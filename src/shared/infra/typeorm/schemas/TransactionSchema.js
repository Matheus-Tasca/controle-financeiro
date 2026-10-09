import { EntitySchema } from 'typeorm';
import { Transaction } from '../../../../domains/financial/entities/Transaction.js';

export const TransactionSchema = new EntitySchema({
  name: 'Transaction',
  target: Transaction,
  tableName: 'TRANSACOES',
  columns: {
    userId: { type: 'uuid', name: 'user_id' },
    id: { primary: true, type: 'uuid', name: 'id', generated: 'uuid' },
    description: { type: 'varchar', name: 'descricao' },
    categoryId: { type: 'uuid', name: 'id_categoria' },
    transactionType: { type: 'varchar', name: 'tipo_transacao' },
    date: { type: 'date', name: 'data' },
    paymentMethodId: {
      type: 'varchar',
      name: 'id_metodo_pagamento',
      length: 50,
    },
    updatedAt: { type: 'datetime', name: 'atualizado_em', updateDate: true },
    createdAt: { type: 'datetime', name: 'criado_em', createDate: true },
    cardId: {
      type: 'varchar',
      name: 'id_cartao',
      nullable: true,
    },
  },
  relations: {
    category: {
      type: 'many-to-one',
      target: 'EntryCategory',
      joinColumn: { name: 'id_categoria' },
    },
    paymentMethod: {
      type: 'many-to-one',
      target: 'PaymentMethod',
      joinColumn: { name: 'id_metodo_pagamento' },
    },
    installment: {
      type: 'one-to-many',
      target: 'Installment',
      inverseSide: 'transaction',
    },
    card: {
      type: 'many-to-one',
      target: 'Card',
      joinColumn: { name: 'id_cartao' },
      nullable: true,
    },
  },
});
