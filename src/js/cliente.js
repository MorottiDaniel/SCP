const clienteForm = document.getElementById('clienteForm');
const clienteTableBody = document.getElementById('clienteTableBody');
const clienteIdInput = document.getElementById('cliente_id');
const tipoClienteInput = document.getElementById('tipo_cliente');
const cpfCnpjInput = document.getElementById('cpf_cnpj_cliente');
const nomeClienteInput = document.getElementById('nome_cliente');
const btnCancelarEdicao = document.getElementById('btnCancelarEdicao');
const btnExcluirCliente = document.getElementById('btnExcluirCliente');

let clientesCache = [];
let clienteEditandoId = null;

function formatarTipoCliente(tipo) {
    return tipo === 'F' ? 'Pessoa física' : tipo === 'J' ? 'Pessoa jurídica' : tipo;
}

function criarLinhaCliente(cliente) {
    const linha = document.createElement('tr');
    linha.innerHTML = `
        <td>${cliente.cliente_id}</td>
        <td>${formatarTipoCliente(cliente.tipo_cliente)}</td>
        <td>${cliente.cpf_cnpj_cliente}</td>
        <td>${cliente.nome_cliente}</td>
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

function renderizarLista(clientes) {
    clientesCache = clientes || [];
    clienteTableBody.innerHTML = '';

    if (!clientesCache.length) {
        const linhaVazia = document.createElement('tr');
        linhaVazia.innerHTML = '<td colspan="5" style="text-align:center;">Nenhum cliente cadastrado.</td>';
        clienteTableBody.appendChild(linhaVazia);
        return;
    }

    clientesCache.forEach((cliente) => {
        clienteTableBody.appendChild(criarLinhaCliente(cliente));
    });
}

function atualizarBotoesEdicao() {
    const editando = clienteEditandoId !== null;
    btnCancelarEdicao.style.display = editando ? 'inline-flex' : 'none';
    btnExcluirCliente.style.display = editando ? 'inline-flex' : 'none';
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
    clienteIdInput.value = cliente.cliente_id;
    tipoClienteInput.value = cliente.tipo_cliente;
    cpfCnpjInput.value = cliente.cpf_cnpj_cliente;
    nomeClienteInput.value = cliente.nome_cliente;
    atualizarBotoesEdicao();
}

function limparFormulario() {
    clienteEditandoId = null;
    clienteIdInput.value = '';
    tipoClienteInput.value = '';
    cpfCnpjInput.value = '';
    nomeClienteInput.value = '';
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

    const clienteId = clienteIdInput.value ? Number(clienteIdInput.value) : null;
    const payload = {
        tipo_cliente: tipoClienteInput.value,
        cpf_cnpj_cliente: cpfCnpjInput.value.trim(),
        nome_cliente: nomeClienteInput.value.trim(),
    };

    const supabase = getSupabaseClient();

    if (!payload.tipo_cliente || !payload.cpf_cnpj_cliente || !payload.nome_cliente) {
        alert('Preencha todos os campos obrigatórios.');
        return;
    }

    let result;
    if (clienteId) {
        result = await supabase
            .from('cliente')
            .update(payload)
            .eq('cliente_id', clienteId);
    } else {
        result = await supabase
            .from('cliente')
            .insert([payload]);
    }

    if (result.error) {
        console.error('Erro ao salvar cliente:', result.error);
        alert('Erro ao salvar cliente: ' + result.error.message);
        return;
    }

    limparFormulario();
    await carregarClientes();
}

window.addEventListener('DOMContentLoaded', function () {
    if (!clienteForm || !clienteTableBody) {
        return;
    }

    clienteForm.addEventListener('submit', salvarCliente);
    clienteForm.addEventListener('reset', limparFormulario);
    btnCancelarEdicao.addEventListener('click', limparFormulario);
    btnExcluirCliente.addEventListener('click', excluirCliente);

    atualizarBotoesEdicao();
    carregarClientes();
});