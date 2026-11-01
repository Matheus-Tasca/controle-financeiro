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

const padWithZero = (value) => String(value).padStart(2, '0');

const getDaysInMonth = (year, monthIndex) =>
  new Date(year, monthIndex + 1, 0).getDate();

/**
 * Constrói uma data de vencimento formatada no padrão YYYY-MM-DD.
 * Se o mês não contiver o dia especificado (ex: 31 de fevereiro),
 * normaliza para o dia 1 do mês subsequente.
 *
 * @param {number} year
 * @param {number} monthIndex 0-11 (pode extrapolar; é normalizado pelo Date)
 * @param {number} dueDay 1-31
 * @returns {string} YYYY-MM-DD
 */
export function buildDueDate(year, monthIndex, dueDay) {
  const normalizedDate = new Date(year, monthIndex, 1);
  let resolvedYear = normalizedDate.getFullYear();
  let resolvedMonthIndex = normalizedDate.getMonth();
  let resolvedDay = dueDay;

  const totalDaysInCurrentMonth = getDaysInMonth(resolvedYear, resolvedMonthIndex);
  if (dueDay > totalDaysInCurrentMonth) {
    resolvedDay = 1;
    resolvedMonthIndex += 1;
    if (resolvedMonthIndex > 11) {
      resolvedMonthIndex = 0;
      resolvedYear += 1;
    }
  }

  const formattedMonth = padWithZero(resolvedMonthIndex + 1);
  const formattedDay = padWithZero(resolvedDay);
  return `${resolvedYear}-${formattedMonth}-${formattedDay}`;
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
  const [year, month, purchaseDay] = String(transactionDate)
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

  const installmentDueDates = [];
  for (let installmentIndex = 0; installmentIndex < totalInstallments; installmentIndex++) {
    const dueDate = buildDueDate(
      year,
      firstInstallmentMonthIndex + installmentIndex,
      dueDay
    );
    installmentDueDates.push(dueDate);
  }

  return installmentDueDates;
}

/**
 * @returns {string} data de hoje (local) em YYYY-MM-DD
 */
export function todayAsString() {
  const now = new Date();
  return `${now.getFullYear()}-${padWithZero(now.getMonth() + 1)}-${padWithZero(now.getDate())}`;
}

/**
 * Converte um valor de coluna `date` (string ou Date) para YYYY-MM-DD.
 * @param {string|Date} value
 * @returns {string} YYYY-MM-DD
 */
export function toDateString(value) {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${padWithZero(value.getMonth() + 1)}-${padWithZero(value.getDate())}`;
  }
  return String(value || '').slice(0, 10);
}

/**
 * Valida se o valor é um dia inteiro entre 1 e 31.
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidDay(value) {
  const parsedDayNumber = Number(value);
  return Number.isInteger(parsedDayNumber) && parsedDayNumber >= 1 && parsedDayNumber <= 31;
}
