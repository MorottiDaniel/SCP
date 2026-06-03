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