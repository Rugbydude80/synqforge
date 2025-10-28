# 🎨 SynqForge Logo Setup Guide

## Quick Setup (3 Steps)

### Step 1: Save the Logo Images

Drag and drop the 3 images you have into the `public/` folder with these exact names:

1. **Light Mode Logo** → Save as: `public/logo-light.png`
   - The image with light/white background
   - Dark "Synq" text + purple "Forge"
   
2. **Dark Mode Logo** → Save as: `public/logo-dark.png`
   - The image with dark background
   - White "Synq" text + purple "Forge"
   
3. **App Icon** → Save as: `public/logo-icon.png`
   - The rounded square with just the lightning bolt
   - Will be used for icon-only views

### Step 2: Commit and Deploy

```bash
cd /Users/chrisrobertson/Desktop/synqforge
git add public/logo-*.png
git commit -m "feat: Add official SynqForge logo PNG assets"
git push clean main
```

### Step 3: Verify

Once deployed, check:
- ✅ Sidebar shows your logo
- ✅ Logo switches between light/dark themes
- ✅ Icon-only mode works in compact views

---

## Alternative: Use SVG (Recommended)

If you want better scaling, convert the PNGs to SVG:

### Option A: Online Converter
1. Go to https://convertio.co/png-svg/
2. Upload each PNG
3. Download as SVG
4. Save as:
   - `logo-light.svg`
   - `logo-dark.svg`
   - `logo-icon.svg`

### Option B: Command Line (requires ImageMagick)
```bash
cd /Users/chrisrobertson/Desktop/synqforge/public

# Convert PNGs to SVG (if you have installed them)
convert logo-light.png logo-light.svg
convert logo-dark.png logo-dark.svg
convert logo-icon.png logo-icon.svg
```

Then update `components/synqforge-logo.tsx` to use `.svg` instead of `.png`

---

## 🔧 Component is Already Updated

The `SynqForgeLogo` component now:
- ✅ Supports PNG images
- ✅ Auto-switches light/dark themes
- ✅ Shows icon-only when `showText={false}`
- ✅ Ready to use once images are saved

---

## ⚡ Favicon Updated

I've already updated the favicon to use just the lightning bolt icon:
- `public/favicon.svg` - Lightning bolt only
- Will show in browser tabs

---

## 📍 Current Status

- ✅ Component updated to use PNG logos
- ✅ Favicon created with lightning bolt
- ⏳ **Action Required**: Save the 3 PNG files to `public/` folder
- ⏳ **Action Required**: Commit and push to deploy

---

## Need Help?

If the images don't load after saving:
1. Clear browser cache
2. Check image names match exactly (case-sensitive)
3. Verify images are in `/Users/chrisrobertson/Desktop/synqforge/public/`
4. Check Next.js console for image loading errors



