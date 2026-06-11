// ─── State ────────────────────────────────────────────────────────────────────

let itensOrcamento    = [];
// cada item: { orcamento_item_id?, produto_id, ds_produto, quantidade, valor_unitario, quantidade_estoque }

let orcamentoEditandoId   = null;
let orcamentoAprovado     = false;
let orcamentoDataValidade = null; // data_validade carregada do DB (para checar expiração)
let itemEditandoIndex     = null;
let produtosCache       = [];
let produtoSelecionado  = null;

// ─── Inputs – formulário principal ───────────────────────────────────────────

const orcamentoForm        = document.getElementById('orcamentoForm');
const orcamentoIdInput     = document.getElementById('orcamento_id');
const clienteIdInput       = document.getElementById('cliente_id');
const clienteSelectedInput = document.getElementById('clienteSelectedInput');
const dataOrcamentoInput  = document.getElementById('data_orcamento');
const dataValidadeInput   = document.getElementById('data_validade');
const orcamentoFormTitulo = document.getElementById('orcamentoFormTitulo');
const btnCancelarEdicao  = document.getElementById('btnCancelarEdicaoOrcamento');
const btnExcluirOrcamento  = document.getElementById('btnExcluirOrcamento');
const btnLimparOrcamento   = document.getElementById('btnLimparOrcamento');
const btnAprovarOrcamento   = document.getElementById('btnAprovarOrcamento');
const btnAtualizarOrcamento = document.getElementById('btnAtualizarOrcamento');
const btnSalvarOrcamento    = document.getElementById('btnSalvarOrcamento');
const campoAprovar          = document.getElementById('campoAprovar');
const campoAtualizar        = document.getElementById('campoAtualizar');
const campoVisualizarPdf    = document.getElementById('campoVisualizarPdf');

// ─── Inputs – tabela de itens ─────────────────────────────────────────────────

const orcamentoItensBody  = document.getElementById('orcamentoItensBody');
const orcamentoTotalGeral = document.getElementById('orcamentoTotalGeral');
const btnAdicionarItem    = document.getElementById('btnAdicionarItem');

// ─── Modal de cliente ─────────────────────────────────────────────────────────

const clienteModal       = document.getElementById('clienteModal');
const clienteModalBody   = document.getElementById('clienteModalBody');
const clienteSearchInput = document.getElementById('clienteSearchInput');

let clienteHiddenAtual   = null;
let clienteSelectedAtual = null;

async function fetchClientes() {
    try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('cliente')
            .select('*')
            .order('cliente_id', { ascending: true });
        if (error) { console.error('Erro ao buscar clientes:', error); return []; }
        return data || [];
    } catch (err) { console.error(err); return []; }
}

function renderModalClientes(clientes) {
    clienteModalBody.innerHTML = '';
    if (!clientes.length) {
        clienteModalBody.innerHTML = '<tr><td colspan="3" class="modal-empty">Nenhum cliente encontrado.</td></tr>';
        return;
    }
    clientes.forEach(c => {
        const tr = document.createElement('tr');
        tr.className = 'modal-row';
        tr.innerHTML = `<td>${c.cliente_id}</td><td>${c.nome_cliente}</td><td>${formatarCpfCnpj(c.cpf_cnpj_cliente, c.tipo_cliente)}</td>`;
        tr.addEventListener('click', () => {
            if (clienteHiddenAtual)   clienteHiddenAtual.value   = c.cliente_id;
            if (clienteSelectedAtual) clienteSelectedAtual.value = `${c.cliente_id} - ${c.nome_cliente}`;
            closeClienteModal();
        });
        clienteModalBody.appendChild(tr);
    });
}

function openClienteModal(hiddenInput, selectedInput) {
    clienteHiddenAtual   = hiddenInput;
    clienteSelectedAtual = selectedInput;
    clienteModal.classList.add('open');
    clienteSearchInput.value = '';
    clienteSearchInput.focus();
}

function closeClienteModal() {
    clienteModal.classList.remove('open');
}

// ─── Pesquisa de orçamentos ───────────────────────────────────────────────────

const orcamentoSearchForm           = document.getElementById('orcamentoSearchForm');
const pesquisarOrcamentoIdInput     = document.getElementById('pesquisarOrcamentoId');
const pesquisarClienteIdInput       = document.getElementById('pesquisarClienteId');
const pesquisarClienteSelectedInput = document.getElementById('pesquisarClienteSelectedInput');
const pesquisarAprovadoInput        = document.getElementById('pesquisarAprovado');
const pesquisarValidadeInput        = document.getElementById('pesquisarValidade');
const pesquisarValorTotalInput      = document.getElementById('pesquisarValorTotal');
const pesquisarValorOperadorInput   = document.getElementById('pesquisarValorOperador');
const orcamentoListaSection         = document.getElementById('orcamentoListaSection');
const orcamentoListaBody            = document.getElementById('orcamentoListaBody');

function calcularTotalOrcamento(orcamento) {
    return (orcamento.orcamento_item || [])
        .reduce((s, i) => s + i.quantidade * i.valor_unitario, 0);
}

function renderizarListaOrcamentos(orcamentos, emptyMessage = 'Nenhum orçamento encontrado.') {
    orcamentoListaBody.innerHTML = '';
    if (!orcamentos.length) {
        orcamentoListaBody.innerHTML = `<tr><td colspan="7" class="text-center">${emptyMessage}</td></tr>`;
        return;
    }
    orcamentos.forEach(oc => {
        const total = calcularTotalOrcamento(oc);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${oc.orcamento_id}</td>
            <td>${oc.cliente?.nome_cliente ?? '-'}</td>
            <td>${formatarData(oc.data_orcamento)}</td>
            <td>${formatarData(oc.data_validade)}</td>
            <td>${formatarValor(total)}</td>
            <td style="text-align:center;">${oc.aprovado ? '✓' : '✕'}</td>
            <td><button type="button" class="btn-editar">Editar</button></td>
        `;
        tr.querySelector('.btn-editar').addEventListener('click', () => carregarOrcamento(oc.orcamento_id));
        orcamentoListaBody.appendChild(tr);
    });
}

async function pesquisarOrcamentos(event) {
    if (event) event.preventDefault();

    const id         = pesquisarOrcamentoIdInput?.value.trim();
    const clienteId  = pesquisarClienteIdInput?.value;
    const aprovado   = pesquisarAprovadoInput?.value;
    const validade   = pesquisarValidadeInput?.value;
    const valorTotal = pesquisarValorTotalInput?.value.trim();
    const valorOp    = pesquisarValorOperadorInput?.value || '=';

    const supabase = getSupabaseClient();
    let query = supabase
        .from('orcamento')
        .select('*, cliente:cliente_id(nome_cliente), orcamento_item(quantidade, valor_unitario)')
        .order('orcamento_id', { ascending: false });

    if (id) {
        const numId = Number(id);
        if (!Number.isNaN(numId)) {
            query = query.eq('orcamento_id', numId);
        } else {
            renderizarListaOrcamentos([], 'ID inválido.');
            return;
        }
    }
    if (clienteId) query = query.eq('cliente_id', Number(clienteId));
    if (aprovado !== '') query = query.eq('aprovado', aprovado === 'true');
    if (validade === 'dentro') query = query.gte('data_validade', hoje());
    if (validade === 'fora')   query = query.lt('data_validade', hoje());

    const { data, error } = await query;
    if (error) {
        console.error('Erro ao pesquisar orçamentos:', error);
        alert('Erro ao pesquisar: ' + error.message);
        return;
    }

    let resultados = data || [];

    if (valorTotal) {
        const numValor = parsearValor(valorTotal);
        resultados = resultados.filter(oc => {
            const t = calcularTotalOrcamento(oc);
            if (valorOp === '=') return Math.abs(t - numValor) < 0.001;
            if (valorOp === '<') return t < numValor;
            if (valorOp === '>') return t > numValor;
            return true;
        });
    }

    renderizarListaOrcamentos(resultados, 'Nenhum orçamento encontrado para os critérios informados.');
}

function limparPesquisaOrcamento() {
    if (pesquisarClienteIdInput)       pesquisarClienteIdInput.value       = '';
    if (pesquisarClienteSelectedInput) pesquisarClienteSelectedInput.value = '';
    if (orcamentoListaBody) {
        orcamentoListaBody.innerHTML = '<tr><td colspan="7" class="text-center">Pesquise para ver orçamentos.</td></tr>';
    }
}

// ─── Modal de item ────────────────────────────────────────────────────────────

const itemModal              = document.getElementById('itemModal');
const itemModalTitle         = document.getElementById('itemModalTitle');
const itemProdutoSearch      = document.getElementById('itemProdutoSearch');
const produtoSearchInput     = document.getElementById('produtoSearchInput');
const itemProdutoListSection = document.getElementById('itemProdutoListSection');
const itemProdutoBody        = document.getElementById('itemProdutoBody');
const itemProdutoSelecionado = document.getElementById('itemProdutoSelecionado');
const itemProdutoNome        = document.getElementById('itemProdutoNome');
const itemEstoqueDisponivel  = document.getElementById('itemEstoqueDisponivel');
const itemValorUnitario      = document.getElementById('itemValorUnitario');
const itemQuantidade         = document.getElementById('itemQuantidade');
const btnRemoverItem         = document.getElementById('btnRemoverItem');
const btnConfirmarItem       = document.getElementById('btnConfirmarItem');

async function fetchProdutos(filtro = '') {
    try {
        const supabase = getSupabaseClient();
        let query = supabase
            .from('produto')
            .select('produto_id, ds_produto, marca, quantidade_estoque, valor_venda')
            .eq('status', 'A')
            .order('ds_produto', { ascending: true });
        if (filtro) query = query.ilike('ds_produto', `%${filtro}%`);
        const { data, error } = await query;
        if (error) { console.error('Erro ao buscar produtos:', error); return []; }
        return data || [];
    } catch (err) { console.error(err); return []; }
}

function renderProdutosModal(produtos) {
    itemProdutoBody.innerHTML = '';
    if (!produtos.length) {
        itemProdutoBody.innerHTML = '<tr><td colspan="5" class="modal-empty">Nenhum produto encontrado.</td></tr>';
        return;
    }
    produtos.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = 'modal-row';
        tr.innerHTML = `
            <td>${p.produto_id}</td>
            <td>${p.ds_produto}</td>
            <td>${p.marca ?? '-'}</td>
            <td>${p.quantidade_estoque}</td>
            <td>${formatarValor(p.valor_venda)}</td>
        `;
        tr.addEventListener('click', () => selecionarProduto(p));
        itemProdutoBody.appendChild(tr);
    });
}

function selecionarProduto(produto) {
    produtoSelecionado = produto;
    itemProdutoSearch.classList.add('hidden');
    itemProdutoListSection.classList.add('hidden');
    itemProdutoSelecionado.classList.remove('hidden');
    itemProdutoNome.textContent = `${produto.produto_id} - ${produto.ds_produto}`;
    itemEstoqueDisponivel.value = produto.quantidade_estoque;
    itemValorUnitario.value     = formatarValor(produto.valor_venda ?? produto.valor_unitario ?? 0);
    itemQuantidade.value        = '';
    itemQuantidade.max          = produto.quantidade_estoque;
    itemQuantidade.focus();
}

function limparSelecaoProduto() {
    produtoSelecionado = null;
    itemProdutoSearch.classList.remove('hidden');
    itemProdutoListSection.classList.remove('hidden');
    itemProdutoSelecionado.classList.add('hidden');
    itemProdutoNome.textContent = '';
    itemEstoqueDisponivel.value = '';
    itemValorUnitario.value     = '';
    itemQuantidade.value        = '';
    renderProdutosModal(produtosCache);
}

async function openItemModal(index = null) {
    itemEditandoIndex  = index;
    produtoSelecionado = null;
    produtoSearchInput.value = '';
    limparSelecaoProduto();

    if (index !== null) {
        itemModalTitle.textContent    = 'Editar Item';
        btnConfirmarItem.textContent  = 'Atualizar';
        btnRemoverItem.classList.remove('hidden');
    } else {
        itemModalTitle.textContent    = 'Adicionar Item';
        btnConfirmarItem.textContent  = 'Adicionar';
        btnRemoverItem.classList.add('hidden');
    }

    itemModal.classList.add('open');

    const produtos = await fetchProdutos();
    produtosCache  = produtos;
    renderProdutosModal(produtos);

    if (index !== null) {
        const item        = itensOrcamento[index];
        const prodAtual   = produtosCache.find(p => p.produto_id === item.produto_id);
        const precoAtual  = prodAtual ? Number(prodAtual.valor_venda) : item.valor_unitario;
        const estoqueAtual = prodAtual ? prodAtual.quantidade_estoque : item.quantidade_estoque;
        selecionarProduto({
            produto_id:         item.produto_id,
            ds_produto:         item.ds_produto,
            quantidade_estoque: estoqueAtual,
            valor_venda:        precoAtual,
        });
        itemValorUnitario.value    = formatarValor(precoAtual);
        itemValorUnitario.disabled = true;
        itemQuantidade.value       = item.quantidade;
    } else {
        itemValorUnitario.disabled = false;
    }
}

function closeItemModalFn() {
    itemModal.classList.remove('open');
    itemEditandoIndex          = null;
    produtoSelecionado         = null;
    itemValorUnitario.disabled = false;
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

function formatarCpfCnpj(valor, tipo) {
    const v = (valor || '').replace(/\D/g, '');
    if (tipo === 'F' && v.length === 11)
        return `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6,9)}-${v.slice(9)}`;
    if (tipo === 'J' && v.length === 14)
        return `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5,8)}/${v.slice(8,12)}-${v.slice(12)}`;
    return valor;
}

function formatarData(data) {
    if (!data) return '-';
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
}

function formatarValor(valor) {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function hoje() {
    return new Date().toISOString().slice(0, 10);
}

function dataValidadeDaqui(dias = 7) {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
}

// ─── Tabela de itens ──────────────────────────────────────────────────────────

function renderizarItens() {
    orcamentoItensBody.innerHTML = '';
    if (!itensOrcamento.length) {
        orcamentoItensBody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhum item adicionado.</td></tr>';
        orcamentoTotalGeral.innerHTML = '<strong>R$ 0,00</strong>';
        return;
    }
    let total = 0;
    itensOrcamento.forEach((item, index) => {
        const valorTotal = item.quantidade * item.valor_unitario;
        total += valorTotal;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.ds_produto}</td>
            <td>${item.quantidade}</td>
            <td>${formatarValor(item.valor_unitario)}</td>
            <td>${formatarValor(valorTotal)}</td>
            <td>${(orcamentoAprovado || isExpirado()) ? '' : `<button type="button" class="btn-editar" data-index="${index}">Editar</button>`}</td>
        `;
        if (!orcamentoAprovado && !isExpirado()) {
            tr.querySelector('.btn-editar').addEventListener('click', () => openItemModal(index));
        }
        orcamentoItensBody.appendChild(tr);
    });
    orcamentoTotalGeral.innerHTML = `<strong>${formatarValor(total)}</strong>`;
}

// ─── Formulário ───────────────────────────────────────────────────────────────

function isExpirado() {
    if (!orcamentoDataValidade) return false;
    return orcamentoDataValidade < hoje();
}

function atualizarBotoesEdicao() {
    const editando  = orcamentoEditandoId !== null;
    const expirado  = isExpirado();

    btnCancelarEdicao?.classList.toggle('hidden', !editando);
    btnExcluirOrcamento?.classList.toggle('hidden', !editando);
    btnLimparOrcamento?.classList.toggle('hidden', editando);

    // Aprovar: edição + não aprovado + não expirado
    campoAprovar?.classList.toggle('hidden', !editando || orcamentoAprovado || expirado);
    // Atualizar: edição + não aprovado + expirado
    campoAtualizar?.classList.toggle('hidden', !editando || orcamentoAprovado || !expirado);
    // Visualizar PDF: sempre visível ao editar
    campoVisualizarPdf?.classList.toggle('hidden', !editando);

    // Salvar e +Item bloqueados quando aprovado ou expirado
    const bloquear = editando && (orcamentoAprovado || expirado);
    btnSalvarOrcamento?.classList.toggle('hidden', bloquear);
    btnAdicionarItem?.classList.toggle('hidden', orcamentoAprovado || expirado);
}

function limparFormulario() {
    orcamentoEditandoId   = null;
    orcamentoAprovado     = false;
    orcamentoDataValidade = null;
    if (orcamentoFormTitulo) orcamentoFormTitulo.textContent = 'Cadastro de Orçamento';
    if (orcamentoIdInput)     orcamentoIdInput.value     = '';
    if (clienteIdInput)       clienteIdInput.value       = '';
    if (clienteSelectedInput) clienteSelectedInput.value = '';
    dataOrcamentoInput.value = hoje();
    if (dataValidadeInput) dataValidadeInput.value = '';
    itensOrcamento = [];
    renderizarItens();
    atualizarBotoesEdicao();
}

async function carregarOrcamento(id) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('orcamento')
        .select(`
            *,
            cliente:cliente_id(nome_cliente),
            orcamento_item(*, produto:produto_id(ds_produto, quantidade_estoque))
        `)
        .eq('orcamento_id', id)
        .single();

    if (error) {
        console.error('Erro ao carregar orçamento:', error);
        alert('Erro ao carregar orçamento: ' + error.message);
        return;
    }

    orcamentoEditandoId = data.orcamento_id;
    orcamentoIdInput.value     = data.orcamento_id;
    clienteIdInput.value       = data.cliente_id;
    clienteSelectedInput.value = `${data.cliente_id} - ${data.cliente?.nome_cliente ?? ''}`;
    dataOrcamentoInput.value   = data.data_orcamento;
    orcamentoDataValidade = data.data_validade;
    orcamentoAprovado     = data.aprovado ?? false;
    if (dataValidadeInput)   dataValidadeInput.value       = formatarData(data.data_validade);
    if (orcamentoFormTitulo) orcamentoFormTitulo.textContent = 'Dados do Orçamento';

    itensOrcamento = (data.orcamento_item || []).map(i => ({
        orcamento_item_id:  i.orcamento_item_id,
        produto_id:         i.produto_id,
        ds_produto:         i.produto?.ds_produto ?? '-',
        quantidade:         i.quantidade,
        valor_unitario:     Number(i.valor_unitario),
        quantidade_estoque: i.produto?.quantidade_estoque ?? 0,
    }));

    renderizarItens();
    atualizarBotoesEdicao();
    orcamentoForm?.scrollIntoView({ behavior: 'smooth' });
}

async function salvarOrcamento(event) {
    event.preventDefault();

    if (orcamentoAprovado) return;

    const clienteId   = clienteIdInput?.value;
    const dataValidade = dataValidadeDaqui(7);

    if (!clienteId) { alert('Selecione um cliente.'); return; }
    if (!itensOrcamento.length) { alert('Adicione pelo menos um item ao orçamento.'); return; }

    const supabase = getSupabaseClient();

    const payloadOrcamento = {
        cliente_id:    Number(clienteId),
        data_validade: dataValidade,
    };

    let orcamentoId;

    if (orcamentoEditandoId) {
        // ── UPDATE ──────────────────────────────────────────────────────────
        const { error } = await supabase
            .from('orcamento')
            .update(payloadOrcamento)
            .eq('orcamento_id', orcamentoEditandoId);

        if (error) { alert('Erro ao atualizar orçamento: ' + error.message); return; }

        // Remove todos os itens antigos e reinsere (cascade garante segurança)
        const { error: errDel } = await supabase
            .from('orcamento_item')
            .delete()
            .eq('orcamento_id', orcamentoEditandoId);

        if (errDel) { alert('Erro ao atualizar itens: ' + errDel.message); return; }

        orcamentoId = orcamentoEditandoId;
    } else {
        // ── INSERT ──────────────────────────────────────────────────────────
        const { data: novoOrc, error } = await supabase
            .from('orcamento')
            .insert([{ ...payloadOrcamento, data_orcamento: hoje() }])
            .select('orcamento_id')
            .single();

        if (error) { alert('Erro ao salvar orçamento: ' + error.message); return; }
        orcamentoId = novoOrc.orcamento_id;
    }

    // Insere itens
    const itensPayload = itensOrcamento.map(item => ({
        orcamento_id:   orcamentoId,
        produto_id:     item.produto_id,
        quantidade:     item.quantidade,
        valor_unitario: item.valor_unitario,
    }));

    const { error: errItens } = await supabase
        .from('orcamento_item')
        .insert(itensPayload);

    if (errItens) { alert('Erro ao salvar itens: ' + errItens.message); return; }

    if (orcamentoEditandoId) {
        limparFormulario();
        orcamentoForm.reset();
        await pesquisarOrcamentos();
    } else {
        const sucessoOrcamento = document.getElementById('sucessoOrcamento');
        await pesquisarOrcamentos();
        await carregarOrcamento(orcamentoId);
        sucessoOrcamento.textContent = 'Orçamento cadastrado!';
        sucessoOrcamento.style.display = 'block';
        setTimeout(() => { sucessoOrcamento.style.display = 'none'; }, 3000);
    }
}

async function atualizarOrcamentoExpirado() {
    if (!orcamentoEditandoId || orcamentoAprovado || !isExpirado()) return;

    const supabase = getSupabaseClient();

    const novaDataOrc = hoje();
    const novaDataVal = dataValidadeDaqui(7);

    // Busca preços atuais dos produtos
    const produtoIds = itensOrcamento.map(i => i.produto_id);
    const { data: produtos, error: errProd } = await supabase
        .from('produto')
        .select('produto_id, valor_venda')
        .in('produto_id', produtoIds);

    if (errProd) { alert('Erro ao buscar preços: ' + errProd.message); return; }

    const precoMap = {};
    produtos.forEach(p => { precoMap[p.produto_id] = Number(p.valor_venda); });

    if (!window.confirm(
        `Atualizar orçamento expirado?\n` +
        `• Nova data: ${novaDataOrc}\n` +
        `• Nova validade: ${novaDataVal} (7 dias)\n` +
        `• Preços dos itens serão atualizados para os valores atuais.`
    )) return;

    // Atualiza datas no orçamento
    const { error: errOrc } = await supabase
        .from('orcamento')
        .update({ data_orcamento: novaDataOrc, data_validade: novaDataVal })
        .eq('orcamento_id', orcamentoEditandoId);

    if (errOrc) { alert('Erro ao atualizar orçamento: ' + errOrc.message); return; }

    // Remove itens antigos e reinsere com preços atualizados
    await supabase.from('orcamento_item').delete().eq('orcamento_id', orcamentoEditandoId);

    const itensPayload = itensOrcamento.map(item => ({
        orcamento_id:   orcamentoEditandoId,
        produto_id:     item.produto_id,
        quantidade:     item.quantidade,
        valor_unitario: precoMap[item.produto_id] ?? item.valor_unitario,
    }));

    const { error: errItens } = await supabase.from('orcamento_item').insert(itensPayload);
    if (errItens) { alert('Erro ao atualizar itens: ' + errItens.message); return; }

    await carregarOrcamento(orcamentoEditandoId);
    await pesquisarOrcamentos();
    alert('Orçamento atualizado com sucesso!');
}

async function aprovarOrcamento() {
    if (!orcamentoEditandoId || orcamentoAprovado) return;

    const supabase = getSupabaseClient();

    // Busca estoque atual de cada produto do orçamento
    const produtoIds = itensOrcamento.map(i => i.produto_id);
    const { data: produtos, error: errProd } = await supabase
        .from('produto')
        .select('produto_id, ds_produto, quantidade_estoque')
        .in('produto_id', produtoIds);

    if (errProd) { alert('Erro ao verificar estoque: ' + errProd.message); return; }

    const estoqueMap = {};
    produtos.forEach(p => { estoqueMap[p.produto_id] = p; });

    // Verifica se há estoque suficiente para cada item
    const semEstoque = itensOrcamento.filter(item => {
        const prod = estoqueMap[item.produto_id];
        return !prod || prod.quantidade_estoque < item.quantidade;
    });

    if (semEstoque.length) {
        const linhas = semEstoque.map(item => {
            const disp = estoqueMap[item.produto_id]?.quantidade_estoque ?? 0;
            return `• ${item.ds_produto}: necessário ${item.quantidade}, disponível ${disp}`;
        });
        alert('Estoque insuficiente:\n\n' + linhas.join('\n'));
        return;
    }

    if (!window.confirm('Deseja aprovar este orçamento? O estoque dos produtos será reduzido.')) return;

    // Reduz o estoque de cada produto
    for (const item of itensOrcamento) {
        const novoEstoque = estoqueMap[item.produto_id].quantidade_estoque - item.quantidade;
        const { error } = await supabase
            .from('produto')
            .update({ quantidade_estoque: novoEstoque })
            .eq('produto_id', item.produto_id);
        if (error) {
            alert(`Erro ao atualizar estoque de "${item.ds_produto}": ` + error.message);
            return;
        }
    }

    // Marca o orçamento como aprovado
    const { error: errOrc } = await supabase
        .from('orcamento')
        .update({ aprovado: true })
        .eq('orcamento_id', orcamentoEditandoId);

    if (errOrc) { alert('Erro ao aprovar orçamento: ' + errOrc.message); return; }

    orcamentoAprovado = true;
    campoAprovar?.classList.add('hidden');
    atualizarBotoesEdicao();
    await pesquisarOrcamentos();
    alert('Orçamento aprovado com sucesso!');
}

async function excluirOrcamento() {
    if (!orcamentoEditandoId) return;
    if (!window.confirm('Deseja excluir este orçamento? Os itens também serão removidos.')) return;

    const supabase = getSupabaseClient();
    const { error } = await supabase
        .from('orcamento')
        .delete()
        .eq('orcamento_id', orcamentoEditandoId);

    if (error) { alert('Erro ao excluir orçamento: ' + error.message); return; }

    limparFormulario();
    orcamentoForm.reset();
    await pesquisarOrcamentos();
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

function gerarPdfOrcamento() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const L = 14;        // margem esquerda
    const R = pageWidth / 2 + 5; // início da coluna direita (~110mm)

    // Título centralizado
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Orçamento', pageWidth / 2, 20, { align: 'center' });

    // Extrai só o nome do cliente (formato "ID - Nome")
    const clienteValor = clienteSelectedInput.value;
    const clienteNome = clienteValor.includes(' - ')
        ? clienteValor.split(' - ').slice(1).join(' - ')
        : clienteValor;

    doc.setFontSize(10);

    // Linha 1: ID | Cliente
    doc.setFont(undefined, 'bold');
    doc.text('ID:', L, 35);
    doc.text('Cliente:', R, 35);
    doc.setFont(undefined, 'normal');
    doc.text(String(orcamentoEditandoId), L + 10, 35);
    doc.text(clienteNome, R + 18, 35);

    // Linha 2: Data | Válido até
    doc.setFont(undefined, 'bold');
    doc.text('Data:', L, 44);
    doc.text('Válido até:', R, 44);
    doc.setFont(undefined, 'normal');
    doc.text(formatarData(dataOrcamentoInput.value), L + 14, 44);
    doc.text(dataValidadeInput.value, R + 25, 44);

    // Linha 3: Status
    doc.setFont(undefined, 'bold');
    doc.text('Status:', L, 53);
    doc.setFont(undefined, 'normal');
    doc.text(orcamentoAprovado ? 'Aprovado' : 'Pendente', L + 17, 53);

    const totalGeral = itensOrcamento.reduce((s, i) => s + i.quantidade * i.valor_unitario, 0);

    doc.autoTable({
        startY: 63,
        head: [['Produto', 'Qtd', 'Valor Unitário', 'Total']],
        body: itensOrcamento.map(item => [
            item.ds_produto,
            item.quantidade,
            formatarValor(item.valor_unitario),
            formatarValor(item.quantidade * item.valor_unitario),
        ]),
        foot: [[
            { content: 'Total Geral', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
            { content: formatarValor(totalGeral), styles: { fontStyle: 'bold' } },
        ]],
        showFoot: 'lastPage',
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        footStyles: { fillColor: [240, 240, 240], textColor: 30 },
        columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    });

    doc.save(`orcamento_${orcamentoEditandoId}.pdf`);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', async function () {

    dataOrcamentoInput.value = hoje();
    renderizarItens();
    atualizarBotoesEdicao();
    limparPesquisaOrcamento();

    // Pré-preenche formulário ou pesquisa se vier da página de cliente
    const params = new URLSearchParams(window.location.search);
    const paramClienteId   = params.get('cliente_id');
    const paramClienteNome = params.get('cliente_nome');
    if (paramClienteId && params.get('novo') === '1') {
        if (clienteIdInput)       clienteIdInput.value       = paramClienteId;
        if (clienteSelectedInput) clienteSelectedInput.value = paramClienteNome || paramClienteId;
    } else if (paramClienteId) {
        if (pesquisarClienteIdInput)       pesquisarClienteIdInput.value       = paramClienteId;
        if (pesquisarClienteSelectedInput) pesquisarClienteSelectedInput.value = paramClienteNome || paramClienteId;
        await pesquisarOrcamentos();
    }

    // ── Modal de cliente ──────────────────────────────────────────────────────

    async function abrirClienteModal(hiddenInput, selectedInput) {
        openClienteModal(hiddenInput, selectedInput);
        const clientes = await fetchClientes();
        renderModalClientes(clientes);
    }

    document.getElementById('clienteSelectBtn')?.addEventListener('click', () =>
        abrirClienteModal(clienteIdInput, clienteSelectedInput));

    document.getElementById('pesquisarClienteSelectBtn')?.addEventListener('click', () =>
        abrirClienteModal(pesquisarClienteIdInput, pesquisarClienteSelectedInput));

    document.getElementById('closeClienteModal')?.addEventListener('click', closeClienteModal);
    clienteModal?.addEventListener('click', e => { if (e.target === clienteModal) closeClienteModal(); });

    clienteSearchInput?.addEventListener('input', async e => {
        const filtro = e.target.value.trim().toLowerCase();
        const clientes = await fetchClientes();
        if (!filtro) { renderModalClientes(clientes); return; }
        const filtrados = clientes.filter(c =>
            c.nome_cliente.toLowerCase().includes(filtro) ||
            String(c.cliente_id).includes(filtro) ||
            (c.cpf_cnpj_cliente || '').includes(filtro)
        );
        renderModalClientes(filtrados);
    });

    // ── Formulário de pesquisa ────────────────────────────────────────────────

    orcamentoSearchForm?.addEventListener('submit', pesquisarOrcamentos);
    orcamentoSearchForm?.addEventListener('reset', limparPesquisaOrcamento);

    // ── Modal de item ─────────────────────────────────────────────────────────

    itemValorUnitario?.addEventListener('input', function () {
        this.value = mascararValorInput(this.value);
    });

    pesquisarValorTotalInput?.addEventListener('input', function () {
        this.value = mascararValorInput(this.value);
    });

    btnAdicionarItem?.addEventListener('click', () => openItemModal(null));

    document.getElementById('closeItemModal')?.addEventListener('click', closeItemModalFn);
    document.getElementById('btnCancelarItem')?.addEventListener('click', closeItemModalFn);
    itemModal?.addEventListener('click', e => { if (e.target === itemModal) closeItemModalFn(); });

    document.getElementById('btnLimparProduto')?.addEventListener('click', limparSelecaoProduto);

    produtoSearchInput?.addEventListener('input', async e => {
        const filtro = e.target.value.trim();
        if (!filtro) { renderProdutosModal(produtosCache); return; }
        const resultado = await fetchProdutos(filtro);
        renderProdutosModal(resultado);
    });

    btnConfirmarItem?.addEventListener('click', () => {
        if (!produtoSelecionado) { alert('Selecione um produto.'); return; }

        const qtd       = Number(itemQuantidade.value);
        const valorUnit = parsearValor(itemValorUnitario.value);

        if (!qtd || qtd < 1) { alert('Digite uma quantidade válida.'); return; }
        if (qtd > produtoSelecionado.quantidade_estoque) {
            alert(`Quantidade máxima disponível em estoque: ${produtoSelecionado.quantidade_estoque}.`);
            return;
        }
        if (valorUnit < 0) { alert('Valor unitário inválido.'); return; }

        const novoItem = {
            produto_id:         produtoSelecionado.produto_id,
            ds_produto:         produtoSelecionado.ds_produto,
            quantidade:         qtd,
            valor_unitario:     valorUnit,
            quantidade_estoque: produtoSelecionado.quantidade_estoque,
        };

        if (itemEditandoIndex !== null) {
            // preserva o orcamento_item_id se existir (edição de orçamento já salvo)
            novoItem.orcamento_item_id = itensOrcamento[itemEditandoIndex].orcamento_item_id;
            itensOrcamento[itemEditandoIndex] = novoItem;
        } else {
            itensOrcamento.push(novoItem);
        }

        renderizarItens();
        closeItemModalFn();
    });

    btnRemoverItem?.addEventListener('click', () => {
        if (itemEditandoIndex === null) return;
        itensOrcamento.splice(itemEditandoIndex, 1);
        renderizarItens();
        closeItemModalFn();
    });

    // ── Formulário principal ──────────────────────────────────────────────────

    orcamentoForm?.addEventListener('submit', salvarOrcamento);
    orcamentoForm?.addEventListener('reset', limparFormulario);

    btnCancelarEdicao?.addEventListener('click', () => {
        limparFormulario();
        orcamentoForm.reset();
    });

    btnExcluirOrcamento?.addEventListener('click', excluirOrcamento);
    btnAprovarOrcamento?.addEventListener('click', aprovarOrcamento);
    btnAtualizarOrcamento?.addEventListener('click', atualizarOrcamentoExpirado);
    document.getElementById('btnVisualizarPdf')?.addEventListener('click', gerarPdfOrcamento);
});
