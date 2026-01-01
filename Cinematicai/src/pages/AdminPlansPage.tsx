import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Loader2, AlertCircle, DollarSign, CreditCard } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  credits: number;
  duration_months: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PlanFormData {
  name: string;
  description: string;
  price: string;
  credits: string;
  duration_months: string;
  is_active: boolean;
}

export default function AdminPlansPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>({
    name: '',
    description: '',
    price: '',
    credits: '',
    duration_months: '1',
    is_active: true,
  });

  // Check if user is admin
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Redirect if not admin
  if (userProfile && userProfile.role !== 'admin') {
    navigate('/');
    return null;
  }

  const { data: plans, isLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price');
      if (error) throw error;
      return data as SubscriptionPlan[];
    },
  });

  const savePlanMutation = useMutation({
    mutationFn: async (data: PlanFormData) => {
      const planData = {
        name: data.name,
        description: data.description || null,
        price: parseFloat(data.price),
        credits: parseInt(data.credits),
        duration_months: parseInt(data.duration_months),
        is_active: data.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editingPlan) {
        const { error } = await supabase
          .from('subscription_plans')
          .update(planData)
          .eq('id', editingPlan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('subscription_plans')
          .insert(planData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingPlan ? 'تم تحديث الباقة بنجاح' : 'تم إضافة الباقة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast.error('فشل حفظ الباقة: ' + error.message);
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', planId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم حذف الباقة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
    },
    onError: (error: Error) => {
      toast.error('فشل حذف الباقة: ' + error.message);
    },
  });

  const handleOpenDialog = (plan?: SubscriptionPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name,
        description: plan.description || '',
        price: plan.price.toString(),
        credits: plan.credits.toString(),
        duration_months: plan.duration_months.toString(),
        is_active: plan.is_active,
      });
    } else {
      setEditingPlan(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        credits: '',
        duration_months: '1',
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPlan(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    savePlanMutation.mutate(formData);
  };

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
          <h1 className="text-3xl font-bold">إدارة الباقات</h1>
          <p className="text-muted-foreground">إضافة وتعديل وحذف باقات الاشتراك</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          إضافة باقة جديدة
        </Button>
      </div>

      {!plans || plans.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>لا توجد باقات متاحة. أضف باقة جديدة للبدء.</AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className={!plan.is_active ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {plan.name}
                      {!plan.is_active && (
                        <span className="rounded bg-muted px-2 py-0.5 text-xs">معطلة</span>
                      )}
                    </CardTitle>
                    {plan.description && (
                      <CardDescription className="mt-2">{plan.description}</CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">
                      / {plan.duration_months === 1 ? 'شهر' : `${plan.duration_months} شهور`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <span className="font-medium">{plan.credits} كريدت</span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => handleOpenDialog(plan)}
                    >
                      <Edit className="h-3 w-3" />
                      تعديل
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => {
                        if (confirm('هل أنت متأكد من حذف هذه الباقة؟')) {
                          deletePlanMutation.mutate(plan.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                      حذف
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'تعديل الباقة' : 'إضافة باقة جديدة'}</DialogTitle>
            <DialogDescription>
              {editingPlan
                ? 'قم بتعديل تفاصيل الباقة أدناه'
                : 'أدخل تفاصيل الباقة الجديدة'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">اسم الباقة *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: باقة البداية"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">الوصف</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="وصف قصير للباقة"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">السعر (USD) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="10.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="credits">عدد الكريدت *</Label>
                  <Input
                    id="credits"
                    type="number"
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                    placeholder="100"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">المدة (بالأشهر) *</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration_months}
                  onChange={(e) =>
                    setFormData({ ...formData, duration_months: e.target.value })
                  }
                  placeholder="1"
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">تفعيل الباقة</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                إلغاء
              </Button>
              <Button type="submit" disabled={savePlanMutation.isPending}>
                {savePlanMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    جارٍ الحفظ...
                  </>
                ) : (
                  'حفظ'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
