import test from 'node:test';
import assert from 'node:assert/strict';
import { UpdateCardUseCase } from '../../src/domains/financial/useCases/UpdateCard.js';

test('UpdateCardUseCase exige id do cartão', async () => {
  const useCase = new UpdateCardUseCase({});
  await assert.rejects(
    () => useCase.execute({ id: '', userId: 'user-1' }),
    /Card ID is required/
  );
});

test('UpdateCardUseCase rejeita cartão inexistente', async () => {
  const repository = {
    findById: async () => null,
  };
  const useCase = new UpdateCardUseCase(repository);
  await assert.rejects(
    () => useCase.execute({ id: 'card-1', userId: 'user-1' }),
    /Card not found/
  );
});

test('UpdateCardUseCase rejeita nome de cartão já em uso', async () => {
  const repository = {
    findById: async () => ({ id: 'card-1', userId: 'user-1', name: 'Nubank' }),
    findByName: async () => ({ id: 'card-2', userId: 'user-1', name: 'Inter' }),
  };
  const useCase = new UpdateCardUseCase(repository);
  await assert.rejects(
    () => useCase.execute({ id: 'card-1', userId: 'user-1', name: 'Inter' }),
    /Card name already in use/
  );
});

test('UpdateCardUseCase reativa cartão inativo com active true', async () => {
  let savedCard;
  const repository = {
    findById: async () => ({
      id: 'card-1',
      userId: 'user-1',
      name: 'Nubank',
      closingDay: 5,
      dueDay: 12,
      active: false,
    }),
    save: async (card) => {
      savedCard = card;
      return card;
    },
  };

  const useCase = new UpdateCardUseCase(repository);
  const result = await useCase.execute({
    id: 'card-1',
    userId: 'user-1',
    active: true,
  });

  assert.equal(result.active, true);
  assert.equal(savedCard.active, true);
  assert.equal(savedCard.closingDay, 5);
  assert.equal(savedCard.dueDay, 12);
  assert.equal(savedCard.name, 'Nubank');
});

test('UpdateCardUseCase desativa cartão com active false', async () => {
  let savedCard;
  const repository = {
    findById: async () => ({
      id: 'card-1',
      userId: 'user-1',
      name: 'Nubank',
      active: true,
    }),
    save: async (card) => {
      savedCard = card;
      return card;
    },
  };

  const useCase = new UpdateCardUseCase(repository);
  const result = await useCase.execute({
    id: 'card-1',
    userId: 'user-1',
    active: false,
  });

  assert.equal(result.active, false);
  assert.equal(savedCard.active, false);
});

