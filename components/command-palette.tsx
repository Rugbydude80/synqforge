'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  FolderKanban,
  FileText,
  Layers,
  CheckSquare,
  Building2,
  FileText as Invoice,
  Sparkles,
  Users,
  Settings,
  Search,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Command {
  id: string
  label: string
  description?: string
  icon: any
  action: () => void
  keywords?: string[]
  category: string
}

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [selectedIndex, setSelectedIndex] = React.useState(0)

  const commands: Command[] = React.useMemo(() => [
    // Navigation
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      description: 'View your dashboard',
      icon: FolderKanban,
      action: () => router.push('/dashboard'),
      keywords: ['dashboard', 'home', 'overview'],
      category: 'Navigation',
    },
    {
      id: 'nav-projects',
      label: 'Go to Projects',
      description: 'View all projects',
      icon: FolderKanban,
      action: () => router.push('/projects'),
      keywords: ['projects', 'proj'],
      category: 'Navigation',
    },
    {
      id: 'nav-stories',
      label: 'Go to Stories',
      description: 'View all stories',
      icon: FileText,
      action: () => router.push('/stories'),
      keywords: ['stories', 'story', 'user stories'],
      category: 'Navigation',
    },
    {
      id: 'nav-epics',
      label: 'Go to Epics',
      description: 'View all epics',
      icon: Layers,
      action: () => router.push('/epics'),
      keywords: ['epics', 'epic'],
      category: 'Navigation',
    },
    {
      id: 'nav-tasks',
      label: 'Go to Tasks',
      description: 'View all tasks',
      icon: CheckSquare,
      action: () => router.push('/tasks'),
      keywords: ['tasks', 'task', 'todo'],
      category: 'Navigation',
    },
    {
      id: 'nav-clients',
      label: 'Go to Clients',
      description: 'View all clients',
      icon: Building2,
      action: () => router.push('/clients'),
      keywords: ['clients', 'client', 'customer'],
      category: 'Navigation',
    },
    {
      id: 'nav-invoices',
      label: 'Go to Invoices',
      description: 'View all invoices',
      icon: Invoice,
      action: () => router.push('/invoices'),
      keywords: ['invoices', 'invoice', 'billing'],
      category: 'Navigation',
    },
    {
      id: 'nav-team',
      label: 'Go to Team',
      description: 'Manage your team',
      icon: Users,
      action: () => router.push('/team'),
      keywords: ['team', 'members', 'users'],
      category: 'Navigation',
    },
    {
      id: 'nav-settings',
      label: 'Go to Settings',
      description: 'Configure your account',
      icon: Settings,
      action: () => router.push('/settings'),
      keywords: ['settings', 'preferences', 'config'],
      category: 'Navigation',
    },
    // Actions
    {
      id: 'action-new-project',
      label: 'Create New Project',
      description: 'Start a new project',
      icon: Plus,
      action: () => router.push('/projects'),
      keywords: ['new', 'create', 'project', 'add'],
      category: 'Actions',
    },
    {
      id: 'action-ai-generate',
      label: 'AI Generate Stories',
      description: 'Generate stories with AI',
      icon: Sparkles,
      action: () => router.push('/ai-generate'),
      keywords: ['ai', 'generate', 'artificial intelligence', 'auto'],
      category: 'Actions',
    },
  ], [router])

  const filteredCommands = React.useMemo(() => {
    if (!search) return commands

    const searchLower = search.toLowerCase()
    return commands.filter((command) => {
      const matchesLabel = command.label.toLowerCase().includes(searchLower)
      const matchesDescription = command.description?.toLowerCase().includes(searchLower)
      const matchesKeywords = command.keywords?.some((kw) => kw.includes(searchLower))
      return matchesLabel || matchesDescription || matchesKeywords
    })
  }, [search, commands])

  const groupedCommands = React.useMemo(() => {
    const groups: Record<string, Command[]> = {}
    filteredCommands.forEach((command) => {
      if (!groups[command.category]) {
        groups[command.category] = []
      }
      groups[command.category].push(command)
    })
    return groups
  }, [filteredCommands])

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  React.useEffect(() => {
    if (!open) {
      setSearch('')
      setSelectedIndex(0)
    }
  }, [open])

  React.useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const command = filteredCommands[selectedIndex]
      if (command) {
        command.action()
        setOpen(false)
      }
    }
  }

  const handleSelect = (command: Command) => {
    command.action()
    setOpen(false)
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground border border-border rounded-lg hover:border-purple-500/50 transition-colors"
      >
        <Search className="h-4 w-4" />
        <span>Search...</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0">
          <div className="flex items-center border-b px-4">
            <Search className="h-4 w-4 shrink-0 opacity-50" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command or search..."
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              autoFocus
            />
          </div>

          <div className="max-h-[400px] overflow-y-auto p-2">
            {Object.keys(groupedCommands).length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No results found.
              </div>
            ) : (
              Object.entries(groupedCommands).map(([category, commands], categoryIndex) => (
                <div key={category} className={cn(categoryIndex > 0 && 'mt-4')}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    {category}
                  </div>
                  <div className="space-y-1">
                    {commands.map((command) => {
                      const globalIndex = filteredCommands.indexOf(command)
                      const isSelected = globalIndex === selectedIndex

                      return (
                        <button
                          key={command.id}
                          onClick={() => handleSelect(command)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
                            isSelected
                              ? 'bg-purple-500/10 text-purple-400'
                              : 'hover:bg-accent text-foreground'
                          )}
                        >
                          <command.icon className="h-4 w-4 shrink-0" />
                          <div className="flex-1 text-left">
                            <div className="font-medium">{command.label}</div>
                            {command.description && (
                              <div className="text-xs text-muted-foreground">
                                {command.description}
                              </div>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))
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
                <span>Select</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="rounded bg-muted px-1.5 py-0.5">Esc</kbd>
                <span>Close</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

