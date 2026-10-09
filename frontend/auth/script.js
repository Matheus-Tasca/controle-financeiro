const API_BASE = window.API_BASE_URL;
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const message = document.getElementById('auth-message');
const loginTab = document.getElementById('show-login');
const registerTab = document.getElementById('show-register');

function showMessage(text, isError = true) {
  message.textContent = text;
  message.className = `mt-4 min-h-5 text-sm ${isError ? 'text-red-400' : 'text-green-400'}`;
}

function showForm(form) {
  const loginSelected = form === 'login';
  loginForm.classList.toggle('hidden', !loginSelected);
  registerForm.classList.toggle('hidden', loginSelected);
  loginTab.className = `rounded-md px-3 py-2 text-sm ${loginSelected ? 'bg-gray-700' : 'text-gray-400'}`;
  registerTab.className = `rounded-md px-3 py-2 text-sm ${loginSelected ? 'text-gray-400' : 'bg-gray-700'}`;
  showMessage('');
}

async function sendForm(path, form) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(Object.fromEntries(new FormData(form))),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || 'Não foi possível completar a operação.');
  return result;
}

loginTab.addEventListener('click', () => showForm('login'));
registerTab.addEventListener('click', () => showForm('register'));

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const result = await sendForm('/auth/login', loginForm);
    sessionStorage.setItem('financeiro.userId', result.userId);
    sessionStorage.setItem('financeiro.acessToken', result.acessToken);
    window.location.replace('../pagina_inicial/index.html');
  } catch (error) {
    showMessage(error.message || 'Não foi possível conectar à API.');
  }
});

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await sendForm('/auth/register', registerForm);
    loginForm.elements.username.value = registerForm.elements.username.value;
    showForm('login');
    showMessage('Conta criada. Entre com seu usuário e senha.', false);
  } catch (error) {
    showMessage(error.message || 'Não foi possível conectar à API.');
  }
});

if (sessionStorage.getItem('financeiro.acessToken')) {
  window.location.replace('../pagina_inicial/index.html');
}
