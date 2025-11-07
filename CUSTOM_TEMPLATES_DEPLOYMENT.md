# Custom Document Templates - Deployment Guide

## ✅ Implementation Complete

All code has been implemented and tested. The build passes successfully.

## 📋 Deployment Steps

### Step 1: Run Database Migration

**Option A - Via Vercel CLI (Recommended):**

```bash
# Pull production environment
vercel env pull .env.production

# Run migration
source .env.production
psql "$DATABASE_URL" -f db/migrations/0014_add_custom_document_templates.sql
```

**Option B - Via Neon Console:**

1. Go to: https://console.neon.tech
2. Select your SynqForge database
3. Open "SQL Editor"
4. Copy and paste contents of: `db/migrations/0014_add_custom_document_templates.sql`
5. Click "Run"

**What this migration does:**
- Creates `custom_document_templates` table
- Adds indexes for performance
- Creates trigger for automatic `updated_at` timestamp updates
- Safe operation - only adds new table, doesn't modify existing data

### Step 2: Deploy Code

The code is ready to deploy. Push to your main branch:

```bash
git add .
git commit -m "feat: Add custom document template upload feature"
git push origin main
```

Vercel will auto-deploy when you push to GitHub.

## 🎯 Features Added

### API Endpoints
- `POST /api/custom-templates` - Upload template (Pro/Team/Enterprise only)
- `GET /api/custom-templates` - List templates
- `GET /api/custom-templates/[templateId]` - Get template details
- `PATCH /api/custom-templates/[templateId]` - Update template
- `DELETE /api/custom-templates/[templateId]` - Delete template

### Components
- `CustomTemplateSelector` - Dropdown for selecting templates in story generation
- `CustomTemplateManager` - Full UI for managing templates

### Integration
- Story generation (`/api/ai/generate-stories`) now accepts `customTemplateId` parameter
- Custom templates enhance AI prompts to match uploaded format

## 🔒 Security & Access Control

- **Tier Gating**: Custom templates require Pro, Team, or Enterprise subscription
- **Organization Isolation**: Templates are scoped to organizations
- **File Validation**: Only PDF, DOCX, TXT, MD files up to 10MB
- **Access Control**: Users can only access templates from their organization

## 📝 Usage

### For Users:

1. **Upload Template**: Go to Settings → Custom Templates → Upload Template
2. **Select Template**: When generating stories, choose your custom template from dropdown
3. **Generate Stories**: Stories will match your uploaded template format

### For Developers:

```typescript
// In story generation form
<CustomTemplateSelector
  value={selectedTemplateId}
  onChange={setSelectedTemplateId}
/>

// When generating stories
const response = await fetch('/api/ai/generate-stories', {
  method: 'POST',
  body: JSON.stringify({
    requirements: '...',
    projectId: '...',
    customTemplateId: selectedTemplateId, // Optional
  }),
})
```

## ✅ Verification

After deployment:

1. **Check Migration**: Verify table exists
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_name = 'custom_document_templates';
   ```

2. **Test Upload**: Upload a sample template document
3. **Test Generation**: Generate stories with custom template selected
4. **Verify Format**: Check that generated stories match template format

## 🐛 Troubleshooting

### Migration Fails
- Check database connection string
- Verify PostgreSQL version supports JSONB
- Check for existing table conflicts

### Template Upload Fails
- Verify subscription tier is Pro/Team/Enterprise
- Check file size (max 10MB)
- Verify file type is PDF, DOCX, TXT, or MD

### Stories Don't Match Format
- Check that template was parsed correctly
- Verify template format JSON in database
- Review AI prompt enhancement logs

## 📦 Files Changed

### New Files
- `db/migrations/0014_add_custom_document_templates.sql`
- `lib/repositories/custom-document-templates.repository.ts`
- `lib/services/custom-template-parser.service.ts`
- `app/api/custom-templates/route.ts`
- `app/api/custom-templates/[templateId]/route.ts`
- `components/ai/custom-template-manager.tsx`

### Modified Files
- `lib/db/schema.ts` - Added `customDocumentTemplates` table
- `lib/validations/ai.ts` - Added `customTemplateId` field
- `lib/services/ai.service.ts` - Added custom template support
- `app/api/ai/generate-stories/route.ts` - Integrated custom templates

## 🚀 Ready to Deploy!

All code is tested, type-checked, and ready for production deployment.


