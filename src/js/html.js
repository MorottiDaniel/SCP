function abrirDropdown(id) {
  const dropdownClicado = document.getElementById(id);
  const todosDropdowns = document.querySelectorAll('.dropdown');

  todosDropdowns.forEach(function(dropdown) {
    if (dropdown !== dropdownClicado) {
      dropdown.classList.remove('show');
    }
  });

  dropdownClicado.classList.toggle('show');
}

function configurarLogout() {
  const botoesSair = document.querySelectorAll('.sair');
  botoesSair.forEach(function(botao) {
    botao.addEventListener('click', function() {
      window.location.href = '/src/login.html';
    });
  });
}

window.addEventListener('DOMContentLoaded', function() {
  configurarLogout();
});
