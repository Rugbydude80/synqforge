# Logo Images - Manual Save Required

The user has provided 3 logo images that need to be saved manually:

## Required Actions:

### 1. Light Mode Logo (logo-light.png or logo-light.svg)
- Image: Logo with dark "Synq" text + purple "Forge" on light background
- Save to: `/Users/chrisrobertson/Desktop/synqforge/public/logo-light.png`
- OR convert to SVG and save as `logo-light.svg`

### 2. Dark Mode Logo (logo-dark.png or logo-dark.svg)
- Image: Logo with white "Synq" text + purple "Forge" on dark background
- Save to: `/Users/chrisrobertson/Desktop/synqforge/public/logo-dark.png`
- OR convert to SVG and save as `logo-dark.svg`

### 3. App Icon (logo-icon.png)
- Image: Dark rounded square with white lightning bolt
- Save to: `/Users/chrisrobertson/Desktop/synqforge/public/logo-icon.png`
- This will be used for the icon-only view

## Component Updates Needed:

Once images are saved, update `components/synqforge-logo.tsx`:

```typescript
// Change from .svg to .png (or keep .svg if converted)
const logoSrc = theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'
```

## Favicon:
I've created a simplified lightning bolt favicon at `/public/favicon.svg`

---

**Note**: I cannot directly save the images you've uploaded, but I've created the structure and updated the favicon. Please save the 3 logo images to the paths above and the component will work perfectly.
