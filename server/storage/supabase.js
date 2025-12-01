import axios from 'axios'

const base = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json'
}

const rest = axios.create({ baseURL: `${base}/rest/v1`, headers })
const auth = axios.create({ baseURL: `${base}/auth/v1/admin`, headers })

const ilike = s => `*${String(s).replace(/\*/g, '')}*`

export const sb = {
  // 使用 Admin API 管理内置 Auth 用户
  listAuthUsers: async ({ page = 1, per_page = 50 }) => {
    const r = await auth.get('/users', { params: { page, per_page } })
    return r.data
  },
  updateAuthUser: async (id, payload) => {
    const r = await auth.put(`/users/${id}`, payload)
    return r.data
  },
  getTransactions: async ({ limit, offset, accountId, status, provider, dateFrom, dateTo }) => {
    const params = { select: '*', order: 'id.desc', limit, offset }
    const filters = []
    if (accountId) filters.push(`account_id.eq.${accountId}`)
    if (status) filters.push(`status.eq.${status}`)
    if (provider) filters.push(`provider.eq.${provider}`)
    if (dateFrom) filters.push(`created_at.gte.${dateFrom}`)
    if (dateTo) filters.push(`created_at.lte.${dateTo}`)
    if (filters.length) params.and = `(${filters.join(',')})`
    const r = await rest.get('/transactions', { params })
    return r.data
  },
  createAccount: async (payload) => {
    const r = await rest.post('/accounts', payload)
    return r.data
  },
  updateAccount: async (id, payload) => {
    const r = await rest.patch(`/accounts?id=eq.${id}`, payload)
    return r.data
  },
  deleteAccount: async (id) => {
    const r = await rest.delete(`/accounts?id=eq.${id}`)
    return r.data
  },
  createAuthUser: async ({ email, password, email_confirm = true, user_metadata }) => {
    const r = await auth.post('/users', { email, password, email_confirm, user_metadata })
    return r.data
  },
  deleteAuthUser: async (id) => {
    const r = await auth.delete(`/users/${id}`)
    return r.data
  }
}
