import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Upload, Sparkles, Monitor, Smartphone, AlertCircle, CreditCard, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [title, setTitle] = useState('');
  const [script, setScript] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'landscape' | 'portrait'>('portrait');
  const [characterImage, setCharacterImage] = useState<File | null>(null);
  const [characterImageUrl, setCharacterImageUrl] = useState<string | null>(null);

  // جلب رصيد المستخدم
  const { data: userCredits, isLoading: loadingCredits, refetch: refetchCredits } = useQuery({
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

  const hasEnoughCredits = userCredits && userCredits.credits >= 5;
  const CREDITS_REQUIRED = 5;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 10 ميجابايت');
      return;
    }

    setCharacterImage(file);
    setUploading(true);

    try {
      const fileName = `${user!.id}/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('character-images')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('character-images')
        .getPublicUrl(data.path);

      setCharacterImageUrl(urlData.publicUrl);
      toast.success('تم رفع الصورة بنجاح');
    } catch (error: any) {
      toast.error('فشل رفع الصورة: ' + error.message);
      setCharacterImage(null);
    } finally {
      setUploading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!title.trim() || !script.trim()) {
      toast.error('يرجى إدخال عنوان النص والمحتوى');
      return;
    }

    // التحقق من الرصيد قبل الإنشاء
    if (!hasEnoughCredits) {
      toast.error('رصيدك غير كافٍ لإنشاء مشروع جديد. الرصيد المطلوب: 5 كريديت');
      return;
    }

    setLoading(true);

    try {
      // Create project (الـ Trigger سيخصم 5 كريديت تلقائياً)
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: user!.id,
          title: title.trim(),
          script: script.trim(),
          character_image_url: characterImageUrl,
          aspect_ratio: aspectRatio,
          status: 'draft',
        })
        .select()
        .single();

      if (projectError) {
        // إذا كان الخطأ متعلق بالرصيد، عرض رسالة مناسبة
        if (projectError.message.includes('رصيدك غير كافٍ')) {
          toast.error('رصيدك غير كافٍ لإنشاء مشروع جديد');
          refetchCredits(); // تحديث الرصيد المعروض
          setLoading(false);
          return;
        }
        throw projectError;
      }

      toast.success('تم إنشاء المشروع بنجاح وخصم 5 كريديت من رصيدك');
      refetchCredits(); // تحديث الرصيد بعد الخصم
      navigate(`/projects/${project.id}`);
    } catch (error: any) {
      toast.error('فشل إنشاء المشروع: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">مشروع جديد</h1>
              <p className="text-muted-foreground">أنشئ مشروعًا جديدًا لتحويل نصك إلى فيديو احترافي</p>
            </div>
            {!loadingCredits && userCredits && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="flex items-center gap-2 p-4">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <div className="text-sm">
                    <p className="text-muted-foreground">رصيدك</p>
                    <p className="text-lg font-bold text-primary">{userCredits.credits} كريديت</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {!loadingCredits && !hasEnoughCredits && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>رصيدك غير كافٍ</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-3">
                يتطلب إنشاء مشروع جديد <strong>{CREDITS_REQUIRED} كريديت</strong>.
                رصيدك الحالي: <strong>{userCredits?.credits || 0} كريديت</strong>.
              </p>
              <Link to="/pricing">
                <Button size="sm" className="gap-2">
                  <CreditCard className="h-4 w-4" />
                  عرض الباقات المتاحة
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>معلومات المشروع</CardTitle>
              <CardDescription>أدخل عنوان المشروع والنص المراد تحويله</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">عنوان المشروع</Label>
                <Input
                  id="title"
                  placeholder="مثال: فيديو تعريفي بالمنتج"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  dir="rtl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="script">النص (Script)</Label>
                <Textarea
                  id="script"
                  placeholder="أدخل النص المراد تحويله إلى فيديو... يمكنك كتابة قصة، إعلان، شرح، أو أي محتوى ترغب في تحويله"
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  rows={12}
                  dir="rtl"
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  سيقوم النظام بتحليل النص وتقسيمه إلى مشاهد متتابعة مدة كل منها 10 ثوانٍ
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>أبعاد الفيديو</CardTitle>
              <CardDescription>
                اختر نسبة العرض إلى الارتفاع المناسبة للفيديوهات
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={aspectRatio} onValueChange={(value: 'landscape' | 'portrait') => setAspectRatio(value)}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Label
                    htmlFor="landscape"
                    className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 p-6 transition-all ${
                      aspectRatio === 'landscape'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value="landscape" id="landscape" className="sr-only" />
                    <Monitor className="h-8 w-8" />
                    <div className="text-center">
                      <div className="font-semibold">أفقي (Landscape)</div>
                      <div className="text-xs text-muted-foreground">16:9 - مناسب للمشاهدة على الشاشات الكبيرة</div>
                    </div>
                  </Label>

                  <Label
                    htmlFor="portrait"
                    className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 p-6 transition-all ${
                      aspectRatio === 'portrait'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value="portrait" id="portrait" className="sr-only" />
                    <Smartphone className="h-8 w-8" />
                    <div className="text-center">
                      <div className="font-semibold">عمودي (Portrait)</div>
                      <div className="text-xs text-muted-foreground">9:16 - مناسب للموبايل ووسائل التواصل</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>صورة الشخصية (اختياري)</CardTitle>
              <CardDescription>
                ارفع صورة للشخصية الرئيسية لضمان ثباتها عبر جميع المشاهد
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <Label
                    htmlFor="character-image"
                    className="flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/20 transition-colors hover:bg-muted/40"
                  >
                    {characterImage ? (
                      <div className="space-y-2 text-center">
                        <img
                          src={characterImageUrl!}
                          alt="Character preview"
                          className="mx-auto h-24 w-24 rounded-lg object-cover"
                        />
                        <p className="text-sm text-muted-foreground">{characterImage.name}</p>
                      </div>
                    ) : (
                      <div className="space-y-2 text-center">
                        <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium text-primary">اضغط لرفع صورة</span> أو اسحب وأفلت
                        </div>
                        <p className="text-xs text-muted-foreground">PNG, JPG حتى 10MB</p>
                      </div>
                    )}
                    <Input
                      id="character-image"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                  </Label>
                </div>

                {uploading && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span>جارٍ رفع الصورة...</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {hasEnoughCredits && (
            <Alert className="border-primary/20 bg-primary/5">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertDescription>
                سيتم خصم <strong>{CREDITS_REQUIRED} كريديت</strong> من رصيدك عند إنشاء هذا المشروع.
                رصيدك بعد الإنشاء: <strong>{(userCredits?.credits || 0) - CREDITS_REQUIRED} كريديت</strong>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4">
            <Button
              className="flex-1 gap-2"
              size="lg"
              onClick={handleCreateProject}
              disabled={loading || uploading || !hasEnoughCredits || loadingCredits}
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  <span>جارٍ الإنشاء...</span>
                </>
              ) : !hasEnoughCredits ? (
                <>
                  <AlertCircle className="h-4 w-4" />
                  <span>رصيد غير كافٍ</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>إنشاء المشروع (خصم {CREDITS_REQUIRED} كريديت)</span>
                </>
              )}
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate('/projects')}>
              إلغاء
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
