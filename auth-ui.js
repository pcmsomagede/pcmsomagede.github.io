/* PCM Somagede — real Supabase login/register UI */
(() => {
  'use strict';
  const URL = 'https://yjergotkwxxrmhtziwo.supabase.co';
  const KEY = 'sb_publishable_Af1OUCyR5kOMOzXnPGDp5w_ucoze69A';

  const load = src => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });

  const q = (sel, root=document) => root.querySelector(sel);

  async function boot() {
    if (!window.supabase?.createClient) {
      await load('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
    }
    const client = window.supabase.createClient(URL, KEY);
    window.PCMSupabase = client;

    function fields(view) {
      return [...view.querySelectorAll('input')];
    }

    function message(view, text, ok=false) {
      let el = q('.pcm-auth-message', view);
      if (!el) {
        el = document.createElement('div');
        el.className = 'pcm-auth-message';
        el.style.cssText = 'margin-top:12px;padding:10px 12px;border-radius:10px;font-size:.88rem;font-weight:700;background:#eef8ff;color:#17436f';
        view.appendChild(el);
      }
      el.textContent = text;
      el.style.background = ok ? '#e9f8ef' : '#fff4e5';
      el.style.color = ok ? '#17663b' : '#7a4a00';
    }

    async function refreshRole() {
      const { data: { session } } = await client.auth.getSession();
      let role = null;
      if (session?.user) {
        const { data } = await client.from('profiles').select('role,aktif,nama').eq('id', session.user.id).maybeSingle();
        if (data?.aktif) role = data.role;
      }
      window.PCMUser = { session, role };
      const editor = document.getElementById('editorBtn');
      if (editor) editor.classList.toggle('hidden', !['admin','editor'].includes(role));
      return { session, role };
    }

    async function bindLogin() {
      const view = document.getElementById('login');
      if (!view || view.dataset.supabaseBound) return;
      view.dataset.supabaseBound = '1';
      const inputs = fields(view);
      const email = inputs.find(x => x.type === 'email') || inputs[0];
      const password = inputs.find(x => x.type === 'password') || inputs[1];
      const button = [...view.querySelectorAll('button')].find(b => /masuk|login/i.test(b.textContent));
      if (!email || !password || !button) return;
      button.addEventListener('click', async e => {
        e.preventDefault();
        button.disabled = true;
        button.textContent = 'Memproses…';
        const { error } = await client.auth.signInWithPassword({ email: email.value.trim(), password: password.value });
        if (error) {
          message(view, 'Login gagal: ' + error.message);
        } else {
          const { role } = await refreshRole();
          if (!['admin','editor'].includes(role)) {
            message(view, 'Login berhasil, tetapi akun belum memiliki otoritas Editor.');
          } else {
            message(view, 'Login berhasil. Otoritas Editor aktif.', true);
            setTimeout(() => { if (typeof window.go === 'function') window.go('editor'); }, 250);
          }
        }
        button.disabled = false;
        button.textContent = 'Masuk';
      });
    }

    async function bindRegister() {
      const view = document.getElementById('register');
      if (!view || view.dataset.supabaseBound) return;
      view.dataset.supabaseBound = '1';
      const inputs = fields(view);
      const email = inputs.find(x => x.type === 'email') || inputs[0];
      const password = inputs.find(x => x.type === 'password') || inputs[1];
      const button = [...view.querySelectorAll('button')].find(b => /daftar|register|buat/i.test(b.textContent));
      if (!email || !password || !button) return;
      button.addEventListener('click', async e => {
        e.preventDefault();
        button.disabled = true;
        const { error } = await client.auth.signUp({ email: email.value.trim(), password: password.value });
        message(view, error ? 'Pendaftaran gagal: ' + error.message : 'Pendaftaran berhasil. Silakan cek email jika verifikasi diminta.', !error);
        button.disabled = false;
      });
    }

    async function bindLogout() {
      document.addEventListener('click', async e => {
        const b = e.target.closest('[data-route="logout"]');
        if (!b) return;
        e.preventDefault();
        await client.auth.signOut();
        location.reload();
      });
    }

    await refreshRole();
    client.auth.onAuthStateChange(() => { refreshRole(); });
    await bindLogin();
    await bindRegister();
    await bindLogout();

    // The existing single-page router may reveal the login view after boot.
    document.addEventListener('click', () => {
      setTimeout(() => { bindLogin(); bindRegister(); }, 50);
    });
  }

  boot().catch(err => console.error('PCM Auth UI failed:', err));
})();
