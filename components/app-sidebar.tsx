'use client'

import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Sparkles,
  Users,
  Settings,
  LogOut,
  Layers,
  Menu,
  X,
  CheckSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SynqForgeLogo } from '@/components/synqforge-logo'

export interface NavItem {
  id: string
  icon: any
  label: string
  href: string
}

const navItems: NavItem[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { id: 'projects', icon: FolderKanban, label: 'Projects', href: '/projects' },
  { id: 'epics', icon: Layers, label: 'Epics', href: '/epics' },
  { id: 'stories', icon: FileText, label: 'Stories', href: '/stories' },
  { id: 'tasks', icon: CheckSquare, label: 'Tasks', href: '/tasks' },
  { id: 'ai', icon: Sparkles, label: 'AI Tools', href: '/ai-generate' },
  { id: 'team', icon: Users, label: 'Team', href: '/team' },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [mobileMenuOpen])

  const getActiveNav = () => {
    if (pathname.startsWith('/dashboard')) return 'dashboard'
    if (pathname.startsWith('/projects')) return 'projects'
    if (pathname.startsWith('/epics')) return 'epics'
    if (pathname.startsWith('/stories')) return 'stories'
    if (pathname.startsWith('/tasks')) return 'tasks'
    if (pathname.startsWith('/ai-generate')) return 'ai'
    if (pathname.startsWith('/team')) return 'team'
    return 'dashboard'
  }

  const activeNav = getActiveNav()

  const handleNavClick = (item: NavItem) => {
    router.push(item.href)
    setMobileMenuOpen(false)
  }

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card shadow-lg md:hidden"
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
      </button>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card transition-transform duration-300 ease-in-out',
          // Hide on mobile by default, show when menu is open
          'md:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
      <div className="flex h-16 items-center border-b border-border px-6">
        <SynqForgeLogo size="md" showText={true} width={180} height={45} />
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
          onClick={() => {
            router.push('/settings')
            setMobileMenuOpen(false)
          }}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 text-red-400 hover:text-red-300 hover:border-red-400"
          onClick={() => {
            setMobileMenuOpen(false)
            signOut({ callbackUrl: '/auth/signin' })
          }}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
    </>
  )
}
