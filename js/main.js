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

    // Sincronizar dados em tempo real
    setupRealtimeDashboard();
});

// ===============================================
// SEGURANÇA E UTILITÁRIOS
// ===============================================

function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function hashPassword(password) {
    if (!password) return '';

    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits({
        name: 'PBKDF2',
        salt,
        iterations: 120000,
        hash: 'SHA-256'
    }, keyMaterial, 256);

    const saltBase64 = btoa(String.fromCharCode(...salt));
    const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(derivedBits)));

    return `${saltBase64}:${hashBase64}`;
}

async function verifyPassword(password, storedHash) {
    if (!password || !storedHash) return false;

    const [saltBase64, hashBase64] = String(storedHash).split(':');
    if (!saltBase64 || !hashBase64) {
        return false;
    }

    try {
        const encoder = new TextEncoder();
        const salt = Uint8Array.from(atob(saltBase64), char => char.charCodeAt(0));
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveBits']
        );

        const derivedBits = await crypto.subtle.deriveBits({
            name: 'PBKDF2',
            salt,
            iterations: 120000,
            hash: 'SHA-256'
        }, keyMaterial, 256);

        const expectedHash = btoa(String.fromCharCode(...new Uint8Array(derivedBits)));
        return constantTimeEqual(expectedHash, hashBase64);
    } catch (error) {
        return false;
    }
}

function constantTimeEqual(a, b) {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

function safeParseStorage(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch (error) {
        console.warn(`Conteúdo inválido em ${key}. Recarregando com fallback.`);
        return fallback;
    }
}

function sanitizeUser(user) {
    if (!user) return null;
    return {
        id: user.id || generateId(),
        nome: String(user.nome || '').trim(),
        email: String(user.email || '').trim().toLowerCase(),
        senhaHash: user.senhaHash || user.senha || '',
        isAdmin: Boolean(user.isAdmin),
        dataCadastro: user.dataCadastro || new Date().toISOString()
    };
}

function normalizeComplaint(complaint = {}) {
    const item = { ...complaint };
    item.id = item.id || item.denuncia_id || generateId();
    item.titulo = item.titulo || item.title || '';
    item.categoria = item.categoria || item.category || '';
    item.endereco = item.endereco || item.address || '';
    item.descricao = item.descricao || item.description || '';
    item.foto = item.foto || item.imagem || item.image_url || '';
    item.status = item.status || 'pendente';
    item.userId = item.userId || item.user_id || item.userID || '';
    item.user_id = item.userId;
    item.userName = item.userName || item.user_name || item.nome_usuario || 'Usuário';
    item.user_name = item.userName;
    item.userEmail = item.userEmail || item.user_email || item.email || '';
    item.data = item.data || item.created_at || item.dataCriacao || new Date().toISOString();
    item.created_at = item.data;
    return item;
}

function mergeComplaints(...sources) {
    const merged = new Map();

    sources.flat().forEach((complaint) => {
        const normalized = normalizeComplaint(complaint);
        if (!normalized.id) return;
        merged.set(normalized.id, normalized);
    });

    return [...merged.values()].sort((a, b) => new Date(b.data) - new Date(a.data));
}

async function syncComplaintToSupabase(complaint) {
    if (!(window.isSupabaseConfigured && window.isSupabaseConfigured()) || !window.supabaseCreateComplaint) {
        return;
    }

    try {
        const normalized = normalizeComplaint(complaint);

        const { data, error } = await window.supabaseCreateComplaint({
            titulo: normalized.titulo,
            categoria: normalized.categoria,
            endereco: normalized.endereco,
            descricao: normalized.descricao,
            foto: normalized.foto,
            status: normalized.status,
            user_id: normalized.userId,
            user_name: normalized.userName,
            user_email: normalized.userEmail,
            created_at: normalized.data
        });

        if (error) {
            throw error;
        }

        return data;
    } catch (error) {
        console.warn('Não foi possível sincronizar denúncia com o Supabase:', error);
        throw error;
    }
}

// ===============================================
// ADMINISTRADOR PADRÃO
// ===============================================

async function initializeAdmin() {
    let users = safeParseStorage('cidadeLimpa_users', []);
    users = users.filter(u => u && u.email !== 'admin@cidade.com');

    const adminExists = users.find(u => u && u.email === 'admin@palmeirais.pi.gov.br');
    if (!adminExists) {
        const adminPassword = 'Palmeirais@2026!Segura';
        const admin = {
            id: generateId(),
            nome: 'Prefeitura Municipal de Palmeirais',
            email: 'admin@palmeirais.pi.gov.br',
            senhaHash: await hashPassword(adminPassword),
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

    const closeMobileMenu = () => {
        if (!navMenu || !navToggle) return;
        navMenu.classList.remove('active');
        const icon = navToggle.querySelector('i');
        if (icon) {
            icon.className = 'fas fa-bars';
        }
        navToggle.setAttribute('aria-expanded', 'false');
    };

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            const isActive = navMenu.classList.contains('active');
            navMenu.classList.toggle('active', !isActive);
            const icon = navToggle.querySelector('i');
            if (icon) {
                icon.className = isActive ? 'fas fa-bars' : 'fas fa-times';
            }
            navToggle.setAttribute('aria-expanded', String(!isActive));
        });

        const navLinks = navMenu.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                closeMobileMenu();
            });
        });

        document.addEventListener('click', function(event) {
            const clickedInsideMenu = navMenu.contains(event.target);
            const clickedToggle = navToggle.contains(event.target);
            if (navMenu.classList.contains('active') && !clickedInsideMenu && !clickedToggle) {
                closeMobileMenu();
            }
        });
    }

    window.addEventListener('resize', function() {
        if (window.innerWidth > 768 && navMenu) {
            closeMobileMenu();
        }
    });

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

async function getMergedComplaints() {
    const localComplaints = getDenuncias();
    let supabaseComplaints = [];

    if (window.isSupabaseConfigured && window.isSupabaseConfigured() && window.supabaseGetComplaints) {
        try {
            supabaseComplaints = await window.supabaseGetComplaints();
        } catch (error) {
            console.warn('Não foi possível sincronizar denúncias do Supabase:', error);
        }
    }

    const merged = mergeComplaints(localComplaints, supabaseComplaints);
    if (merged.length > 0) {
        saveDenuncias(merged);
    }
    return merged;
}

async function getAllUsersForStats() {
    const localUsers = safeParseStorage('cidadeLimpa_users', []);
    const mergedUsers = new Map();

    localUsers.forEach((user) => {
        if (!user || !user.email) return;
        const cleanUser = sanitizeUser(user);
        mergedUsers.set(String(cleanUser.email).toLowerCase(), cleanUser);
    });

    if (window.isSupabaseConfigured && window.isSupabaseConfigured() && window.supabaseGetProfiles) {
        try {
            const profiles = await window.supabaseGetProfiles();
            profiles.forEach((profile) => {
                if (!profile?.email) return;
                const normalized = sanitizeUser({
                    id: profile.id || profile.user_id,
                    nome: profile.nome || profile.name || profile.email?.split('@')[0] || 'Usuário',
                    email: profile.email,
                    senhaHash: '',
                    isAdmin: Boolean(profile.is_admin || profile.isAdmin),
                    dataCadastro: profile.created_at || new Date().toISOString()
                });
                mergedUsers.set(String(normalized.email).toLowerCase(), normalized);
            });
        } catch (error) {
            console.warn('Não foi possível sincronizar usuários do Supabase:', error);
        }
    }

    return [...mergedUsers.values()].filter(user => !user.isAdmin);
}

async function loadStats() {
    const denuncias = await getMergedComplaints();
    const users = await getAllUsersForStats();
    
    const totalDenuncias = denuncias.length;
    const pendentes = denuncias.filter(d => d.status === 'pendente').length;
    const emAnalise = denuncias.filter(d => d.status === 'em-analise').length;
    const resolvidas = denuncias.filter(d => d.status === 'resolvido').length;
    const totalUsuarios = users.length;
    
    animateCounter('totalDenuncias', totalDenuncias);
    animateCounter('pendentes', pendentes);
    animateCounter('emAnalise', emAnalise);
    animateCounter('denunciasResolvidas', resolvidas);
    animateCounter('totalUsuarios', totalUsuarios);
}

function setupRealtimeDashboard() {
    if (document.getElementById('denunciasTableBody')) return;

    if (!(window.isSupabaseConfigured && window.isSupabaseConfigured()) || !window.supabaseSubscribeToComplaints) {
        return;
    }

    if (window.__cidadeLimpaComplaintChannel) return;

    window.__cidadeLimpaComplaintChannel = window.supabaseSubscribeToComplaints(refreshComplaintViews, handleRealtimeStatus);
    startComplaintRefreshFallback();
}

function handleRealtimeStatus(status) {
    if (status === 'SUBSCRIBED') {
        window.__cidadeLimpaRealtimeWarningShown = false;
        return;
    }

    if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
        if (window.__cidadeLimpaRealtimeWarningShown) return;

        window.__cidadeLimpaRealtimeWarningShown = true;
        showToast('Atualizações em tempo real indisponíveis. Recarregue a página para atualizar.', 'warning');
    }
}

function refreshComplaintViews() {
    loadStats();
    loadRecentComplaints();
    if (typeof window.loadAdminDashboard === 'function') {
        window.loadAdminDashboard();
    }
}

function startComplaintRefreshFallback() {
    if (window.__cidadeLimpaComplaintRefreshTimer) return;

    window.__cidadeLimpaComplaintRefreshTimer = window.setInterval(() => {
        refreshComplaintViews();
    }, 15000);
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

async function loadRecentComplaints() {
    const container = document.getElementById('recentComplaints');
    if (!container) return;

    const denuncias = await getMergedComplaints();
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
                <img src="${escapeHtml(denuncia.foto || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400')}" alt="${escapeHtml(denuncia.titulo)}">
            </div>
            <div class="complaint-content">
                <span class="complaint-category">
                    <i class="${getCategoryIcon(denuncia.categoria)}"></i>
                    ${escapeHtml(denuncia.categoria)}
                </span>
                <h3 class="complaint-title">${escapeHtml(denuncia.titulo)}</h3>
                <p class="complaint-address">
                    <i class="fas fa-map-marker-alt"></i>
                    ${escapeHtml(denuncia.endereco)}
                </p>
                <div class="complaint-meta-row">
                    <span class="complaint-user">
                        <i class="fas fa-user"></i>
                        Cidadão
                    </span>
                    <span class="complaint-date">
                        <i class="fas fa-calendar"></i>
                        ${formatDate(denuncia.data)}
                    </span>
                </div>
                <div class="complaint-footer">
                    <span class="complaint-label">Registrada</span>
                    <span class="complaint-status status-${denuncia.status.replace(' ', '-')}">
                        <i class="${getStatusIcon(denuncia.status)}"></i>
                        ${escapeHtml(capitalizeFirst(denuncia.status.replace('-', ' ')))}
                    </span>
                </div>
            </div>
        </div>
    `).join('');
    
    initializeScrollAnimations();
}

// ===============================================
// FUNÇÕES UTILITÁRIAS
// ===============================================

// Gerar ID único em formato UUID v4
function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Obter usuário atual
function getCurrentUser() {
    const userJson = sessionStorage.getItem('cidadeLimpa_currentUser') || localStorage.getItem('cidadeLimpa_currentUser');
    if (!userJson) return null;
    try {
        return JSON.parse(userJson);
    } catch (error) {
        sessionStorage.removeItem('cidadeLimpa_currentUser');
        localStorage.removeItem('cidadeLimpa_currentUser');
        return null;
    }
}

async function restoreSupabaseSession() {
    const currentUser = getCurrentUser();
    if (currentUser || !window.supabaseGetSessionUser) return currentUser;

    try {
        const supabaseUser = await window.supabaseGetSessionUser();
        if (!supabaseUser) return null;

        sessionStorage.setItem('cidadeLimpa_currentUser', JSON.stringify(supabaseUser));
        return supabaseUser;
    } catch (error) {
        console.warn('Não foi possível restaurar a sessão do Supabase:', error);
        return null;
    }
}

// Obter todas as denúncias
function getDenuncias() {
    const stored = JSON.parse(localStorage.getItem('cidadeLimpa_denuncias')) || [];
    return stored.map(normalizeComplaint);
}

// Salvar denúncias
function saveDenuncias(denuncias) {
    const normalized = (denuncias || []).map(normalizeComplaint);
    localStorage.setItem('cidadeLimpa_denuncias', JSON.stringify(normalized));
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

async function logout() {
    if (window.isSupabaseConfigured && window.isSupabaseConfigured() && window.supabaseSignOut) {
        try {
            const { data: { session } } = await window.supabaseClient?.auth?.getSession?.() || { data: { session: null } };
            if (session) {
                await window.supabaseSignOut();
            }
        } catch (error) {
            console.warn('Logout do Supabase falhou:', error);
        }
    }

    sessionStorage.removeItem('cidadeLimpa_currentUser');
    localStorage.removeItem('cidadeLimpa_currentUser');
    showToast('Logout realizado com sucesso!', 'success');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

// ===============================================
// CHATBOT DE AJUDA
// ===============================================

// Assistente local: orientações reais do sistema, sem chamadas externas nem acesso a denúncias pessoais.
// O contexto fica apenas na memória da aba e é descartado ao fechar/recarregar a página.
const chatbotMemory = { lastIntent: null };

function normalizeChatbotText(value) {
    return String(value || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function classifyChatbotIntent(normalized) {
    const patterns = [
        ['emergency', 100, /\b(emergencia|incendio|fogo|risco de vida|acidente grave|socorro)\b/],
        ['recovery', 90, /\b(esqueci|perdi|recuperar|redefinir|resetar|trocar|alterar)\b.*\b(senha|acesso)\b|\b(senha|acesso)\b.*\b(esqueci|perdi|recuperar|redefinir|resetar|trocar|alterar)\b/],
        ['photo', 87, /\b(foto|imagem|upload|anexo|arquivo|camera|fotografia)\b/],
        ['privacy', 85, /\b(anonim|anonima|anonimo|privacidade|dados pessoais|identidade|sigilo)\b/],
        ['deadline', 83, /\b(prazo|quanto tempo|demora|quando vai|quando sera|previsao)\b/],
        ['delete', 82, /\b(excluir|apagar|remover|cancelar)\b.*\b(denuncia|ocorrencia|registro)\b|\b(denuncia|ocorrencia|registro)\b.*\b(excluir|apagar|remover|cancelar)\b/],
        ['edit', 81, /\b(editar|corrigir|mudar|alterar)\b.*\b(denuncia|endereco|descricao|ocorrencia)\b/],
        ['login', 80, /\b(login|logar|entrar|acessar|acesso|autenticacao|senha incorreta|email incorreto)\b/],
        ['register', 79, /\b(cadastro|cadastrar|cadastra|criar conta|nova conta|registrar conta)\b/],
        ['status', 77, /\b(status|andamento|acompanhar|pendente|resolvido|em analise|protocolo|minhas denuncias|minha denuncia|foi aceita)\b/],
        ['location', 76, /\b(endereco|localizacao|localizar|local|mapa|rua|bairro|gps)\b/],
        ['category', 75, /\b(lixo|entulho|esgoto|iluminacao|poste|lampada|buraco|pavimentacao|terreno|mato alto)\b/],
        ['report', 65, /\b(denuncia|denunciar|denuncias|ocorrencia|registrar problema|relatar|enviar denuncia|reportar)\b/],
        ['contact', 58, /\b(contato|atendente|humano|prefeitura|telefone|email|e mail|suporte|falar com alguem)\b/],
        ['cost', 55, /\b(custa|custo|pagar|preco|gratuito|gratis|taxa)\b/],
        ['install', 53, /\b(instalar|aplicativo|app|iphone|android|tela inicial)\b/],
        ['thanks', 45, /\b(obrigado|obrigada|valeu|agradeco)\b/],
        ['greeting', 40, /^(oi|ola|bom dia|boa tarde|boa noite|e ai|ajuda|menu|comecar)$/]
    ];
    let best = null;
    for (const [intent, weight, pattern] of patterns) {
        if (pattern.test(normalized) && (!best || weight > best.weight)) best = { intent, weight };
    }
    if (best) return best.intent;
    // Perguntas curtas podem continuar o assunto anterior sem guardar informações pessoais.
    if (chatbotMemory.lastIntent && /^(como|onde|e como|e onde|nao deu|nao consegui|continua|e isso|e depois|o que faco|por que|porque|me explica|qual o proximo passo)\b/.test(normalized)) {
        return chatbotMemory.lastIntent;
    }
    return 'unknown';
}

function makeChatbotReply(text, actions, intent) {
    if (intent && intent !== 'unknown' && intent !== 'greeting' && intent !== 'thanks') chatbotMemory.lastIntent = intent;
    return { text, actions: actions || [] };
}

function getChatbotResponse(message) {
    const text = normalizeChatbotText(message);
    const intent = classifyChatbotIntent(text);
    const loggedIn = typeof getCurrentUser === 'function' && Boolean(getCurrentUser());
    const help = (body, actions) => makeChatbotReply(body, actions, intent);
    const link = (label, href) => ({ label, href });
    const ask = (label, prompt) => ({ label, prompt });
    const reportLink = link('Nova denúncia', 'denuncia.html');
    const trackLink = link('Minhas denúncias', 'minhas-denuncias.html');
    const loginLink = link('Entrar', 'login.html');

    switch (intent) {
        case 'emergency':
            return help('Se houver perigo imediato, procure o serviço público de emergência apropriado. Este chat não atende emergências e não envia alertas às autoridades.', [ask('Como registrar depois?', 'Como registrar uma denúncia?')]);
        case 'recovery':
            return help('Na página Entrar, selecione “Esqueci minha senha”, informe o e-mail cadastrado e siga o link recebido. Confira também a pasta de spam. Nunca envie sua senha neste chat.', [loginLink, ask('Ainda não consigo entrar', 'Não consigo entrar na conta')]);
        case 'photo':
            return help('Em Nova Denúncia, toque na área “Foto da Ocorrência” e escolha uma imagem. O formulário aceita uma foto de até 5 MB; o campo é opcional. Se falhar, tente um arquivo menor, confira a conexão e envie novamente. Não coloque documentos pessoais na foto.', [reportLink, ask('Como preencher a denúncia?', 'Como registrar uma denúncia?')]);
        case 'privacy':
            return help('O envio usa uma conta cadastrada; não posso garantir anonimato ou sigilo de identidade. Evite dados pessoais desnecessários na descrição e na foto. Para saber como seus dados são tratados, procure o responsável pelo serviço.', [link('Cadastro', 'cadastro.html'), ask('Como falar com alguém?', 'Quero contato com a prefeitura')]);
        case 'deadline':
            return help('Não consigo consultar prazos reais nem prometer uma data de solução. Acompanhe a situação em Minhas Denúncias e abra os detalhes da ocorrência para ver o histórico disponível.', [trackLink, ask('O que significa pendente?', 'O que significa status pendente?')]);
        case 'delete':
        case 'edit':
            return help('Este chatbot não modifica nem exclui ocorrências. Confira a página Minhas Denúncias e os detalhes do registro; se não houver essa opção, entre em contato com o responsável pelo serviço. Não envie senha ou dados pessoais aqui.', [trackLink, ask('Falar com suporte', 'Quero contato com a prefeitura')]);
        case 'login':
            return help(loggedIn
                ? 'Sua sessão parece estar ativa neste navegador. Para enviar uma nova ocorrência, abra Nova Denúncia. Se outra conta for necessária, use a opção Sair do menu.'
                : 'Abra Entrar e informe o e-mail e a senha cadastrados. Se aparecer um erro, confira o e-mail, a conexão e se há espaços extras. Se esqueceu a senha, use “Esqueci minha senha”.', [loginLink, ask('Esqueci minha senha', 'Esqueci minha senha')]);
        case 'register':
            return help('Na página de cadastro, informe nome, e-mail, senha e confirmação da senha. Depois entre na sua conta para registrar ocorrências. Se seu e-mail já estiver cadastrado, tente entrar ou recuperar sua senha.', [link('Criar conta', 'cadastro.html'), loginLink]);
        case 'status':
            return help(loggedIn
                ? 'Abra Minhas Denúncias e selecione a ocorrência. “Pendente” indica registro aguardando análise, “Em Análise” indica avaliação em andamento, e “Resolvido” indica que a ocorrência foi marcada como resolvida. Não consigo ver o status específico da sua conta por este chat.'
                : 'Faça login e abra Minhas Denúncias para acompanhar suas ocorrências. Pendente, Em Análise e Resolvido são as situações exibidas pelo sistema; este chat não consulta seus registros.', [loggedIn ? trackLink : loginLink, ask('Entender os status', 'O que significa status pendente?')]);
        case 'location':
            return help('No campo Endereço / Localização, informe rua, número ou ponto de referência e bairro, com detalhes suficientes para localizar o problema. Evite incluir seu endereço pessoal quando ele não for o local da ocorrência.', [reportLink]);
        case 'category': {
            let selected = '';
            if (/\b(lixo)\b/.test(text)) selected = 'Lixo Acumulado';
            else if (/\b(entulho)\b/.test(text)) selected = 'Entulho';
            else if (/\b(esgoto)\b/.test(text)) selected = 'Esgoto Vazando';
            else if (/\b(iluminacao|poste|lampada)\b/.test(text)) selected = 'Iluminação Pública';
            else if (/\b(buraco|pavimentacao)\b/.test(text)) selected = 'Buracos nas Ruas';
            else if (/\b(terreno|mato alto)\b/.test(text)) selected = 'Terrenos Abandonados';
            return help(selected
                ? 'Para esse problema, selecione a categoria “' + selected + '” em Nova Denúncia. Descreva o local e o que aconteceu, e anexe uma foto se tiver.'
                : 'As categorias disponíveis são: Lixo Acumulado, Entulho, Esgoto Vazando, Iluminação Pública, Buracos nas Ruas e Terrenos Abandonados.', [reportLink, ask('Como preencher?', 'Como registrar uma denúncia?')]);
        }
        case 'report':
            return help(loggedIn
                ? 'Abra Nova Denúncia. Preencha título, categoria, endereço e descrição detalhada; a foto é opcional. Revise os dados e toque em Enviar Denúncia. Depois acompanhe em Minhas Denúncias.'
                : 'Para enviar uma denúncia, primeiro entre na sua conta ou cadastre-se. Depois abra Nova Denúncia, preencha título, categoria, endereço e descrição; a foto é opcional.', [loggedIn ? reportLink : loginLink, trackLink]);
        case 'contact':
            return help('Este chat oferece orientação automática e não transfere a conversa para um atendente. Para assuntos que precisam de uma pessoa, use os contatos publicados no rodapé do site ou procure o órgão responsável. Não informe dados sensíveis aqui.', [link('Voltar ao início', 'index.html')]);
        case 'cost':
            return help('O cadastro e o registro de denúncias nesta plataforma não apresentam etapa de pagamento. Não envie dinheiro nem dados bancários solicitados por mensagens que aleguem ser deste chatbot.', [link('Criar conta', 'cadastro.html')]);
        case 'install':
            return help('No Android, abra o site no navegador e procure “Instalar aplicativo” ou “Adicionar à tela inicial”. No iPhone, abra no Safari e use Compartilhar → Adicionar à Tela de Início. A opção pode variar conforme o aparelho e o navegador.', [link('Página inicial', 'index.html')]);
        case 'thanks':
            return help('Por nada! Posso ajudar você a registrar ou acompanhar uma denúncia.', [ask('Registrar denúncia', 'Como registrar uma denúncia?'), ask('Acompanhar', 'Como acompanho minha denúncia?')]);
        case 'greeting':
            return help('Olá! Sou o assistente automático da Palmeirais Conectada. Posso orientar sobre login, cadastro, denúncias, fotos e acompanhamento. Sobre qual assunto você precisa de ajuda?', [ask('Fazer denúncia', 'Como registrar uma denúncia?'), ask('Acompanhar', 'Como acompanho minha denúncia?'), ask('Problema no login', 'Não consigo entrar na conta')]);
        default:
            return help('Quero entender melhor para orientar você. Sua dúvida é sobre entrar na conta, fazer uma denúncia, enviar uma foto ou acompanhar uma ocorrência? Não consigo consultar contas ou encaminhar mensagens a atendentes.', [ask('Entrar na conta', 'Não consigo entrar na conta'), ask('Fazer denúncia', 'Como registrar uma denúncia?'), ask('Acompanhar', 'Como acompanho minha denúncia?')]);
    }
}

function createChatbotElements() {
    if (document.getElementById('chatbotToggle')) return;

    const toggleButton = document.createElement('button');
    toggleButton.id = 'chatbotToggle';
    toggleButton.className = 'chatbot-toggle';
    toggleButton.type = 'button';
    toggleButton.setAttribute('aria-label', 'Abrir assistente de ajuda');
    toggleButton.setAttribute('aria-controls', 'chatbotPanel');
    toggleButton.setAttribute('aria-expanded', 'false');
    toggleButton.innerHTML = '<i class="fas fa-comments" aria-hidden="true"></i>';

    const panel = document.createElement('section');
    panel.id = 'chatbotPanel';
    panel.className = 'chatbot-panel';
    panel.setAttribute('aria-label', 'Assistente de ajuda da Palmeirais Conectada');
    panel.innerHTML =
        '<div class="chatbot-header"><div><h3>Ajuda da Palmeirais Conectada</h3><p>Orientação automática • não é atendimento humano</p></div>' +
        '<button id="chatbotClose" class="chatbot-close" type="button" aria-label="Fechar ajuda"><i class="fas fa-times" aria-hidden="true"></i></button></div>' +
        '<div class="chatbot-body"><div id="chatbotMessages" class="chatbot-messages" role="log" aria-live="polite" aria-relevant="additions"></div>' +
        '<form id="chatbotForm" class="chatbot-input-group"><label class="chatbot-sr-only" for="chatbotInput">Escreva sua dúvida</label>' +
        '<input id="chatbotInput" type="text" class="chatbot-input" maxlength="500" placeholder="Escreva sua dúvida..." autocomplete="off" required />' +
        '<button type="submit" class="chatbot-send" aria-label="Enviar mensagem"><i class="fas fa-paper-plane" aria-hidden="true"></i></button></form>' +
        '<p class="chatbot-notice">Não compartilhe senhas, documentos ou dados pessoais neste chat.</p></div>';

    document.body.appendChild(toggleButton);
    document.body.appendChild(panel);
}

function addChatbotMessage(text, sender, actions) {
    const messages = document.getElementById('chatbotMessages');
    if (!messages) return;

    const messageElement = document.createElement('div');
    messageElement.className = 'chatbot-message ' + sender;
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    messageText.textContent = text;
    messageElement.appendChild(messageText);

    if (sender === 'bot' && actions && actions.length) {
        const buttonRow = document.createElement('div');
        buttonRow.className = 'chatbot-actions';
        for (const action of actions.slice(0, 3)) {
            if (action.href && /^(index|login|cadastro|denuncia|minhas-denuncias)\.html$/.test(action.href)) {
                const a = document.createElement('a');
                a.href = action.href;
                a.textContent = action.label;
                buttonRow.appendChild(a);
            } else if (action.prompt) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = action.label;
                btn.addEventListener('click', function () { sendChatbotText(action.prompt); });
                buttonRow.appendChild(btn);
            }
        }
        messageElement.appendChild(buttonRow);
    }

    messages.appendChild(messageElement);
    while (messages.childElementCount > 40) messages.firstElementChild.remove();
    messages.scrollTop = messages.scrollHeight;
}

function sendChatbotText(text) {
    const input = document.getElementById('chatbotInput');
    if (!text || !text.trim()) return;
    addChatbotMessage(text.trim(), 'user');
    if (input) { input.value = ''; input.focus(); }
    const response = getChatbotResponse(text);
    addChatbotMessage(response.text, 'bot', response.actions);
}

function handleChatbotSubmit(event) {
    event.preventDefault();
    const input = document.getElementById('chatbotInput');
    if (input) sendChatbotText(input.value);
}

function initChatbot() {
    createChatbotElements();
    const toggle = document.getElementById('chatbotToggle');
    const close = document.getElementById('chatbotClose');
    const form = document.getElementById('chatbotForm');
    const messages = document.getElementById('chatbotMessages');
    const panel = document.getElementById('chatbotPanel');
    const input = document.getElementById('chatbotInput');
    if (!toggle || !close || !form || !messages || !panel) return;

    const closePanel = () => {
        panel.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
    };
    toggle.addEventListener('click', () => {
        const isActive = panel.classList.toggle('active');
        toggle.setAttribute('aria-expanded', String(isActive));
        if (isActive && messages.childElementCount === 0) {
            const welcome = getChatbotResponse('olá');
            addChatbotMessage(welcome.text, 'bot', welcome.actions);
        }
        if (isActive && input) input.focus();
    });
    close.addEventListener('click', closePanel);
    panel.addEventListener('keydown', event => { if (event.key === 'Escape') closePanel(); });
    form.addEventListener('submit', handleChatbotSubmit);
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

async function initializeApp() {
    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
        return;
    }

    const users = safeParseStorage('cidadeLimpa_users', []);
    const adminExists = users.some(u => u && u.isAdmin);

    if (!adminExists) {
        const defaultAdmin = {
            id: generateId(),
            nome: 'Administrador',
            email: 'admin@palmeirais.pi.gov.br',
            senhaHash: await hashPassword('Palmeirais@2026!Segura'),
            isAdmin: true,
            dataCadastro: new Date().toISOString()
        };
        users.push(defaultAdmin);
        localStorage.setItem('cidadeLimpa_users', JSON.stringify(users));
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
window.restoreSupabaseSession = restoreSupabaseSession;
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
