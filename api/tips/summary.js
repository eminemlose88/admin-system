import { getRedis } from '../_lib/redis.js'
export default async function handler(req,res){
  const r=await getRedis()
  const total=Number(await r.get('tips:total')||0)
  const users=Number(await r.get('user:seq')||0)
  res.status(200).json({ok:true,data:{total,users}})
}

