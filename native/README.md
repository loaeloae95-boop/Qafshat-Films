# قفشات أفلام — Native Sticker/GIF Keyboard Providers

هذه ملفات تطبيق جوال أصلي (Android + iOS). لا تعمل داخل مشروع الويب الحالي؛
انسخها إلى مشروع Android Studio / Xcode.

## كيف تعمل؟

| المنصة | الآلية | النتيجة |
|---|---|---|
| Android (Gboard) | `ContentProvider` + `FileProvider` + دعم `image/*`, `video/mp4`, `image/gif` عبر `commitContent` | أيقونة التطبيق تظهر في شريط الملصقات/GIF داخل Gboard |
| iOS | `Custom Keyboard Extension` (`UIInputViewController`) + `App Group` مشترك | لوحة مفاتيح فيها شريط بحث وشبكة مقاطع MP4 تُلصق في واتساب/ماسنجر |

> ملاحظة iOS: أبل لا تسمح لتطبيق طرف ثالث بحقن أيقونته في شريط ملصقات لوحة مفاتيح
> أبل نفسها. الطريقتان المسموحتان: (1) لوحة مفاتيح مخصصة كاملة (المرفقة هنا)،
> (2) `Messages App Extension` (ملصقات iMessage فقط). لإرسال MP4 إلى واتساب من
> لوحة المفاتيح يجب نسخ الملف إلى الحافظة العامة (`UIPasteboard`) ثم يلصقه المستخدم،
> لأن `UITextDocumentProxy` يقبل نصاً فقط. يتطلب ذلك `RequestsOpenAccess = YES`.

## البنية

```
native/
  android/
    AndroidManifest.xml
    res/xml/file_paths.xml
    java/com/qafshat/aflam/stickers/StickerContentProvider.kt
    java/com/qafshat/aflam/stickers/StickerRepository.kt
    java/com/qafshat/aflam/keyboard/QafshatInputMethodService.kt
    res/xml/method.xml
  ios/
    QafshatKeyboard/Info.plist
    QafshatKeyboard/KeyboardViewController.swift
    QafshatKeyboard/StickerStore.swift
    QafshatKeyboard/StickerCell.swift
    Shared/AppGroup.swift
```

## خطوات التركيب السريعة

### Android
1. ضع الملفات تحت `app/src/main/`.
2. ضع مقاطع MP4 في `app/src/main/assets/stickers/` مع `stickers/index.json`.
3. `applicationId` = `com.qafshat.aflam` (غيّره في كل الملفات إن أردت).
4. Gboard يكتشف المزوّد تلقائياً عبر `android.content.action.STICKER_PACK`.

### iOS
1. File ▸ New ▸ Target ▸ **Custom Keyboard Extension** باسم `QafshatKeyboard`.
2. فعّل **App Groups** (`group.com.qafshat.aflam`) على التطبيق والامتداد.
3. انسخ ملفات `ios/` واستبدل ما ولّده Xcode.
4. في الإعدادات: لوحات المفاتيح ▸ قفشات أفلام ▸ **السماح بالوصول الكامل**.
