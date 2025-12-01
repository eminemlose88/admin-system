const parseList = v => (v || '').split(',').map(x => x.trim()).filter(Boolean)
const whitelist = new Set(parseList(process.env.IP_WHITELIST))

const normIp = ip => {
  if (!ip) return ''
  if (ip.startsWith('::ffff:')) return ip.replace('::ffff:', '')
  return ip
}

export const ipWhitelistMiddleware = (req, res, next) => {
  const ip = normIp(req.headers['cf-connecting-ip'] || req.ip || req.connection?.remoteAddress)
  if (whitelist.size === 0) return next()
  if (whitelist.has(ip)) return next()
  res.status(403).json({ error: 'ip_forbidden', ip })
}
