'use client'

import * as React from 'react'
import { Select } from '@/components/ui/select'
import { api, type User } from '@/lib/api-client'

interface UserSelectProps {
  value?: string
  onChange: (userId: string | undefined) => void
  placeholder?: string
  disabled?: boolean
}

export function UserSelect({ value, onChange, placeholder = 'Select user', disabled }: UserSelectProps) {
  const [users, setUsers] = React.useState<User[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await api.users.list()
      setUsers(response.data || [])
    } catch (error) {
      console.error('Failed to fetch users:', error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">Loading users...</div>
    )
  }

  return (
    <Select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || undefined)}
      disabled={disabled}
      className="text-sm"
    >
      <option value="">{placeholder}</option>
      {users.map((user) => (
        <option key={user.id} value={user.id}>
          {user.name || user.email}
        </option>
      ))}
    </Select>
  )
}
