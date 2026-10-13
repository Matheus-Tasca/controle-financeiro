import test from 'node:test';
import assert from 'node:assert/strict';
import { UpdateTransactionUseCase } from '../../src/domains/financial/useCases/UpdateTransaction.js';

test('UpdateTransactionUseCase exige id da transação', async () => {
  const useCase = new UpdateTransactionUseCase({});
  await assert.rejects(
    () => useCase.execute({ id: '', userId: 'user-1' }),
    /Transaction ID is required/
  );
});

test('UpdateTransactionUseCase rejeita transação inexistente', async () => {
  const repository = {
    findById: async () => null,
  };
  const useCase = new UpdateTransactionUseCase(repository);
  await assert.rejects(
    () => useCase.execute({ id: 'trans-1', userId: 'user-1' }),
    /Transaction not found/
  );
});

test('UpdateTransactionUseCase rejeita categoria pertencente a outro usuário', async () => {
  const repository = {
    findById: async () => ({ id: 'trans-1', userId: 'user-1' }),
    categoryBelongsToUser: async () => false,
  };
  const useCase = new UpdateTransactionUseCase(repository);
  await assert.rejects(
    () =>
      useCase.execute({
        id: 'trans-1',
        userId: 'user-1',
        categoryId: 'cat-foreign',
      }),
    /Entry category not found/
  );
});

test('UpdateTransactionUseCase rejeita cartão pertencente a outro usuário', async () => {
  const repository = {
    findById: async () => ({ id: 'trans-1', userId: 'user-1' }),
    categoryBelongsToUser: async () => true,
    cardBelongsToUser: async () => false,
  };
  const useCase = new UpdateTransactionUseCase(repository);
  await assert.rejects(
    () =>
      useCase.execute({
        id: 'trans-1',
        userId: 'user-1',
        cardId: 'card-foreign',
      }),
    /Card not found/
  );
});

test('UpdateTransactionUseCase atualiza campos e sincroniza parcela única', async () => {
  let savedTransaction;
  const repository = {
    findById: async () => ({
      id: 'trans-1',
      userId: 'user-1',
      description: 'Antiga',
      transactionType: 'saida',
      date: new Date('2026-10-01'),
      installment: [
        {
          installmentId: 'inst-1',
          amount: 5000,
          dueDate: new Date('2026-10-01'),
        },
      ],
    }),
    categoryBelongsToUser: async () => true,
    cardBelongsToUser: async () => true,
    save: async (transaction) => {
      savedTransaction = transaction;
      return transaction;
    },
  };

  const useCase = new UpdateTransactionUseCase(repository);
  await useCase.execute({
    id: 'trans-1',
    userId: 'user-1',
    description: 'Nova descrição',
    transactionType: 'entrada',
    date: '2026-10-15',
    amount: 7500,
  });

  assert.equal(savedTransaction.description, 'Nova descrição');
  assert.equal(savedTransaction.transactionType, 'entrada');
  assert.equal(savedTransaction.installment[0].amount, 7500);
  assert.equal(
    savedTransaction.installment[0].dueDate.toISOString().slice(0, 10),
    '2026-10-15'
  );
});

