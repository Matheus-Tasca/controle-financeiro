import { toDateString } from '../utils/installmentDates.js';

export class GetTransactionStatement {
  constructor(repository) {
    this.repository = repository;
  }

  async execute({ startDate, endDate, userId }) {
    const rawInstallments = await this.repository.getStatementInstallments(
      startDate,
      endDate,
      userId
    );

    const transactions = rawInstallments.map((record) => ({
      transactionId: record.transactionId,
      installmentId: record.installmentId,
      description: record.description || '',
      transactionType: record.transactionType,
      transactionDate: toDateString(record.transactionDate),
      dueDate: toDateString(record.dueDate),
      amount: Number(record.amount),
      installmentNumber: Number(record.installmentNumber),
      totalInstallments: Number(record.totalInstallments),
      cardName: record.cardName || null,
      categoryId: record.categoryId || null,
      paymentMethodId: record.paymentMethodId || null,
      cardId: record.cardId || null,
    const transactions = rows.map((row) => ({
      transactionId: row.transactionId,
      installmentId: row.installmentId,
      description: row.description || '',
      transactionType: row.transactionType,
      transactionDate: toDateString(row.transactionDate),
      dueDate: toDateString(row.dueDate),
      amount: Number(row.amount),
      installmentNumber: Number(row.installmentNumber),
      totalInstallments: Number(row.totalInstallments),
      cardName: row.cardName || null,
      categoryName: row.categoryName || null,
      categoryId: row.categoryId || null,
      paymentMethodId: row.paymentMethodId || null,
      cardId: row.cardId || null,
    }));

    const summary = transactions.reduce(
      (financialTotals, transaction) => {
        if (transaction.transactionType === 'entrada') {
          financialTotals.incomes += transaction.amount;
        } else if (transaction.transactionType === 'saida') {
          financialTotals.expenses += transaction.amount;
        }
        return financialTotals;
      },
      { incomes: 0, expenses: 0 }
    );
    summary.balance = summary.incomes - summary.expenses;

    const dailyExpensesMap = new Map();
    for (const transaction of transactions) {
      if (transaction.transactionType !== 'saida') {
        continue;
      }
      const currentDailyTotal = dailyExpensesMap.get(transaction.dueDate) || 0;
      dailyExpensesMap.set(
        transaction.dueDate,
        currentDailyTotal + transaction.amount
      );
    }

    const dailyExpenses = Array.from(
      dailyExpensesMap.entries(),
      ([date, amount]) => ({
        date,
        amount,
      })
    );

    return {
      startDate,
      endDate,
      summary,
      transactions,
      dailyExpenses,
    };
  }
}
