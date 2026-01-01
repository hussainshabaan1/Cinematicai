import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Loader2, AlertCircle, CreditCard, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface UserWithCredits {
  id: string;
  email: string;
  username: string | null;
  role: string;
  credits: number;
  total_earned: number;
  total_spent: number;
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchEmail, setSearchEmail] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithCredits | null>(null);
  const [creditsToAdd, setCreditsToAdd] = useState('');

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

  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['admin-users', searchEmail],
    queryFn: async () => {
      let query = supabase
        .from('user_profiles')
        .select(`
          id,
          email,
          username,
          role,
          user_credits (
            credits,
            total_earned,
            total_spent
          )
        `);

      if (searchEmail.trim()) {
        query = query.ilike('email', `%${searchEmail.trim()}%`);
      }

      const { data, error } = await query.order('email');
      if (error) throw error;

      return data.map((u: any) => ({
        id: u.id,
        email: u.email,
        username: u.username,
        role: u.role,
        credits: u.user_credits?.[0]?.credits || 0,
        total_earned: u.user_credits?.[0]?.total_earned || 0,
        total_spent: u.user_credits?.[0]?.total_spent || 0,
      })) as UserWithCredits[];
    },
  });

  const addCreditsMutation = useMutation({
    mutationFn: async ({ userId, credits }: { userId: string; credits: number }) => {
      const { error } = await supabase.rpc('add_user_credits', {
        p_user_id: userId,
        p_credits: credits,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم إضافة الرصيد بنجاح');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast.error('فشل إضافة الرصيد: ' + error.message);
    },
  });

  const handleOpenDialog = (user: UserWithCredits) => {
    setSelectedUser(user);
    setCreditsToAdd('');
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedUser(null);
    setCreditsToAdd('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const credits = parseInt(creditsToAdd);
    if (isNaN(credits) || credits <= 0) {
      toast.error('يرجى إدخال عدد صحيح من الكريدت');
      return;
    }

    addCreditsMutation.mutate({ userId: selectedUser.id, credits });
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold">إدارة المستخدمين</h1>
        <p className="text-muted-foreground">البحث عن المستخدمين وإضافة رصيد</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            البحث عن مستخدم
          </CardTitle>
          <CardDescription>ابحث بالبريد الإلكتروني</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="أدخل البريد الإلكتروني..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  refetch();
                }
              }}
            />
            <Button onClick={() => refetch()}>بحث</Button>
          </div>
        </CardContent>
      </Card>

      {!users || users.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {searchEmail.trim()
              ? 'لم يتم العثور على مستخدمين بهذا البريد الإلكتروني'
              : 'لا يوجد مستخدمين'}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{user.username || 'بدون اسم'}</h3>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role === 'admin' ? 'مدير' : 'مستخدم'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <CreditCard className="h-4 w-4 text-primary" />
                      <span className="font-medium">{user.credits}</span>
                      <span className="text-muted-foreground">كريدت متاح</span>
                    </div>
                    <div className="text-muted-foreground">
                      إجمالي المكتسب: {user.total_earned}
                    </div>
                    <div className="text-muted-foreground">
                      إجمالي المستخدم: {user.total_spent}
                    </div>
                  </div>
                </div>
                <Button onClick={() => handleOpenDialog(user)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  إضافة رصيد
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة رصيد</DialogTitle>
            <DialogDescription>
              إضافة رصيد يدوياً لـ {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>الرصيد الحالي</Label>
                <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <span className="text-lg font-semibold">{selectedUser?.credits || 0}</span>
                  <span className="text-muted-foreground">كريدت</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="credits">عدد الكريدت للإضافة *</Label>
                <Input
                  id="credits"
                  type="number"
                  value={creditsToAdd}
                  onChange={(e) => setCreditsToAdd(e.target.value)}
                  placeholder="100"
                  min="1"
                  required
                />
              </div>

              {creditsToAdd && parseInt(creditsToAdd) > 0 && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="text-sm text-muted-foreground">الرصيد بعد الإضافة:</p>
                  <p className="text-lg font-semibold text-primary">
                    {(selectedUser?.credits || 0) + parseInt(creditsToAdd)} كريدت
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                إلغاء
              </Button>
              <Button type="submit" disabled={addCreditsMutation.isPending}>
                {addCreditsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    جارٍ الإضافة...
                  </>
                ) : (
                  'إضافة رصيد'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
