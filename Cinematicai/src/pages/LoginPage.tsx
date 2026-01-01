import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth, mapSupabaseUser } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Film, Mail, Lock, User } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const handleSendOtp = async () => {
    if (!email) {
      toast.error('يرجى إدخال البريد الإلكتروني');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });

      if (error) throw error;

      setOtpSent(true);
      toast.success('تم إرسال رمز التحقق إلى بريدك الإلكتروني');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      toast.error('يرجى إدخال رمز التحقق');
      return;
    }

    if (isSignUp && (!password || !username)) {
      toast.error('يرجى إدخال جميع البيانات المطلوبة');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });

      if (error) throw error;

      if (isSignUp && data.user) {
        const { data: updateData, error: updateError } = await supabase.auth.updateUser({
          password,
          data: { username },
        });

        if (updateError) throw updateError;
        if (updateData.user) {
          login(mapSupabaseUser(updateData.user));
        }
      } else if (data.user) {
        login(mapSupabaseUser(data.user));
      }

      toast.success('تم تسجيل الدخول بنجاح');
      navigate('/projects');
    } catch (error: any) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      toast.error('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        login(mapSupabaseUser(data.user));
        toast.success('تم تسجيل الدخول بنجاح');
        navigate('/projects');
      }
    } catch (error: any) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl cinematic-bg">
            <Film className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl">
            {isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
          </CardTitle>
          <CardDescription>
            {isSignUp
              ? 'أنشئ حسابك لبدء إنشاء فيديوهات احترافية'
              : 'سجّل دخولك للوصول إلى مشاريعك'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {!otpSent && !isSignUp ? (
            <>
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="البريد الإلكتروني"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pr-10"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="كلمة المرور"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    dir="rtl"
                  />
                </div>
              </div>

              <Button className="w-full" onClick={handleSignIn} disabled={loading}>
                {loading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className="text-sm text-primary hover:underline"
                >
                  ليس لديك حساب؟ سجّل الآن
                </button>
              </div>
            </>
          ) : !otpSent ? (
            <>
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="البريد الإلكتروني"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pr-10"
                    dir="rtl"
                  />
                </div>
              </div>

              <Button className="w-full" onClick={handleSendOtp} disabled={loading}>
                {loading ? 'جارٍ الإرسال...' : 'إرسال رمز التحقق'}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className="text-sm text-primary hover:underline"
                >
                  لديك حساب؟ سجّل دخولك
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="رمز التحقق (4 أرقام)"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="pr-10"
                    dir="rtl"
                    maxLength={4}
                  />
                </div>
              </div>

              {isSignUp && (
                <>
                  <div className="space-y-2">
                    <div className="relative">
                      <User className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="اسم المستخدم"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pr-10"
                        dir="rtl"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="relative">
                      <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="password"
                        placeholder="كلمة المرور"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10"
                        dir="rtl"
                      />
                    </div>
                  </div>
                </>
              )}

              <Button className="w-full" onClick={handleVerifyOtp} disabled={loading}>
                {loading ? 'جارٍ التحقق...' : 'تحقق ومتابعة'}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtp('');
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  رجوع
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
