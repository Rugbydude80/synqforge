'use client'

import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Sparkles,
  Users,
  Settings,
  LogOut,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface NavItem {
  id: string
  icon: any
  label: string
  href: string
}

const navItems: NavItem[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { id: 'projects', icon: FolderKanban, label: 'Projects', href: '/projects' },
  { id: 'stories', icon: FileText, label: 'Stories', href: '/stories' },
  { id: 'ai', icon: Sparkles, label: 'AI Tools', href: '/ai-generate' },
  { id: 'team', icon: Users, label: 'Team', href: '/team' },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const getActiveNav = () => {
    if (pathname.startsWith('/dashboard')) return 'dashboard'
    if (pathname.startsWith('/projects')) return 'projects'
    if (pathname.startsWith('/stories')) return 'stories'
    if (pathname.startsWith('/ai-generate')) return 'ai'
    if (pathname.startsWith('/team')) return 'team'
    return 'dashboard'
  }

  const activeNav = getActiveNav()

  const handleNavClick = (item: NavItem) => {
    router.push(item.href)
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-bold gradient-text">SynqForge</span>
      </div>

      <nav className="space-y-1 p-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavClick(item)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
              activeNav === item.id
                ? 'bg-gradient-primary text-white shadow-lg shadow-brand-purple-500/20'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="absolute bottom-4 left-4 right-4 space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => router.push('/settings')}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 text-red-400 hover:text-red-300 hover:border-red-400"
          onClick={() => signOut({ callbackUrl: '/auth/signin' })}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  )
}
