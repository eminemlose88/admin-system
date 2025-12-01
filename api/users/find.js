import { getRedis } from '../_lib/redis.js'
export default async function handler(req,res){
  const account=req.query.account
  if(!account) return res.status(400).json({ok:false,error:'missing account'})
  const r=await getRedis()
  const id=await r.get(`userByAccount:${account}`)
  if(!id) return res.status(404).json({ok:false,error:'not found'})
  const data=await r.hGetAll(`user:${id}`)
  delete data.password
  res.status(200).json({ok:true,data:{id:String(id),user:data}})
}

