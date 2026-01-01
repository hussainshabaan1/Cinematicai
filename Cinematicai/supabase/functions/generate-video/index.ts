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

    const { sceneId, characterImageUrl } = await req.json();

    if (!sceneId) {
      return new Response(JSON.stringify({ error: 'Missing sceneId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Generating video for scene:', sceneId);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Initialize API key manager for Sora2API
    const keyManager = new ApiKeyManager(supabaseAdmin, 'sora2api');

    // Get scene details with language info
    const { data: scene, error: sceneError } = await supabaseAdmin
      .from('scenes')
      .select('*, projects(*)')
      .eq('id', sceneId)
      .single();

    if (sceneError || !scene) {
      return new Response(JSON.stringify({ error: 'Scene not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get character profile for language info
    const { data: characterProfile } = await supabaseAdmin
      .from('character_profiles')
      .select('voice_language, accent')
      .eq('project_id', scene.project_id)
      .single();

    // Update scene status to generating
    await supabaseAdmin
      .from('scenes')
      .update({ status: 'generating', updated_at: new Date().toISOString() })
      .eq('id', sceneId);

    // Build comprehensive prompt with dialog text and language/dialect specifications
    let enhancedPrompt = scene.visual_prompt;
    
    // SECTION 1: DIALOG TEXT - The exact words the character will speak
    enhancedPrompt += `\n\n=== CHARACTER DIALOG ===`;
    enhancedPrompt += `\nSpoken Text: "${scene.narration_text}"`;
    enhancedPrompt += `\nNote: Character speaks these EXACT words from the script.`;
    
    // SECTION 2: LANGUAGE & DIALECT SPECIFICATIONS
    if (scene.projects?.primary_language) {
      enhancedPrompt += `\n\n=== LANGUAGE & DIALECT SPECIFICATIONS ===`;
      
      // Text Language (what is written in the script)
      enhancedPrompt += `\nText Language: ${scene.projects.primary_language}`;
      enhancedPrompt += `\nText Direction: ${scene.projects.language_direction || 'LTR'}`;
      
      // Spoken Dialect (how the text is pronounced)
      if (characterProfile?.accent) {
        enhancedPrompt += `\nSpoken Dialect/Accent: ${characterProfile.accent}`;
        enhancedPrompt += `\n(e.g., Egyptian Arabic, American English, Parisian French)`;
      }
      
      // Voice Language (should match text language)
      if (characterProfile?.voice_language) {
        enhancedPrompt += `\nVoice Language: ${characterProfile.voice_language}`;
      }
      
      // CRITICAL INSTRUCTION for video model
      const dialectNote = characterProfile?.accent ? ` using ${characterProfile.accent} dialect/accent` : '';
      enhancedPrompt += `\n\n🎯 CRITICAL INSTRUCTION:`;
      enhancedPrompt += `\nThe character MUST speak the dialog text in ${scene.projects.primary_language}${dialectNote}.`;
      enhancedPrompt += `\nEnsure perfect lip synchronization and timing match the spoken narration.`;
      enhancedPrompt += `\nDO NOT change the language of the text - keep it as written in the script.`;
    }
    
    // Prepare video generation request
    const requestBody: any = {
      prompt: enhancedPrompt,
      aspectRatio: scene.projects?.aspect_ratio || 'portrait',
      quality: 'hd',
    };

    // Add character image if provided
    if (characterImageUrl) {
      requestBody.imageUrls = [characterImageUrl];
    }

    console.log('Calling Sora2API with key rotation...');
    
    let data;
    try {
      data = await keyManager.executeWithKeyRotation(async (apiKey) => {
        console.log('Making request to Sora2API...');
        
        const response = await fetch('https://api.sora2api.ai/api/v1/sora2api/generate', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Sora2API Error: ${errorText}`);
        }

        const responseData = await response.json();
        
        if (responseData.code !== 200 || !responseData.data?.taskId) {
          throw new Error(responseData.msg || 'Failed to create video task');
        }

        return responseData;
      });
      
      console.log('Sora2API response received successfully:', data.data.taskId);
    } catch (error: any) {
      console.error('All Sora2API keys failed:', error.message);
      
      await supabaseAdmin
        .from('scenes')
        .update({ 
          status: 'failed', 
          error_message: error.message,
          updated_at: new Date().toISOString() 
        })
        .eq('id', sceneId);

      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Save task ID
    await supabaseAdmin
      .from('scenes')
      .update({ 
        task_id: data.data.taskId,
        updated_at: new Date().toISOString() 
      })
      .eq('id', sceneId);

    console.log('Video generation task created:', data.data.taskId);

    return new Response(JSON.stringify({ 
      success: true,
      taskId: data.data.taskId,
      sceneId 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-video:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
