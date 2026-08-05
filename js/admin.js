/* ===============================================
   CIDADE LIMPA - ADMIN.JS
   Funções do Painel Administrativo
   =============================================== */

// ===============================================
// VARIÁVEIS GLOBAIS
// ===============================================

let allDenuncias = [];
let filteredDenuncias = [];
let currentPage = 1;
const itemsPerPage = 10;

// ===============================================
// CARREGAR DASHBOARD
// ===============================================

function loadAdminDashboard() {
    allDenuncias = getDenuncias();
    filteredDenuncias = [...allDenuncias];
    
    updateAdminStats();
    renderDenunciasTable();
}

// ===============================================
// ATUALIZAR ESTATÍSTICAS
// ===============================================

function updateAdminStats() {
    const total = allDenuncias.length;
    const pendentes = allDenuncias.filter(d => d.status === 'pendente').length;
    const emAnalise = allDenuncias.filter(d => d.status === 'em-analise').length;
    const resolvidos = allDenuncias.filter(d => d.status === 'resolvido').length;
    
    animateAdminCounter('totalDenuncias', total);
    animateAdminCounter('pendentes', pendentes);
    animateAdminCounter('emAnalise', emAnalise);
    animateAdminCounter('resolvidos', resolvidos);
}

function animateAdminCounter(elementId, target) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    let current = 0;
    const increment = Math.max(1, target / 20);
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 30);
}

// ===============================================
// PESQUISA E FILTROS
// ===============================================

function handleAdminSearch() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    applyFilters(query);
}

function handleAdminFilter() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    applyFilters(query);
}

function applyFilters(query = '') {
    const categoryFilter = document.getElementById('categoryFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    
    filteredDenuncias = allDenuncias.filter(denuncia => {
        // Filtro de pesquisa
        const matchesSearch = !query || 
            denuncia.titulo.toLowerCase().includes(query) ||
            denuncia.descricao.toLowerCase().includes(query) ||
            denuncia.endereco.toLowerCase().includes(query) ||
            denuncia.userName.toLowerCase().includes(query);
        
        // Filtro de categoria
        const matchesCategory = categoryFilter === 'todas' || 
            denuncia.categoria === categoryFilter;
        
        // Filtro de status
        const matchesStatus = statusFilter === 'todos' || 
            denuncia.status === statusFilter;
        
        return matchesSearch && matchesCategory && matchesStatus;
    });
    
    currentPage = 1;
    renderDenunciasTable();
}

// ===============================================
// RENDERIZAR TABELA
// ===============================================

function renderDenunciasTable() {
    const tbody = document.getElementById('denunciasTableBody');
    const countLabel = document.getElementById('countLabel');
    
    if (!tbody) return;
    
    // Atualizar contador
    countLabel.textContent = `${filteredDenuncias.length} denúncia(s)`;
    
    if (filteredDenuncias.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
                    Nenhuma denúncia encontrada.
                </td>
            </tr>
        `;
        renderPagination();
        return;
    }
    
    // Calcular itens da página atual
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageItems = filteredDenuncias.slice(startIndex, endIndex);
    
    tbody.innerHTML = pageItems.map(denuncia => `
        <tr>
            <td>
                <div style="max-width: 200px;">
                    <strong style="display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${denuncia.titulo}
                    </strong>
                </div>
            </td>
            <td>
                <span class="complaint-category" style="white-space: nowrap;">
                    <i class="${getCategoryIcon(denuncia.categoria)}"></i>
                    ${denuncia.categoria}
                </span>
            </td>
            <td>
                <span style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-secondary);">
                    <i class="fas fa-map-marker-alt"></i>
                    ${truncateText(denuncia.endereco, 25)}
                </span>
            </td>
            <td>
                <span style="display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-user" style="color: var(--primary);"></i>
                    ${denuncia.userName}
                </span>
            </td>
            <td>
                <span style="color: var(--text-muted);">
                    ${formatDate(denuncia.data)}
                </span>
            </td>
            <td>
                <span class="status-badge ${denuncia.status}">
                    <i class="${getStatusIcon(denuncia.status)}"></i>
                    ${capitalizeFirst(denuncia.status.replace('-', ' '))}
                </span>
            </td>
            <td>
                <div class="table-actions">
                    <a href="detalhes.html?id=${denuncia.id}" class="btn-icon view" title="Ver detalhes">
                        <i class="fas fa-eye"></i>
                    </a>
                    <button class="btn-icon edit" title="Alterar status" onclick="openStatusModal('${denuncia.id}', '${denuncia.status}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete" title="Excluir" onclick="openDeleteModal('${denuncia.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    renderPagination();
}

// ===============================================
// PAGINAÇÃO
// ===============================================

function renderPagination() {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    
    const totalPages = Math.ceil(filteredDenuncias.length / itemsPerPage);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Botão anterior
    html += `
        <button ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    // Páginas
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `
                <button class="${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">
                    ${i}
                </button>
            `;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<span style="padding: 0.5rem;">...</span>`;
        }
    }
    
    // Botão próximo
    html += `
        <button ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    pagination.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    renderDenunciasTable();
    
    // Scroll para o topo da tabela
    document.querySelector('.table-container').scrollIntoView({ behavior: 'smooth' });
}

// ===============================================
// MODAL DE STATUS
// ===============================================

function openStatusModal(id, currentStatus) {
    document.getElementById('modalDenunciaId').value = id;
    document.getElementById('novoStatus').value = currentStatus;
    openModal('statusModal');
}

function saveStatus() {
    const id = document.getElementById('modalDenunciaId').value;
    const novoStatus = document.getElementById('novoStatus').value;
    
    const denuncias = getDenuncias();
    const index = denuncias.findIndex(d => d.id === id);
    
    if (index !== -1) {
        denuncias[index].status = novoStatus;
        denuncias[index].dataAtualizacao = new Date().toISOString();
        saveDenuncias(denuncias);
        
        showToast('Status atualizado com sucesso!', 'success');
        closeModal('statusModal');
        loadAdminDashboard();
    }
}

// ===============================================
// MODAL DE EXCLUSÃO
// ===============================================

function openDeleteModal(id) {
    document.getElementById('deleteDenunciaId').value = id;
    openModal('deleteModal');
}

function confirmDelete() {
    const id = document.getElementById('deleteDenunciaId').value;
    
    let denuncias = getDenuncias();
    denuncias = denuncias.filter(d => d.id !== id);
    saveDenuncias(denuncias);
    
    showToast('Denúncia excluída com sucesso!', 'success');
    closeModal('deleteModal');
    loadAdminDashboard();
}

// ===============================================
// FUNÇÕES AUXILIARES
// ===============================================

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// ===============================================
// EXPORTAR FUNÇÕES
// ===============================================

window.loadAdminDashboard = loadAdminDashboard;
window.handleAdminSearch = handleAdminSearch;
window.handleAdminFilter = handleAdminFilter;
window.goToPage = goToPage;
window.openStatusModal = openStatusModal;
window.saveStatus = saveStatus;
window.openDeleteModal = openDeleteModal;
window.confirmDelete = confirmDelete;
