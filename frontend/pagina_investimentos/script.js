const API_URL = window.API_BASE_URL || 'http://localhost:8080';
const API_INVESTMENTS = `${API_URL}/financial/investments`;

// Estado da Aplicação
let allBanks = []; // Todos os bancos (ativos e inativos para gerenciamento)
let activeBanks = []; // Apenas bancos ativos para o carrossel
let currentBankIndex = 0; // Índice do banco atualmente focado no carrossel
let summaryData = null; // Dados retornados por /investments/summary
let currentDaysFilter = 90; // Filtro de dias ativo (30, 60, 90 ou 'custom')
let customStartDate = null;
let customEndDate = null;

// Instâncias do Chart.js
let bankChartInstance = null;
let totalChartInstance = null;

// Mensagens amigáveis
const ERROR_MESSAGES = {
  'Bank name is required': 'O nome do banco ou corretora é obrigatório.',
  'Bank with this name already exists':
    'Já existe uma instituição com este nome.',
  'Bank name already in use': 'Já existe uma instituição com este nome.',
  'Bank not found': 'Instituição não encontrada.',
  'Bank ID is required': 'Selecione uma instituição.',
  'Novo saldo ou valor do aporte é obrigatório':
    'Informe o novo saldo total da instituição.',
  'O valor da retirada deve ser maior que zero':
    'O valor da retirada deve ser maior que zero.',
  'Saldo insuficiente para realizar a retirada':
    'Saldo insuficiente para realizar esta retirada.',
  'Invalid movement type. Must be "aporte" or "retirada"':
    'Tipo de movimentação inválido.',
};

function translateError(msg) {
  return ERROR_MESSAGES[msg] || msg || 'Ocorreu um erro inesperado.';
}

function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatBRL(cents) {
  const value = (Number(cents) || 0) / 100;
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

// Converte texto BRL (ex: "R$ 1.500,50") em centavos inteiros (ex: 150050)
function parseBRLToCents(text) {
  if (!text) return 0;
  const digits = String(text).replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

// Aplica máscara de moeda em tempo real para campos monetários
function setupCurrencyMask(input) {
  if (!input) return;
  input.addEventListener('input', (e) => {
    const cents = parseBRLToCents(e.target.value);
    e.target.value = cents > 0 ? formatBRL(cents) : '';
  });
}

function setCurrencyInputValue(input, cents) {
  if (!input) return;
  const val = Number(cents) || 0;
  input.value = val > 0 ? formatBRL(val) : '';
}

// Feedback Toast
let toastTimeout;
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = `fixed bottom-6 right-24 z-[60] px-4 py-3 rounded-lg shadow-xl text-sm font-medium transition-opacity ${
    type === 'success'
      ? 'bg-green-500 text-gray-950 font-semibold'
      : 'bg-red-500 text-white'
  }`;
  toast.classList.remove('hidden');

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 3500);
}

// Helpers de requisições HTTP autenticadas
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

// Modais
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('hidden');
  requestAnimationFrame(() => {
    modal.classList.remove('opacity-0');
    modal.classList.add('opacity-100');
    const container = modal.querySelector('div[class*="transform"]');
    container?.classList.remove('scale-95');
    container?.classList.add('scale-100');
  });
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  const container = modal.querySelector('div[class*="transform"]');
  modal.classList.remove('opacity-100');
  modal.classList.add('opacity-0');
  container?.classList.remove('scale-100');
  container?.classList.add('scale-95');
  setTimeout(() => {
    modal.classList.add('hidden');
  }, 250);
}

/* ========================================================================== */
/* Inicialização da Página                                                     */
/* ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initFAB();
  initModals();
  initFilters();
  initMovementForm();
  initCreateBankForm();
  initEditBankForm();
  initCarouselControls();

  // Configura máscaras de moeda
  setupCurrencyMask(document.getElementById('movement-new-balance'));
  setupCurrencyMask(document.getElementById('movement-withdraw-amount'));
  setupCurrencyMask(document.getElementById('new-bank-initial-balance'));

  // Define data padrão de hoje para formulário de movimentação
  const today = new Date().toISOString().split('T')[0];
  const movementDateInput = document.getElementById('movement-date');
  if (movementDateInput) movementDateInput.value = today;

  // Carrega dados iniciais
  loadAllData();
});

/* ========================================================================== */
/* Botão Flutuante (+) & Menu                                                 */
/* ========================================================================== */

function initFAB() {
  const fabButton = document.getElementById('fab-button');
  const fabMenu = document.getElementById('fab-menu');
  const fabIcon = document.getElementById('fab-icon');

  if (!fabButton || !fabMenu) return;

  fabButton.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = fabMenu.classList.contains('hidden');
    if (isHidden) {
      fabMenu.classList.remove('hidden');
      fabIcon?.classList.add('rotate-45');
    } else {
      fabMenu.classList.add('hidden');
      fabIcon?.classList.remove('rotate-45');
    }
  });

  // Fecha o menu popup ao clicar fora
  document.addEventListener('click', (e) => {
    if (!fabMenu.contains(e.target) && !fabButton.contains(e.target)) {
      fabMenu.classList.add('hidden');
      fabIcon?.classList.remove('rotate-45');
    }
  });

  // Ações do menu
  document
    .getElementById('btn-open-movement-modal')
    ?.addEventListener('click', () => {
      fabMenu.classList.add('hidden');
      fabIcon?.classList.remove('rotate-45');
      populateMovementBanksSelect();
      openModal('modal-movement');
    });

  document
    .getElementById('btn-open-manage-banks')
    ?.addEventListener('click', () => {
      fabMenu.classList.add('hidden');
      fabIcon?.classList.remove('rotate-45');
      loadManageBanksTable();
      openModal('modal-manage-banks');
    });
}

function initModals() {
  // Botões de fechar modal genéricos
  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close-modal');
      closeModal(modalId);
    });
  });

  // Fechar ao clicar no backdrop escuro
  document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal.id);
      }
    });
  });
}

/* ========================================================================== */
/* Carregamento de Dados & Resumo                                             */
/* ========================================================================== */

async function loadAllData() {
  await Promise.all([fetchBanksList(), fetchInvestmentsSummary()]);
  renderDashboard();
}

async function fetchBanksList() {
  const { ok, body } = await request(`${API_INVESTMENTS}/banks`);
  if (ok && Array.isArray(body.data)) {
    allBanks = body.data;
    activeBanks = allBanks.filter((b) => b.active);
  } else {
    allBanks = [];
    activeBanks = [];
  }
}

async function fetchInvestmentsSummary() {
  let query = '';
  if (currentDaysFilter === 'custom' && customStartDate && customEndDate) {
    query = `?startDate=${customStartDate}&endDate=${customEndDate}`;
  } else {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - Number(currentDaysFilter || 90));
    const sStr = start.toISOString().split('T')[0];
    const eStr = end.toISOString().split('T')[0];
    query = `?startDate=${sStr}&endDate=${eStr}`;
  }

  const { ok, body } = await request(`${API_INVESTMENTS}/summary${query}`);
  if (ok && body) {
    summaryData = body;
  }
}

/* ========================================================================== */
/* Renderização do Dashboard & Carrossel                                      */
/* ========================================================================== */

function renderDashboard() {
  const totalBalanceElem = document.getElementById('stat-total-balance');
  const activeBanksElem = document.getElementById('stat-active-banks');
  const focusBalanceElem = document.getElementById('stat-focus-balance');
  const focusNameElem = document.getElementById('stat-focus-name');

  const total = summaryData?.totalCurrentBalance || 0;
  totalBalanceElem.textContent = formatBRL(total);
  activeBanksElem.textContent = activeBanks.length;

  const carouselSection = document.getElementById('bank-carousel-section');
  const emptyState = document.getElementById('bank-empty-state');
  const dataContainer = document.getElementById('bank-data-container');

  if (activeBanks.length === 0) {
    emptyState.classList.remove('hidden');
    dataContainer.classList.add('hidden');
    document.getElementById('current-bank-name').textContent =
      'Sem bancos cadastrados';
    document.getElementById('bank-carousel-index').textContent = '0 de 0';
    document.getElementById('current-bank-badge').classList.add('hidden');
    document.getElementById('btn-prev-bank').disabled = true;
    document.getElementById('btn-next-bank').disabled = true;
    focusBalanceElem.textContent = 'R$ 0,00';
    focusNameElem.textContent = 'Nenhuma instituição';

    destroyChart(bankChartInstance);
    renderTotalChart();
    return;
  }

  emptyState.classList.add('hidden');
  dataContainer.classList.remove('hidden');

  // Ajusta índice corrente se estiver fora do range
  if (currentBankIndex >= activeBanks.length) {
    currentBankIndex = activeBanks.length - 1;
  }
  if (currentBankIndex < 0) {
    currentBankIndex = 0;
  }

  const bank = activeBanks[currentBankIndex];
  document.getElementById('current-bank-name').textContent = bank.name;
  document.getElementById('current-bank-balance').textContent = formatBRL(
    bank.currentBalance
  );
  document.getElementById('bank-carousel-index').textContent =
    `${currentBankIndex + 1} de ${activeBanks.length}`;
  document.getElementById('current-bank-badge').classList.remove('hidden');

  focusBalanceElem.textContent = formatBRL(bank.currentBalance);
  focusNameElem.textContent = bank.name;

  // Atualiza estado dos botões de setas
  document.getElementById('btn-prev-bank').disabled = activeBanks.length <= 1;
  document.getElementById('btn-next-bank').disabled = activeBanks.length <= 1;

  // Renderiza gráficos
  renderBankChart(bank);
  renderTotalChart();
}

/* ========================================================================== */
/* Controles do Carrossel de Bancos                                           */
/* ========================================================================== */

function initCarouselControls() {
  document.getElementById('btn-prev-bank')?.addEventListener('click', () => {
    if (activeBanks.length <= 1) return;
    currentBankIndex =
      (currentBankIndex - 1 + activeBanks.length) % activeBanks.length;
    renderDashboard();
  });

  document.getElementById('btn-next-bank')?.addEventListener('click', () => {
    if (activeBanks.length <= 1) return;
    currentBankIndex = (currentBankIndex + 1) % activeBanks.length;
    renderDashboard();
  });
}

/* ========================================================================== */
/* Gráficos com Chart.js                                                      */
/* ========================================================================== */

function destroyChart(chartInstance) {
  if (chartInstance) {
    chartInstance.destroy();
  }
}

function renderBankChart(bank) {
  const canvas = document.getElementById('bank-chart');
  const emptyNotice = document.getElementById('bank-chart-empty');
  if (!canvas) return;

  const bankHistoryObj = summaryData?.bankMonthlyEvolution?.[bank.id];
  const history = bankHistoryObj?.history || [];

  if (history.length === 0) {
    emptyNotice?.classList.remove('hidden');
    canvas.classList.add('hidden');
    destroyChart(bankChartInstance);
    return;
  }

  emptyNotice?.classList.add('hidden');
  canvas.classList.remove('hidden');

  const labels = history.map((item) => item.label);
  const data = history.map((item) => (item.balance || 0) / 100);

  destroyChart(bankChartInstance);

  const ctx = canvas.getContext('2d');
  bankChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: `Saldo ${bank.name} (R$)`,
          data,
          borderColor: '#10b981', // emerald-500
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#064e3b',
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#e5e7eb',
          bodyColor: '#34d399',
          borderColor: '#374151',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label(context) {
              const val = context.parsed.y * 100;
              return ` Saldo: ${formatBRL(val)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(55, 65, 81, 0.3)' },
          ticks: { color: '#9ca3af', font: { size: 11 } },
        },
        y: {
          grid: { color: 'rgba(55, 65, 81, 0.3)' },
          ticks: {
            color: '#9ca3af',
            font: { size: 11 },
            callback(val) {
              return `R$ ${val.toLocaleString('pt-BR')}`;
            },
          },
        },
      },
    },
  });
}

function renderTotalChart() {
  const canvas = document.getElementById('total-chart');
  const emptyNotice = document.getElementById('total-chart-empty');
  if (!canvas) return;

  const evolution = summaryData?.totalMonthlyEvolution || [];

  if (evolution.length === 0) {
    emptyNotice?.classList.remove('hidden');
    canvas.classList.add('hidden');
    destroyChart(totalChartInstance);
    return;
  }

  emptyNotice?.classList.add('hidden');
  canvas.classList.remove('hidden');

  const labels = evolution.map((item) => item.label);
  const data = evolution.map((item) => (item.totalBalance || 0) / 100);

  destroyChart(totalChartInstance);

  const ctx = canvas.getContext('2d');
  totalChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Patrimônio Total Acumulado (R$)',
          data,
          borderColor: '#22c55e', // green-500
          backgroundColor: 'rgba(34, 197, 94, 0.15)',
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointBackgroundColor: '#22c55e',
          pointBorderColor: '#14532d',
          pointRadius: 4.5,
          pointHoverRadius: 7,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#e5e7eb',
          bodyColor: '#4ade80',
          borderColor: '#374151',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label(context) {
              const val = context.parsed.y * 100;
              return ` Total: ${formatBRL(val)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(55, 65, 81, 0.3)' },
          ticks: { color: '#9ca3af', font: { size: 11 } },
        },
        y: {
          grid: { color: 'rgba(55, 65, 81, 0.3)' },
          ticks: {
            color: '#9ca3af',
            font: { size: 11 },
            callback(val) {
              return `R$ ${val.toLocaleString('pt-BR')}`;
            },
          },
        },
      },
    },
  });
}

/* ========================================================================== */
/* Filtros de Período                                                         */
/* ========================================================================== */

function initFilters() {
  const pills = document.querySelectorAll('[data-filter-days]');
  const customBtn = document.getElementById('btn-custom-filter');
  const customForm = document.getElementById('custom-date-form');
  const periodLabel = document.getElementById('period-display-label');

  pills.forEach((pill) => {
    pill.addEventListener('click', async () => {
      const days = pill.getAttribute('data-filter-days');
      currentDaysFilter = days;

      // Estilo ativo nos botões
      pills.forEach((p) => {
        p.className =
          'filter-pill px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-gray-700 hover:bg-gray-600 text-gray-300';
      });
      customBtn.className =
        'filter-pill px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-gray-700 hover:bg-gray-600 text-gray-300';
      pill.className =
        'filter-pill px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors bg-green-500 text-gray-950 shadow-sm';

      customForm.classList.add('hidden');
      if (periodLabel) periodLabel.textContent = `Últimos ${days} dias`;

      await fetchInvestmentsSummary();
      renderDashboard();
    });
  });

  customBtn?.addEventListener('click', () => {
    currentDaysFilter = 'custom';
    pills.forEach((p) => {
      p.className =
        'filter-pill px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-gray-700 hover:bg-gray-600 text-gray-300';
    });
    customBtn.className =
      'filter-pill px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors bg-green-500 text-gray-950 shadow-sm';

    customForm.classList.toggle('hidden');

    // Preenche com padrão 90 dias caso vazio
    if (!document.getElementById('custom-end-date').value) {
      const today = new Date().toISOString().split('T')[0];
      const start = new Date();
      start.setDate(start.getDate() - 90);
      document.getElementById('custom-start-date').value = start
        .toISOString()
        .split('T')[0];
      document.getElementById('custom-end-date').value = today;
    }
  });

  customForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    customStartDate = document.getElementById('custom-start-date').value;
    customEndDate = document.getElementById('custom-end-date').value;

    if (!customStartDate || !customEndDate) return;
    if (customStartDate > customEndDate) {
      showToast('A data inicial não pode ser maior que a final.', 'error');
      return;
    }

    if (periodLabel)
      periodLabel.textContent = `${customStartDate} até ${customEndDate}`;

    await fetchInvestmentsSummary();
    renderDashboard();
  });
}

/* ========================================================================== */
/* Formulário: Novo Aporte / Retirada                                         */
/* ========================================================================== */

function initMovementForm() {
  const form = document.getElementById('form-movement');
  const bankSelect = document.getElementById('movement-bank-select');
  const balanceDisplay = document.getElementById(
    'movement-current-balance-display'
  );
  const radios = document.querySelectorAll('input[name="movement-type"]');
  const aporteContainer = document.getElementById('field-aporte-container');
  const retiradaContainer = document.getElementById('field-retirada-container');
  const newBalanceInput = document.getElementById('movement-new-balance');
  const withdrawInput = document.getElementById('movement-withdraw-amount');
  const errorElem = document.getElementById('movement-form-error');

  // Atualiza exibição de saldo atual quando o usuário troca o banco
  function onBankChanged() {
    const selectedBankId = bankSelect.value;
    const bank = activeBanks.find((b) => b.id === selectedBankId);
    if (bank) {
      balanceDisplay.textContent = formatBRL(bank.currentBalance);
      // Se for aporte, pré-preenche o novo saldo com o saldo atual para facilitar a edição!
      const currentType = document.querySelector(
        'input[name="movement-type"]:checked'
      )?.value;
      if (currentType === 'aporte') {
        setCurrencyInputValue(newBalanceInput, bank.currentBalance);
      }
    } else {
      balanceDisplay.textContent = 'R$ 0,00';
      newBalanceInput.value = '';
    }
  }

  bankSelect?.addEventListener('change', onBankChanged);

  // Alterna entre campos de Aporte e Retirada
  radios.forEach((radio) => {
    radio.addEventListener('change', () => {
      const type = radio.value;
      if (type === 'aporte') {
        aporteContainer.classList.remove('hidden');
        retiradaContainer.classList.add('hidden');
        withdrawInput.value = '';
        onBankChanged();
      } else {
        retiradaContainer.classList.remove('hidden');
        aporteContainer.classList.add('hidden');
        withdrawInput.value = '';
      }
    });
  });

  // Envio do formulário
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorElem.classList.add('hidden');

    const bankId = bankSelect.value;
    if (!bankId) {
      errorElem.textContent = 'Selecione uma instituição.';
      errorElem.classList.remove('hidden');
      return;
    }

    const type =
      document.querySelector('input[name="movement-type"]:checked')?.value ||
      'aporte';
    const date = document.getElementById('movement-date').value;

    const payload = { bankId, type, date };

    if (type === 'aporte') {
      const cents = parseBRLToCents(newBalanceInput.value);
      if (newBalanceInput.value.trim() === '') {
        errorElem.textContent = 'Informe o novo saldo total da instituição.';
        errorElem.classList.remove('hidden');
        return;
      }
      payload.newBalance = cents;
    } else {
      const cents = parseBRLToCents(withdrawInput.value);
      if (!cents || cents <= 0) {
        errorElem.textContent = 'Informe um valor de retirada maior que zero.';
        errorElem.classList.remove('hidden');
        return;
      }
      payload.amount = cents;
    }

    const submitBtn = document.getElementById('btn-save-movement');
    submitBtn.disabled = true;

    const { ok, body } = await request(`${API_INVESTMENTS}/movements`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    submitBtn.disabled = false;

    if (!ok) {
      errorElem.textContent = translateError(body.error);
      errorElem.classList.remove('hidden');
      return;
    }

    showToast('Movimentação registrada com sucesso!');
    closeModal('modal-movement');
    form.reset();

    // Mantém o foco no banco que foi movimentado
    const updatedBankIndex = activeBanks.findIndex((b) => b.id === bankId);
    if (updatedBankIndex !== -1) {
      currentBankIndex = updatedBankIndex;
    }

    await loadAllData();
  });
}

function populateMovementBanksSelect() {
  const select = document.getElementById('movement-bank-select');
  if (!select) return;

  const currentFocus = activeBanks[currentBankIndex];

  select.innerHTML =
    '<option value="">Selecione um banco...</option>' +
    activeBanks
      .map(
        (b) =>
          `<option value="${b.id}" ${currentFocus && currentFocus.id === b.id ? 'selected' : ''}>${escapeHTML(b.name)} (${escapeHTML(formatBRL(b.currentBalance))})</option>`
      )
      .join('');

  // Dispara o evento change para pré-preencher saldo atual e inputs
  select.dispatchEvent(new Event('change'));
}

/* ========================================================================== */
/* Modal: Gerenciar Bancos (Cadastro, Listagem, Edição, Inativação)           */
/* ========================================================================== */

function initCreateBankForm() {
  const form = document.getElementById('form-create-bank');
  const errorElem = document.getElementById('create-bank-error');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorElem.classList.add('hidden');

    const nameInput = document.getElementById('new-bank-name');
    const initialBalanceInput = document.getElementById(
      'new-bank-initial-balance'
    );

    const name = nameInput.value.trim();
    if (!name) {
      errorElem.textContent = 'Informe o nome da instituição.';
      errorElem.classList.remove('hidden');
      return;
    }

    const initialBalance = parseBRLToCents(initialBalanceInput.value);

    const { ok, body } = await request(`${API_INVESTMENTS}/banks`, {
      method: 'POST',
      body: JSON.stringify({ name, initialBalance }),
    });

    if (!ok) {
      errorElem.textContent = translateError(body.error);
      errorElem.classList.remove('hidden');
      return;
    }

    showToast('Instituição cadastrada com sucesso!');
    form.reset();
    await loadManageBanksTable();
    await loadAllData();
  });
}

async function loadManageBanksTable() {
  const tbody = document.getElementById('manage-banks-table-body');
  if (!tbody) return;

  tbody.innerHTML =
    '<tr><td colspan="4" class="px-4 py-4 text-center text-gray-500">Atualizando bancos...</td></tr>';

  await fetchBanksList();

  if (allBanks.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="px-4 py-6 text-center text-gray-500">Nenhum banco cadastrado.</td></tr>';
    return;
  }

  tbody.innerHTML = allBanks
    .map((bank) => {
      const isActive = bank.active;
      const statusBadge = isActive
        ? '<span class="px-2 py-0.5 text-xs rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700">Ativo</span>'
        : '<span class="px-2 py-0.5 text-xs rounded-full bg-gray-800 text-gray-400 border border-gray-700">Inativo</span>';

      const toggleActionBtn = isActive
        ? `<button type="button" data-deactivate-bank="${bank.id}" class="text-xs text-red-400 hover:text-red-300 underline font-medium">Inativar</button>`
        : `<button type="button" data-activate-bank="${bank.id}" class="text-xs text-green-400 hover:text-green-300 underline font-medium">Reativar</button>`;

      return `<tr>
        <td class="px-4 py-3 font-medium text-gray-100">${escapeHTML(bank.name)}</td>
        <td class="px-4 py-3 text-right font-medium text-green-400">${escapeHTML(formatBRL(bank.currentBalance))}</td>
        <td class="px-4 py-3 text-center">${statusBadge}</td>
        <td class="px-4 py-3 text-center space-x-3">
          <button type="button" data-edit-bank="${bank.id}" data-bank-name="${escapeHTML(bank.name)}" class="text-xs text-blue-400 hover:text-blue-300 underline font-medium">Editar</button>
          ${toggleActionBtn}
        </td>
      </tr>`;
    })
    .join('');

  // Eventos de Ação na Tabela
  tbody.querySelectorAll('[data-edit-bank]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-edit-bank');
      const name = btn.getAttribute('data-bank-name');
      openEditBankModal(id, name);
    });
  });

  tbody.querySelectorAll('[data-deactivate-bank]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-deactivate-bank');
      const { ok, body } = await request(`${API_INVESTMENTS}/banks/${id}`, {
        method: 'DELETE',
      });
      if (ok) {
        showToast('Banco desativado com sucesso.');
        await loadManageBanksTable();
        await loadAllData();
      } else {
        showToast(translateError(body.error), 'error');
      }
    });
  });

  tbody.querySelectorAll('[data-activate-bank]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-activate-bank');
      const { ok, body } = await request(`${API_INVESTMENTS}/banks/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: true }),
      });
      if (ok) {
        showToast('Banco reativado com sucesso.');
        await loadManageBanksTable();
        await loadAllData();
      } else {
        showToast(translateError(body.error), 'error');
      }
    });
  });
}

function openEditBankModal(id, currentName) {
  document.getElementById('edit-bank-id').value = id;
  document.getElementById('edit-bank-name').value = currentName;
  document.getElementById('edit-bank-error').classList.add('hidden');
  openModal('modal-edit-bank');
}

function initEditBankForm() {
  const form = document.getElementById('form-edit-bank');
  const errorElem = document.getElementById('edit-bank-error');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorElem.classList.add('hidden');

    const id = document.getElementById('edit-bank-id').value;
    const name = document.getElementById('edit-bank-name').value.trim();

    if (!name) {
      errorElem.textContent = 'Informe o novo nome da instituição.';
      errorElem.classList.remove('hidden');
      return;
    }

    const { ok, body } = await request(`${API_INVESTMENTS}/banks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });

    if (!ok) {
      errorElem.textContent = translateError(body.error);
      errorElem.classList.remove('hidden');
      return;
    }

    showToast('Nome da instituição atualizado!');
    closeModal('modal-edit-bank');
    await loadManageBanksTable();
    await loadAllData();
  });
}
