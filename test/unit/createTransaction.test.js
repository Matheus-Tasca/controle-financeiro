import test from 'node:test';
import assert from 'node:assert/strict';
import { CreateTransactionUseCase } from '../../src/domains/financial/useCases/CreateTransaction.js';

const input = {
  userId: 'user-a',
  description: 'Compra de teste',
  categoryId: 'category-a',
  transactionType: 'saida',
  date: '2028-01-20',
  paymentMethodId: 'cartao_credito',
  cardId: 'card-a',
  installment: { amount: 1000, totalInstallments: 3 },
};

test('cria parcelas em centavos com soma preservada e datas corretas', async () => {
  let saved;
  const transactionRepository = {
    categoryBelongsToUser: async () => true,
    cardBelongsToUser: async () => true,
    createWithInstallments: async (transaction, installments) => {
      saved = { transaction, installments };
      return transaction;
    },
  };
  const cardRepository = {
    findDateInformationByCardId: async () => ({ closingDay: 25, dueDay: 31 }),
  };
  const useCase = new CreateTransactionUseCase(
    transactionRepository,
    cardRepository
  );

  await useCase.execute(input);

  assert.equal(saved.transaction.userId, 'user-a');
  assert.deepEqual(
    saved.installments.map(({ amount }) => amount),
    [334, 333, 333]
  );
  assert.equal(
    saved.installments.reduce((sum, item) => sum + item.amount, 0),
    1000
  );
  assert.deepEqual(
    saved.installments.map(({ dueDate }) => dueDate),
    ['2028-01-31', '2028-03-01', '2028-03-31']
  );
});

test('rejeita categoria ou cartão pertencente a outro usuário', async () => {
  const transactionRepository = {
    categoryBelongsToUser: async () => false,
    cardBelongsToUser: async () => false,
  };
  const useCase = new CreateTransactionUseCase(transactionRepository, {
    findDateInformationByCardId: async () => null,
  });

  await assert.rejects(useCase.execute(input), /Entry category not found/);
});

test('rejeita campos obrigatórios ausentes e propaga falha de persistência', async () => {
  const validRepositories = {
    categoryBelongsToUser: async () => true,
    cardBelongsToUser: async () => true,
  };
  const useCase = new CreateTransactionUseCase(validRepositories, {
    findDateInformationByCardId: async () => ({ closingDay: 25, dueDay: 10 }),
  });

  await assert.rejects(
    useCase.execute({ ...input, categoryId: undefined }),
    /required data is missing/
  );

  const failingUseCase = new CreateTransactionUseCase(
    {
      ...validRepositories,
      createWithInstallments: async () => {
        throw new Error('database unavailable');
      },
    },
    {
      findDateInformationByCardId: async () => ({ closingDay: 25, dueDay: 10 }),
    }
  );
  await assert.rejects(
    failingUseCase.execute(input),
    /Failed to create transaction and installments/
  );
});
