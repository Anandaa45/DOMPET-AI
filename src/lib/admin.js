const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9000'

export async function getAdminDashboardStats() {
  const res = await fetch(`${API_BASE}/api/admin/stats`)
  if (!res.ok) throw new Error(`Failed to fetch admin stats: ${res.status}`)
  const json = await res.json()
  if (!json.ok) throw new Error(json.message || 'Gagal memuat stats')
  return json.data
}

export async function getAdminUsers() {
  const res = await fetch(`${API_BASE}/api/admin/users`)
  if (!res.ok) throw new Error(`Failed to fetch admin users: ${res.status}`)
  const json = await res.json()
  if (!json.ok) throw new Error(json.message || 'Gagal memuat users')
  return json.data
}

export async function getAdminLogs(limit = 50) {
  const res = await fetch(`${API_BASE}/api/admin/logs?limit=${limit}`)
  if (!res.ok) throw new Error(`Failed to fetch admin logs: ${res.status}`)
  const json = await res.json()
  if (!json.ok) throw new Error(json.message || 'Gagal memuat logs')
  return json.data
}

export async function updateUserRole(userId, role) {
  const res = await fetch(`${API_BASE}/api/admin/users/role`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, role }),
  })
  if (!res.ok) throw new Error(`Failed to update user role: ${res.status}`)
  const json = await res.json()
  if (!json.ok) throw new Error(json.message || 'Gagal mengupdate role')
  return json
}
