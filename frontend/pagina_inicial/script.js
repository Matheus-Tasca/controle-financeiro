document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  fetchDashboardData();
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

async function fetchDashboardData() {
  const API_URL = window.API_BASE_URL;

  const API_ROUTE_SUMMARY = `${API_URL}/financial/dashboard`;
  const API_ROUTE_TOP_CATEGORIES = `${API_URL}/financial/dashboard/top-categories`;

  try {
    const responseSummary = await fetch(API_ROUTE_SUMMARY);
    const dataSummary = await responseSummary.json();
    console.log(dataSummary);

    const responseCategories = await fetch(API_ROUTE_TOP_CATEGORIES);
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

  if (totalIncomesEl) totalIncomesEl.textContent = formatBRL(data.incomes);
  if (totalExpensesEl) totalExpensesEl.textContent = formatBRL(data.expenses);

  if (totalBalanceEl) {
    const balance = data.incomes - data.expenses;
    totalBalanceEl.textContent = formatBRL(balance);

    if (balance < 0) {
      totalBalanceEl.classList.remove('text-white');
      totalBalanceEl.classList.add('text-red-400');
      return;
    }
    totalBalanceEl.classList.remove('text-white');
    totalBalanceEl.classList.add('text-green-400');
  }
}

function updateCategoriesTable(categories) {
  const tbody = document.getElementById('categories-table-body');
  if (!tbody) return;

  if (!categories || categories.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="2" class="py-6 text-center text-gray-500 border-t border-gray-700">
                    Nenhum gasto registrado nos últimos 30 dias.
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
