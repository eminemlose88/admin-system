const qs = p => new URLSearchParams(p).toString()

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
