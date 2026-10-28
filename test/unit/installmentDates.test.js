import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDueDate,
  calculateInstallmentDueDates,
  isValidDay,
} from '../../src/domains/financial/utils/installmentDates.js';

test('calcula parcelas antes e depois do fechamento quando vencimento é posterior ao fechamento', () => {
  assert.deepEqual(
    calculateInstallmentDueDates({
      transactionDate: '2026-05-10',
      closingDay: 10,
      dueDay: 20,
      totalInstallments: 3,
    }),
    ['2026-05-20', '2026-06-20', '2026-07-20']
  );
  assert.deepEqual(
    calculateInstallmentDueDates({
      transactionDate: '2026-05-15',
      closingDay: 10,
      dueDay: 20,
      totalInstallments: 2,
    }),
    ['2026-06-20', '2026-07-20']
  );
});

test('calcula parcelas quando vencimento é menor que o fechamento (avança para o mês seguinte)', () => {
  assert.deepEqual(
    calculateInstallmentDueDates({
      transactionDate: '2026-05-10',
      closingDay: 20,
      dueDay: 15,
      totalInstallments: 3,
    }),
    ['2026-06-15', '2026-07-15', '2026-08-15']
  );
  assert.deepEqual(
    calculateInstallmentDueDates({
      transactionDate: '2026-05-21',
      closingDay: 20,
      dueDay: 15,
      totalInstallments: 2,
    }),
    ['2026-07-15', '2026-08-15']
  );
  // Caso de compra após o fechamento quando o vencimento é no início do mês
  assert.deepEqual(
    calculateInstallmentDueDates({
      transactionDate: '2026-10-26',
      closingDay: 25,
      dueDay: 1,
      totalInstallments: 2,
    }),
    ['2026-12-01', '2027-01-01']
  );
  assert.deepEqual(
    calculateInstallmentDueDates({
      transactionDate: '2026-10-20',
      closingDay: 25,
      dueDay: 1,
      totalInstallments: 2,
    }),
    ['2026-11-01', '2026-12-01']
  );
});

test('normaliza virada de ano e vencimento inexistente no mês', () => {
  assert.deepEqual(
    calculateInstallmentDueDates({
      transactionDate: '2027-12-28',
      closingDay: 25,
      dueDay: 31,
      totalInstallments: 3,
    }),
    ['2028-01-31', '2028-03-01', '2028-03-31']
  );
});

test('considera fevereiro bissexto ao construir a data de vencimento', () => {
  assert.equal(buildDueDate(2028, 1, 29), '2028-02-29');
  assert.equal(buildDueDate(2027, 1, 29), '2027-03-01');
});

test('valida dias inteiros entre 1 e 31', () => {
  for (const day of [1, 15, 31, '15']) assert.equal(isValidDay(day), true);
  for (const day of [0, 32, 1.5, 'abc', null])
    assert.equal(isValidDay(day), false);
});
