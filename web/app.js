const qs = p => new URLSearchParams(p).toString()
const switchTab = id => {
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'))
  const el = document.getElementById(id)
  if (el) el.classList.add('active')
}
document.querySelectorAll('.sidebar button').forEach(btn => {
  btn.addEventListener('click', () => switchTab(`tab-${btn.dataset.tab}`))
})
switchTab('tab-users')
// 自动加载用户与账单数据
const autoLoadUsers = async () => {
  try {
    const r = await fetch('/api/accounts?limit=100&offset=0')
    const j = await r.json()
    renderRows(document.getElementById('accountsBody'), j.data || [], ['id','email','name','created_at'])
  } catch {}
}
const autoLoadBills = async () => {
  try {
    const r = await fetch('/api/transactions?limit=100&offset=0')
    const j = await r.json()
    renderRows(document.getElementById('txBody'), j.data || [], ['id','account_id','amount','currency','status','provider','external_id','created_at'])
  } catch {}
}
autoLoadUsers()

document.querySelector('[data-tab="users"]').addEventListener('click', autoLoadUsers)
document.querySelector('[data-tab="bills"]').addEventListener('click', autoLoadBills)
document.querySelector('[data-tab="payment"]').addEventListener('click', () => {
  const pre = document.getElementById('callbacks')
  const es = new EventSource('/api/payment/callbacks/monitor')
  es.onmessage = e => {
    const d = JSON.parse(e.data)
    pre.textContent = JSON.stringify(d, null, 2)
  }
})

const renderRows = (tbody, rows, cols) => {
  tbody.innerHTML = rows.map(r => `<tr>${cols.map(c => `<td>${r[c] ?? ''}</td>`).join('')}</tr>`).join('')
}

document.getElementById('loadAccounts').addEventListener('click', async () => {
  const q = document.getElementById('accountQuery').value
  const r = await fetch(`/api/accounts?${qs({ query: q })}`)
  const j = await r.json()
  renderRows(document.getElementById('accountsBody'), j.data || [], ['id','email','name','created_at'])
})

document.getElementById('loadTx').addEventListener('click', async () => {
  const accountId = document.getElementById('txAccountId').value
  const status = document.getElementById('txStatus').value
  const provider = document.getElementById('txProvider').value
  const r = await fetch(`/api/transactions?${qs({ accountId, status, provider })}`)
  const j = await r.json()
  renderRows(document.getElementById('txBody'), j.data || [], ['id','account_id','amount','currency','status','provider','external_id','created_at'])
})

const healthSpan = document.getElementById('health')
const source = new EventSource('/api/payment/monitor')
source.onmessage = e => {
  const d = JSON.parse(e.data)
  healthSpan.textContent = d.status
  healthSpan.className = d.status
}

document.getElementById('loadUsers').addEventListener('click', async () => {
  const r = await fetch('/api/auth/users')
  const j = await r.json()
  const tbody = document.getElementById('usersBody')
  const rows = (j.data?.users || j.data || []).map(u => ({ id: u.id, email: u.email, name: u.user_metadata?.name || '', created_at: u.created_at }))
  tbody.innerHTML = rows.map(u => `<tr>
    <td>${u.id}</td>
    <td>${u.email}</td>
    <td><input value="${u.name}" data-id="${u.id}" class="userName" /></td>
    <td>${u.created_at}</td>
    <td><button data-id="${u.id}" class="saveUser">保存</button> <button data-id="${u.id}" class="delUser">删除</button></td>
  </tr>`).join('')
  tbody.querySelectorAll('.delUser').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id')
      await fetch(`/api/auth/users/${id}`, { method: 'DELETE' })
      btn.closest('tr').remove()
    })
  })
  tbody.querySelectorAll('.saveUser').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id')
      const input = tbody.querySelector(`input.userName[data-id="${id}"]`)
      const name = input.value
      await fetch(`/api/auth/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_metadata: { name } }) })
    })
  })
})

document.getElementById('createUser').addEventListener('click', async () => {
  const email = document.getElementById('newUserEmail').value
  const password = document.getElementById('newUserPassword').value
  const r = await fetch('/api/auth/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, email_confirm: true }) })
  const j = await r.json()
  if (j.data?.id) {
    document.getElementById('loadUsers').click()
  }
})

document.getElementById('listAssets').addEventListener('click', async () => {
  const prefix = document.getElementById('assetPrefix').value
  const r = await fetch(`/api/assets/list?${qs({ prefix })}`)
  const j = await r.json()
  const tbody = document.getElementById('assetsBody')
  const items = j.data?.blobs || j.data?.items || []
  tbody.innerHTML = items.map(b => `<tr><td><a href="${b.url}" target="_blank">${b.url}</a></td><td>${b.size || ''}</td><td><button data-url="${b.url}" class="delAsset">删除</button></td></tr>`).join('')
  tbody.querySelectorAll('.delAsset').forEach(btn => {
    btn.addEventListener('click', async () => {
      const url = btn.getAttribute('data-url')
      await fetch(`/api/assets?${qs({ url })}`, { method: 'DELETE' })
      btn.closest('tr').remove()
    })
  })
})

document.getElementById('uploadAsset').addEventListener('click', async () => {
  const fileEl = document.getElementById('assetFile')
  const filename = document.getElementById('assetFileName').value || (fileEl.files[0]?.name || '')
  const contentType = document.getElementById('assetContentType').value || (fileEl.files[0]?.type || 'application/octet-stream')
  const file = fileEl.files[0]
  if (!file) return
  const buf = await file.arrayBuffer()
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
  await fetch('/api/assets/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename, contentType, dataBase64: b64 }) })
  document.getElementById('listAssets').click()
})

document.getElementById('startCallbacks').addEventListener('click', async () => {
  const pre = document.getElementById('callbacks')
  const es = new EventSource('/api/payment/callbacks/monitor')
  es.onmessage = e => {
    const d = JSON.parse(e.data)
    pre.textContent = JSON.stringify(d, null, 2)
  }
})
