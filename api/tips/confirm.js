import { getRedis } from '../_lib/redis.js'
import { requireAdmin } from '../_lib/auth.js'
export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({ok:false,error:'method'})
  if(!requireAdmin(req,res)) return
  const {id,status}=req.body||{}
  if(!id) return res.status(400).json({ok:false,error:'missing id'})
  const r=await getRedis()
  const exists=await r.exists(`tip:${id}`)
  if(!exists) return res.status(404).json({ok:false,error:'not found'})
  await r.hSet(`tip:${id}`,{status:status||'completed',confirmedAt:String(Date.now())})
  res.status(200).json({ok:true,data:{id,status:status||'completed'}})
}

