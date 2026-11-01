import test from 'node:test';
import assert from 'node:assert/strict';
import { CreateThirdPartyUseCase } from '../../src/domains/financial/useCases/CreateThirdPartyUseCase.js';
import { UpdateThirdPartyUseCase } from '../../src/domains/financial/useCases/UpdateThirdPartyUseCase.js';
import { DeleteThirdPartyUseCase } from '../../src/domains/financial/useCases/DeleteThirdPartyUseCase.js';
import { CreateThirdPartyDebtUseCase } from '../../src/domains/financial/useCases/CreateThirdPartyDebtUseCase.js';
import { UpdateThirdPartyInstallmentPaymentUseCase } from '../../src/domains/financial/useCases/UpdateThirdPartyInstallmentPaymentUseCase.js';
import { GetThirdPartyStatementUseCase } from '../../src/domains/financial/useCases/GetThirdPartyStatementUseCase.js';

test('CreateThirdPartyUseCase valida nome e salva novo terceiro', async () => {
  let savedEntity = null;
  const mockRepo = {
    findByName: async () => null,
    save: async (entity) => {
      savedEntity = entity;
      return entity;
    },
  };
  const useCase = new CreateThirdPartyUseCase(mockRepo);

  await assert.rejects(
    useCase.execute({ userId: 'u1', name: '  ' }),
    /Third party name is required/
  );

  await useCase.execute({ userId: 'u1', name: ' Carlos Silva ' });
  assert.equal(savedEntity.name, 'Carlos Silva');
  assert.equal(savedEntity.userId, 'u1');
  assert.equal(savedEntity.active, true);
});

test('CreateThirdPartyUseCase rejeita nome duplicado para o mesmo usuário', async () => {
  const mockRepo = {
    findByName: async (name) => ({ id: 'tp-1', name }),
  };
  const useCase = new CreateThirdPartyUseCase(mockRepo);

  await assert.rejects(
    useCase.execute({ userId: 'u1', name: 'Carlos Silva' }),
    /Third party with this name already exists/
  );
});

test('DeleteThirdPartyUseCase desativa se possuir lançamentos ou remove fisicamente se não possuir', async () => {
  let deactivatedId = null;
  let deletedId = null;

  const mockRepo = {
    findById: async (id) => ({ id, name: 'João' }),
    countDebts: async (id) => (id === 'with-debts' ? 2 : 0),
    deactivate: async (id) => {
      deactivatedId = id;
    },
    delete: async (id) => {
      deletedId = id;
    },
  };

  const useCase = new DeleteThirdPartyUseCase(mockRepo);

  const res1 = await useCase.execute('with-debts', 'u1');
  assert.equal(res1.deactivated, true);
  assert.equal(deactivatedId, 'with-debts');

  const res2 = await useCase.execute('no-debts', 'u1');
  assert.equal(res2.deleted, true);
  assert.equal(deletedId, 'no-debts');
});

test('CreateThirdPartyDebtUseCase gera parcelas em centavos e vencimentos pelo cartão para a_receber', async () => {
  let savedDebt = null;
  let savedInstallments = null;

  const mockDebtRepo = {
    thirdPartyBelongsToUser: async () => true,
    cardBelongsToUser: async () => true,
    createWithInstallments: async (debt, installments) => {
      savedDebt = debt;
      savedInstallments = installments;
      return debt;
    },
  };

  const mockCardRepo = {
    findDateInformationByCardId: async () => ({ closingDay: 20, dueDay: 28 }),
  };

  const useCase = new CreateThirdPartyDebtUseCase(mockDebtRepo, mockCardRepo);

  await useCase.execute({
    userId: 'u1',
    thirdPartyId: 'tp-1',
    type: 'a_receber',
    description: 'Empréstimo celular',
    date: '2028-02-10',
    totalAmount: 10000, // R$ 100,00 em centavos
    totalInstallments: 3,
    cardId: 'card-1',
  });

  assert.equal(savedDebt.type, 'a_receber');
  assert.equal(savedDebt.totalAmount, 10000);
  assert.equal(savedInstallments.length, 3);

  // Soma de centavos: 3334 + 3333 + 3333 = 10000
  assert.deepEqual(
    savedInstallments.map((i) => i.amount),
    [3334, 3333, 3333]
  );
  assert.equal(
    savedInstallments.reduce((sum, i) => sum + i.amount, 0),
    10000
  );

  // Data 2028-02-10 antes do fechamento dia 20 -> 1ª parcela em 2028-02-28
  assert.equal(savedInstallments[0].dueDate, '2028-02-28');
  assert.equal(savedInstallments[1].dueDate, '2028-03-28');
  assert.equal(savedInstallments[2].dueDate, '2028-04-28');
});

test('CreateThirdPartyDebtUseCase gera parcelas de a_pagar com data livre mês a mês', async () => {
  let savedInstallments = null;

  const mockDebtRepo = {
    thirdPartyBelongsToUser: async () => true,
    createWithInstallments: async (debt, installments) => {
      savedInstallments = installments;
      return debt;
    },
  };

  const useCase = new CreateThirdPartyDebtUseCase(mockDebtRepo, {});

  await useCase.execute({
    userId: 'u1',
    thirdPartyId: 'tp-1',
    type: 'a_pagar',
    description: 'Devolução de empréstimo',
    date: '2028-01-05',
    firstDueDate: '2028-01-15',
    totalAmount: 5000,
    totalInstallments: 2,
  });

  assert.equal(savedInstallments.length, 2);
  assert.equal(savedInstallments[0].dueDate, '2028-01-15');
  assert.equal(savedInstallments[1].dueDate, '2028-02-15');
  assert.deepEqual(
    savedInstallments.map((i) => i.amount),
    [2500, 2500]
  );
});

test('UpdateThirdPartyInstallmentPaymentUseCase atualiza baixa e data', async () => {
  let updatedPayment = null;

  const mockDebtRepo = {
    findInstallmentById: async () => ({ id: 'inst-1', paid: false }),
    updateInstallmentPayment: async (id, data) => {
      updatedPayment = { id, ...data };
    },
  };

  const useCase = new UpdateThirdPartyInstallmentPaymentUseCase(mockDebtRepo);

  // Baixa com data explícita
  await useCase.execute({
    installmentId: 'inst-1',
    userId: 'u1',
    paid: true,
    paymentDate: '2028-03-10',
  });

  assert.equal(updatedPayment.paid, true);
  assert.equal(updatedPayment.paymentDate, '2028-03-10');

  // Estorno (unpaid)
  await useCase.execute({
    installmentId: 'inst-1',
    userId: 'u1',
    paid: false,
  });

  assert.equal(updatedPayment.paid, false);
  assert.equal(updatedPayment.paymentDate, null);
});

test('GetThirdPartyStatementUseCase calcula totais de a_pagar, a_receber e saldo consolidado', async () => {
  const mockDebtRepo = {
    getStatement: async () => [
      {
        installmentId: 'i-1',
        debtId: 'd-1',
        description: 'Empréstimo celular',
        type: 'a_receber',
        debtDate: '2028-01-10',
        dueDate: '2028-02-10',
        amount: 5000,
        installmentNumber: 1,
        totalInstallments: 2,
        paid: 1,
        paymentDate: '2028-02-09',
        thirdPartyId: 'tp-1',
        thirdPartyName: 'Carlos',
      },
      {
        installmentId: 'i-2',
        debtId: 'd-1',
        description: 'Empréstimo celular',
        type: 'a_receber',
        debtDate: '2028-01-10',
        dueDate: '2028-03-10',
        amount: 5000,
        installmentNumber: 2,
        totalInstallments: 2,
        paid: 0,
        paymentDate: null,
        thirdPartyId: 'tp-1',
        thirdPartyName: 'Carlos',
      },
      {
        installmentId: 'i-3',
        debtId: 'd-2',
        description: 'Aluguel ferramentas',
        type: 'a_pagar',
        debtDate: '2028-01-15',
        dueDate: '2028-02-15',
        amount: 3000,
        installmentNumber: 1,
        totalInstallments: 1,
        paid: 0,
        paymentDate: null,
        thirdPartyId: 'tp-1',
        thirdPartyName: 'Carlos',
      },
    ],
  };

  const useCase = new GetThirdPartyStatementUseCase(mockDebtRepo);
  const result = await useCase.execute({ userId: 'u1', thirdPartyId: 'tp-1' });

  assert.equal(result.installments.length, 3);
  assert.equal(result.summary.totalReceivable, 10000);
  assert.equal(result.summary.paidReceivable, 5000);
  assert.equal(result.summary.pendingReceivable, 5000);

  assert.equal(result.summary.totalPayable, 3000);
  assert.equal(result.summary.paidPayable, 0);
  assert.equal(result.summary.pendingPayable, 3000);

  // Saldo líquido = pendingReceivable (5000) - pendingPayable (3000) = +2000
  assert.equal(result.summary.netBalance, 2000);
});

