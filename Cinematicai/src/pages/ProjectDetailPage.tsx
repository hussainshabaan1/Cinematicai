import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Sparkles, Play, Download, Loader2, AlertCircle, Film, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import type { Project, Scene } from '@/types';
import { formatDuration, getStatusBadgeVariant } from '@/lib/utils';
import { FunctionsHttpError } from '@supabase/supabase-js';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id!)
        .single();

      if (error) throw error;
      return data as Project;
    },
    enabled: !!id,
  });

  const { data: scenes, refetch: refetchScenes } = useQuery({
    queryKey: ['scenes', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scenes')
        .select('*')
        .eq('project_id', id!)
        .order('scene_number');

      if (error) throw error;
      return data as Scene[];
    },
    enabled: !!id && project?.status !== 'draft',
  });

  const analyzeScriptMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('analyze-script', {
        body: {
          script: project!.script,
          projectId: project!.id,
          characterImageUrl: project!.character_image_url,
        },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
          } catch {
            errorMessage = `${error.message || 'Failed to read response'}`;
          }
        }
        throw new Error(errorMessage);
      }

      return data;
    },
    onSuccess: () => {
      toast.success('تم تحليل النص بنجاح! جارٍ تحميل المشاهد...');
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['scenes', id] });
    },
    onError: (error: Error) => {
      toast.error('فشل تحليل النص: ' + error.message);
    },
  });

  const generateVideoMutation = useMutation({
    mutationFn: async (sceneId: string) => {
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: {
          sceneId,
          characterImageUrl: project!.character_image_url,
        },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
          } catch {
            errorMessage = `${error.message || 'Failed to read response'}`;
          }
        }
        throw new Error(errorMessage);
      }

      return data;
    },
    onSuccess: () => {
      refetchScenes();
    },
    onError: (error: Error) => {
      toast.error('فشل توليد الفيديو: ' + error.message);
    },
  });

  const checkVideoStatusMutation = useMutation({
    mutationFn: async (sceneId: string) => {
      const { data, error } = await supabase.functions.invoke('check-video-status', {
        body: { sceneId },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
          } catch {
            errorMessage = `${error.message || 'Failed to read response'}`;
          }
        }
        throw new Error(errorMessage);
      }

      return data;
    },
    onSuccess: (data) => {
      if (data.status === 'completed') {
        toast.success('تم توليد الفيديو بنجاح!');
        refetchScenes();
      }
    },
  });

  // Auto-check video status for generating scenes
  useEffect(() => {
    if (!scenes) return;

    const generatingScenes = scenes.filter((s) => s.status === 'generating' && s.task_id);
    if (generatingScenes.length === 0) return;

    const interval = setInterval(() => {
      generatingScenes.forEach((scene) => {
        checkVideoStatusMutation.mutate(scene.id);
      });
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [scenes]);

  const handleGenerateAllVideos = () => {
    if (!scenes) return;

    const pendingScenes = scenes.filter((s) => s.status === 'pending');
    pendingScenes.forEach((scene) => {
      generateVideoMutation.mutate(scene.id);
    });
  };

  if (loadingProject) {
    return (
      <div className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>المشروع غير موجود</AlertDescription>
        </Alert>
      </div>
    );
  }

  const completedScenes = scenes?.filter((s) => s.status === 'completed').length || 0;
  const totalScenes = scenes?.length || 0;
  const progress = totalScenes > 0 ? (completedScenes / totalScenes) * 100 : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" className="mb-6 gap-2" onClick={() => navigate('/projects')}>
        <ArrowLeft className="h-4 w-4" />
        العودة إلى المشاريع
      </Button>

      <div className="mb-8">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{project.title}</h1>
            <p className="text-muted-foreground">إدارة المشاهد وتوليد الفيديوهات</p>
          </div>
          <Badge variant={getStatusBadgeVariant(project.status)} className="text-sm">
            {getStatusLabel(project.status)}
          </Badge>
        </div>

        {project.total_scenes && project.total_duration && (
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Film className="h-4 w-4" />
              <span>{project.total_scenes} مشهد</span>
            </div>
            <div className="flex items-center gap-2">
              <span>المدة الإجمالية: {formatDuration(project.total_duration)}</span>
            </div>
            {project.primary_language && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {getLanguageLabel(project.primary_language)}
                </Badge>
              </div>
            )}
          </div>
        )}
      </div>

      {project.status === 'draft' && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>تحليل النص</CardTitle>
            <CardDescription>ابدأ بتحليل النص لتقسيمه إلى مشاهد متتابعة</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="whitespace-pre-wrap text-sm">{project.script}</p>
              </div>
              <Button
                className="w-full gap-2"
                onClick={() => analyzeScriptMutation.mutate()}
                disabled={analyzeScriptMutation.isPending}
              >
                {analyzeScriptMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>جارٍ التحليل...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>تحليل النص وإنشاء المشاهد</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {project.status === 'analyzing' && (
        <Alert className="mb-6">
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>جارٍ تحليل النص... يرجى الانتظار</AlertDescription>
        </Alert>
      )}

      {scenes && scenes.length > 0 && (
        <>
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">التقدم الكلي</span>
              <span className="text-muted-foreground">
                {completedScenes} / {totalScenes} مشهد
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {scenes.some((s) => s.status === 'pending') && (
            <div className="mb-6 flex gap-4">
              <Button
                className="gap-2"
                onClick={handleGenerateAllVideos}
                disabled={generateVideoMutation.isPending}
              >
                <Play className="h-4 w-4" />
                توليد جميع الفيديوهات
              </Button>
            </div>
          )}

          <div className="space-y-4">
            {scenes.map((scene) => (
              <Card key={scene.id} className="scene-card-bg">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <CardTitle className="text-lg">المشهد {scene.scene_number}</CardTitle>
                        {scene.scene_role && (
                          <Badge variant="outline" className="text-xs">
                            {scene.scene_role}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {scene.speed_type === 'fast' && 'سريع'}
                          {scene.speed_type === 'medium' && 'متوسط'}
                          {scene.speed_type === 'slow' && 'بطيء'}
                        </Badge>
                      </div>
                      <CardDescription className="whitespace-pre-wrap">
                        {scene.narration_text}
                      </CardDescription>
                    </div>
                    <Badge variant={getStatusBadgeVariant(scene.status)} className="ml-4">
                      {getStatusLabel(scene.status)}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    {scene.visual_prompt && (
                      <div className="rounded-lg bg-muted/30 p-3">
                        <p className="text-xs font-medium text-muted-foreground">الوصف البصري:</p>
                        <p className="mt-1 text-sm">{scene.visual_prompt}</p>
                      </div>
                    )}

                    {scene.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={() => generateVideoMutation.mutate(scene.id)}
                        disabled={generateVideoMutation.isPending}
                      >
                        <Play className="h-3 w-3" />
                        توليد الفيديو
                      </Button>
                    )}

                    {scene.status === 'generating' && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>جارٍ توليد الفيديو...</span>
                      </div>
                    )}

                    {scene.status === 'completed' && scene.video_url && (
                      <div className="space-y-2">
                        <div className={`mx-auto overflow-hidden rounded-lg ${
                          project.aspect_ratio === 'landscape' ? 'max-w-full' : 'max-w-sm'
                        }`}>
                          <video
                            src={scene.video_url}
                            controls
                            className={`w-full rounded-lg ${
                              project.aspect_ratio === 'landscape' ? 'aspect-video' : 'aspect-[9/16]'
                            }`}
                            preload="metadata"
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => window.open(scene.video_url!, '_blank')}
                        >
                          <Download className="h-3 w-3" />
                          تحميل الفيديو
                        </Button>
                      </div>
                    )}

                    {scene.status === 'failed' && scene.error_message && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{scene.error_message}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'مسودة',
    analyzing: 'جارٍ التحليل',
    analyzed: 'تم التحليل',
    pending: 'في الانتظار',
    generating: 'جارٍ التوليد',
    completed: 'مكتمل',
    failed: 'فشل',
  };
  return labels[status] || status;
}

function getLanguageLabel(language: string): string {
  const labels: Record<string, string> = {
    'Arabic': 'العربية',
    'English': 'الإنجليزية',
    'French': 'الفرنسية',
    'Spanish': 'الإسبانية',
    'German': 'الألمانية',
    'Italian': 'الإيطالية',
    'Portuguese': 'البرتغالية',
    'Russian': 'الروسية',
    'Chinese': 'الصينية',
    'Japanese': 'اليابانية',
    'Korean': 'الكورية',
    'Hindi': 'الهندية',
    'Turkish': 'التركية',
    'Dutch': 'الهولندية',
    'Polish': 'البولندية',
    'Swedish': 'السويدية',
  };
  return labels[language] || language;
}
