import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Key, Plus, Trash2, Power, PowerOff, AlertCircle, Shield, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import type { ApiKey } from '@/types';

export default function AdminApiKeysPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newKeyService, setNewKeyService] = useState<'sora2api' | 'atlascloud'>('sora2api');
  const [newKeyValue, setNewKeyValue] = useState('');

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        navigate('/login');
        return;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error || data?.role !== 'admin') {
        toast.error('غير مصرح لك بالوصول إلى هذه الصفحة');
        navigate('/projects');
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    };

    checkAdminStatus();
  }, [user, navigate]);

  // Fetch all API keys (admin only)
  const { data: apiKeys, isLoading: loadingKeys } = useQuery({
    queryKey: ['admin-api-keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('service')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ApiKey[];
    },
    enabled: isAdmin,
  });

  // Add new API key
  const addKeyMutation = useMutation({
    mutationFn: async () => {
      if (!newKeyValue.trim()) {
        throw new Error('يرجى إدخال قيمة المفتاح');
      }

      const { error } = await supabase.from('api_keys').insert({
        user_id: user!.id,
        service: newKeyService,
        key_value: newKeyValue.trim(),
        is_active: true,
        failure_count: 0,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم إضافة المفتاح بنجاح');
      setNewKeyValue('');
      setShowAddForm(false);
      queryClient.invalidateQueries({ queryKey: ['admin-api-keys'] });
    },
    onError: (error: Error) => {
      toast.error('فشل إضافة المفتاح: ' + error.message);
    },
  });

  // Toggle key active status
  const toggleKeyMutation = useMutation({
    mutationFn: async ({ keyId, isActive }: { keyId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: !isActive })
        .eq('id', keyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-api-keys'] });
    },
    onError: (error: Error) => {
      toast.error('فشل تعديل حالة المفتاح: ' + error.message);
    },
  });

  // Delete API key
  const deleteKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const { error } = await supabase.from('api_keys').delete().eq('id', keyId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم حذف المفتاح بنجاح');
      queryClient.invalidateQueries({ queryKey: ['admin-api-keys'] });
    },
    onError: (error: Error) => {
      toast.error('فشل حذف المفتاح: ' + error.message);
    },
  });

  if (loading) {
    return (
      <div className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const sora2apiKeys = apiKeys?.filter((k) => k.service === 'sora2api') || [];
  const atlascloudKeys = apiKeys?.filter((k) => k.service === 'atlascloud') || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" className="mb-6 gap-2" onClick={() => navigate('/projects')}>
        <ArrowLeft className="h-4 w-4" />
        العودة
      </Button>

      <div className="mb-8">
        <div className="mb-4 flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">إدارة مفاتيح API</h1>
            <p className="text-muted-foreground">لوحة تحكم الأدمن - إدارة مفاتيح API المتعددة</p>
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            تُستخدم المفاتيح بالترتيب حسب عدد الفشل (الأقل فشلاً أولاً). عند نفاد رصيد مفتاح، ينتقل النظام
            تلقائياً للمفتاح التالي دون انقطاع العملية.
          </AlertDescription>
        </Alert>
      </div>

      {!showAddForm && (
        <Button className="mb-6 gap-2" onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4" />
          إضافة مفتاح جديد
        </Button>
      )}

      {showAddForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>إضافة مفتاح API جديد</CardTitle>
            <CardDescription>أضف مفتاح جديد لزيادة الموثوقية والأداء</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>الخدمة</Label>
              <Select
                value={newKeyService}
                onValueChange={(value: 'sora2api' | 'atlascloud') => setNewKeyService(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sora2api">Sora2API (توليد الفيديو)</SelectItem>
                  <SelectItem value="atlascloud">AtlasCloud (تحليل النص)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>قيمة المفتاح</Label>
              <Input
                type="password"
                placeholder="أدخل مفتاح API"
                value={newKeyValue}
                onChange={(e) => setNewKeyValue(e.target.value)}
                dir="ltr"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={() => addKeyMutation.mutate()} disabled={addKeyMutation.isPending}>
                {addKeyMutation.isPending ? 'جارٍ الإضافة...' : 'إضافة المفتاح'}
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                إلغاء
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sora2API Keys */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              مفاتيح Sora2API
            </CardTitle>
            <CardDescription>إدارة مفاتيح توليد الفيديو</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingKeys ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : sora2apiKeys.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">لا توجد مفاتيح</p>
            ) : (
              <div className="space-y-3">
                {sora2apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between rounded-lg border bg-card p-3"
                  >
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <code className="text-xs text-muted-foreground">
                          {key.key_value.substring(0, 8)}...{key.key_value.slice(-4)}
                        </code>
                        {key.is_active ? (
                          <Badge variant="default" className="text-xs">
                            نشط
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            معطل
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>فشل: {key.failure_count}</span>
                        {key.last_used_at && (
                          <span>آخر استخدام: {new Date(key.last_used_at).toLocaleDateString('ar')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          toggleKeyMutation.mutate({ keyId: key.id, isActive: key.is_active })
                        }
                      >
                        {key.is_active ? (
                          <PowerOff className="h-4 w-4" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm('هل أنت متأكد من حذف هذا المفتاح؟')) {
                            deleteKeyMutation.mutate(key.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AtlasCloud Keys */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              مفاتيح AtlasCloud
            </CardTitle>
            <CardDescription>إدارة مفاتيح تحليل النص</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingKeys ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : atlascloudKeys.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">لا توجد مفاتيح</p>
            ) : (
              <div className="space-y-3">
                {atlascloudKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between rounded-lg border bg-card p-3"
                  >
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <code className="text-xs text-muted-foreground">
                          {key.key_value.substring(0, 8)}...{key.key_value.slice(-4)}
                        </code>
                        {key.is_active ? (
                          <Badge variant="default" className="text-xs">
                            نشط
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            معطل
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>فشل: {key.failure_count}</span>
                        {key.last_used_at && (
                          <span>آخر استخدام: {new Date(key.last_used_at).toLocaleDateString('ar')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          toggleKeyMutation.mutate({ keyId: key.id, isActive: key.is_active })
                        }
                      >
                        {key.is_active ? (
                          <PowerOff className="h-4 w-4" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm('هل أنت متأكد من حذف هذا المفتاح؟')) {
                            deleteKeyMutation.mutate(key.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
