import { EntitySchema } from 'typeorm';
import { InvestmentMovement } from '../../../../domains/financial/entities/InvestmentMovement.js';

export const InvestmentMovementSchema = new EntitySchema({
  name: 'InvestmentMovement',
  target: InvestmentMovement,
  tableName: 'MOVIMENTACOES_INVESTIMENTO',
  columns: {
    id: {
      primary: true,
      type: 'varchar',
    },
    userId: {
      type: 'uuid',
      name: 'user_id',
    },
    bankId: {
      type: 'varchar',
      name: 'id_banco',
    },
    type: {
      type: 'varchar',
      name: 'tipo',
      length: 20,
    },
    amount: {
      type: 'bigint',
      name: 'valor_movimentado',
      transformer: {
        to: (value) => Number(value) || 0,
        from: (value) => Number(value) || 0,
      },
    },
    previousBalance: {
      type: 'bigint',
      name: 'saldo_anterior',
      transformer: {
        to: (value) => Number(value) || 0,
        from: (value) => Number(value) || 0,
      },
    },
    newBalance: {
      type: 'bigint',
      name: 'saldo_novo',
      transformer: {
        to: (value) => Number(value) || 0,
        from: (value) => Number(value) || 0,
      },
    },
    date: {
      type: 'date',
      name: 'data',
    },
    createdAt: {
      type: 'datetime',
      name: 'criado_em',
      createDate: true,
    },
  },
  relations: {
    bank: {
      type: 'many-to-one',
      target: 'InvestmentBank',
      joinColumn: { name: 'id_banco' },
      inverseSide: 'movements',
    },
  },
});

