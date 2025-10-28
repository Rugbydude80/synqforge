import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { getTemplateMetadata } from '@/lib/ai/prompt-templates';

/**
 * GET /api/admin/prompt-templates
 * 
 * Admin-only endpoint to view all template metadata including admin-tier templates
 * SECURITY: Still never exposes actual system prompts
 */
async function getAdminPromptTemplates(_req: NextRequest, context: AuthContext) {
  try {
    // Check if user is admin
    const isAdmin = context.user.role === 'admin' || context.user.role === 'owner';
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }
    
    // Get all templates including admin-tier ones
    const templates = getTemplateMetadata(true);
    
    return NextResponse.json({
      success: true,
      templates,
      note: 'Template prompts are server-side only and never exposed via API'
    });
  } catch (error) {
    console.error('Error fetching admin prompt templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompt templates' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getAdminPromptTemplates);

