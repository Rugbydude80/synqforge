/**
 * Export utilities for CSV and other formats
 */

export function downloadCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    throw new Error('No data to export')
  }

  // Get headers from first object
  const headers = Object.keys(data[0])
  
  // Build CSV content
  const csvRows = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        // Escape quotes and wrap in quotes if contains comma or newline
        if (value === null || value === undefined) return ''
        const stringValue = String(value)
        if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      }).join(',')
    )
  ]

  const csvContent = csvRows.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

export function exportStoriesToCSV(stories: any[], projectName?: string) {
  const data = stories.map(story => ({
    ID: story.id,
    Title: story.title,
    Description: story.description || '',
    Status: story.status || '',
    Priority: story.priority || '',
    'Story Points': story.storyPoints || '',
    'Story Type': story.storyType || '',
    'Assigned To': story.assignedTo || '',
    Tags: Array.isArray(story.tags) ? story.tags.join('; ') : '',
    'Created At': story.createdAt ? new Date(story.createdAt).toLocaleDateString() : '',
    'Updated At': story.updatedAt ? new Date(story.updatedAt).toLocaleDateString() : '',
  }))

  const filename = projectName 
    ? `${projectName}-stories-${new Date().toISOString().split('T')[0]}.csv`
    : `stories-${new Date().toISOString().split('T')[0]}.csv`

  downloadCSV(data, filename)
}

export function exportProjectsToCSV(projects: any[]) {
  const data = projects.map(project => ({
    ID: project.id,
    Name: project.name,
    Description: project.description || '',
    Status: project.status || '',
    'Client': project.clientName || '',
    'Owner': project.ownerName || '',
    'Created At': project.createdAt ? new Date(project.createdAt).toLocaleDateString() : '',
    'Updated At': project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : '',
  }))

  const filename = `projects-${new Date().toISOString().split('T')[0]}.csv`
  downloadCSV(data, filename)
}

export function exportEpicsToCSV(epics: any[], projectName?: string) {
  const data = epics.map(epic => ({
    ID: epic.id,
    Title: epic.title,
    Description: epic.description || '',
    Status: epic.status || '',
    Priority: epic.priority || '',
    'Start Date': epic.startDate ? new Date(epic.startDate).toLocaleDateString() : '',
    'Target Date': epic.targetDate ? new Date(epic.targetDate).toLocaleDateString() : '',
    'Progress': `${epic.progressPct || 0}%`,
    'Created At': epic.createdAt ? new Date(epic.createdAt).toLocaleDateString() : '',
  }))

  const filename = projectName
    ? `${projectName}-epics-${new Date().toISOString().split('T')[0]}.csv`
    : `epics-${new Date().toISOString().split('T')[0]}.csv`

  downloadCSV(data, filename)
}

