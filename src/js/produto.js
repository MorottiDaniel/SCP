const produtoForm = document.getElementById('produtoForm');
const produtoSearchForm = document.getElementById('produtoSearchForm');
const produtoTableBody = document.getElementById('produtoTableBody');
const produtoListaSection = document.getElementById('produtoListaSection');
const produtoIdInput = document.getElementById('produto_id');
const categoriaProdutoIdInput = document.getElementById('categoria_produto_id');
const categoriaSelectedInput = produtoForm?.querySelector('.categoriaSelectedInput');
const dsProdutoInput = document.getElementById('ds_produto');
const marcaInput = document.getElementById('marca');
const valorVendaInput = document.getElementById('valor_venda');
const quantidadeEstoqueInput = document.getElementById('quantidade_estoque');
const observacaoInput = document.getElementById('observacao');
const dataCadastroInput = document.getElementById('data_cadastro');
const statusInput = document.getElementById('status');
const btnCancelarEdicaoProduto = document.getElementById('btnCancelarEdicaoProduto');
const btnExcluirProduto        = document.getElementById('btnExcluirProduto');
const btnLimparProduto         = document.getElementById('btnLimparProduto');
const produtoFormTitulo        = document.getElementById('produtoFormTitulo');

const pesquisarProdutoIdInput = document.getElementById('pesquisarProdutoId');
const pesquisarCategoriaProdutoIdInput = document.getElementById('pesquisarCategoriaProdutoId');
const pesquisarCategoriaSelectedInput = produtoSearchForm?.querySelector('.categoriaSelectedInput');
const pesquisarDsProdutoInput = document.getElementById('pesquisarDsProduto');
const pesquisarMarcaInput = document.getElementById('pesquisarMarca');
const pesquisarObservacaoInput = document.getElementById('pesquisarObservacao');
const pesquisarQuantidadeEstoqueInput = document.getElementById('pesquisarQuantidadeEstoque');
const pesquisarEstoqueOperadorInput = document.getElementById('pesquisarEstoqueOperador');
const pesquisarValorVendaInput = document.getElementById('pesquisarValorVenda');
const pesquisarValorOperadorInput = document.getElementById('pesquisarValorOperador');
const pesquisarStatusInput = document.getElementById('pesquisarStatus');

let produtosCache = [];
let produtoEditandoId = null;

// ─── Modal de categoria ───────────────────────────────────────────────────────

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

let hiddenInputAtual = null;
let selectedInputAtual = null;

async function fetchCategorias() {
    try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('categoria_produto')
            .select('*')
            .order('categoria_produto_id', { ascending: true });
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

function renderModalCategorias(categorias) {
    modalBody.innerHTML = '';
    if (!categorias.length) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="2" class="modal-empty">Nenhuma categoria encontrada.</td>';
        modalBody.appendChild(tr);
        return;
    }
    categorias.forEach(cat => {
        const tr = document.createElement('tr');
        tr.className = 'modal-row';
        tr.innerHTML = `<td>${cat.categoria_produto_id}</td><td>${cat.ds_categoria_produto}</td>`;
        tr.addEventListener('click', () => {
            if (hiddenInputAtual) hiddenInputAtual.value = cat.categoria_produto_id;
            if (selectedInputAtual) selectedInputAtual.value = `${cat.categoria_produto_id} - ${cat.ds_categoria_produto}`;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mascararValorInput(v) {
    const digits = String(v).replace(/\D/g, '');
    if (!digits) return '';
    return (parseInt(digits, 10) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parsearValor(v) {
    return parseFloat(String(v).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
}

function formatarValor(valor) {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarStatus(status) {
    return status === 'A' ? 'Ativo' : 'Inativo';
}

function formatarData(timestamp) {
    if (!timestamp) return '';
    return timestamp.slice(0, 10);
}

// ─── Tabela ───────────────────────────────────────────────────────────────────

function criarLinhaProduto(produto) {
    const linha = document.createElement('tr');
    const categoria = produto.categoria_produto?.ds_categoria_produto ?? '-';
    linha.innerHTML = `
        <td>${produto.produto_id}</td>
        <td>${produto.ds_produto}</td>
        <td>${categoria}</td>
        <td>${produto.marca ?? '-'}</td>
        <td>${formatarValor(produto.valor_venda)}</td>
        <td>${produto.quantidade_estoque}</td>
        <td>${formatarStatus(produto.status)}</td>
        <td>
            <button type="button" class="btn-editar" data-produto-id="${produto.produto_id}">Editar</button>
        </td>
    `;
    linha.querySelector('.btn-editar').addEventListener('click', () => {
        carregarProdutoNoFormulario(produto.produto_id);
    });
    return linha;
}

function renderizarLista(produtos, emptyMessage = 'Nenhum produto encontrado.') {
    produtosCache = produtos || [];
    produtoTableBody.innerHTML = '';
    if (!produtosCache.length) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="8" class="text-center">${emptyMessage}</td>`;
        produtoTableBody.appendChild(tr);
        return;
    }
    produtosCache.forEach(p => produtoTableBody.appendChild(criarLinhaProduto(p)));
}

function mostrarLista(visible) {
    if (!produtoListaSection) return;
    produtoListaSection.classList.toggle('hidden', !visible);
}

// ─── Formulário de cadastro ───────────────────────────────────────────────────

function atualizarBotoesEdicao() {
    const editando = produtoEditandoId !== null;
    btnCancelarEdicaoProduto?.classList.toggle('hidden', !editando);
    btnExcluirProduto?.classList.toggle('hidden', !editando);
    btnLimparProduto?.classList.toggle('hidden', editando);
}

function limparFormularioProduto() {
    produtoEditandoId = null;
    if (produtoIdInput) produtoIdInput.value = '';
    if (categoriaProdutoIdInput) categoriaProdutoIdInput.value = '';
    if (categoriaSelectedInput) categoriaSelectedInput.value = '';
    if (dataCadastroInput) dataCadastroInput.value = '';
    if (produtoFormTitulo) produtoFormTitulo.textContent = 'Cadastro de Produto';
    atualizarBotoesEdicao();
}

function carregarProdutoNoFormulario(produtoId) {
    const produto = produtosCache.find(p => p.produto_id === produtoId);
    if (!produto) return;

    produtoEditandoId = produtoId;
    if (produtoIdInput) produtoIdInput.value = produto.produto_id;
    if (categoriaProdutoIdInput) categoriaProdutoIdInput.value = produto.categoria_produto_id;
    if (categoriaSelectedInput) {
        const dsCat = produto.categoria_produto?.ds_categoria_produto ?? '';
        categoriaSelectedInput.value = dsCat
            ? `${produto.categoria_produto_id} - ${dsCat}`
            : produto.categoria_produto_id;
    }
    if (dsProdutoInput) dsProdutoInput.value = produto.ds_produto;
    if (marcaInput) marcaInput.value = produto.marca ?? '';
    if (valorVendaInput) valorVendaInput.value = formatarValor(produto.valor_venda);
    if (quantidadeEstoqueInput) quantidadeEstoqueInput.value = produto.quantidade_estoque;
    if (observacaoInput) observacaoInput.value = produto.observacao ?? '';
    if (dataCadastroInput) dataCadastroInput.value = formatarData(produto.data_cadastro);
    if (statusInput) statusInput.value = produto.status;

    if (produtoFormTitulo) produtoFormTitulo.textContent = 'Dados do Produto';
    atualizarBotoesEdicao();
    produtoForm?.scrollIntoView({ behavior: 'smooth' });
}

async function salvarProduto(event) {
    event.preventDefault();

    const categoriaId = categoriaProdutoIdInput?.value;
    const dsProduto = dsProdutoInput?.value.trim();
    const valorVenda = valorVendaInput?.value;
    const quantidadeEstoque = quantidadeEstoqueInput?.value;

    if (!categoriaId) {
        alert('Selecione uma categoria.');
        return;
    }
    if (!dsProduto) {
        alert('Digite a descrição do produto.');
        return;
    }
    if (valorVenda === '' || valorVenda === null) {
        alert('Digite o valor de venda.');
        return;
    }
    if (quantidadeEstoque === '' || quantidadeEstoque === null) {
        alert('Digite a quantidade em estoque.');
        return;
    }

    const payload = {
        categoria_produto_id: Number(categoriaId),
        ds_produto: dsProduto,
        marca: marcaInput?.value.trim() || null,
        valor_venda: parsearValor(valorVenda),
        quantidade_estoque: Number(quantidadeEstoque),
        observacao: observacaoInput?.value.trim() || null,
        status: statusInput?.value || 'A',
    };

    const supabase = getSupabaseClient();
    const sucessoProduto = document.getElementById('sucessoProduto');
    sucessoProduto.style.display = 'none';

    if (produtoEditandoId) {
        const { error } = await supabase
            .from('produto')
            .update(payload)
            .eq('produto_id', produtoEditandoId);
        if (error) { alert('Erro ao salvar produto: ' + error.message); return; }
        limparFormularioProduto();
        produtoForm.reset();
        await pesquisarProdutos();
    } else {
        const { data, error } = await supabase
            .from('produto')
            .insert([payload])
            .select('produto_id')
            .single();
        if (error) { alert('Erro ao salvar produto: ' + error.message); return; }
        await pesquisarProdutos();
        carregarProdutoNoFormulario(data.produto_id);
        sucessoProduto.textContent = 'Produto cadastrado!';
        sucessoProduto.style.display = 'block';
        setTimeout(() => { sucessoProduto.style.display = 'none'; }, 3000);
    }
}

async function excluirProduto() {
    if (!produtoEditandoId) return;
    if (!window.confirm('Deseja excluir este produto?')) return;

    const supabase = getSupabaseClient();
    const { error } = await supabase
        .from('produto')
        .delete()
        .eq('produto_id', produtoEditandoId);

    if (error) {
        console.error('Erro ao excluir produto:', error);
        alert('Erro ao excluir produto: ' + error.message);
        return;
    }

    limparFormularioProduto();
    produtoForm.reset();
    await pesquisarProdutos();
}

// ─── Pesquisa ─────────────────────────────────────────────────────────────────

async function pesquisarProdutos(event) {
    if (event) event.preventDefault();

    const id = pesquisarProdutoIdInput?.value.trim();
    const categoriaId = pesquisarCategoriaProdutoIdInput?.value;
    const dsProduto = pesquisarDsProdutoInput?.value.trim();
    const marca = pesquisarMarcaInput?.value.trim();
    const observacao = pesquisarObservacaoInput?.value.trim();
    const quantidadeEstoque = pesquisarQuantidadeEstoqueInput?.value.trim();
    const estoqueOperador = pesquisarEstoqueOperadorInput?.value || '=';
    const valorVenda = pesquisarValorVendaInput?.value.trim();
    const valorOperador = pesquisarValorOperadorInput?.value || '=';
    const status = pesquisarStatusInput?.value;

    const supabase = getSupabaseClient();
    let query = supabase
        .from('produto')
        .select('*, categoria_produto(ds_categoria_produto)')
        .order('produto_id', { ascending: false });

    if (id) {
        const numericId = Number(id);
        if (!Number.isNaN(numericId)) {
            query = query.eq('produto_id', numericId);
        } else {
            mostrarLista(true);
            renderizarLista([], 'ID inválido.');
            return;
        }
    }
    if (categoriaId) query = query.eq('categoria_produto_id', Number(categoriaId));
    if (dsProduto) query = query.ilike('ds_produto', `%${dsProduto}%`);
    if (marca) query = query.ilike('marca', `%${marca}%`);
    if (observacao) query = query.ilike('observacao', `%${observacao}%`);
    if (quantidadeEstoque !== '') {
        const numEstoque = Number(quantidadeEstoque);
        if (!Number.isNaN(numEstoque)) {
            if (estoqueOperador === '=') query = query.eq('quantidade_estoque', numEstoque);
            else if (estoqueOperador === '<') query = query.lt('quantidade_estoque', numEstoque);
            else if (estoqueOperador === '>') query = query.gt('quantidade_estoque', numEstoque);
        }
    }
    if (valorVenda) {
        const numValor = parsearValor(valorVenda);
        if (valorOperador === '=') query = query.eq('valor_venda', numValor);
        else if (valorOperador === '<') query = query.lt('valor_venda', numValor);
        else if (valorOperador === '>') query = query.gt('valor_venda', numValor);
    }
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) {
        console.error('Erro ao pesquisar produtos:', error);
        alert('Erro ao pesquisar produtos: ' + error.message);
        return;
    }

    mostrarLista(true);
    renderizarLista(data, 'Nenhum produto encontrado para os critérios informados.');
}

function limparPesquisaProduto() {
    if (pesquisarCategoriaProdutoIdInput) pesquisarCategoriaProdutoIdInput.value = '';
    if (pesquisarCategoriaSelectedInput) pesquisarCategoriaSelectedInput.value = '';
    mostrarLista(true);
    if (produtoTableBody) {
        produtoTableBody.innerHTML = '<tr><td colspan="8" class="text-center">Pesquise para ver produtos.</td></tr>';
    }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', async function () {
    if (!produtoForm || !produtoTableBody) return;

    // Botões do modal de categoria
    document.querySelectorAll('.categoriaSelectBtn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const row = btn.closest('.categoria-row');
            hiddenInputAtual = row.querySelector('.categoria_produto_id');
            selectedInputAtual = row.querySelector('.categoriaSelectedInput');
            openModal();
            const categorias = await fetchCategorias();
            renderModalCategorias(categorias);
        });
    });

    closeBtn?.addEventListener('click', () => closeModal());

    categoriaSearchInput?.addEventListener('input', async (e) => {
        const filtro = e.target.value.trim().toLowerCase();
        const categorias = await fetchCategorias();
        if (!filtro) {
            renderModalCategorias(categorias);
            return;
        }
        const filtradas = categorias.filter(c =>
            (c.ds_categoria_produto || '').toLowerCase().includes(filtro) ||
            String(c.categoria_produto_id).includes(filtro)
        );
        renderModalCategorias(filtradas);
    });

    // Fechar modal clicando fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    valorVendaInput?.addEventListener('input', function () {
        this.value = mascararValorInput(this.value);
    });
    pesquisarValorVendaInput?.addEventListener('input', function () {
        this.value = mascararValorInput(this.value);
    });

    // Formulário de cadastro
    produtoForm.addEventListener('submit', salvarProduto);
    produtoForm.addEventListener('reset', limparFormularioProduto);
    btnCancelarEdicaoProduto?.addEventListener('click', () => {
        limparFormularioProduto();
        produtoForm.reset();
    });
    btnExcluirProduto?.addEventListener('click', excluirProduto);

    // Formulário de pesquisa
    if (produtoSearchForm) {
        produtoSearchForm.addEventListener('submit', pesquisarProdutos);
        produtoSearchForm.addEventListener('reset', limparPesquisaProduto);
    }

    atualizarBotoesEdicao();
    limparPesquisaProduto();

    // Pré-preenche pesquisa se vier da página de categoria
    const params = new URLSearchParams(window.location.search);
    const paramCategoriaId   = params.get('categoria_id');
    const paramCategoriaNome = params.get('categoria_nome');
    if (paramCategoriaId) {
        if (pesquisarCategoriaProdutoIdInput) pesquisarCategoriaProdutoIdInput.value = paramCategoriaId;
        if (pesquisarCategoriaSelectedInput)  pesquisarCategoriaSelectedInput.value  = paramCategoriaNome || paramCategoriaId;
        await pesquisarProdutos();
    }
});
