import test from 'node:test';
import assert from 'node:assert/strict';
import { DeleteTransactionUseCase } from '../../src/domains/financial/useCases/DeleteTransactionUseCase.js';

test('DeleteTransactionUseCase exige id da transação', async () => {
  const useCase = new DeleteTransactionUseCase({});
  await assert.rejects(
    () => useCase.execute('', 'user-1'),
    /Transaction ID is required/
  );
});

test('DeleteTransactionUseCase rejeita transação inexistente ou de outro usuário', async () => {
  const repository = {
    findById: async (id, userId) => {
      assert.equal(id, 'trans-999');
      assert.equal(userId, 'user-1');
      return null;
    },
  };
  const useCase = new DeleteTransactionUseCase(repository);
  await assert.rejects(
    () => useCase.execute('trans-999', 'user-1'),
    /Transaction not found/
  );
});

test('DeleteTransactionUseCase remove transação existente do usuário', async () => {
  let deletedArgs;
  const repository = {
    findById: async (id, userId) => {
      assert.equal(id, 'trans-123');
      assert.equal(userId, 'user-1');
      return { id: 'trans-123', userId: 'user-1' };
    },
    delete: async (id, userId) => {
      deletedArgs = { id, userId };
    },
  };

  const useCase = new DeleteTransactionUseCase(repository);
  await useCase.execute('trans-123', 'user-1');

  assert.deepEqual(deletedArgs, { id: 'trans-123', userId: 'user-1' });
});

