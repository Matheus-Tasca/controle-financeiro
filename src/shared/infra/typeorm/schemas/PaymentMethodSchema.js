import { EntitySchema } from 'typeorm';
import { PaymentMethod } from '../../../../domains/financial/entities/PaymentMethod.js';

export const PaymentMethodSchema = new EntitySchema({
  name: 'PaymentMethod',
  target: PaymentMethod,
  tableName: 'METODO_PAGAMENTO',
  columns: {
    id: { primary: true, type: 'varchar', name: 'id', length: 50 },
    name: { type: 'varchar', name: 'nome' },
  },
});
