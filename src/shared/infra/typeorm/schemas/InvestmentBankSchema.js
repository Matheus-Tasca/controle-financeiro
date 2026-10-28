import { EntitySchema } from 'typeorm';
import { InvestmentBank } from '../../../../domains/financial/entities/InvestmentBank.js';

export const InvestmentBankSchema = new EntitySchema({
  name: 'InvestmentBank',
  target: InvestmentBank,
  tableName: 'BANCOS_INVESTIMENTO',
  columns: {
    userId: { type: 'uuid', name: 'user_id' },
    id: {
      primary: true,
      type: 'varchar',
    },
    name: {
      type: 'varchar',
      name: 'nome',
    },
    currentBalance: {
      type: 'bigint',
      name: 'saldo_atual',
      default: 0,
      transformer: {
        to: (value) => Number(value) || 0,
        from: (value) => Number(value) || 0,
      },
    },
    active: {
      type: 'boolean',
      name: 'ativo',
      default: true,
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
    movements: {
      type: 'one-to-many',
      target: 'InvestmentMovement',
      inverseSide: 'bank',
    },
  },
});

