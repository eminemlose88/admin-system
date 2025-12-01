import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { verifyAccessMiddleware } from './security/access.js'
import { ipWhitelistMiddleware } from './security/ipWhitelist.js'
import { requireAdmin, issueAdminSession } from './security/adminSession.js'
import { sb } from './storage/supabase.js'
import { blob } from './assets/vercelBlob.js'
import axios from 'axios'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Pragma', 'no-cache')
  next()
})

app.use(ipWhitelistMiddleware)

if (!(process.env.CF_ACCESS_DISABLE_LOCAL === 'true' && process.env.NODE_ENV !== 'production')) {
  app.use(verifyAccessMiddleware)
}

app.get('/', (req, res) => {
  const hasCookie = (req.headers.cookie || '').includes('admin_session=')
  if (!hasCookie) return res.sendFile(path.join(__dirname, '..', 'web', 'login.html'))
  res.sendFile(path.join(__dirname, '..', 'web', 'index.html'))
})
app.use(express.static(path.join(__dirname, '..', 'web')))

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {}
  const ok = username === (process.env.ADMIN_USERNAME || 'admin') && password === process.env.ADMIN_PASSWORD
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' })
  issueAdminSession(res, { u: username })
  res.json({ ok: true })
})

app.get('/api/admin/me', requireAdmin, (req, res) => {
  res.json({ user: req.admin })
})

app.get('/api/accounts', requireAdmin, async (req, res) => {
  const { limit = 50, offset = 0, query = '' } = req.query
  try {
    const per_page = Number(limit)
    const page = Math.max(1, Math.floor(Number(offset) / per_page) + 1)
    const data = await sb.listAuthUsers({ page, per_page })
    const users = Array.isArray(data?.users) ? data.users : (Array.isArray(data) ? data : [])
    const q = String(query).toLowerCase().trim()
    const filtered = q
      ? users.filter(u => {
          const email = (u.email || '').toLowerCase()
          const name = (u.user_metadata?.name || '').toLowerCase()
          return email.includes(q) || name.includes(q)
        })
      : users
    const rows = filtered.map(u => ({ id: u.id, email: u.email, name: u.user_metadata?.name || '', created_at: u.created_at }))
    res.json({ data: rows })
  } catch (e) {
    res.status(500).json({ error: 'accounts_query_failed' })
  }
})

app.get('/api/transactions', requireAdmin, async (req, res) => {
  const { limit = 50, offset = 0, accountId, status, provider, dateFrom, dateTo } = req.query
  try {
    const rows = await sb.getTransactions({
      limit: Number(limit),
      offset: Number(offset),
      accountId: accountId ? Number(accountId) : undefined,
      status: status ? String(status) : undefined,
      provider: provider ? String(provider) : undefined,
      dateFrom: dateFrom ? String(dateFrom) : undefined,
      dateTo: dateTo ? String(dateTo) : undefined
    })
    res.json({ data: rows })
  } catch (e) {
    res.status(500).json({ error: 'transactions_query_failed' })
  }
})

app.get('/api/payment/health', async (req, res) => {
  try {
    const url = process.env.PAYMENT_HEALTH_URL
    if (!url) return res.json({ status: 'unknown' })
    const r = await axios.get(url, { timeout: 5000 })
    res.json({ status: r.status === 200 ? 'up' : 'degraded' })
  } catch (e) {
    res.json({ status: 'down' })
  }
})

app.get('/api/payment/monitor', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  let alive = true
  req.on('close', () => { alive = false })
  const send = s => { if (alive) res.write(`data: ${JSON.stringify(s)}\n\n`) }
  const tick = async () => {
    try {
      const url = process.env.PAYMENT_HEALTH_URL
      if (!url) return send({ status: 'unknown' })
      const r = await axios.get(url, { timeout: 5000 })
      send({ status: r.status === 200 ? 'up' : 'degraded' })
    } catch {
      send({ status: 'down' })
    }
  }
  await tick()
  const id = setInterval(tick, 5000)
  req.on('close', () => clearInterval(id))
})

app.get('/api/payment/callbacks', requireAdmin, async (req, res) => {
  try {
    const url = process.env.PAYMENT_CALLBACKS_URL
    if (!url) return res.json({ data: [] })
    const r = await axios.get(url, { timeout: 5000 })
    res.json({ data: r.data })
  } catch (e) {
    res.status(500).json({ error: 'callbacks_fetch_failed' })
  }
})

app.get('/api/payment/callbacks/monitor', requireAdmin, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  let alive = true
  req.on('close', () => { alive = false })
  const send = s => { if (alive) res.write(`data: ${JSON.stringify(s)}\n\n`) }
  const tick = async () => {
    try {
      const url = process.env.PAYMENT_CALLBACKS_URL
      if (!url) return send({ data: [] })
      const r = await axios.get(url, { timeout: 5000 })
      send({ data: r.data })
    } catch {
      send({ error: 'down' })
    }
  }
  await tick()
  const id = setInterval(tick, 5000)
  req.on('close', () => clearInterval(id))
})

app.get('/api/assets/list', requireAdmin, async (req, res) => {
  const { prefix = '' } = req.query
  try {
    const data = await blob.list({ prefix })
    res.json({ data })
  } catch (e) {
    res.status(500).json({ error: 'assets_list_failed' })
  }
})

app.post('/api/assets/upload', requireAdmin, async (req, res) => {
  try {
    const { filename, contentType, dataBase64 } = req.body || {}
    const data = await blob.upload({ filename, contentType, dataBase64 })
    res.json({ data })
  } catch (e) {
    res.status(500).json({ error: 'assets_upload_failed' })
  }
})

app.delete('/api/assets', requireAdmin, async (req, res) => {
  try {
    const { url } = req.query
    const data = await blob.remove({ url })
    res.json({ data })
  } catch (e) {
    res.status(500).json({ error: 'assets_remove_failed' })
  }
})

app.get('/api/admin-accounts', requireAdmin, async (req, res) => {
  const { limit = 50, offset = 0, query, role, status } = req.query
  try {
    const rows = await sb.listAdminAccounts({ limit: Number(limit), offset: Number(offset), query: query ? String(query) : undefined, role, status })
    res.json({ data: rows })
  } catch (e) {
    res.status(500).json({ error: 'admin_accounts_query_failed' })
  }
})

app.post('/api/admin-accounts', requireAdmin, async (req, res) => {
  try {
    const rows = await sb.createAdminAccount(req.body)
    res.json({ data: rows })
  } catch (e) {
    res.status(500).json({ error: 'admin_account_create_failed' })
  }
})

app.patch('/api/admin-accounts/:id', requireAdmin, async (req, res) => {
  try {
    const rows = await sb.updateAdminAccount(req.params.id, req.body)
    res.json({ data: rows })
  } catch (e) {
    res.status(500).json({ error: 'admin_account_update_failed' })
  }
})

app.delete('/api/admin-accounts/:id', requireAdmin, async (req, res) => {
  try {
    const rows = await sb.deleteAdminAccount(req.params.id)
    res.json({ data: rows })
  } catch (e) {
    res.status(500).json({ error: 'admin_account_delete_failed' })
  }
})

app.post('/api/accounts', requireAdmin, async (req, res) => {
  try {
    const rows = await sb.createAccount(req.body)
    res.json({ data: rows })
  } catch (e) {
    res.status(500).json({ error: 'account_create_failed' })
  }
})

app.patch('/api/accounts/:id', requireAdmin, async (req, res) => {
  try {
    const rows = await sb.updateAccount(Number(req.params.id), req.body)
    res.json({ data: rows })
  } catch (e) {
    res.status(500).json({ error: 'account_update_failed' })
  }
})

app.delete('/api/accounts/:id', requireAdmin, async (req, res) => {
  try {
    const rows = await sb.deleteAccount(Number(req.params.id))
    res.json({ data: rows })
  } catch (e) {
    res.status(500).json({ error: 'account_delete_failed' })
  }
})

app.get('/api/auth/users', requireAdmin, async (req, res) => {
  const { page = 1, per_page = 50 } = req.query
  try {
    const rows = await sb.listAuthUsers({ page: Number(page), per_page: Number(per_page) })
    res.json({ data: rows })
  } catch (e) {
    res.status(500).json({ error: 'auth_users_query_failed' })
  }
})

app.post('/api/auth/users', requireAdmin, async (req, res) => {
  try {
    const user = await sb.createAuthUser(req.body)
    res.json({ data: user })
  } catch (e) {
    res.status(500).json({ error: 'auth_user_create_failed' })
  }
})

app.delete('/api/auth/users/:id', requireAdmin, async (req, res) => {
  try {
    await sb.deleteAuthUser(req.params.id)
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'auth_user_delete_failed' })
  }
})

app.patch('/api/auth/users/:id', requireAdmin, async (req, res) => {
  try {
    const updated = await sb.updateAuthUser(req.params.id, req.body)
    res.json({ data: updated })
  } catch (e) {
    res.status(500).json({ error: 'auth_user_update_failed' })
  }
})

export { app }
