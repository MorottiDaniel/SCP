function obterNavbarHTML() {
  return `
    <nav class="navbar">
      <div class="menu-item">
        <button class="menu-button" onclick="abrirDropdown('cadastro')">
          Cadastro
        </button>

        <div class="dropdown" id="cadastro">
          <a href="/src/cliente.html">Clientes</a>
          <a href="/src/categoria.html">Categorias</a>
          <a href="/src/produto.html">Produtos</a>
        </div>
      </div>

      <div class="menu-item">
        <button class="menu-button" onclick="abrirDropdown('vendas')">
          Vendas
        </button>

        <div class="dropdown" id="vendas">
          <a href="#">Orçamentos</a>
        </div>
      </div>

      <button class="menu-button sair">Sair</button>
    </nav>
  `;
}

function inserirNavbar() {
  const navbarRoot = document.getElementById('navbar-root');
  if (navbarRoot) {
    navbarRoot.innerHTML = obterNavbarHTML();
  }
}

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
  inserirNavbar();
  configurarLogout();
});
