import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { ApiKeyManager } from '../_shared/api-key-manager.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // Get user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { sceneId } = await req.json();

    if (!sceneId) {
      return new Response(JSON.stringify({ error: 'Missing sceneId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get scene with task_id
    const { data: scene, error: sceneError } = await supabaseAdmin
      .from('scenes')
      .select('*')
      .eq('id', sceneId)
      .single();

    if (sceneError || !scene || !scene.task_id) {
      return new Response(JSON.stringify({ error: 'Scene or task not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If already completed, return the existing data
    if (scene.status === 'completed' && scene.video_url) {
      return new Response(JSON.stringify({ 
        success: true,
        status: 'completed',
        videoUrl: scene.video_url 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize API key manager for Sora2API
    const keyManager = new ApiKeyManager(supabaseAdmin, 'sora2api');

    console.log('Checking task status:', scene.task_id);

    // Check task status with automatic key rotation
    let data;
    try {
      data = await keyManager.executeWithKeyRotation(async (apiKey) => {
        console.log('Checking Sora2API task status...');
        
        const response = await fetch(
          `https://api.sora2api.ai/api/v1/sora2api/record-info?taskId=${scene.task_id}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Sora2API Status Check Error: ${errorText}`);
        }

        const responseData = await response.json();
        
        if (responseData.code !== 200) {
          throw new Error(responseData.msg || 'Failed to check task status');
        }

        return responseData;
      });
      
      console.log('Task status retrieved successfully:', data);
    } catch (error: any) {
      console.error('All Sora2API keys failed for status check:', error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const taskData = data.data;
    
    // successFlag: 0 (Generating), 1 (Success), 2 (Task Creation Failed), 3 (Generation Failed)
    if (taskData.successFlag === 1) {
      // Task completed successfully
      const videoUrl = taskData.response?.imageUrl; // Note: API uses 'imageUrl' for video URL
      
      if (!videoUrl) {
        await supabaseAdmin
          .from('scenes')
          .update({ 
            status: 'failed',
            error_message: 'No video URL in response',
            updated_at: new Date().toISOString() 
          })
          .eq('id', sceneId);

        return new Response(JSON.stringify({ 
          success: false,
          status: 'failed',
          error: 'No video URL in response' 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Download and upload video to Supabase Storage
      console.log('Downloading video from:', videoUrl);
      const videoResponse = await fetch(videoUrl);
      const videoBlob = await videoResponse.blob();
      const videoBuffer = await videoBlob.arrayBuffer();

      // Upload to storage
      const fileName = `${sceneId}_${Date.now()}.mp4`;
      const { data: uploadData, error: uploadError } = await supabaseAdmin
        .storage
        .from('videos')
        .upload(fileName, videoBuffer, {
          contentType: 'video/mp4',
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        await supabaseAdmin
          .from('scenes')
          .update({ 
            status: 'failed',
            error_message: `Upload failed: ${uploadError.message}`,
            updated_at: new Date().toISOString() 
          })
          .eq('id', sceneId);

        return new Response(JSON.stringify({ 
          success: false,
          status: 'failed',
          error: `Upload failed: ${uploadError.message}` 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get public URL
      const { data: urlData } = supabaseAdmin
        .storage
        .from('videos')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      // Update scene with video URL
      await supabaseAdmin
        .from('scenes')
        .update({ 
          status: 'completed',
          video_url: publicUrl,
          updated_at: new Date().toISOString() 
        })
        .eq('id', sceneId);

      console.log('Video uploaded successfully:', publicUrl);

      return new Response(JSON.stringify({ 
        success: true,
        status: 'completed',
        videoUrl: publicUrl 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (taskData.successFlag === 0) {
      // Still generating
      return new Response(JSON.stringify({ 
        success: true,
        status: 'generating' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      // Failed (successFlag 2 or 3)
      const errorMessage = taskData.errorMessage || 'Video generation failed';
      
      await supabaseAdmin
        .from('scenes')
        .update({ 
          status: 'failed',
          error_message: errorMessage,
          updated_at: new Date().toISOString() 
        })
        .eq('id', sceneId);

      return new Response(JSON.stringify({ 
        success: false,
        status: 'failed',
        error: errorMessage 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in check-video-status:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
