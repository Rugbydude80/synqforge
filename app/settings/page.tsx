'use client'

import { useState } from 'react'
import {
  Settings,
  User,
  Shield,
  Bell,
  Palette,
  Database,
  Key,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AppSidebar } from '@/components/app-sidebar'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'integrations', label: 'Integrations', icon: Database },
    { id: 'api', label: 'API Keys', icon: Key },
  ]

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 ml-64">
        {/* Header */}
        <div className="border-b border-border bg-card/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow-purple">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Settings</h1>
              <p className="text-muted-foreground">Manage your account and preferences</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
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
            {activeTab === 'profile' && <ProfileSettings />}
            {activeTab === 'security' && <SecuritySettings />}
            {activeTab === 'notifications' && <NotificationSettings />}
            {activeTab === 'appearance' && <AppearanceSettings />}
            {activeTab === 'integrations' && <IntegrationSettings />}
            {activeTab === 'api' && <ApiSettings />}
          </div>
        </div>
      </div>
      </main>
    </div>
  )
}

function ProfileSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>Update your personal information and profile settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-6">
          <div className="h-20 w-20 rounded-full bg-gradient-primary flex items-center justify-center text-2xl font-bold text-white">
            JD
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">John Doe</h3>
            <p className="text-muted-foreground">john.doe@example.com</p>
            <Badge>Admin</Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Full Name</label>
            <input
              type="text"
              defaultValue="John Doe"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              defaultValue="john.doe@example.com"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Bio</label>
          <textarea
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
            <label className="text-sm font-medium">Current Password</label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">New Password</label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Confirm New Password</label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border border-border rounded-lg">
          <div>
            <h4 className="font-medium">Two-Factor Authentication</h4>
            <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
          </div>
          <Button variant="outline">Enable 2FA</Button>
        </div>

        <Button>Update Password</Button>
      </CardContent>
    </Card>
  )
}

function NotificationSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>Choose how you want to be notified about updates</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {[
            { title: 'Email Notifications', description: 'Receive notifications via email' },
            { title: 'Push Notifications', description: 'Get push notifications in your browser' },
            { title: 'Project Updates', description: 'When projects are updated or new stories are added' },
            { title: 'Team Mentions', description: 'When someone mentions you in comments' },
            { title: 'Weekly Summary', description: 'Get a weekly summary of your project activity' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              <input type="checkbox" defaultChecked className="rounded" />
            </div>
          ))}
        </div>

        <Button>Save Preferences</Button>
      </CardContent>
    </Card>
  )
}

function AppearanceSettings() {
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
              {[
                { name: 'Light', value: 'light' },
                { name: 'Dark', value: 'dark' },
                { name: 'System', value: 'system' },
              ].map((theme) => (
                <button
                  key={theme.value}
                  className="p-3 border border-border rounded-lg hover:border-primary transition-colors"
                >
                  {theme.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">Color Scheme</h4>
            <div className="grid grid-cols-3 gap-3">
              {[
                { name: 'Purple & Emerald', colors: ['bg-brand-purple-500', 'bg-brand-emerald-500'] },
                { name: 'Blue & Orange', colors: ['bg-blue-500', 'bg-orange-500'] },
                { name: 'Green & Teal', colors: ['bg-green-500', 'bg-teal-500'] },
              ].map((scheme, i) => (
                <button
                  key={i}
                  className="p-3 border border-border rounded-lg hover:border-primary transition-colors"
                >
                  <div className="flex gap-2 mb-2">
                    {scheme.colors.map((color, j) => (
                      <div key={j} className={`h-4 w-4 rounded-full ${color}`} />
                    ))}
                  </div>
                  {scheme.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Button>Save Appearance</Button>
      </CardContent>
    </Card>
  )
}

function IntegrationSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
        <CardDescription>Connect with third-party services</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          {[
            { name: 'Slack', description: 'Get notifications in Slack', connected: false },
            { name: 'GitHub', description: 'Link your repositories', connected: true },
            { name: 'Jira', description: 'Sync with Jira projects', connected: false },
            { name: 'Linear', description: 'Import issues from Linear', connected: false },
          ].map((integration, i) => (
            <div key={i} className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <h4 className="font-medium">{integration.name}</h4>
                <p className="text-sm text-muted-foreground">{integration.description}</p>
              </div>
              <div className="flex items-center gap-3">
                {integration.connected && <Badge variant="emerald">Connected</Badge>}
                <Button variant={integration.connected ? 'outline' : 'default'}>
                  {integration.connected ? 'Configure' : 'Connect'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ApiSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>API Keys</CardTitle>
        <CardDescription>Manage API keys for external integrations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div>
              <h4 className="font-medium">Production API Key</h4>
              <p className="text-sm text-muted-foreground">sk-1234-5678-9012-3456-7890-1234-5678</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">Regenerate</Button>
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div>
              <h4 className="font-medium">Development API Key</h4>
              <p className="text-sm text-muted-foreground">sk-dev-1234-5678-9012-3456-7890-1234</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">Regenerate</Button>
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Button>Create New Key</Button>
      </CardContent>
    </Card>
  )
}

