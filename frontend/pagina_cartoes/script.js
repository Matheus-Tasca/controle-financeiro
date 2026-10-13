const API_URL = window.API_BASE_URL;
const API_ROUTE_CARDS = `${API_URL}/financial/cards`;

const ERROR_MESSAGES = {
  'Card required data is missing':
    'Preencha nome, dia de fechamento e dia de vencimento.',
  'Card with this name already exists': 'Já existe um cartão com este nome.',
  'Card name already in use': 'Já existe um cartão com este nome.',
  'Card not found': 'Cartão não encontrado.',
  'Closing day and due day must be integers between 1 and 31':
    'Os dias de fechamento e vencimento devem ser números inteiros entre 1 e 31.',
  'Closing day must be an integer between 1 and 31':
    'O dia de fechamento deve ser um número inteiro entre 1 e 31.',
  'Due day must be an integer between 1 and 31':
    'O dia de vencimento deve ser um número inteiro entre 1 e 31.',
};

let cards = [];
let editingCard = null;
let deletingCard = null;

document.addEventListener('DOMContentLoaded', () => {
  initModals();
  initCreateForm();
  initEditForm();
  initDeleteModal();
  fetchCards();
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

function isValidDay(value) {
  const dayInNumber = Number(value);
  return (
    value !== '' &&
    Number.isInteger(dayInNumber) &&
    dayInNumber >= 1 &&
    dayInNumber <= 31
  );
}

/**
 * Valida os campos do formulário de cartão.
 * @returns {string|null} mensagem de erro ou null se válido
 */
function validateCardFields({ name, closingDay, dueDay }) {
  if (!name.trim()) return 'Informe o nome do cartão.';
  if (!isValidDay(closingDay))
    return 'O dia de fechamento deve ser um número inteiro entre 1 e 31.';
  if (!isValidDay(dueDay))
    return 'O dia de vencimento deve ser um número inteiro entre 1 e 31.';
  return null;
}

function showFieldError(element, message) {
  if (!element) return;
  if (message) {
    element.textContent = message;
    element.classList.remove('hidden');
  } else {
    element.textContent = '';
    element.classList.add('hidden');
  }
}

let toastTimeout;
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.remove(
    'hidden',
    'bg-green-500',
    'text-gray-900',
    'bg-red-500',
    'text-white'
  );
  toast.classList.add(
    ...(type === 'success'
      ? ['bg-green-500', 'text-gray-900']
      : ['bg-red-500', 'text-white'])
  );

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.add('hidden'), 3500);
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  let body = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }

  return { ok: response.ok, status: response.status, body };
}

/* ------------------------------------------------------------------ */
/* Modais (abrir/fechar)                                               */
/* ------------------------------------------------------------------ */

function openModal(modal) {
  const container = modal.querySelector('.modal-container');
  modal.classList.remove('hidden');
  requestAnimationFrame(() => {
    modal.classList.remove('opacity-0');
    modal.classList.add('opacity-100');
    container?.classList.remove('scale-95');
    container?.classList.add('scale-100');
  });
}

function closeModal(modal) {
  const container = modal.querySelector('.modal-container');
  modal.classList.remove('opacity-100');
  modal.classList.add('opacity-0');
  container?.classList.remove('scale-100');
  container?.classList.add('scale-95');
  setTimeout(() => modal.classList.add('hidden'), 300);
}

function initModals() {
  document.querySelectorAll('.modal').forEach((modal) => {
    modal
      .querySelectorAll('[data-close-modal]')
      .forEach((btn) => btn.addEventListener('click', () => closeModal(modal)));

    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal(modal);
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('.modal:not(.hidden)').forEach(closeModal);
  });
}

/* ------------------------------------------------------------------ */
/* Listagem                                                            */
/* ------------------------------------------------------------------ */

async function fetchCards() {
  const tbody = document.getElementById('cards-table-body');

  try {
    const { ok, body } = await request(API_ROUTE_CARDS);
    if (!ok) throw new Error(body.error);

    cards = body.data || [];
    renderCardsTable();
  } catch (error) {
    console.error('Erro ao buscar os cartões:', error);
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-6 text-center text-red-500">
            Ocorreu um erro ao buscar os cartões. Tente novamente mais tarde.
          </td>
        </tr>
      `;
    }
  }
}

function renderCardsTable() {
  const tbody = document.getElementById('cards-table-body');
  if (!tbody) return;

  if (cards.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-6 text-center text-gray-500">
          Nenhum cartão cadastrado.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = cards
    .map(
      (card) => `
        <tr class="transition-colors duration-200 ${card.active ? '' : 'opacity-60'}">
          <td class="py-4 px-4 text-center text-gray-300 font-medium">${escapeHTML(card.name)}</td>
          <td class="py-4 px-4 text-center border-l border-gray-700"><span class="inline-flex px-2.5 py-1 rounded-full text-xs ${card.active ? 'bg-green-900/60 text-green-300' : 'bg-gray-800 text-gray-400'}">${card.active ? 'Ativo' : 'Inativo'}</span></td>
          <td class="py-4 px-4 text-center text-gray-300 border-l border-gray-700">Dia ${card.closingDay}</td>
          <td class="py-4 px-4 text-center text-gray-300 border-l border-gray-700">Dia ${card.dueDay}</td>
          <td class="py-4 px-4 text-center text-gray-300 border-l border-gray-700">${card.transactionsCount}</td>
          <td class="py-4 px-4 text-center border-l border-gray-700">
            <div class="flex justify-center gap-2">
              ${card.active ? `
                <button type="button" data-action="edit" data-id="${escapeHTML(card.id)}" class="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white text-sm rounded-lg border border-gray-700">Editar</button>
                <button type="button" data-action="delete" data-id="${escapeHTML(card.id)}" class="px-3 py-1.5 bg-gray-800 hover:bg-red-600 text-red-400 hover:text-white text-sm rounded-lg border border-gray-700">Desativar</button>
              ` : `
                <button type="button" data-action="activate" data-id="${escapeHTML(card.id)}" class="px-3 py-1.5 bg-gray-800 hover:bg-green-600 text-green-400 hover:text-white text-sm rounded-lg border border-gray-700">Reativar</button>
              `}
            </div>
          </td>
        </tr>
      `
    )
    .join('');

  tbody.querySelectorAll('button[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = cards.find((c) => c.id === btn.dataset.id);
      if (!card) return;
      if (btn.dataset.action === 'edit') openEditModal(card);
      if (btn.dataset.action === 'delete') openDeleteModal(card);
      if (btn.dataset.action === 'activate') activateCard(card);
    });
  });
}

/* ------------------------------------------------------------------ */
/* Cadastro                                                            */
/* ------------------------------------------------------------------ */

function initCreateForm() {
  const form = document.getElementById('create-card-form');
  const errorEl = document.getElementById('create-card-error');
  const submitBtn = document.getElementById('create-card-submit');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const data = {
      name: document.getElementById('create-name').value,
      closingDay: document.getElementById('create-closing-day').value,
      dueDay: document.getElementById('create-due-day').value,
    };

    const validationError = validateCardFields(data);
    showFieldError(errorEl, validationError);
    if (validationError) return;

    submitBtn.disabled = true;
    try {
      const { ok, body } = await request(API_ROUTE_CARDS, {
        method: 'POST',
        body: JSON.stringify({
          name: data.name.trim(),
          closingDay: Number(data.closingDay),
          dueDay: Number(data.dueDay),
        }),
      });

      if (!ok) {
        showFieldError(errorEl, translateError(body.error));
        return;
      }

      form.reset();
      showToast('Cartão cadastrado com sucesso!');
      await fetchCards();
    } catch (error) {
      console.error('Erro ao cadastrar cartão:', error);
      showFieldError(errorEl, 'Não foi possível conectar à API.');
    } finally {
      submitBtn.disabled = false;
    }
  });
}

/* ------------------------------------------------------------------ */
/* Edição                                                              */
/* ------------------------------------------------------------------ */

function openEditModal(card) {
  editingCard = card;
  document.getElementById('edit-name').value = card.name;
  document.getElementById('edit-closing-day').value = card.closingDay;
  document.getElementById('edit-due-day').value = card.dueDay;
  const activeInput = document.getElementById('edit-card-active');
  if (activeInput) {
    activeInput.checked = card.active !== false;
  }
  document
    .getElementById('edit-card-warning')
    .classList.toggle('hidden', card.transactionsCount === 0);
  showFieldError(document.getElementById('edit-card-error'), null);
  openModal(document.getElementById('edit-card-modal'));
}

function initEditForm() {
  const form = document.getElementById('edit-card-form');
  const errorEl = document.getElementById('edit-card-error');
  const submitBtn = document.getElementById('edit-card-submit');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!editingCard) return;

    const data = {
      name: document.getElementById('edit-name').value,
      closingDay: document.getElementById('edit-closing-day').value,
      dueDay: document.getElementById('edit-due-day').value,
    };

    const validationError = validateCardFields(data);
    showFieldError(errorEl, validationError);
    if (validationError) return;

    submitBtn.disabled = true;
    try {
      const activeInput = document.getElementById('edit-card-active');
      const { ok, body } = await request(
        `${API_ROUTE_CARDS}/${encodeURIComponent(editingCard.id)}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            name: data.name.trim(),
            closingDay: Number(data.closingDay),
            dueDay: Number(data.dueDay),
            active: activeInput ? activeInput.checked : true,
          }),
        }
      );

      if (!ok) {
        showFieldError(errorEl, translateError(body.error));
        return;
      }

      closeModal(document.getElementById('edit-card-modal'));
      showToast('Cartão atualizado com sucesso!');
      await fetchCards();
    } catch (error) {
      console.error('Erro ao atualizar cartão:', error);
      showFieldError(errorEl, 'Não foi possível conectar à API.');
    } finally {
      submitBtn.disabled = false;
    }
  });
}

/* ------------------------------------------------------------------ */
/* Exclusão                                                            */
/* ------------------------------------------------------------------ */

/**
 * Configura o modal de exclusão.
 * @param {object} card
 */
function setupDeleteModal(card) {
  document
    .querySelectorAll('#delete-card-modal .delete-card-name')
    .forEach((el) => (el.textContent = card.name));
  document.getElementById('delete-transactions-count').textContent =
    card.transactionsCount;
}

function openDeleteModal(card) {
  deletingCard = { ...card };
  showFieldError(document.getElementById('delete-card-error'), null);
  setupDeleteModal(deletingCard);
  openModal(document.getElementById('delete-card-modal'));
}

function initDeleteModal() {
  const confirmBtn = document.getElementById('delete-card-confirm');
  const errorEl = document.getElementById('delete-card-error');
  if (!confirmBtn) return;

  confirmBtn.addEventListener('click', async () => {
    if (!deletingCard) return;

    showFieldError(errorEl, null);

    const url = `${API_ROUTE_CARDS}/${encodeURIComponent(deletingCard.id)}`;

    confirmBtn.disabled = true;
    try {
      const { ok, body } = await request(url, { method: 'DELETE' });

      if (!ok) {
        showFieldError(errorEl, translateError(body.error));
        return;
      }

      closeModal(document.getElementById('delete-card-modal'));
      showToast('Cartão desativado. Histórico e parcelas mantidos.');
      await fetchCards();
    } catch (error) {
      console.error('Erro ao excluir cartão:', error);
      showFieldError(errorEl, 'Não foi possível conectar à API.');
    } finally {
      confirmBtn.disabled = false;
    }
  });
}

async function activateCard(card) {
  try {
    const { ok, body } = await request(
      `${API_ROUTE_CARDS}/${encodeURIComponent(card.id)}`,
      { method: 'PUT', body: JSON.stringify({ active: true }) }
    );
    if (!ok) {
      showToast(translateError(body.error), 'error');
      return;
    }
    showToast('Cartão reativado com sucesso!');
    await fetchCards();
  } catch (error) {
    console.error('Erro ao reativar cartão:', error);
    showToast('Não foi possível conectar à API.', 'error');
  }
}
