# 🗄️ Database Setup Guide - Create Organization & Link User

## Quick Setup (2 minutes)

This will create an organization and link your user to fix the 500 errors.

---

## Step 1: Get Your Production Database Credentials

You have two options:

### **Option A: Use Vercel CLI** (Recommended)

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Pull environment variables from production
vercel env pull .env.local

# This will download DATABASE_URL and other env vars
```

### **Option B: Copy from Vercel Dashboard**

1. Go to https://vercel.com/dashboard
2. Click your **synqforge** project
3. Go to **Settings** → **Environment Variables**
4. Copy `DATABASE_URL` value
5. Create/update `.env.local`:
   ```
   DATABASE_URL="your-neon-url-here"
   ```

---

## Step 2: Run the Setup Script

Replace `your@email.com` with the email you use to log into synqforge.com:

```bash
npx tsx scripts/setup-user-organization.ts your@email.com
```

**Example:**
```bash
npx tsx scripts/setup-user-organization.ts chris@example.com
```

---

## Expected Output

You should see:

```
🚀 Starting user and organization setup...

📧 Looking for user: your@email.com
✅ Found user: user_xxxxx
   Name: Your Name
   Current Org ID: None

📝 Creating new organization...
✅ Created organization: org_xxxxx
   Name: Your Name's Organization
   Slug: your-name-s-organization
   Plan: free
   Trial Ends: [date]

🔗 Linking user to organization...
✅ User linked to organization!

🎉 Setup complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Final Status:
   User Email: your@email.com
   User Role: owner
   Organization ID: org_xxxxx
   Organization Name: Your Name's Organization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ You can now use the app without 500 errors!
🌐 Visit: https://synqforge.com
```

---

## Step 3: Test Your Site

1. **Wait 30 seconds** for any caching to clear
2. Go to https://synqforge.com
3. **Hard refresh**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
4. The 500 errors should be gone! ✅

---

## Troubleshooting

### Error: "User not found"

**Problem:** You haven't signed in yet, so the user doesn't exist in the database.

**Solution:**
1. Go to https://synqforge.com
2. Sign in with Google/GitHub (this creates the user)
3. Then run the script again

---

### Error: "Connection refused" or "Database error"

**Problem:** Database credentials are incorrect or missing.

**Solution:**
1. Check `.env.local` has correct `DATABASE_URL`
2. Make sure you pulled from production: `vercel env pull .env.local`
3. Verify Neon database is accessible from your IP

---

### Error: "ENOENT: no such file or directory"

**Problem:** Script can't find database module.

**Solution:**
```bash
# Make sure dependencies are installed
npm install

# Try again
npx tsx scripts/setup-user-organization.ts your@email.com
```

---

### Script runs but still getting 500 errors

**Problem:** Changes not deployed to production yet.

**Solution:**
1. The script only updates the database
2. Make sure your code is deployed (you did this earlier with `git push`)
3. Wait 2-3 minutes for Vercel deployment
4. Hard refresh the browser

---

## What This Script Does

1. ✅ Finds your user by email
2. ✅ Creates a new organization with:
   - Name: "[Your Name]'s Organization"
   - Plan: Free
   - 14-day trial
   - Active subscription status
3. ✅ Links your user to the organization
4. ✅ Sets your role as "owner"

After this, the APIs will work because your user now has an `organizationId`!

---

## Alternative: Manual Database Update

If you prefer to do it manually via SQL:

### Connect to Neon Database:
```bash
# Get your DATABASE_URL from Vercel
vercel env pull .env.local

# Or copy it and use psql/pgAdmin
```

### Run SQL:
```sql
-- 1. Create organization
INSERT INTO organizations (
  id, name, slug, plan, "subscriptionStatus", 
  "subscriptionTier", "trialEndsAt", "createdAt", "updatedAt"
) VALUES (
  'org_' || gen_random_uuid(),
  'My Organization',
  'my-organization',
  'free',
  'active',
  'free',
  NOW() + INTERVAL '14 days',
  NOW(),
  NOW()
) RETURNING id;

-- 2. Link your user (replace EMAIL and ORG_ID)
UPDATE users 
SET 
  "organizationId" = 'org_xxxxx-from-above',
  role = 'owner',
  "updatedAt" = NOW()
WHERE email = 'your@email.com';

-- 3. Verify
SELECT 
  u.email, 
  u.role, 
  u."organizationId",
  o.name as org_name
FROM users u
LEFT JOIN organizations o ON o.id = u."organizationId"
WHERE u.email = 'your@email.com';
```

---

## Summary

```bash
# Quick 3-step fix:
vercel env pull .env.local
npx tsx scripts/setup-user-organization.ts your@email.com
# Visit https://synqforge.com and refresh!
```

That's it! 🎉

---

## Need Help?

If you're stuck, let me know and I can:
1. Help debug the script output
2. Create a simpler SQL-only approach
3. Set up a different method

The script is safe - it only creates data, never deletes anything!

