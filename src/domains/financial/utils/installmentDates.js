/**
 * Utilitários de datas para parcelas de cartão de crédito.
 *
 * Regras:
 * - Se o dia de vencimento for menor que o dia de fechamento, a fatura vence
 *   no mês seguinte ao do fechamento (+1 mês).
 * - Se o dia da compra for maior que o dia de fechamento, a compra entra
 *   na fatura seguinte (+1 mês).
 * - Cada parcela seguinte vence um mês após a anterior.
 * - Se o mês não possuir o dia de vencimento (ex.: dia 31 em fevereiro),
 *   o vencimento é jogado para o dia 1 do mês seguinte.
 */

const pad = (value) => String(value).padStart(2, '0');

const daysInMonth = (year, monthIndex) =>
  new Date(year, monthIndex + 1, 0).getDate();

/**
 * @param {number} year
 * @param {number} monthIndex 0-11 (pode extrapolar; é normalizado)
 * @param {number} dueDay 1-31
 * @returns {string} YYYY-MM-DD
 */
export function buildDueDate(year, monthIndex, dueDay) {
  const normalized = new Date(year, monthIndex, 1);
  let y = normalized.getFullYear();
  let m = normalized.getMonth();
  let d = dueDay;

  if (dueDay > daysInMonth(y, m)) {
    d = 1;
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }

  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

/**
 * Calcula as datas de vencimento de todas as parcelas de uma compra no cartão.
 *
 * @param {Object} params
 * @param {string} params.transactionDate YYYY-MM-DD
 * @param {number} params.closingDay
 * @param {number} params.dueDay
 * @param {number} params.totalInstallments
 * @returns {string[]} datas YYYY-MM-DD, índice 0 = parcela 1
 */
export function calculateInstallmentDueDates({
  transactionDate,
  closingDay,
  dueDay,
  totalInstallments,
}) {
  const [year, month, day] = String(transactionDate)
    .slice(0, 10)
    .split('-')
    .map(Number);

  let firstMonthIndex = month - 1;
  if (dueDay < closingDay) {
    firstMonthIndex += 1;
  }
  if (day > closingDay) {
    firstMonthIndex += 1;
  }

  const dates = [];
  for (let i = 0; i < totalInstallments; i++) {
    dates.push(buildDueDate(year, firstMonthIndex + i, dueDay));
  }
  return dates;
}

/**
 * @returns {string} data de hoje (local) em YYYY-MM-DD
 */
export function todayAsString() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Converte um valor de coluna `date` (string ou Date) para YYYY-MM-DD.
 * @param {string|Date} value
 */
export function toDateString(value) {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  return String(value).slice(0, 10);
}

/**
 * Valida se o valor é um dia inteiro entre 1 e 31.
 * @param {unknown} value
 */
export function isValidDay(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 31;
}
