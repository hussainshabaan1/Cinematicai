import { Link } from 'react-router-dom';
import { Film, Sparkles, Zap, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/stores/authStore';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 cinematic-bg opacity-20" />
        <div className="container relative mx-auto px-4 py-24 sm:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full glass-effect px-4 py-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">منصة توليد الفيديوهات بالذكاء الاصطناعي</span>
            </div>
            
            <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
              حوّل نصوصك إلى <span className="text-gradient">فيديوهات سينمائية</span> احترافية
            </h1>
            
            <p className="mb-10 text-xl text-muted-foreground">
              تحليل ذكي للنصوص، تقسيم احترافي للمشاهد، وتوليد فيديوهات عالية الجودة بمشاهد متتابعة مدة كل منها 10 ثوانٍ بالضبط
            </p>
            
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to={user ? '/projects/new' : '/login'}>
                <Button size="lg" className="gap-2">
                  <Film className="h-5 w-5" />
                  ابدأ مشروعك الأول
                </Button>
              </Link>
              <Link to={user ? '/projects' : '/login'}>
                <Button size="lg" variant="outline">
                  مشاريعي
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">مميزات المنصة</h2>
            <p className="text-lg text-muted-foreground">
              كل ما تحتاجه لإنشاء فيديوهات احترافية من نصوصك
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="scene-card-bg rounded-xl border border-border p-8">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg cinematic-bg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <h3 className="mb-3 text-xl font-semibold">تحليل ذكي بالـ AI</h3>
              <p className="text-muted-foreground">
                يقوم النظام بتحليل النص بالكامل باستخدام GPT-5.1 لفهم السياق وتحديد أفضل تقسيم للمشاهد
              </p>
            </div>

            <div className="scene-card-bg rounded-xl border border-border p-8">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg cinematic-bg">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h3 className="mb-3 text-xl font-semibold">مشاهد متتابعة احترافية</h3>
              <p className="text-muted-foreground">
                كل مشهد مدته 10 ثوانٍ بالضبط، مع ضبط زمني دقيق للنص الصوتي والترابط السردي الكامل
              </p>
            </div>

            <div className="scene-card-bg rounded-xl border border-border p-8">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg cinematic-bg">
                <Target className="h-6 w-6 text-white" />
              </div>
              <h3 className="mb-3 text-xl font-semibold">ثبات الشخصية</h3>
              <p className="text-muted-foreground">
                ضمان الثبات الكامل للشخصية الرئيسية عبر جميع المشاهد لتجربة مشاهدة متماسكة
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 cinematic-bg opacity-10" />
        <div className="container relative mx-auto px-4 text-center">
          <h2 className="mb-6 text-3xl font-bold sm:text-4xl">
            جاهز لإنشاء فيديوهاتك الاحترافية؟
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            ابدأ الآن واستمتع بتجربة تحويل نصوصك إلى فيديوهات سينمائية
          </p>
          <Link to={user ? '/projects/new' : '/login'}>
            <Button size="lg" className="gap-2">
              <Film className="h-5 w-5" />
              ابدأ الآن مجانًا
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
