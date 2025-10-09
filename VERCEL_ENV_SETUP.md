# Vercel Environment Variables Setup

## 🚀 Required Environment Variables for Production

To enable password reset functionality on https://synqforge.com, update these environment variables in your Vercel project settings:

### 1. Go to Vercel Dashboard
1. Navigate to: https://vercel.com/dashboard
2. Select your **synqforge** project
3. Go to **Settings** → **Environment Variables**

### 2. Add/Update These Variables

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `RESEND_API_KEY` | `re_6nWErpzF_EqWvPizSKzbZm21LxkFhgEaq` | Production, Preview, Development |
| `EMAIL_FROM` | `SynqForge <noreply@updates.synqforge.com>` | Production, Preview, Development |
| `NEXTAUTH_URL` | `https://synqforge.com` | Production |
| `NEXTAUTH_SECRET` | `KADHhVTWB5RWAV4aY90Rw+H1I+RMT6L9J3SUAV6FuJk=` | Production, Preview, Development |

### 3. Redeploy Your Application

After adding the environment variables:
1. Go to **Deployments** tab
2. Click the **⋯** menu on the latest deployment
3. Click **Redeploy**
4. Select **Use existing Build Cache** (optional, faster)
5. Click **Redeploy**

### 4. Test Password Reset

Once redeployed:
1. Go to https://synqforge.com/auth/signin
2. Click **"Forgot password?"**
3. Enter your email address
4. Check your inbox for the reset email from `noreply@updates.synqforge.com`
5. Click the reset link and set a new password

---

## ✅ Verification Checklist

- [ ] Resend API key added to Vercel
- [ ] Email FROM address updated to use verified domain
- [ ] NEXTAUTH_URL set to production domain
- [ ] NEXTAUTH_SECRET configured
- [ ] Application redeployed
- [ ] Password reset tested successfully
- [ ] Email received and link works

---

## 📧 Domain Verification Status

✅ **Domain:** updates.synqforge.com  
✅ **Status:** Verified  
✅ **Region:** eu-west-1 (Ireland)  
✅ **DNS Records:** All verified  
✅ **MX Record:** Configured  
✅ **SPF Record:** Configured  
✅ **DKIM Record:** Configured  
✅ **DMARC Record:** Configured  

Your domain is fully configured and ready to send emails! 🎉

---

## 🐛 Troubleshooting

### Emails Not Arriving

1. **Check Vercel Logs:**
   - Go to Vercel Dashboard → Deployments → View Function Logs
   - Look for errors related to Resend API calls

2. **Check Resend Dashboard:**
   - Go to https://resend.com/logs
   - Verify emails are being sent
   - Check delivery status

3. **Check Spam Folder:**
   - Password reset emails might be filtered
   - Mark as "Not Spam" to train filters

4. **Verify Environment Variables:**
   - Ensure all variables are set for Production environment
   - Check for typos in email address

### Reset Link Not Working

- Token expires after 1 hour
- Tokens can only be used once
- Request a new reset link if needed

---

## 📚 Additional Resources

- [Resend Dashboard](https://resend.com/overview)
- [Resend Email Logs](https://resend.com/logs)
- [Vercel Environment Variables Docs](https://vercel.com/docs/environment-variables)
- [Password Reset Setup Guide](./SETUP_GUIDE.md)
