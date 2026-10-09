import { EntitySchema } from 'typeorm';
import { Installment } from '../../../../domains/financial/entities/Installment.js';

export const InstallmentSchema = new EntitySchema({
  name: 'Installment',
  target: Installment,
  tableName: 'PARCELAS',
  columns: {
    installmentId: {
      primary: true,
      type: 'uuid',
      name: 'id_parcela',
      generated: 'uuid',
    },
    amount: { type: 'int', name: 'valor' },
    transactionId: { type: 'uuid', name: 'id_transacao' },
    installmentNumber: { type: 'int', name: 'numero_parcela' },
    totalInstallments: { type: 'int', name: 'total_parcelas' },
    dueDate: { type: 'date', name: 'vencimento' },
    updatedAt: { type: 'datetime', name: 'atualizado_em', updateDate: true },
    createdAt: { type: 'datetime', name: 'criado_em', createDate: true },
  },
  relations: {
    transaction: {
      type: 'many-to-one',
      target: 'Transaction',
      joinColumn: { name: 'id_transacao' },
      inverseSide: 'installment',
    },
  },
});
