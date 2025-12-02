'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface SearchResult {
  id: string
  type: 'story' | 'epic' | 'project' | 'task'
  title: string
  description?: string
  projectName?: string
  status?: string
}

export function QuickSearch() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = React.useState(false)
  const [selectedIndex, setSelectedIndex] = React.useState(0)

  // Keyboard shortcut
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === '/' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  // Search with debounce
  React.useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([])
      return
    }

    setIsSearching(true)
    const timeoutId = setTimeout(async () => {
      try {
        // Search across stories, epics, projects
        const [storiesRes, epicsRes, projectsRes] = await Promise.all([
          fetch(`/api/stories?search=${encodeURIComponent(query)}&limit=5`).then(r => r.ok ? r.json() : { data: [] }),
          fetch(`/api/epics?search=${encodeURIComponent(query)}&limit=5`).then(r => r.ok ? r.json() : { data: [] }),
          fetch(`/api/projects?search=${encodeURIComponent(query)}&limit=5`).then(r => r.ok ? r.json() : { data: [] }),
        ])

        const searchResults: SearchResult[] = [
          ...storiesRes.data.map((s: any) => ({
            id: s.id,
            type: 'story' as const,
            title: s.title,
            description: s.description,
            projectName: s.project?.name,
            status: s.status,
          })),
          ...epicsRes.data.map((e: any) => ({
            id: e.id,
            type: 'epic' as const,
            title: e.title,
            description: e.description,
            projectName: e.project?.name,
            status: e.status,
          })),
          ...projectsRes.data.map((p: any) => ({
            id: p.id,
            type: 'project' as const,
            title: p.name,
            description: p.description,
            status: p.status,
          })),
        ]

        setResults(searchResults)
        setSelectedIndex(0)
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query])

  const handleSelect = (result: SearchResult) => {
    setOpen(false)
    setQuery('')
    
    if (result.type === 'story') {
      router.push(`/stories/${result.id}`)
    } else if (result.type === 'epic') {
      router.push(`/epics?epicId=${result.id}`)
    } else if (result.type === 'project') {
      router.push(`/projects/${result.id}`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault()
      handleSelect(results[selectedIndex])
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'story': return 'bg-blue-500/10 text-blue-400'
      case 'epic': return 'bg-purple-500/10 text-purple-400'
      case 'project': return 'bg-green-500/10 text-green-400'
      default: return 'bg-gray-500/10 text-gray-400'
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground border border-border rounded-lg hover:border-purple-500/50 transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Quick Search...</span>
        <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>/
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0">
          <div className="flex items-center border-b px-4">
            <Search className="h-4 w-4 shrink-0 opacity-50" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search stories, epics, projects..."
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              autoFocus
            />
            {isSearching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          <div className="max-h-[400px] overflow-y-auto p-2">
            {query.length < 2 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search
              </div>
            ) : results.length === 0 && !isSearching ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No results found for "{query}"
              </div>
            ) : (
              <div className="space-y-1">
                {results.map((result, index) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelect(result)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-md px-3 py-3 text-sm transition-colors',
                      index === selectedIndex
                        ? 'bg-purple-500/10 text-purple-400'
                        : 'hover:bg-accent text-foreground'
                    )}
                  >
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getTypeColor(result.type)} variant="outline">
                          {result.type}
                        </Badge>
                        <div className="font-medium">{result.title}</div>
                      </div>
                      {result.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {result.description}
                        </div>
                      )}
                      {result.projectName && (
                        <div className="text-xs text-muted-foreground mt-1">
                          in {result.projectName}
                        </div>
                      )}
                    </div>
                    {result.status && (
                      <Badge variant="secondary" className="text-xs">
                        {result.status}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <kbd className="rounded bg-muted px-1.5 py-0.5">↑↓</kbd>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="rounded bg-muted px-1.5 py-0.5">↵</kbd>
                <span>Open</span>
              </div>
            </div>
            <div className="text-muted-foreground">
              Press <kbd className="rounded bg-muted px-1.5 py-0.5">⌘/</kbd> to open
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

