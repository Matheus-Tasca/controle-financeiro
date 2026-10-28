import { AppDataSource } from '../../../../shared/infra/typeorm/data-source.js';
import { InvestmentMovementSchema } from '../../../../shared/infra/typeorm/schemas/InvestmentMovementSchema.js';
import { Between, LessThanOrEqual } from 'typeorm';

export class InvestmentMovementRepository {
  constructor() {
    this.repository = AppDataSource.getRepository(InvestmentMovementSchema);
  }

  save(movement) {
    return this.repository.save(movement);
  }

  findAllByPeriod(userId, startDate, endDate) {
    return this.repository.find({
      where: {
        userId,
        date: Between(startDate, endDate),
      },
      order: { date: 'ASC', createdAt: 'ASC' },
      relations: ['bank'],
    });
  }

  findByBankAndPeriod(userId, bankId, startDate, endDate) {
    return this.repository.find({
      where: {
        userId,
        bankId,
        date: Between(startDate, endDate),
      },
      order: { date: 'ASC', createdAt: 'ASC' },
    });
  }

  findAllUpToDate(userId, endDate) {
    return this.repository.find({
      where: {
        userId,
        date: LessThanOrEqual(endDate),
      },
      order: { date: 'ASC', createdAt: 'ASC' },
    });
  }

  findLatestMovementBeforeDate(userId, bankId, date) {
    return this.repository.findOne({
      where: {
        userId,
        bankId,
        date: LessThanOrEqual(date),
      },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }
}

