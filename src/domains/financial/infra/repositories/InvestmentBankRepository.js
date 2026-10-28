import { AppDataSource } from '../../../../shared/infra/typeorm/data-source.js';
import { InvestmentBankSchema } from '../../../../shared/infra/typeorm/schemas/InvestmentBankSchema.js';
import { ILike } from 'typeorm';

export class InvestmentBankRepository {
  constructor() {
    this.repository = AppDataSource.getRepository(InvestmentBankSchema);
  }

  save(bank) {
    return this.repository.save(bank);
  }

  findById(id, userId) {
    return this.repository.findOneBy({ id, userId });
  }

  findByName(name, userId) {
    return this.repository.findOneBy({
      name: ILike(name),
      userId,
    });
  }

  findAll(userId, { activeOnly = false } = {}) {
    const where = { userId };
    if (activeOnly) {
      where.active = true;
    }
    return this.repository.find({
      where,
      order: { name: 'ASC' },
    });
  }

  async update(id, userId, data) {
    const updateData = {};
    if (typeof data.name === 'string') updateData.name = data.name;
    if (typeof data.active === 'boolean') updateData.active = data.active;
    if (typeof data.currentBalance === 'number')
      updateData.currentBalance = data.currentBalance;

    if (Object.keys(updateData).length === 0) return;
    return this.repository.update({ id, userId }, updateData);
  }

  updateBalance(id, userId, newBalance) {
    return this.repository.update(
      { id, userId },
      { currentBalance: Number(newBalance) }
    );
  }

  deactivate(id, userId) {
    return this.repository.update({ id, userId }, { active: false });
  }

  activate(id, userId) {
    return this.repository.update({ id, userId }, { active: true });
  }
}

