// Shared Supabase config for Easy Job (client-side)
// NOTE: anon key is safe to expose in frontend; NEVER use service_role key here.
(function () {
  // Fill these once, all pages reuse.
  // From Supabase Dashboard -> Project Settings -> API
  window.SUPABASE_URL = window.SUPABASE_URL || 'https://ylpzdegpjbkrhfbqcbvc.supabase.co';
  window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'sb_publishable_otHMsDv-KIy08iRvQmS3rQ_5kf1GmSL';

  window.getEasyjobSupabase = function getEasyjobSupabase() {
    if (!window.supabase) return null;
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return null;
    if (window.easyjobSupabase) return window.easyjobSupabase;
    try {
      window.easyjobSupabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
      return window.easyjobSupabase;
    } catch (_) {
      return null;
    }
  };
})();

