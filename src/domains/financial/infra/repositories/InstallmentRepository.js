import { AppDataSource } from '../../../../shared/infra/typeorm/data-source.js';
import { InstallmentSchema } from '../../../../shared/infra/typeorm/schemas/InstallmentSchema.js';

export class InstallmentRepository {
  constructor() {
    this.installmentRepository = AppDataSource.getRepository(InstallmentSchema);
  }

  save(newInstallment) {
    return this.installmentRepository.save(newInstallment);
  }
}
