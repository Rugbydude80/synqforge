#!/bin/bash
# Generate encryption key for GDPR compliance
# Run this once and add to Vercel environment variables

echo "🔐 Generating AES-256 Encryption Key for Production"
echo "===================================================="

# Generate 32-byte (256-bit) random key
KEY=$(openssl rand -hex 32)

echo ""
echo "✅ Generated encryption key:"
echo ""
echo "ENCRYPTION_KEY_V1=$KEY"
echo ""
echo "===================================================="
echo "⚠️  IMPORTANT: Add this to Vercel production environment"
echo ""
echo "Steps:"
echo "1. Go to: https://vercel.com/dashboard → Your Project → Settings → Environment Variables"
echo "2. Add new variable:"
echo "   Name: ENCRYPTION_KEY_V1"
echo "   Value: $KEY"
echo "   Environment: Production (only)"
echo ""
echo "3. Keep this key SECRET and SECURE"
echo "4. Never commit this key to git"
echo "5. Store backup in password manager (1Password/LastPass)"
echo ""
echo "🔄 Key Rotation Schedule:"
echo "- Rotate keys every 90 days"
echo "- Create ENCRYPTION_KEY_V2, migrate data, then retire V1"
echo ""
echo "===================================================="

