'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Settings,
  User,
  Shield,
  Bell,
  Palette,
  Database,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AppSidebar } from '@/components/app-sidebar'

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('profile')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <main className="flex-1 md:ml-64 flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </main>
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'integrations', label: 'Integrations', icon: Database },
  ]

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 md:ml-64">
        {/* Header */}
        <div className="border-b border-border bg-card/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow-purple">
              <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Manage your account and preferences</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                        activeTab === tab.id
                          ? 'bg-gradient-primary text-white shadow-lg shadow-brand-purple-500/20'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      <tab.icon className="h-5 w-5" />
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            {activeTab === 'profile' && <ProfileSettings user={session.user} />}
            {activeTab === 'security' && <SecuritySettings />}
            {activeTab === 'notifications' && <NotificationSettings />}
            {activeTab === 'appearance' && <AppearanceSettings />}
            {activeTab === 'integrations' && <IntegrationSettings />}
          </div>
        </div>
      </div>
      </main>
    </div>
  )
}

interface User {
  name?: string | null
  email?: string | null
  image?: string | null
  role?: string
}

function ProfileSettings({ user }: { user: User }) {
  const getInitials = (name?: string | null) => {
    if (!name) return '??'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>Update your personal information and profile settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-6">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name || 'User'}
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-gradient-primary flex items-center justify-center text-2xl font-bold text-white">
              {getInitials(user.name)}
            </div>
          )}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{user.name || 'No name set'}</h3>
            <p className="text-muted-foreground">{user.email}</p>
            {user.role && <Badge>{user.role}</Badge>}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="fullName" className="text-sm font-medium">Full Name</label>
            <input
              id="fullName"
              type="text"
              defaultValue={user.name || ''}
              placeholder="Enter your full name"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input
              id="email"
              type="email"
              defaultValue={user.email || ''}
              placeholder="Enter your email"
              disabled
              className="w-full px-3 py-2 border border-border rounded-lg bg-muted cursor-not-allowed"
              title="Email cannot be changed"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="bio" className="text-sm font-medium">Bio</label>
          <textarea
            id="bio"
            rows={3}
            placeholder="Tell us about yourself..."
            className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary resize-none"
          />
        </div>

        <Button>Save Changes</Button>
      </CardContent>
    </Card>
  )
}

function SecuritySettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Settings</CardTitle>
        <CardDescription>Manage your password and security preferences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="currentPassword" className="text-sm font-medium">Current Password</label>
            <input
              id="currentPassword"
              type="password"
              placeholder="Enter current password"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="newPassword" className="text-sm font-medium">New Password</label>
            <input
              id="newPassword"
              type="password"
              placeholder="Enter new password"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm New Password</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border border-border rounded-lg">
          <div>
            <h4 className="font-medium">Two-Factor Authentication</h4>
            <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
          </div>
          <Button variant="outline" disabled>Coming Soon</Button>
        </div>

        <Button>Update Password</Button>
      </CardContent>
    </Card>
  )
}

function NotificationSettings() {
  const notificationOptions = [
    { id: 'email', title: 'Email Notifications', description: 'Receive notifications via email' },
    { id: 'push', title: 'Push Notifications', description: 'Get push notifications in your browser' },
    { id: 'project', title: 'Project Updates', description: 'When projects are updated or new stories are added' },
    { id: 'mentions', title: 'Team Mentions', description: 'When someone mentions you in comments' },
    { id: 'summary', title: 'Weekly Summary', description: 'Get a weekly summary of your project activity' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>Choose how you want to be notified about updates</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {notificationOptions.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div>
                <label htmlFor={item.id} className="font-medium cursor-pointer">{item.title}</label>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              <input
                id={item.id}
                type="checkbox"
                defaultChecked
                className="rounded"
                title={`Toggle ${item.title}`}
              />
            </div>
          ))}
        </div>

        <Button>Save Preferences</Button>
      </CardContent>
    </Card>
  )
}

function AppearanceSettings() {
  const [selectedTheme, setSelectedTheme] = useState<string>('system')
  const [selectedColorScheme, setSelectedColorScheme] = useState<string>('Purple & Emerald')
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  useEffect(() => {
    // Load saved preferences from localStorage
    const savedTheme = localStorage.getItem('theme') || 'system'
    const savedColorScheme = localStorage.getItem('colorScheme') || 'Purple & Emerald'
    setSelectedTheme(savedTheme)
    setSelectedColorScheme(savedColorScheme)

    // Apply theme
    applyTheme(savedTheme)
  }, [])

  const themes = [
    { name: 'Light', value: 'light' },
    { name: 'Dark', value: 'dark' },
    { name: 'System', value: 'system' },
  ]

  const colorSchemes = [
    { name: 'Purple & Emerald', colors: ['bg-brand-purple-500', 'bg-brand-emerald-500'] },
    { name: 'Blue & Orange', colors: ['bg-blue-500', 'bg-orange-500'] },
    { name: 'Green & Teal', colors: ['bg-green-500', 'bg-teal-500'] },
  ]

  const applyTheme = (theme: string) => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'light') {
      root.classList.remove('dark')
    } else {
      // System theme
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (isDarkMode) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
  }

  const handleSaveAppearance = () => {
    setIsSaving(true)
    setSaveMessage(null)

    try {
      // Save to localStorage
      localStorage.setItem('theme', selectedTheme)
      localStorage.setItem('colorScheme', selectedColorScheme)

      // Apply the theme
      applyTheme(selectedTheme)

      setSaveMessage('Appearance settings saved successfully!')
      setTimeout(() => setSaveMessage(null), 3000)
    } catch {
      setSaveMessage('Failed to save settings. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Customize how SynqForge looks and feels</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-3">Theme</h4>
            <div className="grid grid-cols-3 gap-3">
              {themes.map((theme) => (
                <button
                  key={theme.value}
                  type="button"
                  onClick={() => setSelectedTheme(theme.value)}
                  className={`p-3 border rounded-lg transition-all ${
                    selectedTheme === theme.value
                      ? 'border-primary bg-primary/10 shadow-md'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  {theme.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">Color Scheme</h4>
            <div className="grid grid-cols-3 gap-3">
              {colorSchemes.map((scheme) => (
                <button
                  key={scheme.name}
                  type="button"
                  onClick={() => setSelectedColorScheme(scheme.name)}
                  className={`p-3 border rounded-lg transition-all ${
                    selectedColorScheme === scheme.name
                      ? 'border-primary bg-primary/10 shadow-md'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  <div className="flex gap-2 mb-2 justify-center">
                    {scheme.colors.map((color) => (
                      <div key={color} className={`h-4 w-4 rounded-full ${color}`} />
                    ))}
                  </div>
                  {scheme.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {saveMessage && (
          <div className={`p-3 rounded-lg text-sm ${
            saveMessage.includes('success')
              ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
              : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
          }`}>
            {saveMessage}
          </div>
        )}

        <Button onClick={handleSaveAppearance} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Appearance'}
        </Button>
      </CardContent>
    </Card>
  )
}

function IntegrationSettings() {
  const integrations = [
    { name: 'Slack', description: 'Get notifications in Slack', comingSoon: true },
    { name: 'GitHub', description: 'Link your repositories', comingSoon: true },
    { name: 'Jira', description: 'Sync with Jira projects', comingSoon: true },
    { name: 'Linear', description: 'Import issues from Linear', comingSoon: true },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
        <CardDescription>Connect with third-party services</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          {integrations.map((integration) => (
            <div key={integration.name} className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <h4 className="font-medium">{integration.name}</h4>
                <p className="text-sm text-muted-foreground">{integration.description}</p>
              </div>
              <Button variant="default" disabled={integration.comingSoon}>
                {integration.comingSoon ? 'Coming Soon' : 'Connect'}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}


