# Epic 403 Forbidden Error - Troubleshooting Guide

This guide will help you diagnose and fix the `403 Forbidden` error when accessing epics.

## 🔍 Understanding the Issue

When you see this error:
```
GET https://synqforge.com/api/epics/j6as6epx1yowhx7d4i5n0 403 (Forbidden)
```

It means the epic exists, but your user account doesn't have permission to access it. This usually happens when:

1. **The epic has no `organizationId`** (most common cause)
2. **The epic's `organizationId` doesn't match your user's `organizationId`**
3. **There was a data migration issue during development**

---

## 📋 Step-by-Step Resolution

### Step 1: Run the Diagnostic Script

First, let's diagnose the exact issue. Copy the epic ID from the error message and run:

```bash
node scripts/diagnose-epic-access.mjs j6as6epx1yowhx7d4i5n0
```

Replace `j6as6epx1yowhx7d4i5n0` with your actual epic ID.

**What this does:**
- Checks if the epic exists
- Shows the epic's organization ID (or if it's missing)
- Shows your organization details
- Identifies any mismatches
- Provides specific recommendations

**Example Output:**

```
🔍 Diagnosing Epic Access Issue...

Epic ID: j6as6epx1yowhx7d4i5n0

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Step 1: Checking if epic exists...
✅ Epic found!
   Title: "Mobile Password Reset Flow"
   Organization ID: NULL ⚠️
   Project ID: proj_abc123
   Created By: user_xyz789
   Created At: 2025-10-14T12:30:00.000Z

⚠️  WARNING: Epic has no organizationId!
   This is the root cause of the 403 error.

...
```

---

### Step 2: Note the Organization ID

The diagnostic script will show you:
1. All organizations in your database
2. The suggested organization ID (usually from the creator or project)

**Example:**
```
Found 1 organization(s):
   1. Acme Corp (ID: org_abc123def456)

Suggested organization ID (from creator): org_abc123def456
```

**Important:** Copy this organization ID - you'll need it in the next step!

---

### Step 3: Run the Fix Script

Now that you know the correct organization ID, fix the epic:

```bash
node scripts/fix-epic-organization.mjs j6as6epx1yowhx7d4i5n0 org_abc123def456
```

Replace with:
- Your epic ID (first argument)
- Your organization ID (second argument)

**What this does:**
- Verifies the epic and organization exist
- Updates the epic's `organizationId`
- Confirms the update was successful

**Example Output:**

```
🔧 Fixing Epic Organization ID...

Epic ID: j6as6epx1yowhx7d4i5n0
New Organization ID: org_abc123def456

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Step 1: Verifying epic exists...
✅ Epic found!
   Title: "Mobile Password Reset Flow"
   Current Org ID: NULL

📋 Step 2: Verifying organization exists...
✅ Organization found!
   Name: "Acme Corp"

📋 Step 4: Updating epic organization ID...
✅ Epic updated successfully!

✅ FIX COMPLETE!

The epic should now be accessible to users in organization: Acme Corp
```

---

### Step 4: Verify the Fix

1. **Refresh your browser** (or clear the cache)
2. **Try accessing the epic again** in your app
3. The 403 error should be gone!

If you still see the error:
- Make sure you're logged in with a user in the correct organization
- Check your browser console for any new errors
- Re-run the diagnostic script to verify the fix was applied

---

## 🔧 Advanced: Fixing Multiple Epics

If you have multiple epics with this issue, you can create a batch fix script:

```bash
# Create a file with all epic IDs
echo "j6as6epx1yowhx7d4i5n0
k7bt7fqy2zpxiy8e5j6o1
l8cu8grz3aqyjz9f6k7p2" > epic-ids.txt

# Fix them all (replace ORG_ID with your organization ID)
while read epic_id; do
  node scripts/fix-epic-organization.mjs "$epic_id" "org_abc123def456"
done < epic-ids.txt
```

---

## ⚠️ Common Issues & Solutions

### Issue: "Epic not found"
**Solution:** Double-check the epic ID. It might have been deleted or the ID is incorrect.

### Issue: "Organization not found"
**Solution:** Verify the organization ID is correct. Run:
```bash
# List all organizations
node -e "
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './lib/db/schema.js';
const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });
const orgs = await db.select().from(schema.organizations);
console.log(orgs);
"
```

### Issue: "Organization ID mismatch with project"
**Solution:** This might be intentional, but usually you want the epic's organization to match its project's organization. Consider updating the project's organization ID instead.

---

## 🛠️ Prevention

To prevent this issue in the future:

1. **Always create epics through a project** - This ensures the `organizationId` is automatically set
2. **Use the API** - Don't manually insert epics into the database
3. **Database constraints** - Consider adding a NOT NULL constraint on the `organizationId` column

---

## 📞 Still Need Help?

If you're still experiencing issues after following this guide:

1. Run the diagnostic script and save the full output
2. Check the application logs for any related errors
3. Verify your user session has the correct `organizationId`
4. Create an issue with:
   - The epic ID
   - The full diagnostic output
   - Any error messages from your browser console

---

## 🎯 Quick Reference

```bash
# Diagnose the issue
node scripts/diagnose-epic-access.mjs <EPIC_ID>

# Fix the issue
node scripts/fix-epic-organization.mjs <EPIC_ID> <ORG_ID>

# Example
node scripts/diagnose-epic-access.mjs j6as6epx1yowhx7d4i5n0
node scripts/fix-epic-organization.mjs j6as6epx1yowhx7d4i5n0 org_abc123def456
```

---

**Last Updated:** October 15, 2025
**Version:** 1.0
