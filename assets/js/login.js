/**
 * @file login.js
 * @module login
 * @description Login simplificado para sistema geral com usuario unico.
 * @requisitos RF09
 * @ator UsuarioUnico
 * @mode real
 */

(function initLoginPage() {
  if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return;
  const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  async function sessaoValida() {
    const { data, error } = await client.auth.getUser();
    return !error && !!data?.user?.id;
  }

  async function boot() {
    const { data } = await client.auth.getSession();
    const token = data?.session?.access_token;
    if (token && await sessaoValida()) {
      window.location.href = 'index.html';
    }
  }

  function bindCardTilt() {
    const card = document.querySelector('.login-wrap');
    if (!card) return;

    card.addEventListener('mousemove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const px = (x / rect.width) - 0.5;
      const py = (y / rect.height) - 0.5;
      card.style.transform = `rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg) translateY(-2px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  }

  document.getElementById('loginForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('loginEmail')?.value?.trim();
    const senha = document.getElementById('loginPassword')?.value || '';
    const feedback = document.getElementById('loginFeedback');
    if (feedback) feedback.textContent = 'Autenticando...';

    const { data, error } = await client.auth.signInWithPassword({ email, password: senha });
    if (error || !data?.session?.access_token) {
      if (feedback) feedback.textContent = error?.message || 'Falha de autenticacao.';
      return;
    }

    const ok = await sessaoValida();
    if (!ok) {
      if (feedback) feedback.textContent = 'Sessao invalida.';
      await client.auth.signOut();
      return;
    }

    window.location.href = 'index.html';
  });

  bindCardTilt();
  boot();
}());
