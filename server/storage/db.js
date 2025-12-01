import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

const init = async () => {
  const db = await open({ filename: process.env.DB_PATH || './data.db', driver: sqlite3.Database })
  await db.exec(`CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT,
    name TEXT,
    created_at TEXT
  )`)
  await db.exec(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER,
    amount REAL,
    currency TEXT,
    status TEXT,
    provider TEXT,
    external_id TEXT,
    created_at TEXT
  )`)
  const row = await db.get('SELECT COUNT(1) c FROM accounts')
  if (row?.c === 0) {
    const now = new Date().toISOString()
    await db.run('INSERT INTO accounts (email, name, created_at) VALUES (?, ?, ?)', 'alice@example.com', 'Alice', now)
    await db.run('INSERT INTO accounts (email, name, created_at) VALUES (?, ?, ?)', 'bob@example.com', 'Bob', now)
    await db.run('INSERT INTO transactions (account_id, amount, currency, status, provider, external_id, created_at) VALUES (?,?,?,?,?,?,?)', 1, 29.99, 'USD', 'paid', 'stripe', 'pi_123', now)
    await db.run('INSERT INTO transactions (account_id, amount, currency, status, provider, external_id, created_at) VALUES (?,?,?,?,?,?,?)', 2, 9.99, 'USD', 'failed', 'paypal', 'tx_456', now)
  }
  return db
}

let instance
const ready = init().then(db => { instance = db })

const like = s => `%${s.replace(/%/g, '')}%`

export const db = {
  ready,
  getAccounts: async ({ limit, offset, query }) => {
    await ready
    const q = query ? like(query) : '%'
    return instance.all(
      'SELECT * FROM accounts WHERE email LIKE ? OR name LIKE ? ORDER BY id DESC LIMIT ? OFFSET ?',
      q, q, limit, offset
    )
  },
  getTransactions: async ({ limit, offset, accountId, status, provider, dateFrom, dateTo }) => {
    await ready
    const conds = []
    const params = []
    if (accountId) { conds.push('account_id = ?'); params.push(accountId) }
    if (status) { conds.push('status = ?'); params.push(status) }
    if (provider) { conds.push('provider = ?'); params.push(provider) }
    if (dateFrom) { conds.push('created_at >= ?'); params.push(dateFrom) }
    if (dateTo) { conds.push('created_at <= ?'); params.push(dateTo) }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : ''
    params.push(limit, offset)
    return instance.all(
      `SELECT * FROM transactions ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      ...params
    )
  }
}
