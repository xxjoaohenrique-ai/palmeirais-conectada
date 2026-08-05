/* ===============================================
   CIDADE LIMPA - DENUNCIA.JS
   Sistema de Denúncias
   =============================================== */

// ===============================================
// VARIÁVEIS GLOBAIS
// ===============================================

let selectedImage = null;

// ===============================================
// PREVIEW DE IMAGEM
// ===============================================

function previewImage(input) {
    const preview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        // Validar tamanho (5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast('A imagem deve ter no máximo 5MB.', 'error');
            input.value = '';
            return;
        }
        
        // Validar tipo
        if (!file.type.startsWith('image/')) {
            showToast('Por favor, selecione apenas arquivos de imagem.', 'error');
            input.value = '';
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            preview.classList.add('active');
            selectedImage = e.target.result;
        };
        
        reader.readAsDataURL(file);
    }
}

function removeImage() {
    const preview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const input = document.getElementById('foto');
    
    preview.classList.remove('active');
    previewImg.src = '';
    input.value = '';
    selectedImage = null;
}

// ===============================================
// CRIAR DENÚNCIA
// ===============================================

function handleDenuncia(event) {
    event.preventDefault();
    
    const currentUser = getCurrentUser();
    if (!currentUser) {
        showToast('Você precisa estar logado para fazer uma denúncia.', 'error');
        return;
    }
    
    const titulo = document.getElementById('titulo').value.trim();
    const categoria = document.getElementById('categoria').value;
    const endereco = document.getElementById('endereco').value.trim();
    const descricao = document.getElementById('descricao').value.trim();
    const errorDiv = document.getElementById('denunciaError');
    
    // Validações
    if (!titulo || !categoria || !endereco || !descricao) {
        showError(errorDiv, 'Por favor, preencha todos os campos obrigatórios.');
        return;
    }
    
    if (titulo.length < 10) {
        showError(errorDiv, 'O título deve ter pelo menos 10 caracteres.');
        return;
    }
    
    if (descricao.length < 20) {
        showError(errorDiv, 'A descrição deve ter pelo menos 20 caracteres.');
        return;
    }
    
    // Criar denúncia
    const novaDenuncia = {
        id: generateId(),
        titulo: titulo,
        categoria: categoria,
        endereco: endereco,
        descricao: descricao,
        foto: selectedImage || getDefaultImage(categoria),
        status: 'pendente',
        userId: currentUser.id,
        userName: currentUser.nome,
        userEmail: currentUser.email,
        data: new Date().toISOString(),
        dataAtualizacao: new Date().toISOString()
    };
    
    // Salvar
    const denuncias = getDenuncias();
    denuncias.unshift(novaDenuncia); // Adiciona no início
    saveDenuncias(denuncias);
    
    // Mostrar sucesso
    showToast('Denúncia registrada com sucesso!', 'success');
    
    // Limpar formulário
    document.getElementById('denunciaForm').reset();
    removeImage();
    
    // Redirecionar
    setTimeout(() => {
        window.location.href = 'minhas-denuncias.html';
    }, 1500);
}

// ===============================================
// IMAGEM PADRÃO POR CATEGORIA
// ===============================================

function getDefaultImage(categoria) {
    const images = {
        'Lixo Acumulado': 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600',
        'Entulho': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600',
        'Esgoto Vazando': 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600',
        'Iluminação Pública': 'https://images.unsplash.com/photo-1551405780-03882d5a2ba7?w=600',
        'Buracos nas Ruas': 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600',
        'Terrenos Abandonados': 'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=600'
    };
    return images[categoria] || 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600';
}

// ===============================================
// FUNÇÕES AUXILIARES
// ===============================================

function showError(element, message) {
    if (element) {
        element.innerHTML = `
            <div class="alert alert-error">
                <i class="fas fa-exclamation-circle"></i>
                <span>${message}</span>
            </div>
        `;
        element.style.display = 'block';
        
        // Scroll para o erro
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Remover após 5 segundos
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

// ===============================================
// CARREGAR MINHAS DENÚNCIAS
// ===============================================

function loadMinhasDenuncias() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    const container = document.getElementById('minhasDenunciasGrid');
    if (!container) return;
    
    const denuncias = getDenuncias();
    const minhasDenuncias = denuncias.filter(d => d.userId === currentUser.id);
    
    if (minhasDenuncias.length === 0) {
        container.innerHTML = `
            <div class="no-complaints" style="grid-column: 1 / -1;">
                <i class="fas fa-inbox"></i>
                <p>Você ainda não fez nenhuma denúncia.</p>
                <a href="denuncia.html" class="btn btn-primary mt-2">
                    <i class="fas fa-plus-circle"></i> Fazer Primeira Denúncia
                </a>
            </div>
        `;
        return;
    }
    
    container.innerHTML = minhasDenuncias.map(denuncia => `
        <div class="my-complaint-card">
            <div class="my-complaint-image">
                <img src="${denuncia.foto}" alt="${denuncia.titulo}">
                <div class="my-complaint-status">
                    <span class="status-badge ${denuncia.status}">
                        <i class="${getStatusIcon(denuncia.status)}"></i>
                        ${capitalizeFirst(denuncia.status.replace('-', ' '))}
                    </span>
                </div>
            </div>
            <div class="my-complaint-content">
                <span class="my-complaint-category">
                    <i class="${getCategoryIcon(denuncia.categoria)}"></i>
                    ${denuncia.categoria}
                </span>
                <h3 class="my-complaint-title">${denuncia.titulo}</h3>
                <p class="my-complaint-description">${denuncia.descricao}</p>
                <div class="my-complaint-meta">
                    <span>
                        <i class="fas fa-map-marker-alt"></i>
                        ${denuncia.endereco}
                    </span>
                    <span>
                        <i class="fas fa-calendar"></i>
                        ${formatDate(denuncia.data)}
                    </span>
                </div>
                <div class="my-complaint-actions">
                    <a href="detalhes.html?id=${denuncia.id}" class="btn btn-primary btn-sm">
                        <i class="fas fa-eye"></i> Ver Detalhes
                    </a>
                </div>
            </div>
        </div>
    `).join('');
}

// ===============================================
// PESQUISA DE DENÚNCIAS
// ===============================================

function searchDenuncias(query) {
    const currentUser = getCurrentUser();
    if (!currentUser) return [];
    
    const denuncias = getDenuncias();
    const minhasDenuncias = denuncias.filter(d => d.userId === currentUser.id);
    
    if (!query) return minhasDenuncias;
    
    const searchTerm = query.toLowerCase();
    return minhasDenuncias.filter(d => 
        d.titulo.toLowerCase().includes(searchTerm) ||
        d.descricao.toLowerCase().includes(searchTerm) ||
        d.endereco.toLowerCase().includes(searchTerm) ||
        d.categoria.toLowerCase().includes(searchTerm)
    );
}

function filterDenunciasByStatus(status) {
    const currentUser = getCurrentUser();
    if (!currentUser) return [];
    
    const denuncias = getDenuncias();
    const minhasDenuncias = denuncias.filter(d => d.userId === currentUser.id);
    
    if (!status || status === 'todos') return minhasDenuncias;
    
    return minhasDenuncias.filter(d => d.status === status);
}

// ===============================================
// EXPORTAR FUNÇÕES
// ===============================================

window.previewImage = previewImage;
window.removeImage = removeImage;
window.handleDenuncia = handleDenuncia;
window.loadMinhasDenuncias = loadMinhasDenuncias;
window.searchDenuncias = searchDenuncias;
window.filterDenunciasByStatus = filterDenunciasByStatus;
