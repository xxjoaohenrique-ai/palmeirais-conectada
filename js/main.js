/* ===============================================
   CIDADE LIMPA - MAIN.JS
   Funções Principais do Sistema
   =============================================== */

// ===============================================
// INICIALIZAÇÃO
// ===============================================

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar administrador padrão
    initializeAdmin();
    
    // Inicializar tema
    initializeTheme();
    
    // Inicializar navbar
    initializeNavbar();
    
    // Atualizar UI baseado no login
    updateUIForLoggedUser();
    
    // Inicializar animações de scroll
    initializeScrollAnimations();
    initChatbot();
    
    // Carregar estatísticas
    loadStats();
    
    // Carregar denúncias recentes
    loadRecentComplaints();
});

// ===============================================
// ADMINISTRADOR PADRÃO
// ===============================================

function initializeAdmin() {
    // Limpar dados antigos (remover usuários com email antigo)
    let users = JSON.parse(localStorage.getItem('cidadeLimpa_users')) || [];
    
    // Remover admin antigo se existir
    users = users.filter(u => u.email !== 'admin@cidade.com');
    
    const adminExists = users.find(u => u.email === 'admin@palmeirais.pi.gov.br');
    
    if (!adminExists) {
        const admin = {
            id: generateId(),
            nome: 'Prefeitura Municipal de Palmeirais',
            email: 'admin@palmeirais.pi.gov.br',
            senha: 'ocute',
            isAdmin: true,
            dataCadastro: new Date().toISOString()
        };
        users.push(admin);
    }
    
    localStorage.setItem('cidadeLimpa_users', JSON.stringify(users));
}

// Função para resetar todos os dados (limpar cadastros)
function resetAllData() {
    localStorage.removeItem('cidadeLimpa_users');
    localStorage.removeItem('cidadeLimpa_denuncias');
    localStorage.removeItem('cidadeLimpa_currentUser');
    initializeAdmin();
}

// Executar reset para limpar cadastros antigos
// resetAllData(); // ← COMENTADO: Não deve resetar a cada página carregada

// ===============================================
// TEMA (DARK MODE)
// ===============================================

function initializeTheme() {
    const savedTheme = localStorage.getItem('cidadeLimpa_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('cidadeLimpa_theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        if (icon) {
            icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }
}

// ===============================================
// NAVBAR
// ===============================================

function initializeNavbar() {
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            const icon = navToggle.querySelector('i');
            if (navMenu.classList.contains('active')) {
                icon.className = 'fas fa-times';
            } else {
                icon.className = 'fas fa-bars';
            }
        });
        
        // Fechar menu ao clicar em um link
        const navLinks = navMenu.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navMenu.classList.remove('active');
                const icon = navToggle.querySelector('i');
                icon.className = 'fas fa-bars';
            });
        });
    }
    
    // Navbar scroll effect
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
            } else {
                navbar.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            }
        }
    });
}

// ===============================================
// ATUALIZAR UI PARA USUÁRIO LOGADO
// ===============================================

function updateUIForLoggedUser() {
    const currentUser = getCurrentUser();
    
    // Elementos da navbar
    const navDenuncia = document.getElementById('navDenuncia');
    const navMinhasDenuncias = document.getElementById('navMinhasDenuncias');
    const navAdmin = document.getElementById('navAdmin');
    const navLogin = document.getElementById('navLogin');
    const navLogout = document.getElementById('navLogout');
    const heroBtn = document.getElementById('heroBtn');
    const ctaBtn = document.getElementById('ctaBtn');
    
    if (currentUser) {
        // Usuário logado
        if (navDenuncia) navDenuncia.style.display = 'block';
        if (navMinhasDenuncias) navMinhasDenuncias.style.display = 'block';
        if (navLogin) navLogin.style.display = 'none';
        if (navLogout) navLogout.style.display = 'block';
        
        // Mostrar painel admin apenas para admin
        if (navAdmin) {
            navAdmin.style.display = currentUser.isAdmin ? 'block' : 'none';
        }
        
        // Alterar botões do hero
        if (heroBtn) {
            heroBtn.href = 'denuncia.html';
            heroBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Nova Denúncia';
        }
        if (ctaBtn) {
            ctaBtn.href = 'denuncia.html';
            ctaBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Fazer Denúncia';
        }
    } else {
        // Usuário não logado
        if (navDenuncia) navDenuncia.style.display = 'none';
        if (navMinhasDenuncias) navMinhasDenuncias.style.display = 'none';
        if (navAdmin) navAdmin.style.display = 'none';
        if (navLogin) navLogin.style.display = 'block';
        if (navLogout) navLogout.style.display = 'none';
    }
}

// ===============================================
// ANIMAÇÕES DE SCROLL
// ===============================================

function initializeScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });
}

// ===============================================
// ESTATÍSTICAS
// ===============================================

function loadStats() {
    const denuncias = getDenuncias();
    const users = JSON.parse(localStorage.getItem('cidadeLimpa_users')) || [];
    
    const totalDenuncias = denuncias.length;
    const resolvidas = denuncias.filter(d => d.status === 'resolvido').length;
    const emAnalise = denuncias.filter(d => d.status === 'em-analise').length;
    const totalUsuarios = users.filter(u => !u.isAdmin).length;
    
    // Animar contadores
    animateCounter('totalDenuncias', totalDenuncias);
    animateCounter('denunciasResolvidas', resolvidas);
    animateCounter('totalUsuarios', totalUsuarios);
    animateCounter('emAnalise', emAnalise);
}

function animateCounter(elementId, target) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    let current = 0;
    const increment = target / 30;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 50);
}

// ===============================================
// DENÚNCIAS RECENTES
// ===============================================

function loadRecentComplaints() {
    const container = document.getElementById('recentComplaints');
    if (!container) return;
    
    const denuncias = getDenuncias();
    const recentDenuncias = denuncias.slice(0, 6);
    
    if (recentDenuncias.length === 0) {
        container.innerHTML = `
            <div class="no-complaints">
                <i class="fas fa-inbox"></i>
                <p>Nenhuma denúncia registrada ainda.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = recentDenuncias.map(denuncia => `
        <div class="complaint-card animate-on-scroll">
            <div class="complaint-image">
                <img src="${denuncia.foto || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'}" alt="${denuncia.titulo}">
            </div>
            <div class="complaint-content">
                <span class="complaint-category">
                    <i class="${getCategoryIcon(denuncia.categoria)}"></i>
                    ${denuncia.categoria}
                </span>
                <h3 class="complaint-title">${denuncia.titulo}</h3>
                <p class="complaint-address">
                    <i class="fas fa-map-marker-alt"></i>
                    ${denuncia.endereco}
                </p>
                <div class="complaint-footer">
                    <span class="complaint-date">
                        <i class="fas fa-calendar"></i>
                        ${formatDate(denuncia.data)}
                    </span>
                    <span class="complaint-status status-${denuncia.status.replace(' ', '-')}">
                        <i class="${getStatusIcon(denuncia.status)}"></i>
                        ${capitalizeFirst(denuncia.status.replace('-', ' '))}
                    </span>
                </div>
            </div>
        </div>
    `).join('');
    
    // Reinicializar animações
    initializeScrollAnimations();
}

// ===============================================
// FUNÇÕES UTILITÁRIAS
// ===============================================

// Gerar ID único
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Obter usuário atual
function getCurrentUser() {
    const userJson = localStorage.getItem('cidadeLimpa_currentUser');
    return userJson ? JSON.parse(userJson) : null;
}

// Obter todas as denúncias
function getDenuncias() {
    return JSON.parse(localStorage.getItem('cidadeLimpa_denuncias')) || [];
}

// Salvar denúncias
function saveDenuncias(denuncias) {
    localStorage.setItem('cidadeLimpa_denuncias', JSON.stringify(denuncias));
}

// Formatar data
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Formatar data e hora
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Capitalizar primeira letra
function capitalizeFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Ícone da categoria
function getCategoryIcon(categoria) {
    const icons = {
        'Lixo Acumulado': 'fas fa-trash',
        'Entulho': 'fas fa-dumpster',
        'Esgoto Vazando': 'fas fa-water',
        'Iluminação Pública': 'fas fa-lightbulb',
        'Buracos nas Ruas': 'fas fa-road',
        'Terrenos Abandonados': 'fas fa-home'
    };
    return icons[categoria] || 'fas fa-exclamation-circle';
}

// Ícone do status
function getStatusIcon(status) {
    const icons = {
        'pendente': 'fas fa-clock',
        'em-analise': 'fas fa-search',
        'resolvido': 'fas fa-check-circle'
    };
    return icons[status] || 'fas fa-question-circle';
}

// ===============================================
// SISTEMA DE TOAST (NOTIFICAÇÕES)
// ===============================================

function showToast(message, type = 'success') {
    // Criar container se não existir
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    // Criar toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-times-circle',
        warning: 'fas fa-exclamation-triangle'
    };
    
    toast.innerHTML = `
        <i class="${icons[type] || icons.success}"></i>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Remover automaticamente após 4 segundos
    setTimeout(() => {
        toast.style.animation = 'toastSlide 0.3s ease reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ===============================================
// VALIDAÇÃO DE FORMULÁRIOS
// ===============================================

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePassword(password) {
    return password.length >= 6;
}

function validateRequired(value) {
    return value.trim() !== '';
}

// ===============================================
// PROTEÇÃO DE ROTAS
// ===============================================

function requireLogin() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        showToast('Você precisa estar logado para acessar esta página.', 'warning');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return false;
    }
    return true;
}

function requireAdmin() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        showToast('Você precisa estar logado para acessar esta página.', 'warning');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return false;
    }
    if (!currentUser.isAdmin) {
        showToast('Acesso negado. Área restrita a administradores.', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        return false;
    }
    return true;
}

// ===============================================
// LOGOUT
// ===============================================

function logout() {
    localStorage.removeItem('cidadeLimpa_currentUser');
    showToast('Logout realizado com sucesso!', 'success');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

// ===============================================
// CHATBOT DE AJUDA
// ===============================================

function createChatbotElements() {
    if (document.getElementById('chatbotToggle')) return;

    const toggleButton = document.createElement('button');
    toggleButton.id = 'chatbotToggle';
    toggleButton.className = 'chatbot-toggle';
    toggleButton.type = 'button';
    toggleButton.innerHTML = '<i class="fas fa-comments"></i>';

    const panel = document.createElement('div');
    panel.id = 'chatbotPanel';
    panel.className = 'chatbot-panel';
    panel.innerHTML = `
        <div class="chatbot-header">
            <div>
                <h3>Ajuda</h3>
                <p>Chatbot de suporte rápido</p>
            </div>
            <button id="chatbotClose" class="chatbot-close" type="button"><i class="fas fa-times"></i></button>
        </div>
        <div class="chatbot-body">
            <div id="chatbotMessages" class="chatbot-messages"></div>
            <form id="chatbotForm" class="chatbot-input-group">
                <input id="chatbotInput" type="text" class="chatbot-input" placeholder="Escreva sua dúvida..." autocomplete="off" required />
                <button type="submit" class="chatbot-send"><i class="fas fa-paper-plane"></i></button>
            </form>
        </div>
    `;

    document.body.appendChild(toggleButton);
    document.body.appendChild(panel);
}

function initChatbot() {
    createChatbotElements();

    const toggle = document.getElementById('chatbotToggle');
    const close = document.getElementById('chatbotClose');
    const form = document.getElementById('chatbotForm');
    const messages = document.getElementById('chatbotMessages');
    const panel = document.getElementById('chatbotPanel');

    if (!toggle || !close || !form || !messages || !panel) return;

    toggle.addEventListener('click', () => {
        panel.classList.toggle('active');
        if (panel.classList.contains('active') && messages.childElementCount === 0) {
            addChatbotMessage('Olá! Sou o assistente de ajuda. Posso orientar sobre cadastro, denúncias e status.', 'bot');
        }
    });

    close.addEventListener('click', () => {
        panel.classList.remove('active');
    });

    form.addEventListener('submit', handleChatbotSubmit);
}

function handleChatbotSubmit(event) {
    event.preventDefault();
    const input = document.getElementById('chatbotInput');
    const messages = document.getElementById('chatbotMessages');
    if (!input || !messages) return;

    const text = input.value.trim();
    if (!text) return;

    addChatbotMessage(text, 'user');
    input.value = '';

    setTimeout(() => {
        addChatbotMessage(getChatbotResponse(text), 'bot');
    }, 400);
}

function addChatbotMessage(text, sender) {
    const messages = document.getElementById('chatbotMessages');
    if (!messages) return;

    const messageElement = document.createElement('div');
    messageElement.className = `chatbot-message ${sender}`;
    messageElement.innerHTML = `<div class="message-text">${text}</div>`;

    messages.appendChild(messageElement);
    messages.scrollTop = messages.scrollHeight;
}

function getChatbotResponse(text) {
    const normalized = text.toLowerCase();

    if (normalized.includes('não consigo') || normalized.includes('problema') || normalized.includes('erro')) {
        return 'Qual problema você está enfrentando? Posso ajudar com login, envio de denúncia e acompanhamento de status.';
    }

    if (normalized.includes('login') || normalized.includes('entrar') || normalized.includes('acessar')) {
        return 'Para acessar, vá em Entrar e use seu email e senha cadastrados. Se ainda não tem conta, clique em Cadastrar.';
    }

    if (normalized.includes('cadastro') || normalized.includes('cadastrar')) {
        return 'Para se cadastrar, acesse a página de cadastro e informe nome, email e senha. Depois faça login para enviar denúncias.';
    }

    if (normalized.includes('denúncia') || normalized.includes('denuncia') || normalized.includes('registrar')) {
        return 'Para registrar uma denúncia, acesse Nova Denúncia, preencha título, categoria, endereço e descrição, e envie uma foto se possível.';
    }

    if (normalized.includes('status') || normalized.includes('acompanhar')) {
        return 'Você pode acompanhar suas denúncias na página Minhas Denúncias após fazer login.';
    }

    if (normalized.includes('foto') || normalized.includes('imagem')) {
        return 'Adicione uma foto do problema no formulário de denúncia para ajudar a equipe a reconhecer melhor a ocorrência.';
    }

    return 'Desculpe, não consegui ajudar com isso agora. Encaminhando para um atendente. Você pode enviar um email para prefeitura@palmeirais.pi.gov.br.';
}

// ===============================================
// MODAL
// ===============================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Fechar modal ao clicar fora
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// Fechar modal com ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal-overlay.active');
        modals.forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }
});

// ===============================================
// INICIALIZAÇÃO DO SISTEMA
// ===============================================

function initializeApp() {
    // Criar usuário admin padrão se não existir
    const users = JSON.parse(localStorage.getItem('cidadeLimpa_users')) || [];
    
    // Verificar se já existe um admin
    const adminExists = users.some(u => u.isAdmin);
    
    if (!adminExists && users.length === 0) {
        // Criar admin padrão na primeira execução
        const defaultAdmin = {
            id: generateId(),
            nome: 'Administrador',
            email: 'admin@palmeirais.com.br',
            senha: 'admin123',
            isAdmin: true,
            dataCadastro: new Date().toISOString()
        };
        users.push(defaultAdmin);
        localStorage.setItem('cidadeLimpa_users', JSON.stringify(users));
        console.log('✓ Usuário admin padrão criado: admin@palmeirais.com.br / admin123');
    }
}

// Executar inicialização quando o documento carregar
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// ===============================================
// EXPORTAR FUNÇÕES GLOBAIS
// ===============================================

window.showToast = showToast;
window.logout = logout;
window.openModal = openModal;
window.closeModal = closeModal;
window.requireLogin = requireLogin;
window.requireAdmin = requireAdmin;
window.getCurrentUser = getCurrentUser;
window.getDenuncias = getDenuncias;
window.saveDenuncias = saveDenuncias;
window.generateId = generateId;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.capitalizeFirst = capitalizeFirst;
window.getCategoryIcon = getCategoryIcon;
window.getStatusIcon = getStatusIcon;
window.validateEmail = validateEmail;
window.validatePassword = validatePassword;
window.validateRequired = validateRequired;
