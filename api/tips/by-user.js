import { getRedis } from '../_lib/redis.js'
export default async function handler(req,res){
  const userId=req.query.userId
  if(!userId) return res.status(400).json({ok:false,error:'missing userId'})
  const r=await getRedis()
  const ids=await r.zRange(`user:${userId}:tips`,0,-1)
  const tips=await Promise.all(ids.map(async id=>await r.hGetAll(`tip:${id}`)))
  const total=tips.reduce((s,t)=>s+(Number(t.amount||0)),0)
  res.status(200).json({ok:true,data:{tips,total}})
}

