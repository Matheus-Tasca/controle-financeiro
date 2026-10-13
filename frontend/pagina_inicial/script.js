let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth(); // 0 a 11

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initMonthNavigation();
  loadDashboardData();
});

function initMobileMenu() {
  const btnOpen = document.getElementById('mobile-menu-btn');
  const btnClose = document.getElementById('close-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  if (btnOpen && btnClose && mobileMenu) {
    btnOpen.addEventListener('click', () => {
      mobileMenu.classList.remove('translate-x-full');
    });

    btnClose.addEventListener('click', () => {
      mobileMenu.classList.add('translate-x-full');
    });
  }
}

function initMonthNavigation() {
  const prevBtn = document.getElementById('prev-month-btn');
  const nextBtn = document.getElementById('next-month-btn');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      changeMonth(-1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      changeMonth(1);
    });
  }
}

function changeMonth(delta) {
  currentMonth += delta;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear -= 1;
  } else if (currentMonth > 11) {
    currentMonth = 0;
    currentYear += 1;
  }
  loadDashboardData();
}

function getMonthDateRange(year, month) {
  const pad = (n) => String(n).padStart(2, '0');
  const startDate = `${year}-${pad(month + 1)}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${pad(month + 1)}-${pad(lastDay)}`;
  return { startDate, endDate, lastDay };
}

function updateMonthHeader(year, month, lastDay) {
  const titleEl = document.getElementById('current-month-title');
  const periodEl = document.getElementById('current-period-dates');

  const date = new Date(year, month, 1);
  const monthName = date.toLocaleDateString('pt-BR', { month: 'long' });
  const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  if (titleEl) {
    titleEl.textContent = `${capitalized} de ${year}`;
  }

  if (periodEl) {
    const pad = (n) => String(n).padStart(2, '0');
    periodEl.textContent = `01/${pad(month + 1)}/${year} a ${pad(lastDay)}/${pad(month + 1)}/${year}`;
  }
}

async function loadDashboardData() {
  const { startDate, endDate, lastDay } = getMonthDateRange(
    currentYear,
    currentMonth
  );
  updateMonthHeader(currentYear, currentMonth, lastDay);

  const API_URL = window.API_BASE_URL;
  const API_ROUTE_SUMMARY = `${API_URL}/financial/dashboard?startDate=${startDate}&endDate=${endDate}`;
  const API_ROUTE_TOP_CATEGORIES = `${API_URL}/financial/dashboard/top-categories?startDate=${startDate}&endDate=${endDate}`;

  try {
    const [responseSummary, responseCategories] = await Promise.all([
      fetch(API_ROUTE_SUMMARY),
      fetch(API_ROUTE_TOP_CATEGORIES),
    ]);

    if (!responseSummary.ok || !responseCategories.ok) {
      throw new Error('Falha ao obter os dados do painel');
    }

    const dataSummary = await responseSummary.json();
    const dataCategories = await responseCategories.json();

    updateSummaryCards(dataSummary);
    updateCategoriesTable(dataCategories);
  } catch (error) {
    console.error('Erro ao buscar os dados da API:', error);

    const tbody = document.getElementById('categories-table-body');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="2" class="py-6 text-center text-red-500 border-t border-gray-700">
            Ocorreu um erro ao buscar os dados. Tente novamente mais tarde.
          </td>
        </tr>
      `;
    }
  }
}

function updateSummaryCards(data) {
  const totalIncomesEl = document.getElementById('total-incomes');
  const totalExpensesEl = document.getElementById('total-expenses');
  const totalBalanceEl = document.getElementById('total-balance');

  const incomes = Number(data?.incomes || 0);
  const expenses = Number(data?.expenses || 0);
  const balance = incomes - expenses;

  if (totalIncomesEl) totalIncomesEl.textContent = formatBRL(incomes);
  if (totalExpensesEl) totalExpensesEl.textContent = formatBRL(expenses);

  if (totalBalanceEl) {
    totalBalanceEl.textContent = formatBRL(balance);

    totalBalanceEl.classList.remove(
      'text-white',
      'text-red-400',
      'text-green-400'
    );
    if (balance < 0) {
      totalBalanceEl.classList.add('text-red-400');
    } else {
      totalBalanceEl.classList.add('text-green-400');
    }
  }
}

function updateCategoriesTable(categories) {
  const tbody = document.getElementById('categories-table-body');
  if (!tbody) return;

  if (!categories || categories.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="2" class="py-6 text-center text-gray-500 border-t border-gray-700">
          Nenhum gasto registrado no mês selecionado.
        </td>
      </tr>
    `;
    return;
  }

  tbody.replaceChildren(
    ...categories.map((category) => {
      const row = document.createElement('tr');
      row.className = 'transition-colors duration-200';

      const nameCell = document.createElement('td');
      nameCell.className =
        'py-4 text-center text-gray-300 font-medium border-t border-gray-700';
      nameCell.textContent = String(category.nome ?? '');

      const totalCell = document.createElement('td');
      totalCell.className =
        'py-4 text-center text-gray-300 border-t border-l border-gray-700';
      totalCell.textContent = formatBRL(category.total);

      row.append(nameCell, totalCell);
      return row;
    })
  );
}

function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0) / 100);
}
