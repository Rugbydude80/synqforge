/**
 * Centralized URL builders for consistent deep linking across the application.
 * Use these helpers to ensure notifications, emails, and navigation stay in sync.
 */

/**
 * Get the canonical URL for a story detail page
 */
export const storyUrl = (storyId: string): string => `/stories/${storyId}`

/**
 * Get the URL for a project detail page
 */
export const projectUrl = (projectId: string): string => `/projects/${projectId}`

/**
 * Get the URL for an epic detail page
 */
export const epicUrl = (projectId: string, epicId: string): string =>
  `/projects/${projectId}/epics/${epicId}`

/**
 * Get the URL for a story within project context (with optional hash)
 */
export const projectStoryUrl = (projectId: string, storyId: string, hash?: string): string => {
  const base = `/projects/${projectId}?story=${storyId}`
  return hash ? `${base}#${hash}` : base
}

/**
 * Get the URL for a comment on a story
 */
export const storyCommentUrl = (storyId: string, commentId: string): string =>
  `${storyUrl(storyId)}#comment-${commentId}`
