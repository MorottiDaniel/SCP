function configurarMostrarSenha() {
  const toggleSenha = document.getElementById('toggleSenha');
  const campoSenha = document.getElementById('senha');

  if (toggleSenha && campoSenha) {
    toggleSenha.addEventListener('click', function() {
      const tipoAtual = campoSenha.getAttribute('type');
      const novoTipo = tipoAtual === 'password' ? 'text' : 'password';
      campoSenha.setAttribute('type', novoTipo);
      toggleSenha.textContent = novoTipo === 'password' ? '👁' : '🙈';
      toggleSenha.setAttribute('aria-label', novoTipo === 'password' ? 'Mostrar senha' : 'Ocultar senha');
    });
  }
}

function configurarLoginForm() {
  const loginForm = document.getElementById('loginForm');
  const recuperarSenha = document.getElementById('recuperarSenha');

  if (loginForm) {
    loginForm.addEventListener('submit', async function(event) {
      event.preventDefault();

      const email = document.getElementById('email').value.trim();
      const senha = document.getElementById('senha').value;
      const btnEntrar = loginForm.querySelector('.btn-entrar');

      btnEntrar.disabled = true;
      btnEntrar.textContent = 'Entrando...';

      const erroLogin = document.getElementById('erroLogin');
      erroLogin.classList.add('hidden');

      const { error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });

      if (error) {
        erroLogin.textContent = 'Email ou senha inválidos.';
        erroLogin.classList.remove('hidden');
        btnEntrar.disabled = false;
        btnEntrar.textContent = 'Entrar';
        return;
      }

      window.location.href = '/src/menu.html';
    });
  }

  if (recuperarSenha) {
    recuperarSenha.addEventListener('click', async function(event) {
      event.preventDefault();
      const email = document.getElementById('email').value.trim();
      const msgRecuperar = document.getElementById('msgRecuperar');
      if (!email) {
        msgRecuperar.textContent = 'Digite seu email antes de solicitar a recuperação de senha.';
        msgRecuperar.className = 'msg-erro';
        return;
      }
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
      if (error) {
        msgRecuperar.textContent = 'Erro ao enviar email de recuperação.';
        msgRecuperar.className = 'msg-erro';
      } else {
        msgRecuperar.textContent = 'Email de recuperação enviado! Verifique sua caixa de entrada.';
        msgRecuperar.className = 'msg-sucesso';
      }
    });
  }
}

window.addEventListener('DOMContentLoaded', function() {
  configurarMostrarSenha();
  configurarLoginForm();
});
