'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Users,
  UserPlus,
  Mail,
  MoreVertical,
  Search,
  Trash2,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AppSidebar } from '@/components/app-sidebar'
import { getInitials } from '@/lib/utils'
import { InviteMemberModal } from '@/components/invite-member-modal'
import { TeamLimitsBadge } from '@/components/team-limits-badge'

interface TeamMember {
  id: string
  name: string
  email: string
  role: 'admin' | 'member' | 'viewer'
  avatar?: string
  isActive: boolean
  lastActiveAt?: string
}

interface Invitation {
  id: string
  email: string
  role: 'admin' | 'member' | 'viewer'
  status: string
  expiresAt: string
  createdAt: string
  inviterName: string
  inviterEmail: string
}

export default function TeamPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (status === 'authenticated') {
      fetchTeamData()
    }
  }, [status, router])

  const fetchTeamData = async () => {
    await Promise.all([fetchTeamMembers(), fetchInvitations()])
  }

  const fetchTeamMembers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/team')
      if (response.ok) {
        const data = await response.json()
        setTeamMembers(data.members || [])
      }
    } catch (error: any) {
      console.error('Failed to fetch team members:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInvitations = async () => {
    try {
      const response = await fetch('/api/team/invite')
      if (response.ok) {
        const data = await response.json()
        setInvitations(data.invitations || [])
      }
    } catch (error: any) {
      console.error('Failed to fetch invitations:', error)
    }
  }

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) {
      return
    }

    try {
      const response = await fetch(`/api/team/invite/${invitationId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchInvitations()
      } else {
        alert('Failed to revoke invitation')
      }
    } catch (error) {
      console.error('Error revoking invitation:', error)
      alert('Failed to revoke invitation')
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default'
      case 'member':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const filteredMembers = teamMembers.filter((member) =>
    member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredInvitations = invitations.filter((inv) =>
    inv.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const pendingInvitations = invitations.filter((inv) => inv.status === 'pending')

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <main className="flex-1 ml-64">
          <div className="flex items-center justify-center h-screen">
            <div className="text-muted-foreground">Loading team...</div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 ml-64">
        {/* Header */}
        <div className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow-purple">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Team</h1>
                  <p className="text-muted-foreground">Manage your organization members</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <TeamLimitsBadge />
                <Button onClick={() => setShowInviteModal(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-8 py-8">
          {/* Tabs */}
          <div className="flex gap-4 mb-6 border-b border-border">
            <button
              onClick={() => setActiveTab('members')}
              className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
                activeTab === 'members'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Members ({teamMembers.length})
              {activeTab === 'members' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
                activeTab === 'invitations'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Pending Invitations ({pendingInvitations.length})
              {activeTab === 'invitations' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={activeTab === 'members' ? 'Search team members...' : 'Search invitations...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {/* Team Members List */}
          {activeTab === 'members' && (
            <div className="grid gap-4">
              {filteredMembers.map((member) => (
                <Card key={member.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {member.avatar ? (
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold">
                            {getInitials(member.name)}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{member.name || 'Unknown'}</h3>
                            <Badge variant={getRoleBadgeVariant(member.role)}>
                              {member.role}
                            </Badge>
                            {member.isActive && (
                              <div className="h-2 w-2 rounded-full bg-emerald-500" title="Active" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Mail className="h-3 w-3" />
                            {member.email}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" disabled>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredMembers.length === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="h-16 w-16 rounded-full bg-gradient-primary/10 flex items-center justify-center mb-4">
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No team members found</h3>
                    <p className="text-muted-foreground text-center max-w-md">
                      {searchQuery
                        ? 'Try adjusting your search query'
                        : 'Invite team members to collaborate on projects'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Invitations List */}
          {activeTab === 'invitations' && (
            <div className="grid gap-4">
              {filteredInvitations.map((invitation) => (
                <Card key={invitation.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-gradient-primary/10 flex items-center justify-center">
                          <Mail className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{invitation.email}</h3>
                            <Badge variant={getRoleBadgeVariant(invitation.role)}>
                              {invitation.role}
                            </Badge>
                            <Badge variant="outline" className="text-amber-600">
                              <Clock className="h-3 w-3 mr-1" />
                              {invitation.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <span>Invited by {invitation.inviterName || invitation.inviterEmail}</span>
                            <span>•</span>
                            <span>Expires {new Date(invitation.expiresAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRevokeInvitation(invitation.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredInvitations.length === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="h-16 w-16 rounded-full bg-gradient-primary/10 flex items-center justify-center mb-4">
                      <Mail className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No pending invitations</h3>
                    <p className="text-muted-foreground text-center max-w-md">
                      {searchQuery
                        ? 'Try adjusting your search query'
                        : 'Invite new members to see pending invitations here'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Invite Modal */}
        <InviteMemberModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            fetchTeamData()
          }}
        />
      </main>
    </div>
  )
}
