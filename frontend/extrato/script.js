const STATEMENT_API = `${window.API_BASE_URL}/financial/transactions/statement`;
const TRANSACTIONS_API = `${window.API_BASE_URL}/financial/transactions`;
const CATEGORIES_API = `${window.API_BASE_URL}/financial/entryCategory`;
const PAYMENT_METHODS_API = `${window.API_BASE_URL}/financial/payment-methods`;
const CARDS_API = `${window.API_BASE_URL}/financial/cards?activeOnly=true`;

let currentTransactions = [];
let editingTransaction = null;
let deletingTransaction = null;
let expensesChartInstance = null;

let categoriesCache = null;
let paymentMethodsCache = null;
let cardsCache = null;

document.addEventListener('DOMContentLoaded', () => {
  initModals();
  initEditForm();
  initDeleteForm();
  setDefaultPeriod();
  document.getElementById('period-form').addEventListener('submit', (event) => {
    event.preventDefault();
    loadStatement();
  });
  loadStatement();
});

function setDefaultPeriod() {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 29);
  const toISODate = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const startInput = document.getElementById('start-date');
  const endInput = document.getElementById('end-date');
  startInput.value = toISODate(startDate);
  endInput.value = BrazilianDate.todayISO();
}

function formatBRL(cents) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(cents || 0) / 100);
}

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isCreditCardMethod(method) {
  const name = normalize(method?.name);
  return (
    name.includes('credito') &&
    (name.includes('cartao') || name.includes('credit'))
  );
}

function parseAmountToCents(rawValue) {
  const value = String(rawValue || '')
    .trim()
    .replace(/\s/g, '');
  if (!value) return null;
  let normalized = value;
  if (value.includes(',')) {
    normalized = value.replace(/\./g, '').replace(',', '.');
  }
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const cents = Math.round(amount * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

function displayDate(value) {
  const [year, month, day] = String(value).slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
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
  if (type === 'success') {
    toast.classList.add('bg-green-500', 'text-gray-900');
  } else {
    toast.classList.add('bg-red-500', 'text-white');
  }
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.add('hidden'), 3500);
}

function openModal(modal) {
  if (!modal) return;
  modal.classList.remove('hidden');
  requestAnimationFrame(() => {
    modal.classList.remove('opacity-0');
    modal.classList.add('opacity-100');
  });
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove('opacity-100');
  modal.classList.add('opacity-0');
  setTimeout(() => modal.classList.add('hidden'), 300);
}

function initModals() {
  document.querySelectorAll('.modal').forEach((modal) => {
    modal
      .querySelectorAll('[data-close-modal]')
      .forEach((button) =>
        button.addEventListener('click', () => closeModal(modal))
      );
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal(modal);
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      document.querySelectorAll('.modal:not(.hidden)').forEach(closeModal);
    }
  });
}

async function fetchOptionsData() {
  const fetchSafe = async (url) => {
    try {
      const res = await fetch(url);
      const data = await res.json();
      return res.ok ? data.data || [] : [];
    } catch {
      return [];
    }
  };

  const [categories, paymentMethods, cards] = await Promise.all([
    categoriesCache
      ? Promise.resolve(categoriesCache)
      : fetchSafe(CATEGORIES_API),
    paymentMethodsCache
      ? Promise.resolve(paymentMethodsCache)
      : fetchSafe(PAYMENT_METHODS_API),
    cardsCache ? Promise.resolve(cardsCache) : fetchSafe(CARDS_API),
  ]);

  categoriesCache = categories;
  paymentMethodsCache = paymentMethods;
  cardsCache = cards;

  return { categories, paymentMethods, cards };
}

async function loadStatement() {
  const startDate = document.getElementById('start-date').value;
  const endDate = document.getElementById('end-date').value;
  const error = document.getElementById('statement-error');
  if (!startDate || !endDate) {
    showError('Informe as duas datas do período.');
    return;
  }
  if (startDate > endDate) {
    showError('A data inicial deve ser anterior ou igual à data final.');
    return;
  }

  const button = document.getElementById('filter-button');
  button.disabled = true;
  error.classList.add('hidden');
  document.getElementById('transactions-table-body').innerHTML =
    '<tr><td colspan="7" class="py-8 text-center text-gray-500">Carregando extrato...</td></tr>';

  try {
    const query = new URLSearchParams({ startDate, endDate });
    const response = await fetch(`${STATEMENT_API}?${query}`);
    const body = await response.json();
    if (!response.ok)
      throw new Error(body.error || 'Não foi possível carregar o extrato.');
    renderSummary(body.summary);
    renderChart(body.dailyExpenses || [], startDate, endDate);
    renderTransactions(body.transactions || []);
  } catch (requestError) {
    console.error('Erro ao carregar extrato:', requestError);
    showError(
      requestError.message === 'Failed to fetch'
        ? 'Não foi possível conectar à API.'
        : requestError.message
    );
    document.getElementById('transactions-table-body').innerHTML =
      '<tr><td colspan="7" class="py-8 text-center text-red-400">Não foi possível carregar os lançamentos.</td></tr>';
    destroyExpensesChart();
    const canvas = document.getElementById('expenses-chart-canvas');
    const emptyNotice = document.getElementById('expenses-chart-empty');
    if (canvas) canvas.classList.add('hidden');
    if (emptyNotice) {
      emptyNotice.textContent = 'Gráfico indisponível.';
      emptyNotice.classList.remove('hidden');
    }
  } finally {
    button.disabled = false;
  }
}

function showError(message) {
  const error = document.getElementById('statement-error');
  error.textContent = message;
  error.classList.remove('hidden');
}

function renderSummary(summary = {}) {
  document.getElementById('total-incomes').textContent = formatBRL(
    summary.incomes
  );
  document.getElementById('total-expenses').textContent = formatBRL(
    summary.expenses
  );
  const balance = Number(summary.balance || 0);
  const balanceElement = document.getElementById('period-balance');
  balanceElement.textContent = formatBRL(balance);
  balanceElement.classList.remove(
    'text-green-400',
    'text-red-400',
    'text-gray-100'
  );
  balanceElement.classList.add(
    balance > 0
      ? 'text-green-400'
      : balance < 0
        ? 'text-red-400'
        : 'text-gray-100'
  );
}

function parseUTCDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addUTCDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function chartBuckets(dailyExpenses, startDate, endDate) {
  const totalsByDate = new Map(
    dailyExpenses.map((item) => [
      String(item.date).slice(0, 10),
      Number(item.amount) || 0,
    ])
  );
  const start = parseUTCDate(startDate);
  const end = parseUTCDate(endDate);
  const days = Math.floor((end - start) / 86400000) + 1;
  const grouping = days <= 31 ? 'day' : days <= 180 ? 'week' : 'month';
  const buckets = new Map();

  for (let date = new Date(start); date <= end; date = addUTCDays(date, 1)) {
    const keyDate = isoDate(date);
    let key = keyDate;
    let label = displayDate(keyDate).slice(0, 5);
    if (grouping === 'week') {
      const weekStart = new Date(date);
      const weekday = (weekStart.getUTCDay() + 6) % 7;
      weekStart.setUTCDate(weekStart.getUTCDate() - weekday);
      key = isoDate(weekStart);
      label = displayDate(key).slice(0, 5);
    } else if (grouping === 'month') {
      key = keyDate.slice(0, 7);
      label = `${keyDate.slice(5, 7)}/${keyDate.slice(0, 4)}`;
    }
    const bucket = buckets.get(key) || { label, amount: 0 };
    bucket.amount += totalsByDate.get(keyDate) || 0;
    buckets.set(key, bucket);
  }

  return { grouping, buckets: [...buckets.values()] };
}

function destroyExpensesChart() {
  if (expensesChartInstance) {
    expensesChartInstance.destroy();
    expensesChartInstance = null;
  }
}

function renderChart(dailyExpenses, startDate, endDate) {
  const canvas = document.getElementById('expenses-chart-canvas');
  const emptyNotice = document.getElementById('expenses-chart-empty');
  const { grouping, buckets } = chartBuckets(dailyExpenses, startDate, endDate);
  const groupingLabels = {
    day: 'Por dia',
    week: 'Por semana',
    month: 'Por mês',
  };
  document.getElementById('chart-grouping').textContent =
    groupingLabels[grouping];

  const max = Math.max(...buckets.map((item) => item.amount), 0);
  if (max === 0) {
    destroyExpensesChart();
    if (canvas) canvas.classList.add('hidden');
    if (emptyNotice) {
      emptyNotice.textContent = 'Nenhuma saída no período selecionado.';
      emptyNotice.classList.remove('hidden');
    }
    return;
  }

  if (emptyNotice) emptyNotice.classList.add('hidden');
  if (canvas) canvas.classList.remove('hidden');

  destroyExpensesChart();

  const labels = buckets.map((bucket) => bucket.label);
  const data = buckets.map((bucket) => (Number(bucket.amount) || 0) / 100);

  const ctx = canvas.getContext('2d');
  expensesChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Débitos (R$)',
          data,
          backgroundColor: 'rgba(248, 113, 113, 0.75)',
          borderColor: '#ef4444',
          borderWidth: 1,
          borderRadius: 4,
          hoverBackgroundColor: '#ef4444',
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
          bodyColor: '#f87171',
          borderColor: '#374151',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label(context) {
              const val = context.parsed.y * 100;
              return ` Saída: ${formatBRL(val)}`;
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

function renderTransactions(transactions) {
  currentTransactions = transactions;
  const tbody = document.getElementById('transactions-table-body');
  document.getElementById('transactions-count').textContent =
    `${transactions.length} ${transactions.length === 1 ? 'lançamento' : 'lançamentos'}`;
  if (!transactions.length) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="py-8 text-center text-gray-500">Nenhum lançamento com vencimento neste período.</td></tr>';
    return;
  }

  tbody.innerHTML = transactions
    .map((transaction) => {
      const isIncome = transaction.transactionType === 'entrada';
      const typeLabel = isIncome ? 'Entrada' : 'Saída';
      const typeClass = isIncome
        ? 'bg-green-900/60 text-green-300'
        : 'bg-red-900/60 text-red-300';
      const amountClass = isIncome ? 'text-green-400' : 'text-red-400';
      const installment =
        Number(transaction.totalInstallments) > 1
          ? `<span class="block text-xs text-gray-400">${Number(transaction.installmentNumber)}/${Number(transaction.totalInstallments)}</span>`
          : '';
      const cardLabel = transaction.cardName
        ? `<span class="block text-gray-200">${escapeHTML(transaction.cardName)}</span>${installment}`
        : '<span class="text-gray-500">—</span>';
      const categoryLabel = transaction.categoryName
        ? `<span class="text-gray-300">${escapeHTML(transaction.categoryName)}</span>`
        : '<span class="text-gray-500">—</span>';
      return `<tr>
      <td class="px-4 py-4 text-gray-300 whitespace-nowrap">${escapeHTML(displayDate(transaction.dueDate))}</td>
      <td class="px-4 py-4 text-gray-200">${escapeHTML(transaction.description || 'Sem descrição')}</td>
      <td class="px-4 py-4">${categoryLabel}</td>
      <td class="px-4 py-4 text-center"><span class="inline-flex px-2.5 py-1 rounded-full text-xs ${typeClass}">${typeLabel}</span></td>
      <td class="px-4 py-4 text-right font-medium whitespace-nowrap ${amountClass}">${escapeHTML(formatBRL(transaction.amount))}</td>
      <td class="px-4 py-4">${cardLabel}</td>
      <td class="px-4 py-4 text-center whitespace-nowrap">
        <div class="flex items-center justify-center gap-2">
          <button
            type="button"
            data-action="edit"
            data-transaction-id="${escapeHTML(transaction.transactionId)}"
            data-installment-id="${escapeHTML(transaction.installmentId)}"
            class="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium rounded-lg border border-gray-700 transition duration-150"
            title="Editar transação"
          >
            Editar
          </button>
          <button
            type="button"
            data-action="delete"
            data-transaction-id="${escapeHTML(transaction.transactionId)}"
            data-installment-id="${escapeHTML(transaction.installmentId)}"
            class="px-2.5 py-1.5 bg-gray-800 hover:bg-red-600 text-red-400 hover:text-white text-xs font-medium rounded-lg border border-gray-700 transition duration-150"
            title="Remover transação"
          >
            Remover
          </button>
        </div>
      </td>
    </tr>`;
    })
    .join('');

  tbody.querySelectorAll('button[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const transactionId = button.dataset.transactionId;
      const installmentId = button.dataset.installmentId;
      const transaction = currentTransactions.find(
        (item) =>
          item.transactionId === transactionId &&
          item.installmentId === installmentId
      );
      if (!transaction) return;

      if (button.dataset.action === 'edit') {
        openEditTransactionModal(transaction);
      } else if (button.dataset.action === 'delete') {
        openDeleteTransactionModal(transaction);
      }
    });
  });
}

async function openEditTransactionModal(transaction) {
  editingTransaction = transaction;
  const modal = document.getElementById('edit-transaction-modal');
  const errorEl = document.getElementById('edit-transaction-error');
  errorEl.textContent = '';
  errorEl.classList.add('hidden');

  document.getElementById('edit-description').value =
    transaction.description || '';
  document.getElementById('edit-transaction-type').value =
    transaction.transactionType || 'saida';
  document.getElementById('edit-date').value =
    transaction.transactionDate || transaction.dueDate;

  const amountInput = document.getElementById('edit-amount');
  const amountHelp = document.getElementById('edit-amount-help');
  const isSingle = Number(transaction.totalInstallments) <= 1;

  if (isSingle) {
    amountInput.disabled = false;
    amountInput.value = (Number(transaction.amount || 0) / 100)
      .toFixed(2)
      .replace('.', ',');
    amountHelp.textContent = 'Use vírgula para os centavos. Ex.: 125,90.';
  } else {
    amountInput.disabled = true;
    amountInput.value = (Number(transaction.amount || 0) / 100)
      .toFixed(2)
      .replace('.', ',');
    amountHelp.textContent = `Transação dividida em ${transaction.totalInstallments} parcelas. Para alterar o valor total, remova e cadastre novamente.`;
  }

  const { categories, paymentMethods, cards } = await fetchOptionsData();

  // Populate categories
  const catSelect = document.getElementById('edit-category-id');
  const activeCategories = categories.filter(
    (c) => c.active !== false || c.id === transaction.categoryId
  );
  catSelect.innerHTML =
    '<option value="">Selecione uma categoria</option>' +
    activeCategories
      .map(
        (cat) =>
          `<option value="${escapeHTML(cat.id)}">${escapeHTML(cat.description)}</option>`
      )
      .join('');
  if (transaction.categoryId) {
    catSelect.value = transaction.categoryId;
  }

  // Populate payment methods
  const pmSelect = document.getElementById('edit-payment-method-id');
  const isIncome =
    document.getElementById('edit-transaction-type').value === 'entrada';
  const availableMethods = isIncome
    ? paymentMethods.filter((method) => {
        const name = normalize(method.name);
        return name.includes('dinheiro') || name.includes('pix');
      })
    : paymentMethods;

  pmSelect.innerHTML =
    '<option value="">Selecione uma forma de pagamento</option>' +
    availableMethods
      .map(
        (pm) =>
          `<option value="${escapeHTML(pm.id)}">${escapeHTML(pm.name)}</option>`
      )
      .join('');
  if (transaction.paymentMethodId) {
    pmSelect.value = transaction.paymentMethodId;
  }

  // Populate cards
  const cardSelect = document.getElementById('edit-card-id');
  cardSelect.innerHTML =
    '<option value="">Selecione um cartão</option>' +
    cards
      .map(
        (card) =>
          `<option value="${escapeHTML(card.id)}">${escapeHTML(card.name)}</option>`
      )
      .join('');
  if (transaction.cardId) {
    cardSelect.value = transaction.cardId;
  }

  updateEditCardFieldVisibility();
  openModal(modal);
}

function updateEditCardFieldVisibility() {
  const pmId = document.getElementById('edit-payment-method-id').value;
  const pm = paymentMethodsCache?.find((m) => m.id === pmId);
  const isCredit = isCreditCardMethod(pm);
  const cardField = document.getElementById('edit-card-field');
  const cardSelect = document.getElementById('edit-card-id');

  cardField.classList.toggle('hidden', !isCredit);
  cardSelect.required = isCredit;
}

function initEditForm() {
  const pmSelect = document.getElementById('edit-payment-method-id');
  pmSelect.addEventListener('change', updateEditCardFieldVisibility);

  const typeSelect = document.getElementById('edit-transaction-type');
  typeSelect.addEventListener('change', () => {
    if (!paymentMethodsCache) return;
    const isIncome = typeSelect.value === 'entrada';
    const availableMethods = isIncome
      ? paymentMethodsCache.filter((method) => {
          const name = normalize(method.name);
          return name.includes('dinheiro') || name.includes('pix');
        })
      : paymentMethodsCache;
    const currentVal = pmSelect.value;
    pmSelect.innerHTML =
      '<option value="">Selecione uma forma de pagamento</option>' +
      availableMethods
        .map(
          (pm) =>
            `<option value="${escapeHTML(pm.id)}">${escapeHTML(pm.name)}</option>`
        )
        .join('');
    if (availableMethods.some((m) => m.id === currentVal)) {
      pmSelect.value = currentVal;
    }
    updateEditCardFieldVisibility();
  });

  const form = document.getElementById('edit-transaction-form');
  const submitBtn = document.getElementById('edit-transaction-submit');
  const errorEl = document.getElementById('edit-transaction-error');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!editingTransaction) return;

    errorEl.textContent = '';
    errorEl.classList.add('hidden');

    const description = document
      .getElementById('edit-description')
      .value.trim();
    const transactionType = document.getElementById(
      'edit-transaction-type'
    ).value;
    const date = document.getElementById('edit-date').value;
    const categoryId = document.getElementById('edit-category-id').value;
    const paymentMethodId = document.getElementById(
      'edit-payment-method-id'
    ).value;
    const cardSelect = document.getElementById('edit-card-id');
    const pm = paymentMethodsCache?.find((m) => m.id === paymentMethodId);
    const isCredit = isCreditCardMethod(pm);
    const cardId = isCredit ? cardSelect.value : null;

    if (!categoryId || !paymentMethodId || !date) {
      errorEl.textContent =
        'Preencha tipo, data, categoria e forma de pagamento.';
      errorEl.classList.remove('hidden');
      return;
    }

    if (isCredit && !cardId) {
      errorEl.textContent = 'Selecione o cartão para compras no crédito.';
      errorEl.classList.remove('hidden');
      return;
    }

    const payload = {
      description,
      transactionType,
      date,
      categoryId,
      paymentMethodId,
      cardId: cardId || null,
    };

    const amountInput = document.getElementById('edit-amount');
    if (!amountInput.disabled) {
      const amountCents = parseAmountToCents(amountInput.value);
      if (amountCents === null) {
        errorEl.textContent = 'Informe um valor válido maior que zero.';
        errorEl.classList.remove('hidden');
        return;
      }
      payload.amount = amountCents;
    }

    submitBtn.disabled = true;
    try {
      const response = await fetch(
        `${TRANSACTIONS_API}/${encodeURIComponent(editingTransaction.transactionId)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          body.error || 'Não foi possível atualizar a transação.'
        );
      }

      closeModal(document.getElementById('edit-transaction-modal'));
      showToast('Transação atualizada com sucesso!');
      await loadStatement();
    } catch (err) {
      console.error('Erro ao atualizar transação:', err);
      errorEl.textContent =
        err.message === 'Failed to fetch'
          ? 'Não foi possível conectar à API.'
          : err.message;
      errorEl.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
    }
  });
}

function openDeleteTransactionModal(transaction) {
  deletingTransaction = transaction;
  const modal = document.getElementById('delete-transaction-modal');
  const descEl = document.getElementById('delete-transaction-desc');
  const installmentsWarning = document.getElementById(
    'delete-installments-warning'
  );
  const installmentsCount = document.getElementById(
    'delete-installments-count'
  );
  const singleWarning = document.getElementById('delete-single-warning');
  const errorEl = document.getElementById('delete-transaction-error');

  errorEl.textContent = '';
  errorEl.classList.add('hidden');

  descEl.textContent = `"${transaction.description || 'Sem descrição'}" (${formatBRL(transaction.amount)})`;

  const total = Number(transaction.totalInstallments);
  if (total > 1) {
    installmentsCount.textContent = String(total);
    installmentsWarning.classList.remove('hidden');
    singleWarning.classList.add('hidden');
  } else {
    installmentsWarning.classList.add('hidden');
    singleWarning.classList.remove('hidden');
  }

  openModal(modal);
}

function initDeleteForm() {
  const confirmBtn = document.getElementById('delete-transaction-confirm');
  const errorEl = document.getElementById('delete-transaction-error');

  confirmBtn.addEventListener('click', async () => {
    if (!deletingTransaction) return;

    errorEl.textContent = '';
    errorEl.classList.add('hidden');
    confirmBtn.disabled = true;

    try {
      const response = await fetch(
        `${TRANSACTIONS_API}/${encodeURIComponent(deletingTransaction.transactionId)}`,
        {
          method: 'DELETE',
        }
      );
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || 'Não foi possível remover a transação.');
      }

      closeModal(document.getElementById('delete-transaction-modal'));
      showToast('Transação e parcelas removidas com sucesso!');
      await loadStatement();
    } catch (err) {
      console.error('Erro ao remover transação:', err);
      errorEl.textContent =
        err.message === 'Failed to fetch'
          ? 'Não foi possível conectar à API.'
          : err.message;
      errorEl.classList.remove('hidden');
    } finally {
      confirmBtn.disabled = false;
    }
  });
}
