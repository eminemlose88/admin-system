import crypto from 'node:crypto'
import { getRedis } from './redis.js'
export async function createSession(userId, ttlSec=60*60*24*7){
  const token=crypto.randomBytes(24).toString('base64url')
  const r=await getRedis();await r.set(`session:${token}`,String(userId),{EX:ttlSec});return token
}
export async function getSessionUserId(req){
  const token=(req.headers['authorization']||'').replace('Bearer ','')
  if(!token) return null;const r=await getRedis();return await r.get(`session:${token}`)
}
export function requireAdmin(req,res){
  const key=(req.headers['authorization']||'').replace('Bearer ','')
  if(!key||key!==process.env.ADMIN_API_KEY){res.status(401).json({ok:false,error:'unauthorized'});return false}
  return true
}

