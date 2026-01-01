CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now()
);





ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_can_read_own_profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "user_can_update_own_profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid());





CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();




-- ====================================
-- CinematicAI Database Schema
-- Complete SQL Setup for OnSpace Cloud / Supabase
-- ====================================

-- ====================================
-- 1. PROJECTS TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  script TEXT NOT NULL,
  total_scenes INTEGER,
  total_duration INTEGER, -- in seconds
  character_image_url TEXT, -- optional character reference image
  aspect_ratio TEXT NOT NULL DEFAULT 'portrait', -- landscape or portrait
  primary_language TEXT, -- detected language (Arabic, English, etc.)
  language_direction TEXT, -- LTR or RTL
  status TEXT NOT NULL DEFAULT 'draft', -- draft, analyzing, analyzed, generating, completed, failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================
-- 2. SCENES TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS public.scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_number INTEGER NOT NULL,
  scene_role TEXT, -- hook, problem, solution, cta, etc.
  narration_text TEXT NOT NULL,
  speed_type TEXT NOT NULL, -- fast, medium, slow
  word_count INTEGER,
  visual_prompt TEXT NOT NULL,
  video_url TEXT,
  task_id TEXT, -- sora2api task id
  status TEXT NOT NULL DEFAULT 'pending', -- pending, generating, completed, failed
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================
-- 3. API KEYS TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  service TEXT NOT NULL, -- sora2api, atlascloud
  key_value TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================
-- 4. CHARACTER PROFILES TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS public.character_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  voice_language TEXT, -- same as primary language
  accent TEXT, -- spoken dialect (Egyptian Arabic, American English, etc.)
  visual_features JSONB, -- stores detailed visual characteristics
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================
-- 5. SUBSCRIPTION PLANS TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  credits INTEGER NOT NULL,
  duration_months INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ====================================
-- 6. USER CREDITS TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS public.user_credits (
  user_id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  credits INTEGER DEFAULT 0 CHECK (credits >= 0),
  total_earned INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now()
);

-- ====================================
-- 7. TRANSACTIONS TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id),
  amount DECIMAL(10,2) NOT NULL,
  credits_added INTEGER NOT NULL,
  payment_method TEXT NOT NULL,
  payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ====================================
-- 8. PAYMENT GATEWAY KEYS TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS public.payment_gateway_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway TEXT NOT NULL,
  key_name TEXT NOT NULL,
  key_value TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ====================================
-- 9. INDEXES FOR PERFORMANCE
-- ====================================
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_scenes_project_id ON public.scenes(project_id);
CREATE INDEX IF NOT EXISTS idx_scenes_status ON public.scenes(status);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_service ON public.api_keys(user_id, service);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);

-- ====================================
-- 10. ENABLE ROW LEVEL SECURITY (RLS)
-- ====================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_gateway_keys ENABLE ROW LEVEL SECURITY;

-- ====================================
-- 11. RLS POLICIES - PROJECTS
-- ====================================
CREATE POLICY "authenticated_select_own_projects"
  ON public.projects FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "authenticated_insert_own_projects"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "authenticated_update_own_projects"
  ON public.projects FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "authenticated_delete_own_projects"
  ON public.projects FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ====================================
-- 12. RLS POLICIES - SCENES
-- ====================================
CREATE POLICY "authenticated_select_own_scenes"
  ON public.scenes FOR SELECT TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

CREATE POLICY "authenticated_insert_own_scenes"
  ON public.scenes FOR INSERT TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

CREATE POLICY "authenticated_update_own_scenes"
  ON public.scenes FOR UPDATE TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

CREATE POLICY "authenticated_delete_own_scenes"
  ON public.scenes FOR DELETE TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

-- ====================================
-- 13. RLS POLICIES - API KEYS
-- ====================================
CREATE POLICY "authenticated_select_own_api_keys"
  ON public.api_keys FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "authenticated_insert_own_api_keys"
  ON public.api_keys FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "authenticated_update_own_api_keys"
  ON public.api_keys FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "authenticated_delete_own_api_keys"
  ON public.api_keys FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ====================================
-- 14. RLS POLICIES - CHARACTER PROFILES
-- ====================================
CREATE POLICY "authenticated_select_own_character_profiles"
  ON public.character_profiles FOR SELECT TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

CREATE POLICY "authenticated_insert_own_character_profiles"
  ON public.character_profiles FOR INSERT TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

CREATE POLICY "authenticated_update_own_character_profiles"
  ON public.character_profiles FOR UPDATE TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

CREATE POLICY "authenticated_delete_own_character_profiles"
  ON public.character_profiles FOR DELETE TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

-- ====================================
-- 15. RLS POLICIES - SUBSCRIPTION PLANS
-- ====================================
CREATE POLICY "anon_select_active_plans"
  ON public.subscription_plans FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "authenticated_select_active_plans"
  ON public.subscription_plans FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "admin_all_plans"
  ON public.subscription_plans FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ====================================
-- 16. RLS POLICIES - USER CREDITS
-- ====================================
CREATE POLICY "authenticated_select_own_credits"
  ON public.user_credits FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "authenticated_insert_own_credits"
  ON public.user_credits FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ====================================
-- 17. RLS POLICIES - TRANSACTIONS
-- ====================================
CREATE POLICY "authenticated_select_own_transactions"
  ON public.transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "admin_select_all_transactions"
  ON public.transactions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ====================================
-- 18. RLS POLICIES - PAYMENT GATEWAY KEYS
-- ====================================
CREATE POLICY "admin_all_payment_keys"
  ON public.payment_gateway_keys FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ====================================
-- 19. FUNCTIONS - CREDITS MANAGEMENT
-- ====================================

-- Function to add credits to user
CREATE OR REPLACE FUNCTION public.add_user_credits(
  p_user_id UUID,
  p_credits INTEGER
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, credits, total_earned)
  VALUES (p_user_id, p_credits, p_credits)
  ON CONFLICT (user_id) DO UPDATE
  SET 
    credits = user_credits.credits + p_credits,
    total_earned = user_credits.total_earned + p_credits,
    last_updated = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deduct credits from user
CREATE OR REPLACE FUNCTION public.deduct_user_credits(
  p_user_id UUID,
  p_credits INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_credits INTEGER;
BEGIN
  SELECT credits INTO v_current_credits
  FROM public.user_credits
  WHERE user_id = p_user_id;
  
  IF v_current_credits IS NULL OR v_current_credits < p_credits THEN
    RETURN false;
  END IF;
  
  UPDATE public.user_credits
  SET 
    credits = credits - p_credits,
    total_spent = total_spent + p_credits,
    last_updated = now()
  WHERE user_id = p_user_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has enough credits
CREATE OR REPLACE FUNCTION public.has_enough_credits(
  p_user_id UUID,
  p_credits INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_credits INTEGER;
BEGIN
  SELECT credits INTO v_current_credits
  FROM public.user_credits
  WHERE user_id = p_user_id;
  
  RETURN v_current_credits IS NOT NULL AND v_current_credits >= p_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================
-- 20. TRIGGERS
-- ====================================

-- Trigger to create user_credits on new user
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, credits)
  VALUES (NEW.id, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_profile_created_credits ON public.user_profiles;
CREATE TRIGGER on_user_profile_created_credits
  AFTER INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_credits();

-- Trigger to auto-assign first user as admin
CREATE OR REPLACE FUNCTION auto_assign_first_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is the first user
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE role = 'admin') THEN
    -- Make this user an admin
    NEW.role := 'admin';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_assign_first_admin ON public.user_profiles;
CREATE TRIGGER trigger_auto_assign_first_admin
  BEFORE INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_first_admin();

-- Trigger to deduct 5 credits when creating a new project
CREATE OR REPLACE FUNCTION deduct_credits_for_project()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_current_credits INTEGER;
  v_deduction_success BOOLEAN;
BEGIN
  v_user_id := NEW.user_id;
  
  -- Check current credits
  SELECT credits INTO v_current_credits 
  FROM public.user_credits 
  WHERE user_id = v_user_id;
  
  -- If user doesn't have enough credits
  IF v_current_credits IS NULL OR v_current_credits < 5 THEN
    RAISE EXCEPTION 'رصيدك غير كافٍ لإنشاء مشروع جديد. الرصيد المطلوب: 5 كريديت.';
  END IF;
  
  -- Deduct 5 credits
  v_deduction_success := deduct_user_credits(v_user_id, 5);
  
  IF NOT v_deduction_success THEN
    RAISE EXCEPTION 'فشل خصم الرصيد. يرجى المحاولة مرة أخرى.';
  END IF;
  
  -- Log transaction
  INSERT INTO public.transactions (
    user_id,
    plan_id,
    amount,
    credits_added,
    payment_method,
    status,
    metadata
  ) VALUES (
    v_user_id,
    NULL,
    0,
    -5,  -- Negative value represents deduction
    'system',
    'completed',
    jsonb_build_object(
      'project_id', NEW.id,
      'project_title', NEW.title,
      'reason', 'project_creation',
      'credits_deducted', 5
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_deduct_credits_for_project ON public.projects;
CREATE TRIGGER trigger_deduct_credits_for_project
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION deduct_credits_for_project();

-- ====================================
-- 21. STORAGE BUCKETS
-- ====================================

-- Videos Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('videos', 'videos', TRUE, 1073741824, ARRAY['video/mp4'])
ON CONFLICT (id) DO NOTHING;

-- Character Images Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('character-images', 'character-images', TRUE, 10485760, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ====================================
-- 22. STORAGE RLS POLICIES
-- ====================================

-- Videos Bucket Policies
CREATE POLICY "service_role_all_operations_videos"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'videos')
WITH CHECK (bucket_id = 'videos');

CREATE POLICY "authenticated_select_own_videos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'videos');

CREATE POLICY "public_select_videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'videos');

-- Character Images Bucket Policies
CREATE POLICY "service_role_all_operations_character_images"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'character-images')
WITH CHECK (bucket_id = 'character-images');

CREATE POLICY "authenticated_insert_own_character_images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'character-images');

CREATE POLICY "authenticated_select_own_character_images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'character-images');

-- ====================================
-- 23. DEFAULT DATA - SUBSCRIPTION PLANS
-- ====================================
INSERT INTO public.subscription_plans (name, description, price, credits, duration_months, is_active)
VALUES 
  ('باقة البداية', '100 كريدت - مثالية للمبتدئين', 10.00, 100, 1, true),
  ('باقة المحترف', '300 كريدت - للاستخدام المتوسط', 25.00, 300, 1, true),
  ('باقة الأعمال', '1000 كريدت - للاستخدام الكثيف', 75.00, 1000, 1, true),
  ('باقة سنوية', '1500 كريدت - وفر 20%', 600.00, 1500, 12, true)
ON CONFLICT DO NOTHING;

-- ====================================
-- 24. ADD ROLE COLUMN TO user_profiles
-- ====================================
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

COMMENT ON COLUMN public.user_profiles.role IS 'User role: user or admin';

-- ====================================
-- END OF SCHEMA
-- ====================================

-- ====================================
-- Notes:
-- ====================================
-- 1. This schema assumes user_profiles table already exists (from Auth setup)
-- 2. Edge Functions must be deployed separately (see deployment guide)
-- 3. API keys stored in api_keys table with automatic failover
-- 4. ✅ FIRST USER BECOMES ADMIN AUTOMATICALLY!
-- 5. Subscription plans and credits system fully integrated
-- 6. Payment gateway keys managed in payment_gateway_keys table
-- 7. To manually make a user admin: UPDATE user_profiles SET role = 'admin' WHERE email = 'email@example.com';
-- 8. Admin users can access:
--    - /admin/api-keys (API key management)
--    - /admin/plans (subscription plans management)
--    - /admin/users (user credits management)
-- 9. Credit costs:
--    - Project creation: 5 credits (automatically deducted via trigger)
--    - Video generation: 10 credits per scene
-- 10. Credit deduction trigger:
--    - Automatically deducts 5 credits when a new project is created
--    - Prevents project creation if user has insufficient credits
--    - Logs transaction in transactions table
