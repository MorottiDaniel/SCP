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
    loginForm.addEventListener('submit', function(event) {
      event.preventDefault();
      window.location.href = '/src/menu.html';
    });
  }

  if (recuperarSenha) {
    recuperarSenha.addEventListener('click', function(event) {
      event.preventDefault();
      alert('Recuperação de senha solicitada. Implemente o fluxo de recuperação aqui.');
    });
  }
}

window.addEventListener('DOMContentLoaded', function() {
  configurarMostrarSenha();
  configurarLoginForm();
});