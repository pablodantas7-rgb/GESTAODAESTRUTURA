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

        const icon = togglePasswordBtn.querySelector('i');
        icon.classList.toggle('bi-eye');
        icon.classList.toggle('bi-eye-slash');
    });

    // 2. Função para lidar com o envio do formulário
    authForm.addEventListener('submit', (event) => {
        event.preventDefault();
        
        errorMessageDiv.classList.add('d-none');
        loginButton.disabled = true;
        btnText.textContent = 'Verificando...';
        spinner.classList.remove('d-none');

        const email = emailInput.value;
        const password = passwordInput.value;

        setTimeout(() => {
            // As credenciais no seu modelo são "admin" e "12345"
            if (email === 'admin' && password === '12345') {
                btnText.textContent = 'Sucesso!';
                sessionStorage.setItem('isLoggedIn', 'true');
                window.location.href = 'index.html'; 
            } else {
                errorMessageDiv.textContent = 'Usuário ou senha inválidos.';
                errorMessageDiv.classList.remove('d-none');
                
                loginButton.disabled = false;
                btnText.textContent = 'Entrar';
                spinner.classList.add('d-none');
            }
        }, 1500);
    });
});