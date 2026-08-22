/* PCM Somagede — Supabase Auth + role gate + media upload foundation */
(() => {
  const SUPABASE_URL = 'https://yjergotkwxxrmhtziwo.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_Af1OUCyR5kOMOzXnPGDp5w_ucoze69A';
  const load = (src) => new Promise((resolve, reject) => { const s=document.createElement('script'); s.src=src; s.onload=resolve; s.onerror=reject; document.head.appendChild(s); });

  async function boot(){
    if (!window.supabase) await load('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.PCMSupabase = client;

    const editorBtn = document.getElementById('editorBtn');
    const updateUI = async (session) => {
      let role = null;
      if (session?.user) {
        const { data } = await client.from('profiles').select('role,aktif,nama').eq('id', session.user.id).maybeSingle();
        if (data?.aktif) role = data.role;
      }
      window.PCMUser = { session, role };
      if (editorBtn) editorBtn.classList.toggle('hidden', !['admin','editor'].includes(role));
      document.dispatchEvent(new CustomEvent('pcm-auth-changed',{detail:{session,role}}));
    };

    const { data } = await client.auth.getSession();
    await updateUI(data.session);
    client.auth.onAuthStateChange((_event, session) => updateUI(session));

    // Expose safe, browser-side operations for the future Editor.
    window.PCMSupabaseAuth = {
      signIn: (email,password) => client.auth.signInWithPassword({email,password}),
      signUp: (email,password) => client.auth.signUp({email,password}),
      signOut: () => client.auth.signOut(),
      getSession: () => client.auth.getSession(),
      getRole: async () => {
        const {data:{session}} = await client.auth.getSession();
        if (!session) return null;
        const {data} = await client.from('profiles').select('role,aktif,nama').eq('id',session.user.id).maybeSingle();
        return data?.aktif ? data.role : null;
      }
    };

    window.PCMSupabaseMedia = {
      upload: async (file, folder='uploads') => {
        const {data:{session}} = await client.auth.getSession();
        if (!session) throw new Error('Silakan login terlebih dahulu.');
        const role = await window.PCMSupabaseAuth.getRole();
        if (!['admin','editor'].includes(role)) throw new Error('Akses Editor ditolak.');
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g,'-');
        const path = `${folder}/${crypto.randomUUID()}-${safe}`;
        const result = await client.storage.from('Media').upload(path,file,{upsert:false,contentType:file.type||undefined});
        if (result.error) throw result.error;
        return {path, data:result.data};
      },
      remove: async (path) => {
        const role = await window.PCMSupabaseAuth.getRole();
        if (!['admin','editor'].includes(role)) throw new Error('Akses Editor ditolak.');
        return client.storage.from('Media').remove([path]);
      }
    };
  }
  boot().catch(err => console.error('Supabase init failed:',err));
})();
