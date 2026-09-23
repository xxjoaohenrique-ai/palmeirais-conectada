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

    if (!window.isSupabaseConfigured?.()) {
        showError(errorDiv, 'Serviço de autenticação indisponível. Tente novamente mais tarde.');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = submitButton.dataset.originalLabel || 'Entrar';
        }
        return;
    }

    try {
        const { error } = await window.supabaseSignIn({ email, password: senha });
        if (error) {
            showError(errorDiv, 'Não foi possível entrar. Confira o e-mail, senha e confirmação da conta.');
            return;
        }
        // O status de administrador vem de profiles protegido por RLS,
        // nunca de user_metadata, email ou armazenamento do navegador.
        const user = await window.supabaseGetSessionUser();
        if (!user) {
            showError(errorDiv, 'Não foi possível verificar a sessão.');
            return;
        }
        window.__cidadeLimpaVerifiedUser = user;
        window.__cidadeLimpaSessionPromise = Promise.resolve(user);
        showToast('Login realizado com sucesso!', 'success');
        setTimeout(() => {
            window.location.href = user.isAdmin ? 'admin.html' : 'index.html';
        }, 1000);
    } catch (error) {
        showError(errorDiv, 'Erro ao autenticar. Tente novamente.');
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

    if (password.length < 12) {
        showError(errorDiv, 'A nova senha deve ter pelo menos 12 caracteres.');
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
    if (window.location.search.includes('reset=1') || window.location.hash.includes('type=recovery')) {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('forgotPasswordPanel').style.display = 'none';
        document.getElementById('resetPasswordPanel').style.display = 'block';
    }
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
        showError(errorDiv, 'A senha deve ter pelo menos 12 caracteres.');
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

    if (!window.isSupabaseConfigured?.()) {
        showError(errorDiv, 'Serviço de cadastro indisponível. Tente novamente mais tarde.');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = submitButton.dataset.originalLabel || 'Criar Conta';
        }
        return;
    }

    try {
        let { data, error } = await window.supabaseSignUp({ email, password: senha, nome });
        if (error) {
            showError(errorDiv, 'Não foi possível cadastrar. Verifique os dados e tente novamente.');
            return;
        }
        if (!data?.session) {
            // A confirmação de e-mail é exigida antes do primeiro acesso.
            showSuccess(errorDiv, 'Conta criada! Confirme seu e-mail para entrar.');
            return;
        }
        const user = await window.supabaseGetSessionUser();
        if (!user) {
            showSuccess(errorDiv, 'Conta criada! Faça login para continuar.');
            return;
        }
        window.__cidadeLimpaVerifiedUser = user;
        window.__cidadeLimpaSessionPromise = Promise.resolve(user);
        showToast('Cadastro realizado com sucesso!', 'success');
        setTimeout(() => {
            window.location.href = user.isAdmin ? 'admin.html' : 'index.html';
        }, 1500);
    } catch (error) {
        showError(errorDiv, 'Erro ao cadastrar. Tente novamente.');
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

// A criação de administradores deve ocorrer exclusivamente em procedimento
// privilegiado no Supabase, nunca em JavaScript público.\n