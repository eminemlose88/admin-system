import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { verifyAccessMiddleware } from './security/access.js'
import { ipWhitelistMiddleware } from './security/ipWhitelist.js'
import { sb } from './storage/supabase.js'
import axios from 'axios'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(cors())
app.use(express.json())

app.use(ipWhitelistMiddleware)

if (!(process.env.CF_ACCESS_DISABLE_LOCAL === 'true' && process.env.NODE_ENV !== 'production')) {
  app.use(verifyAccessMiddleware)
}

app.use(express.static(path.join(__dirname, '..', 'web')))

app.get('/api/accounts', async (req, res) => {
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

app.get('/api/transactions', async (req, res) => {
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

app.post('/api/accounts', async (req, res) => {
  try {
    const rows = await sb.createAccount(req.body)
    res.json({ data: rows })
  } catch (e) {
    res.status(500).json({ error: 'account_create_failed' })
  }
})

app.patch('/api/accounts/:id', async (req, res) => {
  try {
    const rows = await sb.updateAccount(Number(req.params.id), req.body)
    res.json({ data: rows })
  } catch (e) {
    res.status(500).json({ error: 'account_update_failed' })
  }
})

app.delete('/api/accounts/:id', async (req, res) => {
  try {
    const rows = await sb.deleteAccount(Number(req.params.id))
    res.json({ data: rows })
  } catch (e) {
    res.status(500).json({ error: 'account_delete_failed' })
  }
})

app.get('/api/auth/users', async (req, res) => {
  const { page = 1, per_page = 50 } = req.query
  try {
    const rows = await sb.listAuthUsers({ page: Number(page), per_page: Number(per_page) })
    res.json({ data: rows })
  } catch (e) {
    res.status(500).json({ error: 'auth_users_query_failed' })
  }
})

app.post('/api/auth/users', async (req, res) => {
  try {
    const user = await sb.createAuthUser(req.body)
    res.json({ data: user })
  } catch (e) {
    res.status(500).json({ error: 'auth_user_create_failed' })
  }
})

app.delete('/api/auth/users/:id', async (req, res) => {
  try {
    await sb.deleteAuthUser(req.params.id)
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'auth_user_delete_failed' })
  }
})

app.patch('/api/auth/users/:id', async (req, res) => {
  try {
    const updated = await sb.updateAuthUser(req.params.id, req.body)
    res.json({ data: updated })
  } catch (e) {
    res.status(500).json({ error: 'auth_user_update_failed' })
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

const port = Number(process.env.PORT || 8787)
app.listen(port, () => {
  console.log(`Admin server listening on http://localhost:${port}`)
})
