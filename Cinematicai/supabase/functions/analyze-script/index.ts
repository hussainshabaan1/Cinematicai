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

    const { script, projectId, characterImageUrl } = await req.json();

    if (!script || !projectId) {
      return new Response(JSON.stringify({ error: 'Missing script or projectId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Analyzing script for project:', projectId);

    // Initialize admin client for API key management
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Initialize API key manager for AtlasCloud
    const keyManager = new ApiKeyManager(supabaseAdmin, 'atlascloud');

    // Prepare the analysis prompt - COMBINED into single user message (AtlasCloud doesn't support system role)
    const fullPrompt = `You are a professional film director and expert script analyzer. Analyze the given text and convert it to sequential video scenes.

RULES:
1. Each scene = exactly 10 seconds
2. Speed classification:
   - Fast: 30-35 words (3-3.5 words/sec)
   - Medium: 20-25 words (2-2.5 words/sec)
   - Slow: 12-16 words (1.2-1.6 words/sec)
3. Adjust text to fit 10 seconds exactly
4. Define clear role for each scene (Hook, Problem, Solution, CTA)
5. Ensure narrative continuity
6. Maintain character consistency across all scenes

LANGUAGE AND DIALECT CONTROL (CRITICAL):

IMPORTANT DISTINCTION:
- Text Language: The written language of the script (Arabic, English, French, etc.) - NEVER CHANGE THIS
- Spoken Dialect: How the text is pronounced/accent (Egyptian Arabic, British English, etc.) - Choose appropriate dialect

1. DETECT the primary TEXT LANGUAGE of the script automatically (Arabic, English, French, Spanish, etc.)
2. LOCK this TEXT LANGUAGE for the entire video - DO NOT change language between scenes
3. ALL narration text MUST remain in the SAME LANGUAGE as the original script - DO NOT TRANSLATE
4. Detect language direction (LTR for English/French/Spanish, RTL for Arabic/Hebrew)
5. CHOOSE appropriate SPOKEN DIALECT based on:
   - Target audience (e.g., Egyptian vs Gulf Arabic, American vs British English)
   - Video context and tone
   - Character personality if provided
6. EXTRACT exact dialog text from the script for each scene - preserve original wording
7. Visual prompts should always be in English for video generation model compatibility

EXAMPLES:
- Arabic script → Text Language: Arabic, Dialect: Egyptian Arabic / Gulf Arabic / Standard Arabic
- English script → Text Language: English, Dialect: American English / British English / Australian English
- French script → Text Language: French, Dialect: Parisian French / Canadian French

${characterImageUrl ? 'IMPORTANT: User provided character reference image - maintain same character across all scenes.' : ''}

RETURN JSON ONLY:
{
  "primaryLanguage": "string (detected language name, e.g., 'Arabic', 'English', 'French')",
  "languageDirection": "LTR|RTL",
  "totalScenes": number,
  "totalDuration": number,
  "videoType": "string",
  "pacing": "fast|medium|slow",
  "characterProfile": {
    "description": "string (in English for consistency)",
    "voiceLanguage": "string - SAME as primaryLanguage (e.g., 'Arabic', 'English', 'French')",
    "accent": "string - SPOKEN DIALECT for voice (e.g., 'Egyptian Arabic', 'American English', 'Parisian French')",
    "visualFeatures": {
      "age": "string",
      "appearance": "string",
      "clothing": "string",
      "style": "string"
    }
  },
  "scenes": [
    {
      "sceneNumber": number,
      "role": "string",
      "narrationText": "string - EXACT TEXT from script that character will speak (preserve original language and wording)",
      "speedType": "fast|medium|slow",
      "wordCount": number,
      "visualPrompt": "detailed English visual description (always in English)"
    }
  ]
}

Now analyze this script:
${script}`;

    // Call AtlasCloud API (GPT-5.1) with automatic key rotation
    console.log('Calling AtlasCloud API with key rotation...');
    
    const requestBody = {
      model: 'openai/gpt-5.1-chat',
      messages: [
        {
          role: 'user',
          content: fullPrompt
        }
      ],
      temperature: 1,
      max_tokens: 64000,
      repetition_penalty: 1.1,
    };

    let data;
    try {
      data = await keyManager.executeWithKeyRotation(async (apiKey) => {
        console.log('Making request to AtlasCloud...');
        
        const response = await fetch('https://api.atlascloud.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`AtlasCloud API Error: ${errorText}`);
        }

        return await response.json();
      });
      
      console.log('AtlasCloud response received successfully');
    } catch (error: any) {
      console.error('All AtlasCloud API keys failed:', error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate response structure
    if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid AtlasCloud response structure:', JSON.stringify(data));
      return new Response(JSON.stringify({ error: 'Invalid response from AtlasCloud API' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const content = data.choices[0].message.content;
    
    // Validate content exists
    if (!content || typeof content !== 'string') {
      console.error('Invalid content from AtlasCloud:', content);
      return new Response(JSON.stringify({ error: 'No content received from AI' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('AtlasCloud content received, length:', content.length);

    // Parse JSON from the response
    let analysis;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      analysis = JSON.parse(jsonString);
      console.log('Successfully parsed analysis, scenes count:', analysis.totalScenes);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Content snippet:', content.substring(0, 200));
      return new Response(JSON.stringify({ error: 'Failed to parse AI analysis response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate analysis structure
    if (!analysis.scenes || !Array.isArray(analysis.scenes) || analysis.scenes.length === 0) {
      console.error('Invalid analysis structure:', JSON.stringify(analysis));
      return new Response(JSON.stringify({ error: 'AI did not return valid scenes' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update project with analysis
    const { error: updateError } = await supabaseAdmin
      .from('projects')
      .update({
        total_scenes: analysis.totalScenes,
        total_duration: analysis.totalDuration,
        primary_language: analysis.primaryLanguage,
        language_direction: analysis.languageDirection,
        status: 'analyzed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    if (updateError) {
      console.error('Error updating project:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update project' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Save character profile if exists
    if (analysis.characterProfile) {
      const { error: profileError } = await supabaseAdmin
        .from('character_profiles')
        .insert({
          project_id: projectId,
          description: analysis.characterProfile.description,
          voice_language: analysis.characterProfile.voiceLanguage,
          accent: analysis.characterProfile.accent,
          visual_features: analysis.characterProfile.visualFeatures,
        });

      if (profileError) {
        console.error('Error saving character profile:', profileError);
      }
    }

    // Insert scenes
    const scenesToInsert = analysis.scenes.map((scene: any) => ({
      project_id: projectId,
      scene_number: scene.sceneNumber,
      scene_role: scene.role,
      narration_text: scene.narrationText,
      speed_type: scene.speedType,
      word_count: scene.wordCount,
      visual_prompt: scene.visualPrompt,
      status: 'pending',
    }));

    const { error: scenesError } = await supabaseAdmin
      .from('scenes')
      .insert(scenesToInsert);

    if (scenesError) {
      console.error('Error inserting scenes:', scenesError);
      return new Response(JSON.stringify({ error: 'Failed to save scenes' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Script analysis completed successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      analysis 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-script:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
