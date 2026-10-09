import { EntitySchema } from 'typeorm';
import { EntryCategory } from '../../../../domains/financial/entities/EntryCategory.js';

export const EntryCategorySchema = new EntitySchema({
  name: 'EntryCategory',
  target: EntryCategory,
  tableName: 'CATEGORIAS_LANCAMENTOS',
  columns: {
    userId: { type: 'uuid', name: 'user_id' },
    id: { primary: true, type: 'uuid', name: 'id', generated: 'uuid' },
    description: { type: 'varchar', name: 'descricao' },
    active: { type: 'boolean', name: 'ativo' },
  },
});
