import { EntitySchema } from 'typeorm';
import { ThirdPartyDebt } from '../../../../domains/financial/entities/ThirdPartyDebt.js';

export const ThirdPartyDebtSchema = new EntitySchema({
  name: 'ThirdPartyDebt',
  target: ThirdPartyDebt,
  tableName: 'LANCAMENTOS_TERCEIROS',
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
    thirdPartyId: {
      type: 'varchar',
      name: 'terceiro_id',
    },
    type: {
      type: 'varchar',
      name: 'tipo',
      length: 20,
    },
    description: {
      type: 'varchar',
      name: 'descricao',
    },
    date: {
      type: 'date',
      name: 'data',
    },
    totalAmount: {
      type: 'int',
      name: 'valor_total',
    },
    totalInstallments: {
      type: 'int',
      name: 'total_parcelas',
    },
    cardId: {
      type: 'varchar',
      name: 'id_cartao',
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
    thirdParty: {
      type: 'many-to-one',
      target: 'ThirdParty',
      joinColumn: { name: 'terceiro_id' },
      inverseSide: 'debts',
    },
    card: {
      type: 'many-to-one',
      target: 'Card',
      joinColumn: { name: 'id_cartao' },
      nullable: true,
    },
    installments: {
      type: 'one-to-many',
      target: 'ThirdPartyInstallment',
      inverseSide: 'debt',
    },
  },
});
