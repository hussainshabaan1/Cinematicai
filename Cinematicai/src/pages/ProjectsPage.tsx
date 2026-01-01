import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Film, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Project } from '@/types';
import { formatDuration, getStatusBadgeVariant } from '@/lib/utils';

export default function ProjectsPage() {
  const { user } = useAuth();

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Project[];
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">مشاريعي</h1>
          <p className="text-muted-foreground">إدارة جميع مشاريع الفيديو الخاصة بك</p>
        </div>
        <Link to="/projects/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            مشروع جديد
          </Button>
        </Link>
      </div>

      {!projects || projects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Film className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">لا توجد مشاريع بعد</h3>
            <p className="mb-6 text-center text-muted-foreground">
              ابدأ مشروعك الأول وحوّل نصوصك إلى فيديوهات احترافية
            </p>
            <Link to="/projects/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                إنشاء مشروع جديد
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`}>
              <Card className="transition-all hover:border-primary hover:shadow-lg">
                <CardHeader>
                  <div className="mb-2 flex items-start justify-between">
                    <CardTitle className="line-clamp-1">{project.title}</CardTitle>
                    <Badge variant={getStatusBadgeVariant(project.status)}>
                      {getStatusLabel(project.status)}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">{project.script}</CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="space-y-2 text-sm">
                    {project.total_scenes && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Film className="h-4 w-4" />
                        <span>{project.total_scenes} مشهد</span>
                      </div>
                    )}
                    {project.total_duration && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{formatDuration(project.total_duration)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="text-xs text-muted-foreground">
                  {new Date(project.created_at).toLocaleDateString('ar-SA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'مسودة',
    analyzing: 'جارٍ التحليل',
    analyzed: 'تم التحليل',
    generating: 'جارٍ التوليد',
    completed: 'مكتمل',
    failed: 'فشل',
  };
  return labels[status] || status;
}
