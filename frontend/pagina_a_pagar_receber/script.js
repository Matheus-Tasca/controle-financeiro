const API_URL = window.API_BASE_URL || 'http://localhost:8080';
const API_THIRD_PARTIES = `${API_URL}/financial/third-parties`;
const API_DEBTS = `${API_URL}/financial/third-party-debts`;
const API_STATEMENT = `${API_URL}/financial/third-party-debts/statement`;
const API_CARDS = `${API_URL}/financial/cards?activeOnly=true`;

let currentTab = 'a_receber'; // 'a_receber' | 'a_pagar'
let persons = [];
let activePerson = null;
let cardsCache = [];
let debtToDeleteId = null;

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initModals();
  initForms();
  initPresets();
  setDefaultDates();

  fetchCards();
  fetchPersons();
});

function setDefaultDates() {
  const today = new Date();
  const toISODate = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const debtDateInput = document.getElementById('debt-date');
  if (debtDateInput) debtDateInput.value = toISODate(today);

  const debtFirstDueDate = document.getElementById('debt-first-due-date');
  if (debtFirstDueDate) debtFirstDueDate.value = toISODate(today);
}

function initTabs() {
  const tabReceivable = document.getElementById('tab-receivable');
  const tabPayable = document.getElementById('tab-payable');

  tabReceivable.addEventListener('click', () => {
    if (currentTab === 'a_receber') return;
    currentTab = 'a_receber';
    tabReceivable.className =
      'px-6 py-3 border-b-2 border-green-400 text-green-400 font-medium text-base transition flex items-center gap-2';
    tabPayable.className =
      'px-6 py-3 border-b-2 border-transparent text-gray-400 hover:text-gray-200 font-medium text-base transition flex items-center gap-2';

    // Se houver pessoa ativa de outro tipo, fecha o extrato
    closeStatement();
    renderPersons();
  });

  tabPayable.addEventListener('click', () => {
    if (currentTab === 'a_pagar') return;
    currentTab = 'a_pagar';
    tabPayable.className =
      'px-6 py-3 border-b-2 border-amber-400 text-amber-400 font-medium text-base transition flex items-center gap-2';
    tabReceivable.className =
      'px-6 py-3 border-b-2 border-transparent text-gray-400 hover:text-gray-200 font-medium text-base transition flex items-center gap-2';

    closeStatement();
    renderPersons();
  });
}

function initModals() {
  const modalDebt = document.getElementById('modal-debt');
  const modalPerson = document.getElementById('modal-person');
  const modalConfirmDelete = document.getElementById('modal-confirm-delete');

  // Abrir / Fechar Modal de Lançamento
  document.getElementById('btn-open-debt-modal').addEventListener('click', () => {
    openDebtModal();
  });
  document.getElementById('btn-close-debt-modal').addEventListener('click', () => {
    modalDebt.classList.add('hidden');
  });
  document.getElementById('btn-cancel-debt').addEventListener('click', () => {
    modalDebt.classList.add('hidden');
  });

  // Abrir / Fechar Modal de Pessoa
  document.getElementById('btn-open-person-modal').addEventListener('click', () => {
    openPersonModal();
  });
  document.getElementById('btn-quick-new-person').addEventListener('click', () => {
    openPersonModal();
  });
  document.getElementById('btn-close-person-modal').addEventListener('click', () => {
    modalPerson.classList.add('hidden');
  });
  document.getElementById('btn-cancel-person').addEventListener('click', () => {
    modalPerson.classList.add('hidden');
  });

  // Fechar Extrato
  document.getElementById('btn-close-statement').addEventListener('click', () => {
    closeStatement();
  });

  // Modal de Exclusão
  document.getElementById('btn-cancel-delete').addEventListener('click', () => {
    modalConfirmDelete.classList.add('hidden');
    debtToDeleteId = null;
  });

  document.getElementById('btn-confirm-delete').addEventListener('click', async () => {
    if (!debtToDeleteId) return;
    await executeDeleteDebt(debtToDeleteId);
    modalConfirmDelete.classList.add('hidden');
    debtToDeleteId = null;
  });

  // Mudança do tipo no modal de lançamento
  const radiosType = document.querySelectorAll('input[name="debt-type"]');
  radiosType.forEach((radio) => {
    radio.addEventListener('change', (e) => {
      toggleDebtModalFields(e.target.value);
    });
  });
}

function toggleDebtModalFields(selectedType) {
  const fieldCard = document.getElementById('field-receivable-card');
  const fieldDueDate = document.getElementById('field-payable-due-date');

  if (selectedType === 'a_receber') {
    fieldCard.classList.remove('hidden');
    fieldDueDate.classList.add('hidden');
  } else {
    fieldCard.classList.add('hidden');
    fieldDueDate.classList.remove('hidden');
  }
}

function openDebtModal(presetType = null, presetPersonId = null) {
  const form = document.getElementById('form-debt');
  form.reset();
  setDefaultDates();

  const typeToSet = presetType || currentTab;
  const radio = form.querySelector(`input[name="debt-type"][value="${typeToSet}"]`);
  if (radio) {
    radio.checked = true;
    toggleDebtModalFields(typeToSet);
  }

  populatePersonsSelect(presetPersonId || (activePerson ? activePerson.id : null));
  populateCardsSelect();

  document.getElementById('modal-debt').classList.remove('hidden');
}

function openPersonModal() {
  document.getElementById('form-person').reset();
  document.getElementById('modal-person').classList.remove('hidden');
}

function initForms() {
  // Submit Formulário de Pessoa
  document.getElementById('form-person').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('person-name');
    const name = nameInput.value.trim();

    if (!name) return;

    try {
      const response = await fetch(API_THIRD_PARTIES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao cadastrar pessoa.');
      }

      showToast('Pessoa cadastrada com sucesso!');
      document.getElementById('modal-person').classList.add('hidden');

      await fetchPersons();
      // Atualiza o select do modal de lançamento caso esteja aberto
      populatePersonsSelect(data.data?.id);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Submit Formulário de Lançamento
  document.getElementById('form-debt').addEventListener('submit', async (e) => {
    e.preventDefault();

    const type = document.querySelector('input[name="debt-type"]:checked').value;
    const thirdPartyId = document.getElementById('debt-third-party').value;
    const description = document.getElementById('debt-description').value.trim();
    const amountVal = parseFloat(document.getElementById('debt-amount').value);
    const installments = parseInt(document.getElementById('debt-installments').value, 10);
    const date = document.getElementById('debt-date').value;
    const cardId = document.getElementById('debt-card').value || null;
    const firstDueDate = document.getElementById('debt-first-due-date').value || null;

    if (!thirdPartyId) {
      showToast('Selecione uma pessoa.', 'error');
      return;
    }

    if (isNaN(amountVal) || amountVal <= 0) {
      showToast('Informe um valor válido maior que zero.', 'error');
      return;
    }

    const totalAmount = Math.round(amountVal * 100);

    const payload = {
      type,
      thirdPartyId,
      description,
      totalAmount,
      totalInstallments: installments,
      date,
      cardId: type === 'a_receber' ? cardId : null,
      firstDueDate: type === 'a_pagar' ? firstDueDate : null,
    };

    try {
      const response = await fetch(API_DEBTS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao salvar lançamento.');
      }

      showToast('Lançamento salvo com sucesso!');
      document.getElementById('modal-debt').classList.add('hidden');

      await fetchPersons();
      if (activePerson && activePerson.id === thirdPartyId) {
        loadStatement();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Filtro personalizado de período do extrato
  document.getElementById('statement-filter-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (activePerson) {
      loadStatement();
    }
  });
}

function initPresets() {
  const presetButtons = document.querySelectorAll('.preset-btn');
  presetButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      presetButtons.forEach((b) => {
        b.className =
          'preset-btn px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium rounded-lg transition';
      });
      btn.className =
        'preset-btn px-3 py-1.5 bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-medium rounded-lg transition';

      const preset = btn.dataset.preset;
      const startInput = document.getElementById('statement-start-date');
      const endInput = document.getElementById('statement-end-date');

      if (preset === 'all') {
        startInput.value = '';
        endInput.value = '';
      } else {
        const days = parseInt(preset, 10);
        const end = new Date();
        const start = new Date(end);
        start.setDate(start.getDate() - (days - 1));

        const toISO = (d) =>
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        startInput.value = toISO(start);
        endInput.value = toISO(end);
      }

      if (activePerson) {
        loadStatement();
      }
    });
  });
}

async function fetchCards() {
  try {
    const res = await fetch(API_CARDS);
    if (!res.ok) return;
    const json = await res.json();
    cardsCache = json.data || [];
  } catch (err) {
    console.error('Erro ao buscar cartões:', err);
  }
}

function populateCardsSelect() {
  const select = document.getElementById('debt-card');
  select.innerHTML = '<option value="">Nenhum (usar data de vencimento manual)</option>';

  cardsCache.forEach((card) => {
    const opt = document.createElement('option');
    opt.value = card.id;
    opt.textContent = `${card.name} (Fecha dia ${card.closingDay}, vence dia ${card.dueDay})`;
    select.appendChild(opt);
  });
}

function populatePersonsSelect(selectedId = null) {
  const select = document.getElementById('debt-third-party');
  select.innerHTML = '<option value="">Selecione uma pessoa...</option>';

  persons.forEach((person) => {
    const opt = document.createElement('option');
    opt.value = person.id;
    opt.textContent = person.name;
    if (selectedId && person.id === selectedId) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });
}

async function fetchPersons() {
  try {
    const res = await fetch(`${API_THIRD_PARTIES}?withBalances=true`);
    if (!res.ok) throw new Error('Erro ao carregar lista de pessoas.');
    const json = await res.json();
    persons = json.data || [];

    renderPersons();
    populatePersonsSelect(activePerson ? activePerson.id : null);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderPersons() {
  const container = document.getElementById('persons-container');
  const countEl = document.getElementById('persons-count');

  container.innerHTML = '';

  const isReceivable = currentTab === 'a_receber';

  // Filtra e ordena pessoas conforme a tab
  const filtered = persons.filter((p) => {
    if (isReceivable) {
      return p.totalReceivable > 0 || p.active;
    } else {
      return p.totalPayable > 0 || p.active;
    }
  });

  countEl.textContent = `${filtered.length} ${filtered.length === 1 ? 'pessoa' : 'pessoas'}`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-gray-500 bg-gray-900/50 border border-gray-800 rounded-xl">
        <p class="text-base font-medium text-gray-400">Nenhum registro encontrado para ${isReceivable ? 'A Receber' : 'A Pagar'}.</p>
        <p class="text-xs text-gray-600 mt-1">Clique em "+ Novo Lançamento" para cadastrar.</p>
      </div>
    `;
    return;
  }

  filtered.forEach((person) => {
    const card = document.createElement('article');
    const isSelected = activePerson && activePerson.id === person.id;
    card.className = `person-card ${isSelected ? 'active-card' : ''}`;

    const totalVal = isReceivable ? person.totalReceivable : person.totalPayable;
    const paidVal = isReceivable ? person.paidReceivable : person.paidPayable;
    const pendingVal = isReceivable ? person.pendingReceivable : person.pendingPayable;

    let statusBadge = '';
    if (totalVal === 0) {
      statusBadge = '<span class="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded">Sem lançamentos</span>';
    } else if (pendingVal === 0) {
      statusBadge = '<span class="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20 font-medium">Quitado</span>';
    } else {
      const color = isReceivable ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      statusBadge = `<span class="text-xs ${color} px-2 py-0.5 rounded border font-medium">Pendente</span>`;
    }

    card.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-bold text-gray-100 text-base truncate" title="${escapeHTML(person.name)}">
          ${escapeHTML(person.name)}
        </h3>
        ${statusBadge}
      </div>
      <div class="space-y-1 text-xs text-gray-400">
        <div class="flex justify-between">
          <span>Total ${isReceivable ? 'a receber' : 'a pagar'}:</span>
          <span class="text-gray-200 font-medium">${formatBRL(totalVal)}</span>
        </div>
        <div class="flex justify-between">
          <span>Já liquidado:</span>
          <span class="text-gray-400">${formatBRL(paidVal)}</span>
        </div>
        <div class="flex justify-between pt-1 border-t border-gray-700/60 font-semibold text-sm">
          <span>Saldo Restante:</span>
          <span class="${pendingVal > 0 ? (isReceivable ? 'text-green-400' : 'text-amber-400') : 'text-gray-400'}">
            ${formatBRL(pendingVal)}
          </span>
        </div>
      </div>
      <div class="mt-4 pt-3 border-t border-gray-700/50 flex items-center justify-between text-xs text-gray-500">
        <span>Clique para ver extrato</span>
        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
        </svg>
      </div>
    `;

    card.addEventListener('click', () => {
      selectPerson(person);
    });

    container.appendChild(card);
  });
}

function selectPerson(person) {
  activePerson = person;
  renderPersons();

  const section = document.getElementById('statement-section');
  section.classList.remove('hidden');

  const title = document.getElementById('statement-title');
  title.textContent = `Extrato com ${person.name}`;

  const badge = document.getElementById('statement-badge');
  badge.textContent = currentTab === 'a_receber' ? 'Extrato A Receber (Devedor)' : 'Extrato A Pagar (Credor)';
  badge.className = currentTab === 'a_receber'
    ? 'text-xs uppercase tracking-wider text-green-400 font-semibold'
    : 'text-xs uppercase tracking-wider text-amber-400 font-semibold';

  // Rola até o extrato de forma suave
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });

  loadStatement();
}

function closeStatement() {
  activePerson = null;
  const section = document.getElementById('statement-section');
  section.classList.add('hidden');
  renderPersons();
}

async function loadStatement() {
  if (!activePerson) return;

  const startVal = document.getElementById('statement-start-date').value;
  const endVal = document.getElementById('statement-end-date').value;

  const params = new URLSearchParams();
  params.append('thirdPartyId', activePerson.id);
  params.append('type', currentTab);
  if (startVal) params.append('startDate', startVal);
  if (endVal) params.append('endDate', endVal);

  const tbody = document.getElementById('statement-table-body');
  tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-gray-500">Carregando extrato...</td></tr>`;

  try {
    const res = await fetch(`${API_STATEMENT}?${params.toString()}`);
    if (!res.ok) throw new Error('Erro ao obter extrato.');
    const json = await res.json();
    const statement = json.data;

    renderStatement(statement);
  } catch (err) {
    showToast(err.message, 'error');
    tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-red-400">Falha ao carregar extrato.</td></tr>`;
  }
}

function renderStatement(statement) {
  const summary = statement.summary || {};
  const installments = statement.installments || [];

  document.getElementById('stat-total-amount').textContent = formatBRL(summary.totalAmount);
  document.getElementById('stat-total-paid').textContent = formatBRL(summary.totalPaid);
  document.getElementById('stat-total-pending').textContent = formatBRL(summary.totalPending);

  const tbody = document.getElementById('statement-table-body');
  tbody.innerHTML = '';

  if (installments.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-10 text-center text-gray-500">
          Nenhuma parcela encontrada para o período selecionado.
        </td>
      </tr>
    `;
    return;
  }

  installments.forEach((inst) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-800/50 transition';

    const formattedDueDate = formatDateBR(inst.dueDate);
    const cardInfo = inst.cardName ? escapeHTML(inst.cardName) : '-';

    let statusBadge = '';
    if (inst.paid) {
      const paidDate = inst.paymentDate ? ` em ${formatDateBR(inst.paymentDate)}` : '';
      statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">Pago${paidDate}</span>`;
    } else {
      statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">Pendente</span>`;
    }

    const toggleBtnLabel = inst.paid ? 'Estornar' : 'Dar Baixa';
    const toggleBtnColor = inst.paid
      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
      : 'bg-green-600 hover:bg-green-500 text-white';

    tr.innerHTML = `
      <td class="px-4 py-3 text-gray-200 font-medium">${formattedDueDate}</td>
      <td class="px-4 py-3 text-gray-300 font-medium max-w-xs truncate" title="${escapeHTML(inst.description)}">
        ${escapeHTML(inst.description)}
      </td>
      <td class="px-4 py-3 text-center text-gray-400">${inst.installmentNumber}/${inst.totalInstallments}</td>
      <td class="px-4 py-3 text-right font-semibold text-gray-100">${formatBRL(inst.amount)}</td>
      <td class="px-4 py-3 text-gray-400 text-xs">${cardInfo}</td>
      <td class="px-4 py-3 text-center">${statusBadge}</td>
      <td class="px-4 py-3 text-center">
        <div class="flex items-center justify-center gap-2">
          <button
            type="button"
            class="btn-toggle-payment px-2.5 py-1 text-xs font-medium rounded transition ${toggleBtnColor}"
            data-id="${inst.installmentId}"
            data-paid="${inst.paid}"
          >
            ${toggleBtnLabel}
          </button>
          <button
            type="button"
            class="btn-delete-debt p-1 text-gray-400 hover:text-red-400 rounded transition"
            title="Excluir lançamento completo"
            data-debt-id="${inst.debtId}"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
      </td>
    `;

    // Ação: Baixa / Estorno
    const toggleBtn = tr.querySelector('.btn-toggle-payment');
    toggleBtn.addEventListener('click', async () => {
      const isCurrentlyPaid = toggleBtn.dataset.paid === 'true';
      await toggleInstallmentPayment(inst.installmentId, !isCurrentlyPaid);
    });

    // Ação: Excluir Lançamento
    const deleteBtn = tr.querySelector('.btn-delete-debt');
    deleteBtn.addEventListener('click', () => {
      debtToDeleteId = inst.debtId;
      document.getElementById('modal-confirm-delete').classList.remove('hidden');
    });

    tbody.appendChild(tr);
  });
}

async function toggleInstallmentPayment(installmentId, newPaidState) {
  try {
    const res = await fetch(`${API_DEBTS}/installments/${installmentId}/payment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paid: newPaidState }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao alterar status da parcela.');
    }

    showToast(newPaidState ? 'Parcela baixada com sucesso!' : 'Pagamento estornado com sucesso!');
    await fetchPersons();
    await loadStatement();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function executeDeleteDebt(debtId) {
  try {
    const res = await fetch(`${API_DEBTS}/${debtId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao excluir lançamento.');
    }

    showToast('Lançamento excluído com sucesso!');
    await fetchPersons();
    await loadStatement();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function formatDateBR(isoString) {
  if (!isoString) return '-';
  const clean = String(isoString).slice(0, 10);
  const parts = clean.split('-');
  if (parts.length !== 3) return isoString;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatBRL(cents) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(cents || 0) / 100);
}

function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `fixed bottom-6 right-6 z-[60] px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
    type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
  }`;
  toast.classList.remove('hidden');

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3500);
}

