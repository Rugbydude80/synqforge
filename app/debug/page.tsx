'use client'

import { useEffect, useState } from 'react'

export default function DebugPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/debug/session')
      .then(res => res.json())
      .then(data => {
        setData(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load debug data:', err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div className="p-8">Loading debug info...</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Debug Session Info</h1>

      {!data?.authenticated ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Not authenticated. Please sign in.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white border rounded-lg p-4">
            <h2 className="font-semibold mb-2">Session User</h2>
            <pre className="bg-gray-50 p-2 rounded text-sm overflow-auto">
              {JSON.stringify(data.session.user, null, 2)}
            </pre>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h2 className="font-semibold mb-2">Database User</h2>
            <pre className="bg-gray-50 p-2 rounded text-sm overflow-auto">
              {JSON.stringify(data.dbUser, null, 2)}
            </pre>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h2 className="font-semibold mb-2">User Projects</h2>
            <pre className="bg-gray-50 p-2 rounded text-sm overflow-auto">
              {JSON.stringify(data.projects, null, 2)}
            </pre>
          </div>

          {data.session.user.organizationId !== data.dbUser?.organizationId && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-800 mb-2">⚠️ Organization ID Mismatch Detected!</h3>
              <p className="text-red-700 mb-2">
                Your session has a different organization ID than your database record.
              </p>
              <p className="text-sm text-red-600">
                Session Org ID: {data.session.user.organizationId}<br />
                Database Org ID: {data.dbUser?.organizationId}
              </p>
              <p className="mt-3 text-red-700 font-medium">
                Solution: Sign out and sign back in to refresh your session.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
