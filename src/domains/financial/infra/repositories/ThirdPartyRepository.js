import { AppDataSource } from '../../../../shared/infra/typeorm/data-source.js';
import { ThirdPartySchema } from '../../../../shared/infra/typeorm/schemas/ThirdPartySchema.js';
import { ThirdPartyDebtSchema } from '../../../../shared/infra/typeorm/schemas/ThirdPartyDebtSchema.js';
import { ILike } from 'typeorm';

export class ThirdPartyRepository {
  constructor() {
    this.thirdPartyRepository = AppDataSource.getRepository(ThirdPartySchema);
    this.debtRepository = AppDataSource.getRepository(ThirdPartyDebtSchema);
  }

  save(thirdParty) {
    return this.thirdPartyRepository.save(thirdParty);
  }

  findById(id, userId) {
    return this.thirdPartyRepository.findOneBy({ id, userId });
  }

  findByName(name, userId) {
    return this.thirdPartyRepository.findOneBy({
      name: ILike(name),
      userId,
    });
  }

  findAll(userId, { activeOnly = false } = {}) {
    const where = { userId };
    if (activeOnly) {
      where.active = true;
    }
    return this.thirdPartyRepository.find({
      where,
      order: { name: 'ASC' },
    });
  }

  countDebts(thirdPartyId) {
    return this.debtRepository.countBy({ thirdPartyId });
  }

  deactivate(id, userId) {
    return this.thirdPartyRepository.update({ id, userId }, { active: false });
  }

  delete(id, userId) {
    return this.thirdPartyRepository.delete({ id, userId });
  }

  async getBalances(userId, { type } = {}) {
    const query = this.thirdPartyRepository
      .createQueryBuilder('tp')
      .leftJoin('tp.debts', 'debt')
      .leftJoin('debt.installments', 'inst')
      .select('tp.id', 'id')
      .addSelect('tp.name', 'name')
      .addSelect('tp.active', 'active')
      .addSelect(
        `COALESCE(SUM(CASE WHEN debt.type = 'a_receber' THEN inst.amount ELSE 0 END), 0)`,
        'totalReceivable'
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN debt.type = 'a_receber' AND inst.paid = 1 THEN inst.amount ELSE 0 END), 0)`,
        'paidReceivable'
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN debt.type = 'a_pagar' THEN inst.amount ELSE 0 END), 0)`,
        'totalPayable'
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN debt.type = 'a_pagar' AND inst.paid = 1 THEN inst.amount ELSE 0 END), 0)`,
        'paidPayable'
      )
      .where('tp.userId = :userId', { userId })
      .groupBy('tp.id')
      .addGroupBy('tp.name')
      .addGroupBy('tp.active')
      .orderBy('tp.name', 'ASC');

    const results = await query.getRawMany();

    const formatted = results.map((row) => {
      const totalReceivable = Number(row.totalReceivable) || 0;
      const paidReceivable = Number(row.paidReceivable) || 0;
      const pendingReceivable = totalReceivable - paidReceivable;

      const totalPayable = Number(row.totalPayable) || 0;
      const paidPayable = Number(row.paidPayable) || 0;
      const pendingPayable = totalPayable - paidPayable;

      const netBalance = pendingReceivable - pendingPayable;

      return {
        id: row.id,
        name: row.name,
        active: Boolean(row.active),
        totalReceivable,
        paidReceivable,
        pendingReceivable,
        totalPayable,
        paidPayable,
        pendingPayable,
        netBalance,
      };
    });

    if (type === 'a_receber') {
      return formatted.filter((item) => item.totalReceivable > 0 || item.active);
    }
    if (type === 'a_pagar') {
      return formatted.filter((item) => item.totalPayable > 0 || item.active);
    }

    return formatted;
  }
}
