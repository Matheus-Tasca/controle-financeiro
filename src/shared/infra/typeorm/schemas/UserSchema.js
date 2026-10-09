import { EntitySchema } from 'typeorm';
import { User } from '../../../../domains/auth/entities/User.js';

export const UserSchema = new EntitySchema({
  name: 'User',
  target: User,
  tableName: 'USUARIOS',
  columns: {
    id: { primary: true, type: 'uuid', name: 'id', generated: 'uuid' },
    username: { type: 'varchar', name: 'usuario', unique: true, length: 100 },
    passwordHash: { type: 'varchar', name: 'senha_hash', length: 255 },
  },
});
