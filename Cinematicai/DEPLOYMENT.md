# 🚀 دليل رفع ونشر منصة CinematicAI

هذا الدليل الشامل لرفع ونشر منصة CinematicAI على OnSpace Cloud أو Supabase.

---

## 📋 المتطلبات الأساسية

### 1. الحسابات المطلوبة
- ✅ حساب OnSpace Cloud أو Supabase
- ✅ حساب Sora2API ([التسجيل](https://sora2api.ai))
- ✅ حساب AtlasCloud AI ([التسجيل](https://api.atlascloud.ai))

### 2. الأدوات المطلوبة
- Node.js v18+ أو Bun
- Git
- Supabase CLI (اختياري للنشر المحلي)

---

## 🗄️ الخطوة 1: إعداد قاعدة البيانات

### أ) تنفيذ Schema على OnSpace Cloud

1. **افتح مشروعك في OnSpace**
2. **اضغط على زر "Cloud" في اللوحة اليمنى**
3. **اذهب إلى تبويب "Data"**
4. **انسخ محتوى ملف `database/schema.sql` بالكامل**
5. **الصقه في محرر SQL وشغله**

### ب) تنفيذ Schema على Supabase

```bash
# قم بتسجيل الدخول إلى Supabase CLI
supabase login

# ارتبط بمشروعك
supabase link --project-ref your-project-ref

# شغل ملف Schema
supabase db push

# أو استخدم SQL Editor في لوحة تحكم Supabase
# Database -> SQL Editor -> New Query -> الصق المحتوى -> Run
```

### ج) التحقق من نجاح الإعداد

تحقق من وجود الجداول التالية:
- ✅ `projects`
- ✅ `scenes`
- ✅ `api_keys`
- ✅ `character_profiles`

تحقق من وجود Buckets:
- ✅ `videos`
- ✅ `character-images`

---

## 🔐 الخطوة 2: إعداد المفاتيح السرية (Secrets)

### على OnSpace Cloud

1. **اذهب إلى Cloud -> Secrets**
2. **أضف المفاتيح التالية:**

```
SORA2_API_KEY=your_sora2api_key_here
ATLASCLOUD_API_KEY=your_atlascloud_api_key_here
```

### على Supabase

```bash
# استخدم Supabase CLI
supabase secrets set SORA2_API_KEY=your_sora2api_key_here
supabase secrets set ATLASCLOUD_API_KEY=your_atlascloud_api_key_here

# أو عبر Dashboard:
# Project Settings -> Edge Functions -> Secrets
```

### الحصول على المفاتيح:

**Sora2API Key:**
1. اذهب إلى [https://sora2api.ai/api-key](https://sora2api.ai/api-key)
2. سجل دخول وأنشئ API Key جديد
3. انسخ المفتاح

**AtlasCloud API Key:**
1. اذهب إلى [https://api.atlascloud.ai](https://api.atlascloud.ai)
2. سجل دخول واذهب إلى API Keys
3. أنشئ مفتاح جديد وانسخه

---

## ⚡ الخطوة 3: رفع Edge Functions

### على OnSpace

**Edge Functions تُرفع تلقائيًا عبر OnSpace!** لا حاجة لخطوات إضافية.

### على Supabase

```bash
# تأكد من أنك في مجلد المشروع
cd your-project-directory

# رفع جميع Edge Functions
supabase functions deploy analyze-script
supabase functions deploy generate-video
supabase functions deploy check-video-status

# أو رفعها جميعًا مرة واحدة
supabase functions deploy
```

### التحقق من نجاح الرفع:

```bash
# عرض قائمة Functions المرفوعة
supabase functions list

# يجب أن ترى:
# - analyze-script
# - generate-video
# - check-video-status
```

---

## 🎨 الخطوة 4: رفع التطبيق Frontend

### أ) تكوين المتغيرات البيئية

**على OnSpace:**
المتغيرات البيئية تُضاف تلقائيًا، لا حاجة للإعداد اليدوي!

**على Vercel/Netlify:**

أنشئ ملف `.env.local`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### ب) بناء التطبيق

```bash
# تثبيت التبعيات
npm install
# أو
bun install

# بناء التطبيق
npm run build
# أو
bun run build
```

### ج) نشر التطبيق

**على OnSpace:**
1. اضغط على زر "Publish" في أعلى يمين الشاشة
2. اختر "Publish" للنشر على .onspace.app
3. أو اختر "Add Existing Domain" لنشر على دومين خاص

**على Vercel:**

```bash
# تثبيت Vercel CLI
npm i -g vercel

# نشر التطبيق
vercel --prod
```

**على Netlify:**

```bash
# تثبيت Netlify CLI
npm i -g netlify-cli

# نشر التطبيق
netlify deploy --prod
```

---

## 🔧 الخطوة 5: إعداد المصادقة (Authentication)

### على OnSpace Cloud

1. **اذهب إلى Cloud -> Users**
2. **اضغط على "Auth Settings"**
3. **فعّل Email/Password Authentication**
4. **اضبط إعدادات OTP:**
   - Email OTP Length: 4
   - Email OTP Expiration: 3600 seconds
5. **(اختياري) فعّل Google OAuth إذا لزم الأمر**

### على Supabase

```bash
# Dashboard -> Authentication -> Providers
# فعّل Email provider
# اضبط نفس الإعدادات كما في OnSpace
```

---

## 🔐 بيانات دخول Admin الافتراضية

**عند أول استخدام:**

### بيانات المستخدم Admin المُوصى بها:

```
البريد الإلكتروني: admin@cinematicai.com
كلمة المرور: Admin@2025
```

### كيفية إنشاء مستخدم Admin:

1. **افتح التطبيق** في المتصفح
2. **اضغط "تسجيل جديد"**
3. **أدخل البيانات التالية:**
   - البريد: `admin@cinematicai.com`
   - الباسورد: `Admin@2025`
   - اسم المستخدم: `admin`
4. **أكمل التحقق عبر OTP**
5. **🎉 تلقائياً سيصبح هذا المستخدم Admin!**

### لماذا يصبح أول مستخدم Admin تلقائياً؟

قاعدة البيانات تحتوي على Trigger يجعل **أول مستخدم يسجل Admin تلقائياً**:

```sql
-- هذا الـ Trigger موجود في schema.sql
CREATE TRIGGER trigger_auto_assign_first_admin
  BEFORE INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_first_admin();
```

### إضافة Admin إضافي يدوياً:

إذا أردت تعيين مستخدم آخر كـ Admin:

```sql
-- على OnSpace Cloud: Data -> SQL Editor
-- على Supabase: Database -> SQL Editor

UPDATE public.user_profiles 
SET role = 'admin' 
WHERE email = 'another-admin@example.com';
```

### الوصول إلى لوحة Admin:

بعد تسجيل الدخول كـ Admin:

```
https://your-domain.com/admin/api-keys
```

⚠️ **تنبيه أمني:**
- **غيّر كلمة المرور بعد أول تسجيل دخول!**
- لا تشارك بيانات Admin مع أي شخص
- استخدم كلمة مرور قوية ومعقدة

---

## 📝 الخطوة 6: اختبار التطبيق

### 1. اختبار تسجيل دخول Admin
- ✅ أنشئ حساب جديد بالبيانات أعلاه
- ✅ تحقق من استلام OTP عبر البريد
- ✅ أكمل تسجيل الدخول
- ✅ تحقق من الوصول إلى `/admin/api-keys`

### 2. اختبار إنشاء مشروع
- ✅ أنشئ مشروع جديد
- ✅ أدخل نص تجريبي
- ✅ (اختياري) ارفع صورة شخصية

### 3. اختبار تحليل النص
- ✅ اضغط "تحليل النص"
- ✅ تحقق من ظهور المشاهد
- ✅ تأكد من اكتشاف اللغة الصحيحة

### 4. اختبار توليد الفيديو
- ✅ اضغط "توليد الفيديو" لمشهد واحد
- ✅ راقب تحديث الحالة تلقائيًا
- ✅ تحقق من تحميل الفيديو بنجاح

---

## 🐛 استكشاف الأخطاء

### خطأ: "AtlasCloud API Error: bad request"

**الحل:**
1. تحقق من صحة `ATLASCLOUD_API_KEY`
2. تأكد من أن المفتاح لديه رصيد كافٍ
3. راجع Edge Function logs في Cloud -> Log

### خطأ: "Sora2API Error"

**الحل:**
1. تحقق من صحة `SORA2_API_KEY`
2. تأكد من الرصيد الكافي في حساب Sora2API
3. تحقق من حجم الصورة المرفوعة (أقل من 10MB)

### خطأ: "Failed to upload image"

**الحل:**
1. تحقق من Storage Bucket policies
2. تأكد من أن المستخدم مسجل دخول
3. راجع حجم ونوع الملف المرفوع

### خطأ: "Unauthorized" في Edge Functions

**الحل:**
1. تحقق من وجود Bearer token في الطلب
2. تأكد من أن المستخدم مسجل دخول
3. راجع Auth state في التطبيق

---

## 📊 مراقبة الأداء

### عرض Logs

**على OnSpace:**
1. Cloud -> Log
2. اختر نوع الخدمة (Edge Function / Database / Auth)
3. راجع الأخطاء والتحذيرات

**على Supabase:**
```bash
# عرض logs لـ Edge Function محدد
supabase functions logs analyze-script --tail

# عرض جميع logs
supabase logs --tail
```

### مراقبة الاستخدام

**OnSpace:**
- Cloud -> AI: راقب استخدام OnSpace AI
- Cloud -> Data: راجع حجم قاعدة البيانات
- Cloud -> Storage: راقب مساحة التخزين المستخدمة

---

## 🔄 تحديث التطبيق

### تحديث Edge Functions

```bash
# بعد تعديل أي Edge Function
supabase functions deploy function-name

# مثال:
supabase functions deploy analyze-script
```

### تحديث Schema

```bash
# أنشئ migration جديد
supabase migration new update_description

# عدّل الملف في supabase/migrations/
# ثم شغل:
supabase db push
```

### تحديث Frontend

```bash
# بناء وتحديث
npm run build
vercel --prod  # أو netlify deploy --prod
```

---

## 📚 موارد إضافية

- [OnSpace Documentation](https://docs.onspace.ai)
- [Supabase Docs](https://supabase.com/docs)
- [Sora2API Docs](https://docs.sora2api.ai)
- [AtlasCloud AI Docs](https://api.atlascloud.ai/docs)

---

## 🆘 الدعم الفني

إذا واجهت أي مشاكل:

1. **راجع Logs** في Cloud -> Log
2. **تحقق من Status** جميع الخدمات
3. **اتصل بالدعم:**
   - OnSpace: contact@onspace.ai
   - Sora2API: support@sora2api.ai

---

## ✅ Checklist النشر النهائي

قبل النشر الرسمي، تأكد من:

- [ ] قاعدة البيانات مُعدة بالكامل
- [ ] جميع Secrets مُضافة بشكل صحيح
- [ ] Edge Functions مرفوعة وتعمل
- [ ] التطبيق Frontend منشور
- [ ] المصادقة تعمل بنجاح
- [ ] تم اختبار تحليل النص
- [ ] تم اختبار توليد الفيديوهات
- [ ] Storage Buckets تعمل بشكل صحيح
- [ ] تم اختبار جميع اللغات المدعومة
- [ ] Logs خالية من الأخطاء الحرجة

---

🎉 **مبروك! منصة CinematicAI الآن جاهزة للاستخدام!**
