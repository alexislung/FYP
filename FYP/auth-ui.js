// Easy Job - simple auth UI (shows "Hi, <name>" when logged in)
(function () {
  function getStoredName() {
    try { return (localStorage.getItem('easyjob_name') || '').trim(); } catch (_) { return ''; }
  }

  function setStoredName(name) {
    try { localStorage.setItem('easyjob_name', (name || '').trim()); } catch (_) {}
  }

  function clearStoredName() {
    try { localStorage.removeItem('easyjob_name'); } catch (_) {}
  }

  function pickDisplayName(user) {
    if (!user) return '';
    var meta = user.user_metadata || {};
    var first = (meta.first_name || meta.firstName || '').trim();
    var last = (meta.last_name || meta.lastName || '').trim();
    var full = (first + ' ' + last).trim();
    return full || (user.email || '').trim();
  }

  function ensureLogoutButton(anchorEl) {
    if (!anchorEl || document.getElementById('authLogoutBtn')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'authLogoutBtn';
    btn.className = 'shrink-0 text-sm font-medium text-neutral-600 hover:text-cyan-600 transition';
    btn.textContent = 'Logout';
    btn.addEventListener('click', async function () {
      btn.disabled = true;
      try {
        if (window.easyjobSupabase) {
          await window.easyjobSupabase.auth.signOut();
        }
      } catch (_) {
        // ignore
      } finally {
        clearStoredName();
        window.location.href = 'index.html';
      }
    });
    anchorEl.insertAdjacentElement('afterend', btn);
  }

  function applyGreeting(name) {
    var el = document.getElementById('authLink');
    if (!el) return;
    if (name) {
      el.textContent = 'Hi, ' + name;
      el.href = 'account.html';
      el.classList.remove('hover:text-cyan-600');
      el.classList.add('text-cyan-700');
      ensureLogoutButton(el);
    } else {
      el.textContent = 'Login';
      el.href = 'login.html';
      var logout = document.getElementById('authLogoutBtn');
      if (logout) logout.remove();
    }
  }

  async function initSupabaseIfPossible() {
    // Optional: pages may already include supabase-js CDN
    if (!window.supabase) return null;

    // Try to read config from globals set in login/signup
    var url = (window.SUPABASE_URL || '').trim();
    var key = (window.SUPABASE_ANON_KEY || '').trim();
    if (!url || !key) return null;

    try {
      return window.supabase.createClient(url, key);
    } catch (_) {
      return null;
    }
  }

  document.addEventListener('DOMContentLoaded', async function () {
    // Fast path: show greeting from localStorage immediately (no network)
    applyGreeting(getStoredName());

    // If supabase is available + configured on this page, verify session and improve name
    var client = await initSupabaseIfPossible();
    if (!client) return;
    window.easyjobSupabase = client;

    try {
      var res = await client.auth.getSession();
      var session = res && res.data ? res.data.session : null;
      if (session && session.user) {
        var name = pickDisplayName(session.user);
        if (name) setStoredName(name);
        applyGreeting(name || getStoredName());
      } else {
        applyGreeting('');
      }
    } catch (_) {
      // keep localStorage greeting as fallback
    }
  });
})();

