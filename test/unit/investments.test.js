import test from 'node:test';
import assert from 'node:assert/strict';
import { CreateInvestmentBankUseCase } from '../../src/domains/financial/useCases/CreateInvestmentBank.js';
import { UpdateInvestmentBankUseCase } from '../../src/domains/financial/useCases/UpdateInvestmentBank.js';
import { DeleteInvestmentBankUseCase } from '../../src/domains/financial/useCases/DeleteInvestmentBank.js';
import { CreateInvestmentMovementUseCase } from '../../src/domains/financial/useCases/CreateInvestmentMovement.js';
import { GetInvestmentsSummaryUseCase } from '../../src/domains/financial/useCases/GetInvestmentsSummary.js';

test('CreateInvestmentBankUseCase exige nome do banco', async () => {
  const useCase = new CreateInvestmentBankUseCase({}, {});
  await assert.rejects(
    () => useCase.execute({ userId: 'u1', name: '' }),
    /Bank name is required/
  );
});

test('CreateInvestmentBankUseCase rejeita banco com nome duplicado', async () => {
  const bankRepo = {
    findByName: async () => ({ id: 'b1', name: 'XP' }),
  };
  const useCase = new CreateInvestmentBankUseCase(bankRepo, {});
  await assert.rejects(
    () => useCase.execute({ userId: 'u1', name: 'XP' }),
    /Bank with this name already exists/
  );
});

test('CreateInvestmentBankUseCase cria banco e registra aporte de saldo inicial', async () => {
  let savedBank;
  let savedMovement;
  const bankRepo = {
    findByName: async () => null,
    save: async (bank) => {
      savedBank = bank;
      return bank;
    },
  };
  const movementRepo = {
    save: async (movement) => {
      savedMovement = movement;
      return movement;
    },
  };

  const useCase = new CreateInvestmentBankUseCase(bankRepo, movementRepo);
  const result = await useCase.execute({
    userId: 'u1',
    name: 'Nubank',
    initialBalance: 50000,
  });

  assert.equal(result.name, 'Nubank');
  assert.equal(savedBank.currentBalance, 50000);
  assert.equal(savedBank.active, true);
  assert.equal(savedMovement.type, 'aporte');
  assert.equal(savedMovement.amount, 50000);
  assert.equal(savedMovement.previousBalance, 0);
  assert.equal(savedMovement.newBalance, 50000);
});

test('UpdateInvestmentBankUseCase atualiza nome e status ativo', async () => {
  const existing = {
    id: 'b1',
    userId: 'u1',
    name: 'Inter',
    active: true,
  };
  const bankRepo = {
    findById: async () => existing,
    findByName: async () => null,
    save: async (bank) => bank,
  };

  const useCase = new UpdateInvestmentBankUseCase(bankRepo);
  const updated = await useCase.execute({
    id: 'b1',
    userId: 'u1',
    name: 'Banco Inter',
    active: false,
  });

  assert.equal(updated.name, 'Banco Inter');
  assert.equal(updated.active, false);
});

test('DeleteInvestmentBankUseCase desativa banco (soft delete)', async () => {
  let deactivatedId;
  const bankRepo = {
    findById: async () => ({ id: 'b1', userId: 'u1' }),
    deactivate: async (id) => {
      deactivatedId = id;
    },
  };

  const useCase = new DeleteInvestmentBankUseCase(bankRepo);
  await useCase.execute('b1', 'u1');
  assert.equal(deactivatedId, 'b1');
});

test('CreateInvestmentMovementUseCase processa aporte substituindo o saldo total', async () => {
  let updatedBalance;
  let savedMovement;
  const bankRepo = {
    findById: async () => ({
      id: 'b1',
      userId: 'u1',
      name: 'XP',
      currentBalance: 10000,
    }),
    updateBalance: async (id, userId, newBal) => {
      updatedBalance = newBal;
    },
  };
  const movementRepo = {
    save: async (movement) => {
      savedMovement = movement;
      return movement;
    },
  };

  const useCase = new CreateInvestmentMovementUseCase(bankRepo, movementRepo);
  const result = await useCase.execute({
    userId: 'u1',
    bankId: 'b1',
    type: 'aporte',
    newBalance: 25000,
    date: '2026-10-28',
  });

  assert.equal(updatedBalance, 25000);
  assert.equal(result.bank.currentBalance, 25000);
  assert.equal(savedMovement.type, 'aporte');
  assert.equal(savedMovement.previousBalance, 10000);
  assert.equal(savedMovement.newBalance, 25000);
  assert.equal(savedMovement.amount, 15000);
});

test('CreateInvestmentMovementUseCase processa retirada subtraindo do saldo', async () => {
  let updatedBalance;
  let savedMovement;
  const bankRepo = {
    findById: async () => ({
      id: 'b1',
      userId: 'u1',
      name: 'XP',
      currentBalance: 25000,
    }),
    updateBalance: async (id, userId, newBal) => {
      updatedBalance = newBal;
    },
  };
  const movementRepo = {
    save: async (movement) => {
      savedMovement = movement;
      return movement;
    },
  };

  const useCase = new CreateInvestmentMovementUseCase(bankRepo, movementRepo);
  const result = await useCase.execute({
    userId: 'u1',
    bankId: 'b1',
    type: 'retirada',
    amount: 5000,
    date: '2026-10-28',
  });

  assert.equal(updatedBalance, 20000);
  assert.equal(result.bank.currentBalance, 20000);
  assert.equal(savedMovement.type, 'retirada');
  assert.equal(savedMovement.previousBalance, 25000);
  assert.equal(savedMovement.newBalance, 20000);
  assert.equal(savedMovement.amount, 5000);
});

test('CreateInvestmentMovementUseCase rejeita retirada com saldo insuficiente', async () => {
  const bankRepo = {
    findById: async () => ({
      id: 'b1',
      userId: 'u1',
      name: 'XP',
      currentBalance: 5000,
    }),
  };

  const useCase = new CreateInvestmentMovementUseCase(bankRepo, {});
  await assert.rejects(
    () =>
      useCase.execute({
        userId: 'u1',
        bankId: 'b1',
        type: 'retirada',
        amount: 10000,
      }),
    /Saldo insuficiente para realizar a retirada/
  );
});

test('GetInvestmentsSummaryUseCase calcula histórico acumulado mês a mês por banco e geral', async () => {
  const bankRepo = {
    findAll: async () => [
      { id: 'b1', name: 'XP', currentBalance: 20000, active: true },
      { id: 'b2', name: 'Nubank', currentBalance: 15000, active: true },
    ],
  };

  const movementRepo = {
    findAllUpToDate: async () => [
      {
        bankId: 'b1',
        date: '2026-08-15',
        newBalance: 10000,
      },
      {
        bankId: 'b2',
        date: '2026-08-20',
        newBalance: 5000,
      },
      {
        bankId: 'b1',
        date: '2026-09-10',
        newBalance: 20000,
      },
      {
        bankId: 'b2',
        date: '2026-10-05',
        newBalance: 15000,
      },
    ],
  };

  const useCase = new GetInvestmentsSummaryUseCase(bankRepo, movementRepo);
  const summary = await useCase.execute({
    userId: 'u1',
    startDate: '2026-08-01',
    endDate: '2026-10-28',
  });

  assert.equal(summary.totalCurrentBalance, 35000);
  assert.equal(summary.banks.length, 2);
  assert.equal(summary.totalMonthlyEvolution.length, 3);

  // Agosto: XP (10000) + Nubank (5000) = 15000
  assert.equal(summary.totalMonthlyEvolution[0].month, '2026-08');
  assert.equal(summary.totalMonthlyEvolution[0].totalBalance, 15000);

  // Setembro: XP (20000) + Nubank (5000 carreado) = 25000
  assert.equal(summary.totalMonthlyEvolution[1].month, '2026-09');
  assert.equal(summary.totalMonthlyEvolution[1].totalBalance, 25000);

  // Outubro: XP (20000 carreado) + Nubank (15000) = 35000
  assert.equal(summary.totalMonthlyEvolution[2].month, '2026-10');
  assert.equal(summary.totalMonthlyEvolution[2].totalBalance, 35000);

  // Histórico individual da XP
  const xpHps = summary.bankMonthlyEvolution['b1'].history;
  assert.equal(xpHps[0].balance, 10000);
  assert.equal(xpHps[1].balance, 20000);
  assert.equal(xpHps[2].balance, 20000);
});

