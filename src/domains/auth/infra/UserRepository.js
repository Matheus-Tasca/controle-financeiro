import { AppDataSource } from '../../../shared/infra/typeorm/data-source.js';
import { UserSchema } from '../../../shared/infra/typeorm/schemas/UserSchema.js';

export class UserRepository {
  constructor() {
    this.repository = AppDataSource.getRepository(UserSchema);
  }
  findByUsername(username) {
    return this.repository.findOneBy({ username });
  }
  save(user) {
    return this.repository.save(user);
  }
}
