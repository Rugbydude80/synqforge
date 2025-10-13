/**
 * Export utilities for projects and stories
 * Supports Excel, Word (DOCX), and PDF formats
 */

import * as XLSX from 'xlsx'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } from 'docx'
import PDFDocument from 'pdfkit'

// ============================================
// TYPES
// ============================================

export interface ExportProject {
  id: string
  name: string
  description?: string
  status: string
  createdAt: string
  totalStories: number
  completedStories: number
  totalEpics: number
}

export interface ExportStory {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  storyPoints?: number
  acceptanceCriteria?: string[]
  assignedTo?: string
  epicTitle?: string
  projectName?: string
  createdAt: string
}

// ============================================
// EXCEL EXPORT
// ============================================

export function exportProjectsToExcel(projects: ExportProject[]): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(
    projects.map(p => ({
      'Project Name': p.name,
      'Description': p.description || '',
      'Status': p.status,
      'Total Stories': p.totalStories,
      'Completed Stories': p.completedStories,
      'Total Epics': p.totalEpics,
      'Created At': new Date(p.createdAt).toLocaleDateString(),
    }))
  )

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Projects')

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}

export function exportStoriesToExcel(stories: ExportStory[]): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(
    stories.map(s => ({
      'Title': s.title,
      'Description': s.description || '',
      'Status': s.status,
      'Priority': s.priority,
      'Story Points': s.storyPoints || '',
      'Assigned To': s.assignedTo || '',
      'Epic': s.epicTitle || '',
      'Project': s.projectName || '',
      'Acceptance Criteria': s.acceptanceCriteria?.join('; ') || '',
      'Created At': new Date(s.createdAt).toLocaleDateString(),
    }))
  )

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Stories')

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}

// ============================================
// WORD (DOCX) EXPORT
// ============================================

export async function exportProjectsToDocx(projects: ExportProject[]): Promise<Buffer> {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: 'Projects Export',
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          text: `Generated on ${new Date().toLocaleDateString()}`,
          spacing: { after: 400 },
        }),
        ...projects.flatMap(project => [
          new Paragraph({
            text: project.name,
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Description: ', bold: true }),
              new TextRun(project.description || 'No description'),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Status: ', bold: true }),
              new TextRun(project.status),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Total Stories: ', bold: true }),
              new TextRun(String(project.totalStories)),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Completed Stories: ', bold: true }),
              new TextRun(String(project.completedStories)),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Total Epics: ', bold: true }),
              new TextRun(String(project.totalEpics)),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Created At: ', bold: true }),
              new TextRun(new Date(project.createdAt).toLocaleDateString()),
            ],
            spacing: { after: 400 },
          }),
        ]),
      ],
    }],
  })

  return await Packer.toBuffer(doc)
}

export async function exportStoriesToDocx(stories: ExportStory[]): Promise<Buffer> {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: 'Stories Export',
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          text: `Generated on ${new Date().toLocaleDateString()}`,
          spacing: { after: 400 },
        }),
        ...stories.flatMap(story => [
          new Paragraph({
            text: story.title,
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Description: ', bold: true }),
              new TextRun(story.description || 'No description'),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Status: ', bold: true }),
              new TextRun(story.status),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Priority: ', bold: true }),
              new TextRun(story.priority),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Story Points: ', bold: true }),
              new TextRun(story.storyPoints ? String(story.storyPoints) : 'Not set'),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Assigned To: ', bold: true }),
              new TextRun(story.assignedTo || 'Unassigned'),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Epic: ', bold: true }),
              new TextRun(story.epicTitle || 'No epic'),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Project: ', bold: true }),
              new TextRun(story.projectName || 'Unknown'),
            ],
          }),
          ...(story.acceptanceCriteria && story.acceptanceCriteria.length > 0
            ? [
                new Paragraph({
                  text: 'Acceptance Criteria:',
                  bold: true,
                }),
                ...story.acceptanceCriteria.map(
                  criteria =>
                    new Paragraph({
                      text: `• ${criteria}`,
                    })
                ),
              ]
            : []),
          new Paragraph({
            children: [
              new TextRun({ text: 'Created At: ', bold: true }),
              new TextRun(new Date(story.createdAt).toLocaleDateString()),
            ],
            spacing: { after: 400 },
          }),
        ]),
      ],
    }],
  })

  return await Packer.toBuffer(doc)
}

// ============================================
// PDF EXPORT
// ============================================

export function exportProjectsToPdf(projects: ExportProject[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument()
    const chunks: Buffer[] = []

    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Title
    doc.fontSize(24).text('Projects Export', { align: 'center' })
    doc.fontSize(12).text(`Generated on ${new Date().toLocaleDateString()}`, { align: 'center' })
    doc.moveDown(2)

    // Projects
    projects.forEach((project, index) => {
      if (index > 0) doc.addPage()

      doc.fontSize(18).text(project.name, { underline: true })
      doc.moveDown(0.5)

      doc.fontSize(12)
      doc.text(`Description: ${project.description || 'No description'}`)
      doc.text(`Status: ${project.status}`)
      doc.text(`Total Stories: ${project.totalStories}`)
      doc.text(`Completed Stories: ${project.completedStories}`)
      doc.text(`Total Epics: ${project.totalEpics}`)
      doc.text(`Created At: ${new Date(project.createdAt).toLocaleDateString()}`)
    })

    doc.end()
  })
}

export function exportStoriesToPdf(stories: ExportStory[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument()
    const chunks: Buffer[] = []

    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Title
    doc.fontSize(24).text('Stories Export', { align: 'center' })
    doc.fontSize(12).text(`Generated on ${new Date().toLocaleDateString()}`, { align: 'center' })
    doc.moveDown(2)

    // Stories
    stories.forEach((story, index) => {
      if (index > 0 && index % 3 === 0) doc.addPage()

      doc.fontSize(16).text(story.title, { underline: true })
      doc.moveDown(0.5)

      doc.fontSize(11)
      doc.text(`Description: ${story.description || 'No description'}`)
      doc.text(`Status: ${story.status}`)
      doc.text(`Priority: ${story.priority}`)
      doc.text(`Story Points: ${story.storyPoints || 'Not set'}`)
      doc.text(`Assigned To: ${story.assignedTo || 'Unassigned'}`)
      doc.text(`Epic: ${story.epicTitle || 'No epic'}`)
      doc.text(`Project: ${story.projectName || 'Unknown'}`)

      if (story.acceptanceCriteria && story.acceptanceCriteria.length > 0) {
        doc.text('Acceptance Criteria:')
        story.acceptanceCriteria.forEach(criteria => {
          doc.text(`  • ${criteria}`)
        })
      }

      doc.text(`Created At: ${new Date(story.createdAt).toLocaleDateString()}`)
      doc.moveDown(1.5)
    })

    doc.end()
  })
}
