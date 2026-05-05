/**
 * Loads Supabase public settings when they are not hard-coded in HTML.
 *
 * Prefer: Flask serves url + anon key from environment via GET /api/public/supabase,
 * so keys are not committed to the repository (see SECURITY notes for teachers).
 *
 * Fallback: before this script, set window.SUPABASE_URL and window.SUPABASE_ANON_KEY
 * (only for temporary local debugging; do not publish real secrets).
 */
(function () {
  var _configPromise = null;
  function applyPublicConfig(data) {
    if (data && data.url) window.SUPABASE_URL = String(data.url);
    if (data && data.anon_key) window.SUPABASE_ANON_KEY = String(data.anon_key);
  }

  function hasConfig() {
    return (window.SUPABASE_URL || "").trim().length > 0 && (window.SUPABASE_ANON_KEY || "").trim().length > 0;
  }

  window.ensureEasyjobSupabaseConfig = function ensureEasyjobSupabaseConfig() {
    if (_configPromise) {
      return _configPromise;
    }
    if (hasConfig()) {
      _configPromise = Promise.resolve();
      return _configPromise;
    }
    _configPromise = fetch("/api/public/supabase")
      .then(function (res) {
        return res.ok ? res.json() : {};
      })
      .then(function (data) {
        applyPublicConfig(data);
        if (hasConfig()) return;
        return fetch("/supabase-public.json")
          .then(function (res) {
            return res.ok ? res.json() : {};
          })
          .then(function (fallbackData) {
            applyPublicConfig(fallbackData);
          })
          .catch(function () {});
      })
      .catch(function () {});
    return _configPromise;
  };

  window.getEasyjobSupabase = function getEasyjobSupabase() {
    if (!window.supabase) return null;
    var url = (window.SUPABASE_URL || "").trim();
    var key = (window.SUPABASE_ANON_KEY || "").trim();
    if (!url || !key) return null;
    if (!window.easyjobSupabase) {
      try {
        window.easyjobSupabase = window.supabase.createClient(url, key);
      } catch (_) {
        return null;
      }
    }
    return window.easyjobSupabase;
  };
})();
