const STATEMENT_API = `${window.API_BASE_URL}/financial/transactions/statement`;

document.addEventListener('DOMContentLoaded', () => {
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

function displayDate(value) {
  const [year, month, day] = String(value).slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
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
    '<tr><td colspan="5" class="py-8 text-center text-gray-500">Carregando extrato...</td></tr>';

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
      '<tr><td colspan="5" class="py-8 text-center text-red-400">Não foi possível carregar os lançamentos.</td></tr>';
    document.getElementById('expenses-chart').innerHTML =
      '<p class="py-12 text-center text-gray-500">Gráfico indisponível.</p>';
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

function renderChart(dailyExpenses, startDate, endDate) {
  const chart = document.getElementById('expenses-chart');
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
    chart.innerHTML =
      '<p class="py-12 text-center text-gray-500">Nenhuma saída no período selecionado.</p>';
    return;
  }

  chart.innerHTML = `<div class="chart-bars">${buckets
    .map((bucket) => {
      const height = bucket.amount
        ? Math.max(4, (bucket.amount / max) * 100)
        : 0;
      return `<div class="chart-item" title="${escapeHTML(bucket.label)}: ${escapeHTML(formatBRL(bucket.amount))}">
      <span class="chart-value">${bucket.amount ? escapeHTML(formatBRL(bucket.amount)) : ''}</span>
      <div class="chart-bar-track"><div class="chart-bar" style="height: ${height}%"></div></div>
      <span class="chart-label">${escapeHTML(bucket.label)}</span>
    </div>`;
    })
    .join('')}</div>`;
}

function renderTransactions(transactions) {
  const tbody = document.getElementById('transactions-table-body');
  document.getElementById('transactions-count').textContent =
    `${transactions.length} ${transactions.length === 1 ? 'lançamento' : 'lançamentos'}`;
  if (!transactions.length) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="py-8 text-center text-gray-500">Nenhum lançamento com vencimento neste período.</td></tr>';
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
      return `<tr>
      <td class="px-4 py-4 text-gray-300 whitespace-nowrap">${escapeHTML(displayDate(transaction.dueDate))}</td>
      <td class="px-4 py-4 text-gray-200">${escapeHTML(transaction.description || 'Sem descrição')}</td>
      <td class="px-4 py-4 text-center"><span class="inline-flex px-2.5 py-1 rounded-full text-xs ${typeClass}">${typeLabel}</span></td>
      <td class="px-4 py-4 text-right font-medium whitespace-nowrap ${amountClass}">${escapeHTML(formatBRL(transaction.amount))}</td>
      <td class="px-4 py-4">${cardLabel}</td>
    </tr>`;
    })
    .join('');
}
