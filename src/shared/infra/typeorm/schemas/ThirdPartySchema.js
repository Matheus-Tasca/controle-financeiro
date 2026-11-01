import { EntitySchema } from 'typeorm';
import { ThirdParty } from '../../../../domains/financial/entities/ThirdParty.js';

export const ThirdPartySchema = new EntitySchema({
  name: 'ThirdParty',
  target: ThirdParty,
  tableName: 'TERCEIROS',
  columns: {
    id: {
      primary: true,
      type: 'varchar',
      name: 'id',
    },
    userId: {
      type: 'varchar',
      name: 'user_id',
    },
    name: {
      type: 'varchar',
      name: 'nome',
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
    debts: {
      type: 'one-to-many',
      target: 'ThirdPartyDebt',
      inverseSide: 'thirdParty',
    },
  },
});
