import { EntitySchema } from 'typeorm';
import { Card } from '../../../../domains/financial/entities/Card.js';

export const CardSchema = new EntitySchema({
  name: 'Card',
  target: Card,
  tableName: 'CARTOES',
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
    closingDay: {
      type: 'integer',
      name: 'dia_fechamento',
    },
    dueDay: {
      type: 'integer',
      name: 'dia_vencimento',
    },
    active: { type: 'boolean', name: 'ativo', default: true },
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
    transactions: {
      type: 'one-to-many',
      target: 'Transaction',
      inverseSide: 'card',
    },
  },
});
