import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';

/**
 * POST /api/projects/[projectId]/files/process-and-analyze
 * Upload file, extract content, analyze with AI, and optionally create epics/stories
 *
 * TODO: Implement file upload and analysis functionality
 */
export const POST = withAuth(
  async (_req: NextRequest, _context: any) => {
    return NextResponse.json(
      { error: 'File upload and analysis not yet implemented' },
      { status: 501 }
    );
  }
);
