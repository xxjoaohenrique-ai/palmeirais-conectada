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

    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
        try {
            const { data, error } = await window.supabaseSignIn({ email, password: senha });
            if (error) {
                const message = String(error.message || '').toLowerCase();
                if (message.includes('email not confirmed')) {
                    showError(errorDiv, 'Confirme seu e-mail no Supabase antes de entrar.');
                } else if (message.includes('invalid login credentials')) {
                    showError(errorDiv, 'E-mail ou senha incorretos. Use a senha cadastrada no Supabase.');
                } else {
                    showError(errorDiv, error.message || 'Não foi possível entrar agora.');
                }
                return;
            }

            const user = {
                id: data?.user?.id || data?.session?.user?.id,
                nome: data?.user?.user_metadata?.nome || data?.user?.email?.split('@')[0] || 'Usuário',
                email: data?.user?.email || email,
                isAdmin: Boolean(data?.user?.user_metadata?.is_admin)
                    || (data?.user?.email || email) === 'admin@palmeirais.pi.gov.br'
            };

            sessionStorage.setItem('cidadeLimpa_currentUser', JSON.stringify(user));
            showToast('Login realizado com sucesso!', 'success');

            setTimeout(() => {
                window.location.href = user.isAdmin ? 'admin.html' : 'index.html';
            }, 1000);
            return;
        } catch (error) {
            showError(errorDiv, 'Erro ao autenticar com Supabase.');
            return;
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = submitButton.dataset.originalLabel || 'Entrar';
            }
        }
    }
    
    const users = safeParseStorage('cidadeLimpa_users', []);
    const userWithEmail = users.find(u => String(u.email || '').toLowerCase() === email);
    
    if (!userWithEmail) {
        showError(errorDiv, 'E-mail incorreto. Verifique e tente novamente.');
        return;
    }

    const passwordMatches = userWithEmail.senhaHash
        ? await verifyPassword(senha, userWithEmail.senhaHash)
        : userWithEmail.senha === senha;
    
    if (!passwordMatches) {
        showError(errorDiv, 'Senha incorreta. Verifique e tente novamente.');
        return;
    }

    if (userWithEmail.senha && !userWithEmail.senhaHash) {
        userWithEmail.senhaHash = await hashPassword(senha);
        delete userWithEmail.senha;
        localStorage.setItem('cidadeLimpa_users', JSON.stringify(users));
    }
    
    const user = {
        id: userWithEmail.id,
        nome: userWithEmail.nome,
        email: userWithEmail.email,
        isAdmin: Boolean(userWithEmail.isAdmin)
    };
    
    sessionStorage.setItem('cidadeLimpa_currentUser', JSON.stringify(user));
    showToast('Login realizado com sucesso!', 'success');
    
    setTimeout(() => {
        if (user.isAdmin) {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'index.html';
        }
    }, 1000);
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

    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
        try {
            let { data, error } = await window.supabaseSignUp({ email, password: senha, nome });
            if (error) {
                showError(errorDiv, error.message || 'Não foi possível cadastrar no Supabase.');
                return;
            }

            if (!data?.session) {
                const loginResult = await window.supabaseSignIn({ email, password: senha });
                if (loginResult.error) {
                    const message = String(loginResult.error.message || '').toLowerCase();
                    if (message.includes('email not confirmed')) {
                        showError(errorDiv, 'Conta criada. Confirme seu e-mail no Supabase para entrar.');
                    } else {
                        showError(errorDiv, loginResult.error.message || 'Conta criada, mas não foi possível entrar automaticamente.');
                    }
                    return;
                }
                data = loginResult.data;
            }

            const user = {
                id: data?.user?.id || data?.session?.user?.id,
                nome: data?.user?.user_metadata?.nome || nome,
                email: data?.user?.email || email,
                isAdmin: Boolean(data?.user?.user_metadata?.is_admin)
                    || (data?.user?.email || email) === 'admin@palmeirais.pi.gov.br'
            };

            sessionStorage.setItem('cidadeLimpa_currentUser', JSON.stringify(user));
            showToast('Cadastro realizado! Você já está logado.', 'success');
            setTimeout(() => {
                window.location.href = user.isAdmin ? 'admin.html' : 'index.html';
            }, 1500);
            return;
        } catch (error) {
            showError(errorDiv, 'Erro ao cadastrar com Supabase.');
            return;
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = submitButton.dataset.originalLabel || 'Criar Conta';
            }
        }
    }
    
    const users = safeParseStorage('cidadeLimpa_users', []);
    const emailExists = users.find(u => String(u.email || '').toLowerCase() === email);
    
    if (emailExists) {
        showError(errorDiv, 'Este e-mail já está cadastrado.');
        return;
    }

    const newUser = {
        id: generateId(),
        nome: nome,
        email: email,
        senhaHash: await hashPassword(senha),
        isAdmin: false,
        dataCadastro: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem('cidadeLimpa_users', JSON.stringify(users));
    sessionStorage.setItem('cidadeLimpa_currentUser', JSON.stringify({
        id: newUser.id,
        nome: newUser.nome,
        email: newUser.email,
        isAdmin: false
    }));
    
    showToast('Cadastro realizado com sucesso!', 'success');
    
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1500);
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
                <span>${message}</span>
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

// ===============================================
// CADASTRO DO ADMINISTRADOR
// ===============================================

async function handleCadastroAdmin(event) {
    event.preventDefault();
    
    const email = 'admin@palmeirais.pi.gov.br';
    const senha = 'admin123';
    const errorDiv = document.getElementById('cadastroAdminError');
    
    if (!email || !senha) {
        showError(errorDiv, 'Por favor, preencha todos os campos.');
        return;
    }

    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
        try {
            const { data, error } = await window.supabaseSignUp({ email, password: senha, nome: 'Administrador' });
            if (error) {
                showError(errorDiv, error.message || 'Não foi possível cadastrar no Supabase.');
                return;
            }

            showToast('Cadastro realizado com sucesso!', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
            return;
        } catch (error) {
            showError(errorDiv, 'Erro ao cadastrar com Supabase.');
            return;
        }
    }
    
    const users = safeParseStorage('cidadeLimpa_users', []);
    const emailExists = users.find(u => String(u.email || '').toLowerCase() === email);
    
    if (emailExists) {
        showError(errorDiv, 'Este e-mail já está cadastrado.');
        return;
    }

    const newUser = {
        id: generateId(),
        nome: 'Administrador',
        email: email,
        senhaHash: await hashPassword(senha),
        isAdmin: true,
        dataCadastro: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem('cidadeLimpa_users', JSON.stringify(users));
    
    showToast('Cadastro realizado com sucesso!', 'success');
    
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1500);

    // Atualizar o perfil do usuário
    await updateProfile(email, { is_admin: true });
}

// ===============================================
// FUNÇÕES DE ATUALIZAÇÃO DE PERFIL
// ===============================================

async function updateProfile(email, data) {
    const { data: { user }, error } = await window.supabase.updateUser({ email, data });
    if (error) {
        console.error('Erro ao atualizar perfil:', error.message);
    }
}
