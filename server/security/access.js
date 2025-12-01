import jwt from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'

const jwksUri = process.env.CF_ACCESS_JWKS_URL
const audience = process.env.CF_ACCESS_AUD
const issuer = process.env.CF_ACCESS_ISS

const client = jwksClient({ jwksUri })

const getKey = (header, callback) => {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err)
    const signingKey = key.getPublicKey()
    callback(null, signingKey)
  })
}

export const verifyAccessMiddleware = (req, res, next) => {
  try {
    const token = req.headers['cf-access-jwt-assertion']
    if (!token) return res.status(401).json({ error: 'access_jwt_missing' })
    jwt.verify(
      token,
      getKey,
      { audience, issuer, algorithms: ['RS256'] },
      (err, decoded) => {
        if (err) return res.status(401).json({ error: 'access_jwt_invalid' })
        req.cfAccess = decoded
        next()
      }
    )
  } catch {
    res.status(401).json({ error: 'access_verification_failed' })
  }
}
