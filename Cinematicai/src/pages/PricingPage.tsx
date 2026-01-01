import { useQuery } from '@tanstack/react-query';
import { Check, Loader2, AlertCircle, CreditCard, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  credits: number;
  duration_months: number;
  is_active: boolean;
}

export default function PricingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: plans, isLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price');
      if (error) throw error;
      return data as SubscriptionPlan[];
    },
  });

  const { data: userCredits } = useQuery({
    queryKey: ['user-credits', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_credits')
        .select('credits')
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleSelectPlan = (planId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    // TODO: Redirect to payment page
    console.log('Selected plan:', planId);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold">اختر الباقة المناسبة لك</h1>
        <p className="text-lg text-muted-foreground">
          باقات مرنة تناسب جميع احتياجاتك في توليد الفيديوهات
        </p>
      </div>

      {user && userCredits && (
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-3">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">رصيدك الحالي</p>
                <p className="text-2xl font-bold">{userCredits.credits} كريدت</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate('/projects')}>
              إنشاء مشروع
            </Button>
          </CardContent>
        </Card>
      )}

      {!plans || plans.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>لا توجد باقات متاحة حالياً</AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const isPopular = plan.credits === 300; // Mark 300 credits plan as popular
            
            return (
              <Card
                key={plan.id}
                className={`relative ${
                  isPopular
                    ? 'border-primary shadow-lg shadow-primary/20'
                    : ''
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center">
                    <Badge className="gap-1">
                      <Sparkles className="h-3 w-3" />
                      الأكثر شعبية
                    </Badge>
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  {plan.description && (
                    <CardDescription>{plan.description}</CardDescription>
                  )}
                </CardHeader>

                <CardContent className="space-y-6">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">${plan.price}</span>
                      <span className="text-muted-foreground">
                        / {plan.duration_months === 1 ? 'شهر' : `${plan.duration_months} شهور`}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="font-medium">{plan.credits} كريدت</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      <span>تحليل نصوص بالذكاء الاصطناعي</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      <span>توليد فيديوهات احترافية</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      <span>دعم جميع اللغات</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      <span>جودة عالية - 1080p</span>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    variant={isPopular ? 'default' : 'outline'}
                    onClick={() => handleSelectPlan(plan.id)}
                  >
                    {user ? 'شراء الباقة' : 'تسجيل الدخول للشراء'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-12 rounded-lg bg-muted/50 p-6 text-center">
        <h3 className="mb-2 text-lg font-semibold">كيف يتم احتساب الكريدت؟</h3>
        <p className="text-sm text-muted-foreground">
          كل عملية تحليل نص تستهلك 5 كريدت، وكل فيديو مُولد يستهلك 10 كريدت
        </p>
      </div>
    </div>
  );
}
