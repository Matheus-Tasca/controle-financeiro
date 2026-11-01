import { EntitySchema } from 'typeorm';
import { ThirdPartyInstallment } from '../../../../domains/financial/entities/ThirdPartyInstallment.js';

export const ThirdPartyInstallmentSchema = new EntitySchema({
  name: 'ThirdPartyInstallment',
  target: ThirdPartyInstallment,
  tableName: 'PARCELAS_TERCEIROS',
  columns: {
    id: {
      primary: true,
      type: 'varchar',
      name: 'id',
    },
    debtId: {
      type: 'varchar',
      name: 'lancamento_id',
    },
    installmentNumber: {
      type: 'int',
      name: 'numero_parcela',
    },
    totalInstallments: {
      type: 'int',
      name: 'total_parcelas',
    },
    amount: {
      type: 'int',
      name: 'valor',
    },
    dueDate: {
      type: 'date',
      name: 'vencimento',
    },
    paid: {
      type: 'boolean',
      name: 'pago',
      default: false,
    },
    paymentDate: {
      type: 'date',
      name: 'data_pagamento',
      nullable: true,
    },
    createdAt: {
      type: 'datetime',
      name: 'criado_em',
      createDate: true,
    },
    updatedAt: {
      type: 'datetime',
      name: 'atualizado_em',
      nullable: true,
      updateDate: true,
    },
  },
  relations: {
    debt: {
      type: 'many-to-one',
      target: 'ThirdPartyDebt',
      joinColumn: { name: 'lancamento_id' },
      inverseSide: 'installments',
    },
  },
});
