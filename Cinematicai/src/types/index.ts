export interface Project {
  id: string;
  user_id: string;
  title: string;
  script: string;
  total_scenes: number | null;
  total_duration: number | null;
  character_image_url: string | null;
  aspect_ratio: 'landscape' | 'portrait';
  primary_language: string | null;
  language_direction: 'LTR' | 'RTL' | null;
  status: 'draft' | 'analyzing' | 'analyzed' | 'generating' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface Scene {
  id: string;
  project_id: string;
  scene_number: number;
  scene_role: string | null;
  narration_text: string;
  speed_type: 'fast' | 'medium' | 'slow';
  word_count: number | null;
  visual_prompt: string;
  video_url: string | null;
  task_id: string | null;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface CharacterProfile {
  id: string;
  project_id: string;
  description: string;
  voice_language: string | null;
  accent: string | null;
  visual_features: {
    age?: string;
    appearance?: string;
    clothing?: string;
    style?: string;
    [key: string]: any;
  };
  created_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  service: 'sora2api' | 'atlascloud';
  key_value: string;
  is_active: boolean;
  last_used_at: string | null;
  failure_count: number;
  created_at: string;
}

export interface AnalysisResponse {
  primaryLanguage: string;
  languageDirection: 'LTR' | 'RTL';
  totalScenes: number;
  totalDuration: number;
  videoType: string;
  pacing: 'fast' | 'medium' | 'slow';
  characterProfile?: {
    description: string;
    voiceLanguage: string;
    accent: string;
    visualFeatures: {
      age?: string;
      appearance?: string;
      clothing?: string;
      style?: string;
    };
  };
  scenes: Array<{
    sceneNumber: number;
    role: string;
    narrationText: string;
    speedType: 'fast' | 'medium' | 'slow';
    wordCount: number;
    visualPrompt: string;
  }>;
}
