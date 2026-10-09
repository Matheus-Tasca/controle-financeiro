const API_URL = window.API_BASE_URL;
const API = {
  categories: `${API_URL}/financial/entryCategory`,
  cards: `${API_URL}/financial/cards?activeOnly=true`,
  paymentMethods: `${API_URL}/financial/payment-methods`,
  transactions: `${API_URL}/financial/transactions`,
};

let paymentMethods = [];
let cards = [];

document.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById('date');
  dateInput.value = BrazilianDate.todayISO();
  document.getElementById('payment-method-id').addEventListener('change', updateCardFields);
  document.getElementById('transaction-type').addEventListener('change', renderPaymentMethods);
  document.getElementById('amount').addEventListener('input', updateInstallmentPreview);
  document.getElementById('total-installments').addEventListener('change', updateInstallmentPreview);
  document.getElementById('transaction-form').addEventListener('submit', submitTransaction);
  loadFormOptions();
});

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function getData(url) {
  const response = await fetch(url);
  let body = {};
  try { body = await response.json(); } catch { body = {}; }
  if (!response.ok) throw new Error(body.error || `Erro HTTP ${response.status}`);
  return body.data || [];
}

async function loadFormOptions() {
  const results = await Promise.allSettled([
    getData(API.categories),
    getData(API.cards),
    getData(API.paymentMethods),
  ]);

  if (results[0].status === 'fulfilled') {
    const categories = results[0].value.filter((category) => category.active !== false);
    populateSelect('category-id', categories, 'Selecione uma categoria', 'id', 'description');
  } else {
    showLoadError('category-load-error', 'Não foi possível carregar as categorias.');
    setUnavailable('category-id', 'Categorias indisponíveis');
  }

  if (results[1].status === 'fulfilled') {
    cards = results[1].value;
    populateSelect('card-id', cards, 'Selecione um cartão', 'id', 'name');
  } else {
    showLoadError('card-load-error', 'Não foi possível carregar os cartões.');
    setUnavailable('card-id', 'Cartões indisponíveis');
  }

  if (results[2].status === 'fulfilled') {
    paymentMethods = results[2].value.filter((method) => method.active !== false);
    renderPaymentMethods();
    updateCardFields();
  } else {
    showLoadError('payment-method-load-error', 'Não foi possível carregar as formas de pagamento.');
    setUnavailable('payment-method-id', 'Formas de pagamento indisponíveis');
  }
}

function renderPaymentMethods() {
  const select = document.getElementById('payment-method-id');
  const previousValue = select.value;
  const isIncome = document.getElementById('transaction-type').value === 'entrada';
  const availableMethods = isIncome
    ? paymentMethods.filter((method) => {
        const name = normalize(method.name);
        return name.includes('dinheiro') || name.includes('pix');
      })
    : paymentMethods;

  populateSelect('payment-method-id', availableMethods, 'Selecione uma forma de pagamento', 'id', 'name');
  if (availableMethods.some((method) => method.id === previousValue)) {
    select.value = previousValue;
  }
  updateCardFields();
}

function populateSelect(id, items, placeholder, valueKey, labelKey) {
  const select = document.getElementById(id);
  select.innerHTML = `<option value="">${escapeHTML(placeholder)}</option>` + items.map((item) =>
    `<option value="${escapeHTML(item[valueKey])}">${escapeHTML(item[labelKey])}</option>`
  ).join('');
  if (items.length === 0) select.innerHTML = `<option value="">Nenhuma opção cadastrada</option>`;
}

function setUnavailable(id, label) {
  document.getElementById(id).innerHTML = `<option value="">${escapeHTML(label)}</option>`;
}

function showLoadError(id, message) {
  const element = document.getElementById(id);
  element.textContent = message;
  element.classList.remove('hidden');
}

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function isCreditCardMethod(method) {
  const name = normalize(method?.name);
  return name.includes('credito') && (name.includes('cartao') || name.includes('credit'));
}

function updateCardFields() {
  const method = paymentMethods.find((item) => item.id === document.getElementById('payment-method-id').value);
  const isCredit = isCreditCardMethod(method);
  const cardField = document.getElementById('card-field');
  const installmentsField = document.getElementById('installments-field');
  const cardSelect = document.getElementById('card-id');
  cardField.classList.toggle('hidden', !isCredit);
  installmentsField.classList.toggle('hidden', !isCredit);
  cardSelect.required = isCredit;
  cardSelect.disabled = !isCredit || cards.length === 0;
  document.getElementById('total-installments').disabled = !isCredit;
  updateInstallmentPreview();
}

/** Converts a Brazilian monetary input into an integer number of cents. */
function parseAmountToCents(rawValue) {
  const value = String(rawValue).trim().replace(/\s/g, '');
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

function formatBRLFromCents(cents) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function updateInstallmentPreview() {
  const preview = document.getElementById('installment-preview');
  const isVisible = !document.getElementById('installments-field').classList.contains('hidden');
  if (!isVisible) { preview.textContent = ''; return; }
  const amountCents = parseAmountToCents(document.getElementById('amount').value);
  if (amountCents === null) { preview.textContent = 'Informe um valor válido para ver a divisão das parcelas.'; return; }
  const count = Number(document.getElementById('total-installments').value);
  if (!Number.isSafeInteger(count) || count < 1) { preview.textContent = 'Informe um número inteiro de parcelas maior que zero.'; return; }
  if (count > amountCents) { preview.textContent = 'O número de parcelas não pode superar o valor em centavos.'; return; }
  const base = Math.floor(amountCents / count);
  const remainder = amountCents % count;
  const first = remainder ? `${formatBRLFromCents(base + remainder)} na 1ª e ${formatBRLFromCents(base)} nas próximas` : `${formatBRLFromCents(base)} por parcela`;
  preview.textContent = count === 1 ? `Pagamento à vista: ${formatBRLFromCents(amountCents)}.` : `${count} parcelas: ${first}.`;
}

function showFormError(message) {
  const error = document.getElementById('form-error');
  error.textContent = message || '';
  error.classList.toggle('hidden', !message);
}

async function submitTransaction(event) {
  event.preventDefault();
  showFormError(null);

  const categoryId = document.getElementById('category-id').value;
  const paymentMethodId = document.getElementById('payment-method-id').value;
  const date = document.getElementById('date').value;
  const amount = parseAmountToCents(document.getElementById('amount').value);
  const method = paymentMethods.find((item) => item.id === paymentMethodId);
  const creditCard = isCreditCardMethod(method);
  const cardId = document.getElementById('card-id').value;
  const totalInstallments = creditCard ? Number(document.getElementById('total-installments').value) : 1;

  if (!categoryId || !paymentMethodId || !date) {
    showFormError('Preencha tipo, data, categoria e forma de pagamento.');
    return;
  }
  if (amount === null) {
    showFormError('Informe um valor maior que zero, com até duas casas decimais (ex.: 125,90).');
    return;
  }
  if (creditCard && (!cardId || !cards.some((card) => card.id === cardId))) {
    showFormError('Selecione um cartão cadastrado para esta compra.');
    return;
  }
  if (creditCard && (!Number.isSafeInteger(totalInstallments) || totalInstallments < 1 || totalInstallments > amount)) {
    showFormError('Informe uma quantidade inteira de parcelas maior que zero e compatível com o valor.');
    return;
  }

  const payload = {
    description: document.getElementById('description').value.trim(),
    categoryId,
    transactionType: document.getElementById('transaction-type').value,
    date,
    paymentMethodId,
    installment: {
      amount,
      totalInstallments,
    },
  };
  if (creditCard) payload.cardId = cardId;

  const button = document.getElementById('submit-button');
  button.disabled = true;
  try {
    const response = await fetch(API.transactions, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    let body = {};
    try { body = await response.json(); } catch { body = {}; }
    if (!response.ok) throw new Error(body.error || 'Não foi possível salvar a transação.');
    document.getElementById('transaction-form').reset();
    document.getElementById('date').value = BrazilianDate.todayISO();
    renderPaymentMethods();
    updateCardFields();
    showToast('Transação cadastrada com sucesso!');
  } catch (error) {
    console.error('Erro ao cadastrar transação:', error);
    showFormError(error.message === 'Failed to fetch' ? 'Não foi possível conectar à API.' : error.message);
  } finally {
    button.disabled = false;
  }
}

let toastTimeout;
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  toast.classList.add('bg-green-500', 'text-gray-900');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.add('hidden'), 3500);
}
