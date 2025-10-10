/**
 * Mention Parser Utilities
 * Handles @mention extraction and rendering
 */

/**
 * Extract @mentions from comment text
 * @example
 * extractMentions("Hey @john, can you review @jane's work?")
 * // Returns: ["john", "jane"]
 */
export function extractMentions(content: string): string[] {
  const mentionRegex = /@(\w+)/g
  const matches = content.matchAll(mentionRegex)
  const mentions = Array.from(matches, (m) => m[1])

  // Remove duplicates
  return Array.from(new Set(mentions))
}

/**
 * Check if content contains mentions
 */
export function hasMentions(content: string): boolean {
  return /@\w+/.test(content)
}

/**
 * Replace @mentions with user links
 * @example
 * replaceMentionsWithLinks("Hey @john", (username) => `/users/${username}`)
 * // Returns: "Hey <a href='/users/john'>@john</a>"
 */
export function replaceMentionsWithLinks(
  content: string,
  getLinkFn: (username: string) => string
): string {
  return content.replace(/@(\w+)/g, (_match, username) => {
    const link = getLinkFn(username)
    return `<a href="${link}" class="text-blue-600 hover:underline font-medium">@${username}</a>`
  })
}

/**
 * Validate mention format
 */
export function isValidMention(mention: string): boolean {
  return /^@\w+$/.test(mention)
}

/**
 * Parse content into parts (text and mentions)
 * Useful for React rendering
 */
export interface ContentPart {
  type: 'text' | 'mention'
  value: string
}

export function parseContentParts(content: string): ContentPart[] {
  const parts: ContentPart[] = []
  const mentionRegex = /@\w+/g

  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = mentionRegex.exec(content)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        value: content.slice(lastIndex, match.index),
      })
    }

    // Add mention
    parts.push({
      type: 'mention',
      value: match[0],
    })

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      value: content.slice(lastIndex),
    })
  }

  return parts
}

/**
 * Highlight mentions in text (for search/preview)
 */
export function highlightMentions(
  content: string,
  highlightClass: string = 'bg-blue-100 text-blue-800'
): string {
  return content.replace(
    /@(\w+)/g,
    `<span class="${highlightClass}">@$1</span>`
  )
}

/**
 * Get mention count in content
 */
export function getMentionCount(content: string): number {
  return extractMentions(content).length
}

/**
 * Check if user is mentioned in content
 */
export function isUserMentioned(content: string, username: string): boolean {
  const mentions = extractMentions(content)
  return mentions.includes(username)
}
