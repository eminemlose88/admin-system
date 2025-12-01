document.getElementById('login').addEventListener('click', async () => {
  const username = document.getElementById('username').value
  const password = document.getElementById('password').value
  const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
  if (r.ok) {
    location.href = '/'
  } else {
    const j = await r.json().catch(() => ({}))
    document.getElementById('msg').textContent = j.error || '登录失败'
  }
})
