import jwt from 'jsonwebtoken'

const secret = process.env.ADMIN_SECRET || 'change_me'

const parseCookies = (cookieHeader) => {
  const out = {}
  if (!cookieHeader) return out
  cookieHeader.split(';').forEach(p => {
    const i = p.indexOf('=')
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1))
  })
  return out
}

export const requireAdmin = (req, res, next) => {
  const cookies = parseCookies(req.headers.cookie)
  const token = cookies['admin_session']
  if (!token) return res.status(401).json({ error: 'admin_unauthorized' })
  try {
    const payload = jwt.verify(token, secret)
    req.admin = payload
    next()
  } catch {
    res.status(401).json({ error: 'admin_session_invalid' })
  }
}

export const issueAdminSession = (res, payload) => {
  const token = jwt.sign(payload, secret, { expiresIn: '2h' })
  const cookie = `admin_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax`
  res.setHeader('Set-Cookie', cookie)
}
