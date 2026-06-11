const categoriaForm = document.getElementById('categoriaForm');
const categoriaSearchForm = document.getElementById('categoriaSearchForm');
const categoriaTableBody = document.getElementById('categoriaTableBody');
const categoriaListaSection = document.getElementById('categoriaListaSection');
const categoriaIdInput = document.getElementById('categoria_produto_id');
const dsCategoriaInput = document.getElementById('ds_categoria_produto');
const btnCancelarEdicaoCategoria = document.getElementById('btnCancelarEdicaoCategoria');
const btnExcluirCategoria        = document.getElementById('btnExcluirCategoria');
const btnLimparCategoria         = document.getElementById('btnLimparCategoria');
const categoriaFormTitulo        = document.getElementById('categoriaFormTitulo');
const campoProdutosCategoria     = document.getElementById('campoProdutosCategoria');
const pesquisarCategoriaIdInput = document.getElementById('pesquisarCategoriaId');
const pesquisarDsCategoriaInput = document.getElementById('pesquisarDsCategoria');

let categoriasCache = [];
let categoriaEditandoId = null;

function criarLinhaCategoria(categoria) {
    const linha = document.createElement('tr');
    linha.innerHTML = `
        <td>${categoria.categoria_produto_id}</td>
        <td>${categoria.ds_categoria_produto}</td>
        <td>
            <button type="button" class="btn-editar" data-categoria-id="${categoria.categoria_produto_id}">Editar</button>
        </td>
    `;

    linha.querySelector('.btn-editar').addEventListener('click', () => {
        carregarCategoriaNoFormulario(categoria.categoria_produto_id);
    });

    return linha;
}

function renderizarLista(categorias, emptyMessage = 'Nenhuma categoria encontrada.') {
    categoriasCache = categorias || [];
    categoriaTableBody.innerHTML = '';

    if (!categoriasCache.length) {
        const linhaVazia = document.createElement('tr');
            linhaVazia.innerHTML = `<td colspan="3" class="text-center">${emptyMessage}</td>`;
        categoriaTableBody.appendChild(linhaVazia);
        return;
    }

    categoriasCache.forEach((categoria) => {
        categoriaTableBody.appendChild(criarLinhaCategoria(categoria));
    });
}

function mostrarLista(visible) {
    if (!categoriaListaSection) {
        return;
    }
    categoriaListaSection.classList.toggle('hidden', !visible);
}

function atualizarBotoesEdicaoCategoria() {
    const editando = categoriaEditandoId !== null;
    if (btnCancelarEdicaoCategoria) {
        btnCancelarEdicaoCategoria.classList.toggle('hidden', !editando);
    }
    if (btnExcluirCategoria) {
        btnExcluirCategoria.classList.toggle('hidden', !editando);
    }
    campoProdutosCategoria?.classList.toggle('hidden', !editando);
    btnLimparCategoria?.classList.toggle('hidden', editando);
}

function limparFormularioCategoria() {
    categoriaEditandoId = null;
    if (categoriaIdInput) {
        categoriaIdInput.value = '';
    }
    if (dsCategoriaInput) {
        dsCategoriaInput.value = '';
    }
    if (categoriaFormTitulo) categoriaFormTitulo.textContent = 'Cadastro de Categoria';
    atualizarBotoesEdicaoCategoria();
}

async function carregarCategoriaNoFormulario(categoriaId) {
    const categoria = categoriasCache.find((item) => item.categoria_produto_id === categoriaId);
    if (!categoria) {
        return;
    }

    categoriaEditandoId = categoriaId;
    if (categoriaIdInput) {
        categoriaIdInput.value = categoria.categoria_produto_id;
    }
    if (dsCategoriaInput) {
        dsCategoriaInput.value = categoria.ds_categoria_produto;
    }
    if (categoriaFormTitulo) categoriaFormTitulo.textContent = 'Dados da Categoria';
    atualizarBotoesEdicaoCategoria();
}

async function excluirCategoria(categoriaId) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
        .from('categoria_produto')
        .delete()
        .eq('categoria_produto_id', categoriaId);

    if (error) {
        console.error('Erro ao excluir categoria:', error);
        alert('Erro ao excluir categoria: ' + error.message);
        return;
    }

    limparFormularioCategoria();
    await pesquisarCategorias();
}

async function salvarCategoria(event) {
    event.preventDefault();

    const descricao = dsCategoriaInput?.value.trim();
    if (!descricao) {
        alert('Digite a descrição da categoria.');
        return;
    }

    const supabase = getSupabaseClient();
    const sucessoCategoria = document.getElementById('sucessoCategoria');
    sucessoCategoria.style.display = 'none';

    if (categoriaEditandoId) {
        const { error } = await supabase
            .from('categoria_produto')
            .update({ ds_categoria_produto: descricao })
            .eq('categoria_produto_id', categoriaEditandoId);
        if (error) { alert('Erro ao salvar categoria: ' + error.message); return; }
        limparFormularioCategoria();
        await pesquisarCategorias();
    } else {
        const { data, error } = await supabase
            .from('categoria_produto')
            .insert([{ ds_categoria_produto: descricao }])
            .select('categoria_produto_id')
            .single();
        if (error) { alert('Erro ao salvar categoria: ' + error.message); return; }
        await pesquisarCategorias();
        carregarCategoriaNoFormulario(data.categoria_produto_id);
        sucessoCategoria.textContent = 'Categoria cadastrada!';
        sucessoCategoria.style.display = 'block';
        setTimeout(() => { sucessoCategoria.style.display = 'none'; }, 3000);
    }
}

async function pesquisarCategorias(event) {
    if (event) {
        event.preventDefault();
    }

    const id = pesquisarCategoriaIdInput?.value.trim();
    const descricao = pesquisarDsCategoriaInput?.value.trim();

    const supabase = getSupabaseClient();
    let query = supabase.from('categoria_produto').select('*').order('categoria_produto_id', { ascending: false });

    if (id) {
        const numericId = Number(id);
        if (!Number.isNaN(numericId)) {
            query = query.eq('categoria_produto_id', numericId);
        } else {
            mostrarLista(true);
            renderizarLista([], 'ID inválido.');
            return;
        }
    }

    if (descricao) {
        query = query.ilike('ds_categoria_produto', `%${descricao}%`);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Erro ao pesquisar categorias:', error);
        return;
    }

    mostrarLista(true);
    renderizarLista(data, 'Nenhuma categoria encontrada para os critérios informados.');
}

function limparPesquisaCategoria() {
    mostrarLista(true);
    if (categoriaTableBody) {
        categoriaTableBody.innerHTML = '<tr><td colspan="3" class="text-center">Pesquise para ver categorias.</td></tr>';
    }
}

window.addEventListener('DOMContentLoaded', function () {
    if (!categoriaForm || !categoriaTableBody) {
        return;
    }

    categoriaForm.addEventListener('submit', salvarCategoria);
    categoriaForm.addEventListener('reset', limparFormularioCategoria);
    btnCancelarEdicaoCategoria?.addEventListener('click', limparFormularioCategoria);

    document.getElementById('btnVerProdutosCategoria')?.addEventListener('click', () => {
        const categoria = categoriasCache.find(c => c.categoria_produto_id === categoriaEditandoId);
        const nome = categoria ? categoria.ds_categoria_produto : '';
        const label = encodeURIComponent(`${categoriaEditandoId} - ${nome}`);
        window.location.href = `/src/produto.html?categoria_id=${categoriaEditandoId}&categoria_nome=${label}`;
    });
    btnExcluirCategoria?.addEventListener('click', async () => {
        if (!categoriaEditandoId) {
            return;
        }
        if (!window.confirm('Deseja excluir esta categoria?')) {
            return;
        }
        await excluirCategoria(categoriaEditandoId);
    });

    if (categoriaSearchForm) {
        categoriaSearchForm.addEventListener('submit', pesquisarCategorias);
        categoriaSearchForm.addEventListener('reset', limparPesquisaCategoria);
    }

    atualizarBotoesEdicaoCategoria();
    limparPesquisaCategoria();
});