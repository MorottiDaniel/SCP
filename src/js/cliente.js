const clienteForm = document.getElementById('clienteForm');
const clienteSearchForm = document.getElementById('clienteSearchForm');
const clienteTableBody = document.getElementById('clienteTableBody');
const clienteListaSection = document.getElementById('clienteListaSection');
const clienteIdInput = document.getElementById('cliente_id');
const tipoClienteInput = document.getElementById('tipo_cliente');
const cpfCnpjInput = document.getElementById('cpf_cnpj_cliente');
const nomeClienteInput = document.getElementById('nome_cliente');
const pesquisarClienteIdInput = document.getElementById('pesquisarClienteId');
const pesquisarTipoClienteInput = document.getElementById('pesquisarTipoCliente');
const pesquisarCpfCnpjInput = document.getElementById('pesquisarCpfCnpj');
const pesquisarNomeClienteInput = document.getElementById('pesquisarNomeCliente');
const btnCancelarEdicao       = document.getElementById('btnCancelarEdicao');
const btnExcluirCliente       = document.getElementById('btnExcluirCliente');
const btnLimparCliente        = document.getElementById('btnLimparCliente');
const clienteFormTitulo       = document.getElementById('clienteFormTitulo');
const campoOrcamentosCliente  = document.getElementById('campoOrcamentosCliente');

let clientesCache = [];
let clienteEditandoId = null;

// ─── CPF / CNPJ ───────────────────────────────────────────────────────────────

function apenasDigitos(v) {
    return v.replace(/\D/g, '');
}

function mascararCPF(v) {
    v = apenasDigitos(v).slice(0, 11);
    if (v.length <= 3) return v;
    if (v.length <= 6) return `${v.slice(0,3)}.${v.slice(3)}`;
    if (v.length <= 9) return `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6)}`;
    return `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6,9)}-${v.slice(9)}`;
}

function mascararCNPJ(v) {
    v = apenasDigitos(v).slice(0, 14);
    if (v.length <= 2) return v;
    if (v.length <= 5) return `${v.slice(0,2)}.${v.slice(2)}`;
    if (v.length <= 8) return `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5)}`;
    if (v.length <= 12) return `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5,8)}/${v.slice(8)}`;
    return `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5,8)}/${v.slice(8,12)}-${v.slice(12)}`;
}

function aplicarMascara(valor, tipo) {
    if (tipo === 'F') return mascararCPF(valor);
    if (tipo === 'J') return mascararCNPJ(valor);
    return valor;
}

function validarCPF(cpf) {
    cpf = apenasDigitos(cpf);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += Number(cpf[i]) * (10 - i);
    let r = (soma * 10) % 11;
    if (r >= 10) r = 0;
    if (r !== Number(cpf[9])) return false;
    soma = 0;
    for (let i = 0; i < 10; i++) soma += Number(cpf[i]) * (11 - i);
    r = (soma * 10) % 11;
    if (r >= 10) r = 0;
    return r === Number(cpf[10]);
}

function validarCNPJ(cnpj) {
    cnpj = apenasDigitos(cnpj);
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
    const calc = (str, pesos) => {
        const soma = str.split('').reduce((s, d, i) => s + Number(d) * pesos[i], 0);
        const r = soma % 11;
        return r < 2 ? 0 : 11 - r;
    };
    if (calc(cnpj.slice(0,12), [5,4,3,2,9,8,7,6,5,4,3,2]) !== Number(cnpj[12])) return false;
    return calc(cnpj.slice(0,13), [6,5,4,3,2,9,8,7,6,5,4,3,2]) === Number(cnpj[13]);
}

function atualizarCampoCpfCnpj(tipo) {
    if (tipo === 'F') {
        cpfCnpjInput.placeholder = '000.000.000-00';
        cpfCnpjInput.maxLength   = 14;
    } else if (tipo === 'J') {
        cpfCnpjInput.placeholder = '00.000.000/0000-00';
        cpfCnpjInput.maxLength   = 18;
    } else {
        cpfCnpjInput.placeholder = 'Selecione o tipo primeiro';
        cpfCnpjInput.maxLength   = 18;
    }
}

// ─── Formatação ───────────────────────────────────────────────────────────────

function formatarTipoCliente(tipo) {
    return tipo === 'F' ? 'Pessoa física' : tipo === 'J' ? 'Pessoa jurídica' : tipo;
}

function criarLinhaCliente(cliente) {
    const linha = document.createElement('tr');
    linha.innerHTML = `
        <td>${cliente.cliente_id}</td>
        <td>${cliente.nome_cliente}</td>
        <td>${aplicarMascara(cliente.cpf_cnpj_cliente, cliente.tipo_cliente)}</td>
        <td>${formatarTipoCliente(cliente.tipo_cliente)}</td>
        <td>
            <button type="button" class="btn-editar" data-cliente-id="${cliente.cliente_id}">Editar</button>
        </td>
    `;

    const btnEditar = linha.querySelector('.btn-editar');
    btnEditar.addEventListener('click', function () {
        carregarClienteNoFormulario(cliente.cliente_id);
    });

    return linha;
}

function renderizarLista(clientes, emptyMessage = 'Nenhum cliente cadastrado.') {
    clientesCache = clientes || [];
    clienteTableBody.innerHTML = '';

    if (!clientesCache.length) {
        const linhaVazia = document.createElement('tr');
        linhaVazia.innerHTML = `<td colspan="5" class="text-center">${emptyMessage}</td>`;
        clienteTableBody.appendChild(linhaVazia);
        return;
    }

    clientesCache.forEach((cliente) => {
        clienteTableBody.appendChild(criarLinhaCliente(cliente));
    });
}

function mostrarLista(visible) {
    if (!clienteListaSection) {
        return;
    }
    clienteListaSection.classList.toggle('hidden', !visible);
}

async function pesquisarClientes(event) {
    if (event) {
        event.preventDefault();
    }

    const id = pesquisarClienteIdInput?.value.trim();
    const tipo = pesquisarTipoClienteInput?.value;
    const cpfCnpj = pesquisarCpfCnpjInput?.value.trim();
    const nome = pesquisarNomeClienteInput?.value.trim();

    const supabase = getSupabaseClient();
    let query = supabase.from('cliente').select('*').order('cliente_id', { ascending: false });

    if (!id && !tipo && !cpfCnpj && !nome) {
        const { data, error } = await query;
        if (error) {
            console.error('Erro ao carregar clientes na pesquisa:', error);
            return;
        }

        mostrarLista(true);
        renderizarLista(data);
        return;
    }


    if (id) {
        const numericId = Number(id);
        if (!Number.isNaN(numericId)) {
            query = query.eq('cliente_id', numericId);
        } else {
            mostrarLista(true);
            renderizarLista([], 'ID inválido.');
            return;
        }
    }

    if (tipo) {
        query = query.eq('tipo_cliente', tipo);
    }

    if (cpfCnpj) {
        query = query.ilike('cpf_cnpj_cliente', `%${apenasDigitos(cpfCnpj)}%`);
    }

    if (nome) {
        query = query.ilike('nome_cliente', `%${nome}%`);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Erro ao pesquisar clientes:', error);
        return;
    }

    mostrarLista(true);
    renderizarLista(data, 'Nenhum cliente encontrado para os critérios informados.');
}

function limparPesquisa() {
    mostrarLista(true);
    if (clienteTableBody) {
        clienteTableBody.innerHTML = '<tr><td colspan="5" class="text-center">Pesquise para ver clientes.</td></tr>';
    }
}

function atualizarBotoesEdicao() {
    const editando = clienteEditandoId !== null;
    btnCancelarEdicao.classList.toggle('hidden', !editando);
    btnExcluirCliente.classList.toggle('hidden', !editando);
    campoOrcamentosCliente?.classList.toggle('hidden', !editando);
    btnLimparCliente?.classList.toggle('hidden', editando);
}

async function carregarClientes() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('cliente')
        .select('*')
        .order('cliente_id', { ascending: false });

    if (error) {
        console.error('Erro ao carregar clientes:', error);
        return;
    }

    renderizarLista(data);
}

function carregarClienteNoFormulario(clienteId) {
    const cliente = clientesCache.find((item) => item.cliente_id === clienteId);
    if (!cliente) {
        return;
    }

    clienteEditandoId = clienteId;
    clienteIdInput.value   = cliente.cliente_id;
    tipoClienteInput.value = cliente.tipo_cliente;
    atualizarCampoCpfCnpj(cliente.tipo_cliente);
    cpfCnpjInput.disabled  = false;
    cpfCnpjInput.value     = aplicarMascara(cliente.cpf_cnpj_cliente, cliente.tipo_cliente);
    nomeClienteInput.value = cliente.nome_cliente;
    if (clienteFormTitulo) clienteFormTitulo.textContent = 'Dados do Cliente';
    atualizarBotoesEdicao();
}

function limparFormulario() {
    clienteEditandoId = null;
    clienteIdInput.value   = '';
    tipoClienteInput.value = '';
    cpfCnpjInput.value     = '';
    cpfCnpjInput.disabled  = true;
    atualizarCampoCpfCnpj('');
    nomeClienteInput.value = '';
    if (clienteFormTitulo) clienteFormTitulo.textContent = 'Cadastro de Cliente';
    atualizarBotoesEdicao();
}

async function excluirCliente() {
    if (!clienteEditandoId) {
        return;
    }

    const confirmado = window.confirm('Deseja excluir esse cliente?');
    if (!confirmado) {
        return;
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase
        .from('cliente')
        .delete()
        .eq('cliente_id', clienteEditandoId);

    if (error) {
        console.error('Erro ao excluir cliente:', error);
        alert('Erro ao excluir cliente: ' + error.message);
        return;
    }

    limparFormulario();
    await carregarClientes();
}

async function salvarCliente(event) {
    event.preventDefault();

    const clienteId  = clienteIdInput.value ? Number(clienteIdInput.value) : null;
    const tipo       = tipoClienteInput.value;
    const cpfCnpjBruto = apenasDigitos(cpfCnpjInput.value);
    const nome       = nomeClienteInput.value.trim();
    const erroCpfCnpj = document.getElementById('erroCpfCnpj');

    erroCpfCnpj.classList.add('hidden');

    if (!tipo || !cpfCnpjBruto || !nome) {
        alert('Preencha todos os campos obrigatórios.');
        return;
    }

    if (tipo === 'F' && !validarCPF(cpfCnpjBruto)) {
        erroCpfCnpj.textContent = 'CPF inválido.';
        erroCpfCnpj.classList.remove('hidden');
        return;
    }
    if (tipo === 'J' && !validarCNPJ(cpfCnpjBruto)) {
        erroCpfCnpj.textContent = 'CNPJ inválido.';
        erroCpfCnpj.classList.remove('hidden');
        return;
    }

    const payload = {
        tipo_cliente:     tipo,
        cpf_cnpj_cliente: cpfCnpjBruto,
        nome_cliente:     nome,
    };

    const supabase = getSupabaseClient();

    const sucessoCliente = document.getElementById('sucessoCliente');
    sucessoCliente.classList.add('hidden');

    if (clienteId) {
        const { error } = await supabase
            .from('cliente')
            .update(payload)
            .eq('cliente_id', clienteId);
        if (error) { alert('Erro ao salvar cliente: ' + error.message); return; }
        limparFormulario();
        await carregarClientes();
    } else {
        const { data, error } = await supabase
            .from('cliente')
            .insert([payload])
            .select('cliente_id')
            .single();
        if (error) { alert('Erro ao salvar cliente: ' + error.message); return; }
        await carregarClientes();
        carregarClienteNoFormulario(data.cliente_id);
        sucessoCliente.textContent = 'Cliente cadastrado!';
        sucessoCliente.classList.remove('hidden');
        setTimeout(() => { sucessoCliente.classList.add('hidden'); }, 3000);
    }
}

window.addEventListener('DOMContentLoaded', function () {
    if (!clienteForm || !clienteTableBody) {
        return;
    }

    pesquisarCpfCnpjInput?.addEventListener('input', function () {
        const tipo = pesquisarTipoClienteInput?.value;
        if (!tipo) return;
        this.value = aplicarMascara(this.value, tipo);
    });

    pesquisarTipoClienteInput?.addEventListener('change', function () {
        if (pesquisarCpfCnpjInput) pesquisarCpfCnpjInput.value = '';
    });

    tipoClienteInput.addEventListener('change', function () {
        atualizarCampoCpfCnpj(this.value);
        cpfCnpjInput.value    = '';
        cpfCnpjInput.disabled = !this.value;
        document.getElementById('erroCpfCnpj').classList.add('hidden');
    });

    cpfCnpjInput.addEventListener('input', function () {
        const tipo = tipoClienteInput.value;
        if (!tipo) return;
        this.value = aplicarMascara(this.value, tipo);
    });

    clienteForm.addEventListener('submit', salvarCliente);
    clienteForm.addEventListener('reset', limparFormulario);
    btnCancelarEdicao.addEventListener('click', limparFormulario);
    btnExcluirCliente.addEventListener('click', excluirCliente);

    document.getElementById('btnVerOrcamentosCliente')?.addEventListener('click', () => {
        const cliente = clientesCache.find(c => c.cliente_id === clienteEditandoId);
        const nome = cliente ? cliente.nome_cliente : '';
        const label = encodeURIComponent(`${clienteEditandoId} - ${nome}`);
        window.location.href = `/src/orcamento.html?cliente_id=${clienteEditandoId}&cliente_nome=${label}`;
    });

    document.getElementById('btnCriarOrcamentoCliente')?.addEventListener('click', () => {
        const cliente = clientesCache.find(c => c.cliente_id === clienteEditandoId);
        const nome = cliente ? cliente.nome_cliente : '';
        const label = encodeURIComponent(`${clienteEditandoId} - ${nome}`);
        window.location.href = `/src/orcamento.html?novo=1&cliente_id=${clienteEditandoId}&cliente_nome=${label}`;
    });

    if (clienteSearchForm) {
        clienteSearchForm.addEventListener('submit', pesquisarClientes);
        clienteSearchForm.addEventListener('reset', limparPesquisa);
    }

    atualizarBotoesEdicao();
    limparPesquisa();
});