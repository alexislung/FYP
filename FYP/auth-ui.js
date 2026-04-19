(function () {
  function getStoredName() {
    try { return (localStorage.getItem('easyjob_name') || '').trim(); } catch (_) { return ''; }
  }

  function setStoredName(name) {
    try { localStorage.setItem('easyjob_name', (name || '').trim()); } catch (_) {}
  }

  function getStoredAccountType() {
    try { return (localStorage.getItem('easyjob_account_type') || '').trim().toLowerCase(); } catch (_) { return ''; }
  }

  function setStoredAccountType(type) {
    try { localStorage.setItem('easyjob_account_type', (type || '').trim().toLowerCase()); } catch (_) {}
  }

  function clearStoredName() {
    try { localStorage.removeItem('easyjob_name'); } catch (_) {}
  }

  function clearStoredAccountType() {
    try { localStorage.removeItem('easyjob_account_type'); } catch (_) {}
  }

  function pickDisplayName(user) {
    if (!user) return '';
    var meta = user.user_metadata || {};
    var first = (meta.first_name || meta.firstName || '').trim();
    var last = (meta.last_name || meta.lastName || '').trim();
    return first || last || (user.email || '').trim();
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
      } finally {
        clearStoredName();
        clearStoredAccountType();
        window.location.href = 'index.html';
      }
    });
    anchorEl.insertAdjacentElement('afterend', btn);
  }

  function applyGreeting(name) {
    var el = document.getElementById('authLink');
    if (!el) return;
    var accountType = getStoredAccountType();
    if (name) {
      el.textContent = 'Hi ' + name;
      el.href = accountType === 'business' ? 'hr-post.html' : 'account.html';
      el.classList.remove('hover:text-cyan-600');
      el.classList.add('text-cyan-700');
      el.classList.add('no-underline');
      el.style.background = 'transparent';
      el.style.boxShadow = 'none';
      el.style.outline = 'none';
      ensureLogoutButton(el);
    } else {
      el.textContent = 'Login';
      el.href = 'login.html';
      el.classList.add('no-underline');
      var logout = document.getElementById('authLogoutBtn');
      if (logout) logout.remove();
    }
  }

  async function initSupabaseIfPossible() {
    if (!window.supabase) return null;
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
    applyGreeting(getStoredName());
    var client = await initSupabaseIfPossible();
    if (!client) return;
    window.easyjobSupabase = client;

    try {
      var res = await client.auth.getSession();
      var session = res && res.data ? res.data.session : null;
      if (session && session.user) {
        var name = pickDisplayName(session.user);
        var meta = session.user.user_metadata || {};
        var accountType = (meta.account_type || '').toString().toLowerCase();
        if (name) setStoredName(name);
        if (accountType) setStoredAccountType(accountType);
        applyGreeting(name || getStoredName());
      } else {
        clearStoredAccountType();
        applyGreeting('');
      }
    } catch (_) {
    }
  });
})();
