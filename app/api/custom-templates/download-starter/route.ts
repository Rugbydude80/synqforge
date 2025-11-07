import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

/**
 * GET /api/custom-templates/download-starter
 * Download the starter template file
 */
export async function GET() {
  try {
    // Read the starter template file
    const templatePath = join(process.cwd(), 'public', 'templates', 'synqforge-starter-template.md')
    const templateContent = await readFile(templatePath, 'utf-8')
    
    // Return as downloadable file
    return new NextResponse(templateContent, {
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': 'attachment; filename="synqforge-starter-template.md"',
      },
    })
  } catch (error) {
    console.error('Error serving starter template:', error)
    return NextResponse.json(
      { error: 'Failed to download starter template' },
      { status: 500 }
    )
  }
}

