import axios from 'axios'

const base = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY
const anonKey = process.env.SUPABASE_ANON_KEY

const chooseKey = () => serviceKey || anonKey
const headers = () => {
  const key = chooseKey()
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json'
  }
}

const rest = axios.create({ baseURL: `${base}/rest/v1` })
const auth = axios.create({ baseURL: `${base}/auth/v1/admin` })

const ilike = s => `*${String(s).replace(/\*/g, '')}*`

export const sb = {
  // 使用 Admin API 管理内置 Auth 用户
  listAuthUsers: async ({ page = 1, per_page = 50 }) => {
    if (!serviceKey) throw new Error('service_key_required')
    const r = await auth.get('/users', { params: { page, per_page }, headers: headers() })
    return r.data
  },
  updateAuthUser: async (id, payload) => {
    if (!serviceKey) throw new Error('service_key_required')
    const r = await auth.put(`/users/${id}`, payload, { headers: headers() })
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
    const r = await rest.get('/transactions', { params, headers: headers() })
    return r.data
  },
  createAccount: async (payload) => {
    const r = await rest.post('/accounts', payload, { headers: headers() })
    return r.data
  },
  updateAccount: async (id, payload) => {
    const r = await rest.patch(`/accounts?id=eq.${id}`, payload, { headers: headers() })
    return r.data
  },
  deleteAccount: async (id) => {
    const r = await rest.delete(`/accounts?id=eq.${id}`, { headers: headers() })
    return r.data
  },
  createAuthUser: async ({ email, password, email_confirm = true, user_metadata }) => {
    if (!serviceKey) throw new Error('service_key_required')
    const r = await auth.post('/users', { email, password, email_confirm, user_metadata }, { headers: headers() })
    return r.data
  },
  deleteAuthUser: async (id) => {
    if (!serviceKey) throw new Error('service_key_required')
    const r = await auth.delete(`/users/${id}`, { headers: headers() })
    return r.data
  },
  findAdminByEmail: async (email) => {
    const r = await rest.get('/admin_accounts', { params: { select: '*', email: `eq.${email}` }, headers: headers() })
    return Array.isArray(r.data) ? r.data[0] : null
  },
  listAdminEmails: async () => {
    const r = await rest.get('/admin_accounts', { params: { select: 'email' }, headers: headers() })
    return (Array.isArray(r.data) ? r.data : []).map(x => x.email).filter(Boolean)
  },
  setAdminPasswordHash: async (id, password_hash) => {
    const r = await rest.patch(`/admin_accounts?id=eq.${id}`, { password_hash }, { headers: headers() })
    return r.data
  },
  listAdminAccounts: async ({ limit = 50, offset = 0, query, role, status }) => {
    const params = { select: '*', order: 'created_at.desc', limit, offset }
    const filters = []
    if (role) filters.push(`role.eq.${role}`)
    if (status) filters.push(`status.eq.${status}`)
    if (filters.length) params.and = `(${filters.join(',')})`
    if (query) params.or = `email.ilike.*${query}*,name.ilike.*${query}*`
    const r = await rest.get('/admin_accounts', { params, headers: headers() })
    return r.data
  },
  createAdminAccount: async (payload) => {
    const r = await rest.post('/admin_accounts', payload, { headers: headers() })
    return r.data
  },
  updateAdminAccount: async (id, payload) => {
    const r = await rest.patch(`/admin_accounts?id=eq.${id}`, payload, { headers: headers() })
    return r.data
  },
  deleteAdminAccount: async (id) => {
    const r = await rest.delete(`/admin_accounts?id=eq.${id}`, { headers: headers() })
    return r.data
  }
}
