const API_URL = window.API_BASE_URL;
const API_ROUTE_CATEGORIES = `${API_URL}/financial/entryCategory`;

const ERROR_MESSAGES = {
  'Entry category already exists': 'Já existe uma categoria com esse nome.',
  'Entry category description already in use': 'Já existe uma categoria com esse nome.',
  'Entry category not found': 'Categoria não encontrada. Atualize a lista e tente novamente.',
  'Entry category has transactions': 'Esta categoria possui transações. Desative-a para impedir novos usos.',
  'Description is required': 'Informe o nome da categoria.',
};

let categories = [];
let editingCategory = null;

document.addEventListener('DOMContentLoaded', () => {
  initModals();
  initCreateForm();
  initEditForm();
  fetchCategories();
});

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function translateError(message) {
  return ERROR_MESSAGES[message] || message || 'Ocorreu um erro inesperado.';
}

function showFieldError(element, message) {
  if (!element) return;
  element.textContent = message || '';
  element.classList.toggle('hidden', !message);
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  let body = {};
  try { body = await response.json(); } catch { body = {}; }
  return { ok: response.ok, body };
}

let toastTimeout;
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden', 'bg-green-500', 'text-gray-900', 'bg-red-500', 'text-white');
  toast.classList.add(...(type === 'success' ? ['bg-green-500', 'text-gray-900'] : ['bg-red-500', 'text-white']));
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.add('hidden'), 3500);
}

function openModal(modal) {
  modal.classList.remove('hidden');
  requestAnimationFrame(() => {
    modal.classList.remove('opacity-0');
    modal.classList.add('opacity-100');
  });
}

function closeModal(modal) {
  modal.classList.remove('opacity-100');
  modal.classList.add('opacity-0');
  setTimeout(() => modal.classList.add('hidden'), 300);
}

function initModals() {
  document.querySelectorAll('.modal').forEach((modal) => {
    modal.querySelectorAll('[data-close-modal]').forEach((button) =>
      button.addEventListener('click', () => closeModal(modal))
    );
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal(modal);
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') document.querySelectorAll('.modal:not(.hidden)').forEach(closeModal);
  });
}

async function fetchCategories() {
  const tbody = document.getElementById('categories-table-body');
  try {
    const { ok, body } = await request(API_ROUTE_CATEGORIES);
    if (!ok) throw new Error(body.error);
    categories = body.data || [];
    renderCategories();
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    tbody.innerHTML = '<tr><td colspan="3" class="py-6 text-center text-red-400">Não foi possível carregar as categorias. Verifique a conexão com a API e tente novamente.</td></tr>';
  }
}

function renderCategories() {
  const tbody = document.getElementById('categories-table-body');
  if (!categories.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="py-6 text-center text-gray-500">Nenhuma categoria cadastrada.</td></tr>';
    return;
  }

  tbody.innerHTML = categories.map((category) => `
    <tr class="${category.active ? '' : 'category-inactive'}">
      <td class="py-4 px-4 text-gray-200 font-medium">${escapeHTML(category.description)}</td>
      <td class="py-4 px-4 text-center border-l border-gray-700"><span class="inline-flex px-2.5 py-1 rounded-full text-xs ${category.active ? 'bg-green-900/60 text-green-300' : 'bg-gray-800 text-gray-400'}">${category.active ? 'Ativa' : 'Inativa'}</span></td>
      <td class="py-4 px-4 text-center border-l border-gray-700"><div class="flex justify-center gap-2">
        <button type="button" data-action="edit" data-id="${escapeHTML(category.id)}" class="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm rounded-lg border border-gray-700">Editar</button>
        <button type="button" data-action="delete" data-id="${escapeHTML(category.id)}" class="px-3 py-1.5 bg-gray-800 hover:bg-red-600 text-red-400 hover:text-white text-sm rounded-lg border border-gray-700">Excluir</button>
      </div></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('button[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const category = categories.find((item) => item.id === button.dataset.id);
      if (!category) return;
      if (button.dataset.action === 'edit') openEditModal(category);
      if (button.dataset.action === 'delete') deleteCategory(category);
    });
  });
}

function initCreateForm() {
  const form = document.getElementById('create-category-form');
  const submit = document.getElementById('create-category-submit');
  const error = document.getElementById('create-category-error');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const description = document.getElementById('category-description').value.trim();
    showFieldError(error, description ? null : 'Informe o nome da categoria.');
    if (!description) return;
    submit.disabled = true;
    try {
      const { ok, body } = await request(API_ROUTE_CATEGORIES, {
        method: 'POST', body: JSON.stringify({ description }),
      });
      if (!ok) { showFieldError(error, translateError(body.error)); return; }
      form.reset();
      showToast('Categoria cadastrada com sucesso!');
      await fetchCategories();
    } catch (requestError) {
      console.error('Erro ao cadastrar categoria:', requestError);
      showFieldError(error, 'Não foi possível conectar à API.');
    } finally { submit.disabled = false; }
  });
}

function openEditModal(category) {
  editingCategory = category;
  document.getElementById('edit-category-description').value = category.description;
  document.getElementById('edit-category-active').checked = category.active;
  showFieldError(document.getElementById('edit-category-error'), null);
  openModal(document.getElementById('edit-category-modal'));
}

function initEditForm() {
  const form = document.getElementById('edit-category-form');
  const submit = document.getElementById('edit-category-submit');
  const error = document.getElementById('edit-category-error');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!editingCategory) return;
    const description = document.getElementById('edit-category-description').value.trim();
    showFieldError(error, description ? null : 'Informe o nome da categoria.');
    if (!description) return;
    submit.disabled = true;
    try {
      const { ok, body } = await request(`${API_ROUTE_CATEGORIES}/${encodeURIComponent(editingCategory.id)}`, {
        method: 'PUT',
        body: JSON.stringify({ description, active: document.getElementById('edit-category-active').checked }),
      });
      if (!ok) { showFieldError(error, translateError(body.error)); return; }
      closeModal(document.getElementById('edit-category-modal'));
      showToast('Categoria atualizada com sucesso!');
      await fetchCategories();
    } catch (requestError) {
      console.error('Erro ao atualizar categoria:', requestError);
      showFieldError(error, 'Não foi possível conectar à API.');
    } finally { submit.disabled = false; }
  });
}

async function deleteCategory(category) {
  if (!window.confirm(`Excluir a categoria "${category.description}"? Categorias com transações não podem ser excluídas; você pode desativá-las.`)) return;
  try {
    const { ok, body } = await request(`${API_ROUTE_CATEGORIES}/${encodeURIComponent(category.id)}`, { method: 'DELETE' });
    if (!ok) {
      showToast(translateError(body.error), 'error');
      return;
    }
    showToast('Categoria excluída com sucesso!');
    await fetchCategories();
  } catch (error) {
    console.error('Erro ao excluir categoria:', error);
    showToast('Não foi possível conectar à API.', 'error');
  }
}
