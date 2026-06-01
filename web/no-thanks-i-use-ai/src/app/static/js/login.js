let isRegister = false;

const form = document.getElementById('authForm');
const title = document.getElementById('title');
const subtitle = document.getElementById('subtitle');
const submitBtn = document.getElementById('submitBtn');
const toggleBtn = document.getElementById('toggleMode');

toggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    isRegister = !isRegister;
    
    if (isRegister) {
        title.textContent = 'Créer un compte';
        subtitle.textContent = 'Choisissez un nom et un mot de passe';
        submitBtn.textContent = 'S\'inscrire';
        toggleBtn.textContent = 'Déjà un compte ? Se connecter';
    } else {
        title.textContent = 'Pyro Chat';
        subtitle.textContent = 'Connectez-vous pour continuer';
        submitBtn.textContent = 'Se connecter';
        toggleBtn.textContent = 'Pas de compte ? S\'inscrire';
    }
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) return;

    const endpoint = isRegister ? '/api/register' : '/api/login';

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (data.status === 'success') {
            window.location.reload();
        } else {
            alert(data.error);
        }
    } catch (error) {
        console.error('Auth error:', error);
        alert('Une erreur est survenue');
    }
});
