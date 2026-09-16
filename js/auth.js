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
    
    if (!email || !senha) {
        showError(errorDiv, 'Por favor, preencha todos os campos.');
        return;
    }
    
    if (!validateEmail(email)) {
        showError(errorDiv, 'Por favor, insira um e-mail válido.');
        return;
    }

    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
        try {
            const { data, error } = await window.supabaseSignIn({ email, password: senha });
            if (error) {
                showError(errorDiv, error.message || 'Falha ao entrar com o Supabase.');
                return;
            }

            const user = {
                id: data?.user?.id || data?.session?.user?.id,
                nome: data?.user?.user_metadata?.nome || data?.user?.email?.split('@')[0] || 'Usuário',
                email: data?.user?.email || email,
                isAdmin: Boolean(data?.user?.user_metadata?.is_admin)
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

    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
        try {
            const { data, error } = await window.supabaseSignUp({ email, password: senha, nome });
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
        nome: nome,
        email: email,
        senhaHash: await hashPassword(senha),
        isAdmin: false,
        dataCadastro: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem('cidadeLimpa_users', JSON.stringify(users));
    
    showToast('Cadastro realizado com sucesso!', 'success');
    
    setTimeout(() => {
        window.location.href = 'login.html';
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
