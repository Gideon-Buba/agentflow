// ── Config ────────────────────────────────────────────────────────────────────
const BASE_KEY  = 'agentflow_base';
const TOKEN_KEY = 'agentflow_token';

function getBase()  { return localStorage.getItem(BASE_KEY)  || 'http://localhost:3001'; }
function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }

function setToken(t) {
  localStorage.setItem(TOKEN_KEY, t);
  renderTokenBar();
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  renderTokenBar();
}

// ── Token bar ─────────────────────────────────────────────────────────────────
function renderTokenBar() {
  const bar = document.getElementById('token-bar');
  if (!bar) return;
  const t = getToken();
  bar.innerHTML = t
    ? `<span class="tb-label">🔑 Token</span>
       <span class="tb-value" title="${t}">${t.slice(0, 40)}…</span>
       <button class="btn-sm" onclick="navigator.clipboard.writeText(getToken())">Copy</button>
       <button class="btn-sm btn-danger" onclick="clearToken()">Clear</button>
       <a href="auth.html" style="font-size:11px;color:var(--muted);text-decoration:none;">change</a>`
    : `<span class="tb-label">🔑 Token</span>
       <span class="tb-none">No token — <a href="auth.html" style="color:var(--warning);">log in first</a></span>`;
}

// ── API helper ────────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(getBase() + path, opts);
  let data;
  try { data = await res.json(); } catch { data = { _raw: await res.text() }; }
  return { status: res.status, ok: res.ok, data };
}

// ── Response renderer ─────────────────────────────────────────────────────────
function showResult(elId, result, { token } = {}) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.className = 'response ' + (result.ok ? 'ok' : 'err');
  el.textContent = `HTTP ${result.status}\n\n${JSON.stringify(result.data, null, 2)}`;
  if (token && result.ok && result.data?.accessToken) {
    setToken(result.data.accessToken);
  }
}

function showLoading(elId, msg = 'Sending request…') {
  const el = document.getElementById(elId);
  if (!el) return;
  el.className = 'response loading';
  el.textContent = msg;
}

function showError(elId, msg) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.className = 'response err';
  el.textContent = msg;
}

// ── Nav active state ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderTokenBar();
  const current = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav a[data-page]').forEach(a => {
    if (a.dataset.page === current) a.classList.add('active');
  });
});
