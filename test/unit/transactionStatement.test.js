import test from 'node:test';
import assert from 'node:assert/strict';
import { GetTransactionStatement } from '../../src/domains/financial/useCases/GetTransactionStatement.js';

test('monta resumo, saldo e despesas diárias em centavos', async () => {
  const rows = [
    {
      transactionId: 't1',
      installmentId: 'i1',
      transactionType: 'entrada',
      transactionDate: new Date(2026, 0, 3),
      dueDate: new Date(2026, 0, 3),
      amount: '10000',
      installmentNumber: '1',
      totalInstallments: '1',
    },
    {
      transactionId: 't2',
      installmentId: 'i2',
      transactionType: 'saida',
      transactionDate: '2026-01-04',
      dueDate: '2026-01-04',
      amount: '2500',
      installmentNumber: '1',
      totalInstallments: '1',
    },
    {
      transactionId: 't3',
      installmentId: 'i3',
      transactionType: 'saida',
      transactionDate: '2026-01-04',
      dueDate: '2026-01-04',
      amount: 500,
      installmentNumber: 1,
      totalInstallments: 1,
    },
  ];
  const useCase = new GetTransactionStatement({
    getStatementInstallments: async (startDate, endDate, userId) => {
      assert.equal(startDate, '2026-01-01');
      assert.equal(endDate, '2026-01-31');
      assert.equal(userId, 'user-a');
      return rows;
    },
  });

  const result = await useCase.execute({
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    userId: 'user-a',
  });

  assert.deepEqual(result.summary, {
    incomes: 10000,
    expenses: 3000,
    balance: 7000,
  });
  assert.deepEqual(result.dailyExpenses, [
    { date: '2026-01-04', amount: 3000 },
  ]);
  assert.equal(result.transactions[0].transactionDate, '2026-01-03');
});

test('retorna totais zerados para extrato vazio', async () => {
  const useCase = new GetTransactionStatement({
    getStatementInstallments: async () => [],
  });
  const result = await useCase.execute({
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    userId: 'user-a',
  });

  assert.deepEqual(result.summary, { incomes: 0, expenses: 0, balance: 0 });
  assert.deepEqual(result.transactions, []);
  assert.deepEqual(result.dailyExpenses, []);
});
