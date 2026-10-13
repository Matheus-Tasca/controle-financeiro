import test from 'node:test';
import assert from 'node:assert/strict';
import { GetDashboardUseCase } from '../../src/domains/financial/useCases/GetDashboard.js';
import { GetTopCategories } from '../../src/domains/financial/useCases/GetTopCategories.js';

test('GetDashboardUseCase repassa userId, startDate e endDate para o repositório', async () => {
  let capturedIncomesArgs;
  let capturedExpensesArgs;

  const fakeRepository = {
    getDashboardIncomes: async (userId, startDate, endDate) => {
      capturedIncomesArgs = { userId, startDate, endDate };
      return 150000;
    },
    getDashboardExpenses: async (userId, startDate, endDate) => {
      capturedExpensesArgs = { userId, startDate, endDate };
      return 80000;
    },
  };

  const useCase = new GetDashboardUseCase(fakeRepository);
  const result = await useCase.execute({
    userId: 'user-123',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
  });

  assert.deepEqual(capturedIncomesArgs, {
    userId: 'user-123',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
  });
  assert.deepEqual(capturedExpensesArgs, {
    userId: 'user-123',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
  });
  assert.deepEqual(result, {
    incomes: 150000,
    expenses: 80000,
  });
});

test('GetDashboardUseCase mantém compatibilidade com userId passado como string', async () => {
  const fakeRepository = {
    getDashboardIncomes: async (userId, startDate, endDate) => {
      assert.equal(userId, 'user-legacy');
      assert.equal(startDate, undefined);
      assert.equal(endDate, undefined);
      return 5000;
    },
    getDashboardExpenses: async (userId, startDate, endDate) => {
      assert.equal(userId, 'user-legacy');
      assert.equal(startDate, undefined);
      assert.equal(endDate, undefined);
      return 2000;
    },
  };

  const useCase = new GetDashboardUseCase(fakeRepository);
  const result = await useCase.execute('user-legacy');

  assert.deepEqual(result, {
    incomes: 5000,
    expenses: 2000,
  });
});

test('GetTopCategories repassa userId, startDate e endDate para o repositório', async () => {
  const fakeRepository = {
    getTopCategories: async (userId, startDate, endDate) => {
      assert.equal(userId, 'user-123');
      assert.equal(startDate, '2026-10-01');
      assert.equal(endDate, '2026-10-31');
      return [
        { nome: 'Alimentação', total: 45000 },
        { nome: 'Transporte', total: 20000 },
      ];
    },
  };

  const useCase = new GetTopCategories(fakeRepository);
  const result = await useCase.execute({
    userId: 'user-123',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
  });

  assert.deepEqual(result, [
    { nome: 'Alimentação', total: 45000 },
    { nome: 'Transporte', total: 20000 },
  ]);
});

test('GetTopCategories mantém compatibilidade com userId string', async () => {
  const fakeRepository = {
    getTopCategories: async (userId, startDate, endDate) => {
      assert.equal(userId, 'user-legacy');
      assert.equal(startDate, undefined);
      assert.equal(endDate, undefined);
      return [{ nome: 'Saúde', total: 10000 }];
    },
  };

  const useCase = new GetTopCategories(fakeRepository);
  const result = await useCase.execute('user-legacy');

  assert.deepEqual(result, [{ nome: 'Saúde', total: 10000 }]);
});

