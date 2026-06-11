// ─── Utilitários genéricos de modal ───────────────────────────────────────────

function abrirModal(modalEl) {
    modalEl.classList.add('open');
}

function fecharModal(modalEl) {
    modalEl.classList.remove('open');
}

function configurarOverlayClose(modalEl, fecharFn) {
    modalEl.addEventListener('click', function (e) {
        if (e.target === modalEl) fecharFn();
    });
}
