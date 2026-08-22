/* PCM Somagede — Supabase auth compatibility layer
   Login UI is owned exclusively by login-fix.js. This file must not bind
   another click handler to the login/register controls. */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://yjergotkwxxrmhtziwo.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_Af1OUCyR5kOMOzXnPGDp5w_ucoze69A';
  const SESSION_KEY = 'pcm_supabase_session';

  const headers = (token) => ({
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${token || SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  });

  async function api(path, options = {}) {
    const response = await fetch(SUPABASE_URL + path, {
      ...options,
      headers: { ...headers(), ...(options.headers || {}) }
    });
    let body = null;
    try { body = await response.json(); } catch (_) {}
    if (!response.ok) {
      throw new Error(body?.msg || body?.message || body?.error_description || body?.error || `HTTP ${response.status}`);
    }
    return body;
  }

  function readSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
    catch (_) { return null; }
  }

  function saveSession(session) {
    try {
      if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      else localStorage.removeItem(SESSION_KEY);
    } catch (_) {}
  }

  async function getSession() {
    const session = readSession();
    if (!session?.access_token) return { data: { session: null } };
    try {
      const user = await api('/auth/v1/user', { headers: headers(session.access_token) });
      session.user = user;
      saveSession(session);
      return { data: { session } };
    } catch (_) {
      return { data: { session: null } };
    }
  }

  async function getRole(session) {
    if (!session?.user?.id || !session?.access_token) return null;
    try {
      const rows = await api(
        `/rest/v1/profiles?select=role,aktif,nama&id=eq.${encodeURIComponent(session.user.id)}&limit=1`,
        { headers: headers(session.access_token) }
      );
      const profile = Array.isArray(rows) ? rows[0] : null;
      return profile?.aktif && ['admin', 'editor'].includes(profile.role) ? profile.role : null;
    } catch (_) {
      return null;
    }
  }

  const auth = {
    async signInWithPassword({ email, password }) {
      try {
        const session = await api('/auth/v1/token?grant_type=password', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        saveSession(session);
        return { data: { session, user: session.user }, error: null };
      } catch (error) {
        return { data: { session: null, user: null }, error };
      }
    },

    async signUp({ email, password }) {
      try {
        const data = await api('/auth/v1/signup', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        if (data?.access_token) saveSession(data);
        return { data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },

    async resetPasswordForEmail(email, redirectTo = location.origin + location.pathname) {
      try {
        await api('/auth/v1/recover', {
          method: 'POST',
          body: JSON.stringify({ email, redirect_to: redirectTo })
        });
        return { error: null };
      } catch (error) {
        return { error };
      }
    },

    async signOut() {
      const session = readSession();
      if (session?.access_token) {
        try {
          await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
            method: 'POST',
            headers: headers(session.access_token)
          });
        } catch (_) {}
      }
      saveSession(null);
      return { error: null };
    },

    getSession
  };

  async function refreshRole(detail) {
    const session = detail?.session || (await getSession()).data.session;
    const role = detail?.role || await getRole(session);
    const profile = detail?.profile || null;
    window.PCMUser = { session, role, profile };
    document.getElementById('editorBtn')?.classList.toggle('hidden', !['admin', 'editor'].includes(role));
    return { session, role, profile };
  }

  // Do not replace window.PCMSupabase: supabase-integration.js owns that client.
  window.PCMSupabaseAuth = {
    signIn: (email, password) => auth.signInWithPassword({ email, password }),
    signUp: (email, password) => auth.signUp({ email, password }),
    signOut: () => auth.signOut(),
    getSession,
    getRole: async () => (await refreshRole()).role
  };

  refreshRole().catch(() => {});
  document.addEventListener('pcm-auth-changed', (event) => {
    refreshRole(event.detail).catch(() => {});
  });
})();
