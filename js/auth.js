/* ===============================================
   CIDADE LIMPA - AUTH.JS
   Sistema de Autenticação
   =============================================== */

// ===============================================
// LOGIN
// ===============================================

function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;
    const errorDiv = document.getElementById('loginError');
    
    // Validações
    if (!email || !senha) {
        showError(errorDiv, 'Por favor, preencha todos os campos.');
        return;
    }
    
    if (!validateEmail(email)) {
        showError(errorDiv, 'Por favor, insira um e-mail válido.');
        return;
    }
    
    // Buscar usuário
    const users = JSON.parse(localStorage.getItem('cidadeLimpa_users')) || [];
    const userWithEmail = users.find(u => u.email === email);
    
    if (!userWithEmail) {
        showError(errorDiv, 'E-mail incorreto. Verifique e tente novamente.');
        return;
    }
    
    if (userWithEmail.senha !== senha) {
        showError(errorDiv, 'Senha incorreta. Verifique e tente novamente.');
        return;
    }
    
    const user = userWithEmail;
    
    // Salvar sessão
    const sessionUser = {
        id: user.id,
        nome: user.nome,
        email: user.email,
        isAdmin: user.isAdmin || false
    };
    localStorage.setItem('cidadeLimpa_currentUser', JSON.stringify(sessionUser));
    
    // Mostrar sucesso
    showToast('Login realizado com sucesso!', 'success');
    
    // Redirecionar
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

function handleCadastro(event) {
    event.preventDefault();
    
    const nome = document.getElementById('nome').value.trim();
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;
    const confirmarSenha = document.getElementById('confirmarSenha').value;
    const errorDiv = document.getElementById('cadastroError');
    
    // Validações
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
    
    // Verificar se e-mail já existe
    const users = JSON.parse(localStorage.getItem('cidadeLimpa_users')) || [];
    const emailExists = users.find(u => u.email === email);
    
    if (emailExists) {
        showError(errorDiv, 'Este e-mail já está cadastrado.');
        return;
    }
    
    // Criar novo usuário
    const newUser = {
        id: generateId(),
        nome: nome,
        email: email,
        senha: senha,
        isAdmin: false,
        dataCadastro: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem('cidadeLimpa_users', JSON.stringify(users));
    
    // Mostrar sucesso
    showToast('Cadastro realizado com sucesso!', 'success');
    
    // Redirecionar para login
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
