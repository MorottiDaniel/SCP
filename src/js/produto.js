window.addEventListener('DOMContentLoaded', function () {
    const botoesCategoria = document.querySelectorAll('.categoriaSelectBtn');

    let hiddenInputAtual = null;
    let selectedInputAtual = null;

    // Criar modal simples dinamicamente (usa classes definidas em produto.css)
    const modal = document.createElement('div');
    modal.id = 'categoriaModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-box">
            <div class="modal-header">
                <h2 class="modal-title">Selecione uma categoria</h2>
                <button id="closeCategoriaModal" class="modal-close">&times;</button>
            </div>
            <div class="modal-search">
                <input id="categoriaSearchInput" placeholder="Pesquisar categoria" />
            </div>
            <div class="modal-body">
                <table class="modal-table">
                    <thead><tr><th>ID</th><th>Descrição</th></tr></thead>
                    <tbody id="categoriaModalBody"></tbody>
                </table>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const modalBody = document.getElementById('categoriaModalBody');
    const categoriaSearchInput = document.getElementById('categoriaSearchInput');
    const closeBtn = document.getElementById('closeCategoriaModal');

    async function fetchCategorias() {
        try {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase.from('categoria_produto').select('*').order('categoria_produto_id', { ascending: true });
            if (error) {
                console.error('Erro ao buscar categorias:', error);
                return [];
            }
            return data || [];
        } catch (err) {
            console.error(err);
            return [];
        }
    }

    function renderCategorias(categorias) {
    modalBody.innerHTML = '';

    if (!categorias.length) {
        const tr = document.createElement('tr');
        tr.innerHTML =
            '<td colspan="2" class="modal-empty">Nenhuma categoria</td>';
        modalBody.appendChild(tr);
        return;
    }

    categorias.forEach(cat => {
        const tr = document.createElement('tr');
        tr.className = 'modal-row';

        tr.innerHTML = `
            <td>${cat.categoria_produto_id}</td>
            <td>${cat.ds_categoria_produto}</td>
        `;

        tr.addEventListener('click', () => {

            if (hiddenInputAtual) {
                hiddenInputAtual.value = cat.categoria_produto_id;
            }

            if (selectedInputAtual) {
                selectedInputAtual.value =
                    `${cat.categoria_produto_id} - ${cat.ds_categoria_produto}`;
            }

            closeModal();
        });

        modalBody.appendChild(tr);
    });
}

    function openModal() {
        modal.classList.add('open');
        categoriaSearchInput.value = '';
        categoriaSearchInput.focus();
    }

    function closeModal() {
        modal.classList.remove('open');
    }

    botoesCategoria.forEach(btn => {

    btn.addEventListener('click', async () => {

        const categoriaRow = btn.closest('.categoria-row');

        hiddenInputAtual =
            categoriaRow.querySelector('.categoria_produto_id');

        selectedInputAtual =
            categoriaRow.querySelector('.categoriaSelectedInput');

        openModal();

        const categorias = await fetchCategorias();
        renderCategorias(categorias);
    });

});

    closeBtn?.addEventListener('click', () => closeModal());

    categoriaSearchInput?.addEventListener('input', async (e) => {
        const filtro = e.target.value.trim().toLowerCase();
        const categorias = await fetchCategorias();
        if (!filtro) {
            renderCategorias(categorias);
            return;
        }
        const filtradas = categorias.filter(c => (c.ds_categoria_produto || '').toLowerCase().includes(filtro) || String(c.categoria_produto_id).includes(filtro));
        renderCategorias(filtradas);
    });

});
