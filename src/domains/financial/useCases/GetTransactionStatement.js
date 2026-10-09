export class GetTransactionStatement {
  constructor(repository) {
    this.repository = repository;
  }

  async execute({ startDate, endDate, userId }) {
    const rows = await this.repository.getStatementInstallments(
      startDate,
      endDate,
      userId
    );

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
    }));

    const summary = transactions.reduce(
      (totals, transaction) => {
        if (transaction.transactionType === 'entrada') {
          totals.incomes += transaction.amount;
        } else if (transaction.transactionType === 'saida') {
          totals.expenses += transaction.amount;
        }
        return totals;
      },
      { incomes: 0, expenses: 0 }
    );
    summary.balance = summary.incomes - summary.expenses;

    const dailyExpenses = new Map();
    for (const transaction of transactions) {
      if (transaction.transactionType !== 'saida') continue;
      dailyExpenses.set(
        transaction.dueDate,
        (dailyExpenses.get(transaction.dueDate) || 0) + transaction.amount
      );
    }

    return {
      startDate,
      endDate,
      summary,
      transactions,
      dailyExpenses: [...dailyExpenses.entries()].map(([date, amount]) => ({
        date,
        amount,
      })),
    };
  }
}

function toDateString(value) {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(value || '').slice(0, 10);
}
