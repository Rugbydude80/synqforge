import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { getTemplateMetadata } from '@/lib/ai/prompt-templates';

/**
 * GET /api/ai/prompt-templates
 * 
 * Returns available prompt template metadata (safe to send to client)
 * NEVER includes actual system prompts
 */
async function getPromptTemplates(_req: NextRequest, context: AuthContext) {
  try {
    const isAdmin = context.user.role === 'admin' || context.user.role === 'owner';
    
    // Get only the metadata (name, description, icon) - NO system prompts
    const templates = getTemplateMetadata(isAdmin);
    
    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error('Error fetching prompt templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompt templates' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getPromptTemplates);

