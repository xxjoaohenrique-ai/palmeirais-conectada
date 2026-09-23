/* ===============================================
   CIDADE LIMPA - AUTH.JS
   Sistema de Autenticação
   =============================================== */

// ===============================================
// LOGIN
// ===============================================

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value.trim().toLowerCase();
    const senha = document.getElementById('senha').value;
    const errorDiv = document.getElementById('loginError');
    const submitButton = event.currentTarget?.querySelector('button[type="submit"]');
    
    if (!email || !senha) {
        showError(errorDiv, 'Por favor, preencha todos os campos.');
        return;
    }
    
    if (!validateEmail(email)) {
        showError(errorDiv, 'Por favor, insira um e-mail válido.');
        return;
    }

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.dataset.originalLabel = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
    }

    try {
        if (!(window.isSupabaseConfigured && window.isSupabaseConfigured())) {
            showError(errorDiv, 'O serviço de acesso está indisponível. Tente novamente em instantes.');
            return;
        }
        const { error } = await window.supabaseSignIn({ email, password: senha });
        if (error) {
            const message = String(error.message || '').toLowerCase();
            showError(errorDiv, message.includes('email not confirmed')
                ? 'Confirme seu e-mail pelo link recebido antes de entrar.'
                : 'Não foi possível entrar. Verifique seu e-mail e sua senha e tente novamente.');
            return;
        }
        const user = await restoreSupabaseSession();
        if (!user) throw new Error('Sessão indisponível.');
        showToast('Login realizado com sucesso!', 'success');
        setTimeout(() => { window.location.href = user.isAdmin ? 'admin.html' : 'index.html'; }, 1000);
    } catch (error) {
        showError(errorDiv, 'Não foi possível entrar agora. Tente novamente.');
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = submitButton.dataset.originalLabel || 'Entrar';
        }
    }
}

async function handleForgotPassword(event) {
    event.preventDefault();

    const emailInput = document.getElementById('forgotEmail');
    const errorDiv = document.getElementById('forgotError');
    const email = emailInput.value.trim().toLowerCase();
    const submitButton = event.currentTarget?.querySelector('button[type="submit"]');

    if (!validateEmail(email)) {
        showError(errorDiv, 'Digite um e-mail válido.');
        return;
    }

    if (!(window.isSupabaseConfigured && window.isSupabaseConfigured()) || !window.supabaseSendPasswordReset) {
        showError(errorDiv, 'A recuperação de senha está indisponível no momento.');
        return;
    }

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.dataset.originalLabel = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    }

    try {
        const redirectTo = `${window.location.origin}${window.location.pathname}?reset=1`;
        const { error } = await window.supabaseSendPasswordReset(email, redirectTo);
        if (error) {
            showError(errorDiv, error.message || 'Não foi possível enviar o link de recuperação.');
            return;
        }

        showToast('Confira seu e-mail para alterar a senha.', 'success');
        emailInput.value = '';
    } catch (error) {
        showError(errorDiv, 'Não foi possível enviar o link de recuperação.');
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = submitButton.dataset.originalLabel || 'Enviar link';
        }
    }
}

async function handlePasswordUpdate(event) {
    event.preventDefault();

    const password = document.getElementById('novaSenha').value;
    const confirmation = document.getElementById('confirmarNovaSenha').value;
    const errorDiv = document.getElementById('resetError');
    const submitButton = event.currentTarget?.querySelector('button[type="submit"]');

    if (password.length < 6) {
        showError(errorDiv, 'A nova senha deve ter pelo menos 6 caracteres.');
        return;
    }

    if (password !== confirmation) {
        showError(errorDiv, 'As senhas não coincidem.');
        return;
    }

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.dataset.originalLabel = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    }

    try {
        const { error } = await window.supabaseUpdatePassword(password);
        if (error) {
            showError(errorDiv, error.message || 'Não foi possível alterar a senha.');
            return;
        }

        const { error: signOutError } = await window.supabaseSignOut();
        if (signOutError) throw signOutError;
        sessionStorage.removeItem('cidadeLimpa_currentUser');
        localStorage.removeItem('cidadeLimpa_currentUser');
        updateUIForLoggedUser();
        window.history.replaceState({}, document.title, window.location.pathname);
        showToast('Senha alterada com sucesso. Faça login com a nova senha.', 'success');
        document.getElementById('resetPasswordPanel').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('novaSenha').value = '';
        document.getElementById('confirmarNovaSenha').value = '';
    } catch (error) {
        showError(errorDiv, 'O link de recuperação expirou. Solicite um novo link.');
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = submitButton.dataset.originalLabel || 'Salvar nova senha';
        }
    }
}

function showForgotPasswordForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('forgotPasswordPanel').style.display = 'block';
}

function showLoginForm() {
    document.getElementById('forgotPasswordPanel').style.display = 'none';
    document.getElementById('resetPasswordPanel').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
}

function initializePasswordRecovery() {
    const isRecovery = new URLSearchParams(window.location.search).get('reset') === '1'
        || new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery';
    if (isRecovery) {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('forgotPasswordPanel').style.display = 'none';
        document.getElementById('resetPasswordPanel').style.display = 'block';
    }
    return isRecovery;
}

// ===============================================
// CADASTRO
// ===============================================

async function handleCadastro(event) {
    event.preventDefault();
    
    const nome = document.getElementById('nome').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const senha = document.getElementById('senha').value;
    const confirmarSenha = document.getElementById('confirmarSenha').value;
    const errorDiv = document.getElementById('cadastroError');
    const submitButton = event.currentTarget?.querySelector('button[type="submit"]');
    
    if (!nome || !email || !senha || !confirmarSenha) {
        showError(errorDiv, 'Por favor, preencha todos os campos.');
        return;
    }
    
    if (nome.length < 3) {
        showError(errorDiv, 'O nome deve ter pelo menos 3 caracteres.');
        return;
    }
    
    if (!validateEmail(email)) {
        showError(errorDiv, 'Por favor, insira um e-mail válido.');
        return;
    }
    
    if (!validatePassword(senha)) {
        showError(errorDiv, 'A senha deve ter pelo menos 6 caracteres.');
        return;
    }
    
    if (senha !== confirmarSenha) {
        showError(errorDiv, 'As senhas não coincidem.');
        return;
    }

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.dataset.originalLabel = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando conta...';
    }

    try {
        if (!(window.isSupabaseConfigured && window.isSupabaseConfigured())) {
            showError(errorDiv, 'O serviço de cadastro está indisponível. Tente novamente em instantes.');
            return;
        }
        const { data, error } = await window.supabaseSignUp({ email, password: senha, nome });
        if (error) {
            showError(errorDiv, 'Não foi possível criar a conta. Verifique os dados e tente novamente.');
            return;
        }
        if (!data?.session) {
            showSuccess(errorDiv, 'Confira seu e-mail e siga o link de confirmação para acessar sua conta.');
            return;
        }
        const user = await restoreSupabaseSession();
        if (!user) throw new Error('Sessão indisponível.');
        showToast('Cadastro realizado com sucesso!', 'success');
        setTimeout(() => { window.location.href = user.isAdmin ? 'admin.html' : 'index.html'; }, 1500);
    } catch (error) {
        showError(errorDiv, 'Não foi possível criar a conta agora. Tente novamente.');
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = submitButton.dataset.originalLabel || 'Criar Conta';
        }
    }
}

// ===============================================
// FUNÇÕES AUXILIARES
// ===============================================

function showError(element, message) {
    if (element) {
        element.innerHTML = `
            <div class="alert alert-error">
                <i class="fas fa-exclamation-circle"></i>
                <span>${escapeHtml(message)}</span>
            </div>
        `;
        element.style.display = 'block';
        
        // Remover após 5 segundos
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

function showSuccess(element, message) {
    if (element) {
        element.innerHTML = `
            <div class="alert alert-success">
                <i class="fas fa-check-circle"></i>
                <span>${escapeHtml(message)}</span>
            </div>
        `;
        element.style.display = 'block';
    }
}

// Toggle de visibilidade da senha
function togglePasswordVisibility(inputId, buttonElement) {
    const input = document.getElementById(inputId);
    const icon = buttonElement.querySelector('i');
    buttonElement.setAttribute('aria-label', input.type === 'password' ? 'Ocultar senha' : 'Mostrar senha');
    buttonElement.setAttribute('aria-pressed', String(input.type === 'password'));
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

// ===============================================
// EXPORTAR FUNÇÕES
// ===============================================

window.handleLogin = handleLogin;
window.handleCadastro = handleCadastro;
window.togglePasswordVisibility = togglePasswordVisibility;
