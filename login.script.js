document.addEventListener('DOMContentLoaded', () => {

    const authForm = document.getElementById('auth-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const errorMessageDiv = document.getElementById('error-message');
    const loginButton = document.querySelector('.btn-login');
    const btnText = loginButton.querySelector('.btn-text');
    const spinner = loginButton.querySelector('.spinner-border');

    // 1. Função para mostrar/ocultar a senha
    togglePasswordBtn.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);

        // Altera o ícone do olho
        const icon = togglePasswordBtn.querySelector('i');
        icon.classList.toggle('bi-eye');
        icon.classList.toggle('bi-eye-slash');
    });

    // 2. Função para lidar com o envio do formulário
    authForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Impede o envio real do formulário
        
        // Resetar UI
        errorMessageDiv.classList.add('d-none');
        loginButton.disabled = true;
        btnText.textContent = 'Verificando...';
        spinner.classList.remove('d-none');

        const email = emailInput.value;
        const password = passwordInput.value;

        // Simulação de autenticação após 1.5 segundos
        setTimeout(() => {
            if (email === 'admin' && password === '12345') {
                // Sucesso na autenticação
                btnText.textContent = 'Sucesso!';
                
                // **NOVA LINHA: Salva o estado de login no navegador**
                sessionStorage.setItem('isLoggedIn', 'true');

                // Redireciona para o painel principal
                window.location.href = 'index.html'; 
            } else {
                // Falha na autenticação
                errorMessageDiv.textContent = 'Usuário ou senha inválidos. Tente novamente.';
                errorMessageDiv.classList.remove('d-none');
                
                // Restaurar o botão
                loginButton.disabled = false;
                btnText.textContent = 'Entrar';
                spinner.classList.add('d-none');
            }
        }, 1500);
    });
});