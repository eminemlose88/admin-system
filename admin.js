const keyEl=document.getElementById('admin-key')
const saveBtn=document.getElementById('save-key')
const sumBtn=document.getElementById('refresh-sum')
const sumEl=document.getElementById('summary')
const qUser=document.getElementById('q-user')
const qBtn=document.getElementById('query-user')
const uRes=document.getElementById('user-result')
const tipId=document.getElementById('tip-id')
const cBtn=document.getElementById('confirm-tip')
const cMsg=document.getElementById('confirm-msg')
const qAcc=document.getElementById('q-account')
const rAcc=document.getElementById('resolve-account')

function getKey(){return localStorage.getItem('admin_key')||''}
function setKey(v){localStorage.setItem('admin_key',v)}
keyEl.value=getKey()
saveBtn.onclick=()=>{setKey(keyEl.value);alert('已保存')}

async function api(path,opts={}){
  const headers=Object.assign({'Content-Type':'application/json'},opts.headers||{})
  if(opts.method==='POST'&&opts.body&&typeof opts.body!=='string') opts.body=JSON.stringify(opts.body)
  const r=await fetch(path,{...opts,headers})
  return r.json()
}

async function refreshSummary(){
  const data=await api('/api/tips/summary')
  if(data.ok){sumEl.textContent=`总账：${data.data.total||0} · 用户数：${data.data.users||0}`}
}
sumBtn.onclick=refreshSummary
refreshSummary()

qBtn.onclick=async()=>{
  uRes.innerHTML=''
  const id=qUser.value.trim()
  if(!id) return
  const data=await api(`/api/tips/by-user?userId=${encodeURIComponent(id)}`)
  if(!data.ok){uRes.textContent='查询失败';return}
  const tips=(data.data&&data.data.tips)||[]
  const total=(data.data&&data.data.total)||0
  const list=document.createElement('div')
  list.className='menu-list'
  tips.forEach(t=>{const d=document.createElement('div');d.className='menu-item';d.textContent=`${t.id} · ${t.amount} ${t.currency||''} · ${t.method} · ${t.status}`;list.append(d)})
  const head=document.createElement('div');head.className='subtitle';head.textContent=`合计：${total}`
  uRes.append(head,list)
}

rAcc.onclick=async()=>{
  const acc=qAcc.value.trim(); if(!acc) return
  const data=await api(`/api/users/find?account=${encodeURIComponent(acc)}`)
  if(data.ok){qUser.value=data.data.id;alert('用户ID：'+data.data.id)} else {alert('未找到该账号')}
}

cBtn.onclick=async()=>{
  cMsg.textContent=''
  const id=tipId.value.trim()
  if(!id) return
  const data=await api('/api/tips/confirm',{method:'POST',headers:{Authorization:'Bearer '+getKey()},body:{id}})
  if(data.ok){cMsg.textContent=`已标记：${id} -> ${data.data.status}`} else {cMsg.textContent='操作失败'}
}

