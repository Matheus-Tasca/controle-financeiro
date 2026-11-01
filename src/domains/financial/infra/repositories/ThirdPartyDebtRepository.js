import { AppDataSource } from '../../../../shared/infra/typeorm/data-source.js';
import { ThirdPartyDebtSchema } from '../../../../shared/infra/typeorm/schemas/ThirdPartyDebtSchema.js';
import { ThirdPartyInstallmentSchema } from '../../../../shared/infra/typeorm/schemas/ThirdPartyInstallmentSchema.js';
import { ThirdPartySchema } from '../../../../shared/infra/typeorm/schemas/ThirdPartySchema.js';
import { CardSchema } from '../../../../shared/infra/typeorm/schemas/CardSchema.js';

export class ThirdPartyDebtRepository {
  constructor() {
    this.debtRepository = AppDataSource.getRepository(ThirdPartyDebtSchema);
    this.installmentRepository = AppDataSource.getRepository(
      ThirdPartyInstallmentSchema
    );
  }

  async createWithInstallments(debtData, installmentsData) {
    return await AppDataSource.transaction(
      async (transactionalEntityManager) => {
        const debt = transactionalEntityManager.create(
          ThirdPartyDebtSchema,
          debtData
        );
        const savedDebt = await transactionalEntityManager.save(debt);

        await transactionalEntityManager.insert(
          ThirdPartyInstallmentSchema,
          installmentsData
        );

        return savedDebt;
      }
    );
  }

  findById(id, userId) {
    return this.debtRepository.findOne({
      where: { id, userId },
      relations: {
        installments: true,
        thirdParty: true,
        card: true,
      },
    });
  }

  async delete(id, userId) {
    return await AppDataSource.transaction(
      async (transactionalEntityManager) => {
        await transactionalEntityManager.delete(ThirdPartyInstallmentSchema, {
          debtId: id,
        });
        return await transactionalEntityManager.delete(ThirdPartyDebtSchema, {
          id,
          userId,
        });
      }
    );
  }

  findInstallmentById(installmentId, userId) {
    return this.installmentRepository
      .createQueryBuilder('installment')
      .innerJoin('installment.debt', 'debt')
      .where('installment.id = :installmentId', { installmentId })
      .andWhere('debt.userId = :userId', { userId })
      .select('installment')
      .getOne();
  }

  async updateInstallmentPayment(installmentId, { paid, paymentDate }) {
    return await this.installmentRepository.update(
      { id: installmentId },
      {
        paid: Boolean(paid),
        paymentDate: paid ? paymentDate : null,
      }
    );
  }

  thirdPartyBelongsToUser(thirdPartyId, userId) {
    return AppDataSource.getRepository(ThirdPartySchema)
      .findOneBy({ id: thirdPartyId, userId })
      .then(Boolean);
  }

  cardBelongsToUser(cardId, userId) {
    return AppDataSource.getRepository(CardSchema)
      .findOneBy({ id: cardId, userId })
      .then(Boolean);
  }

  async getStatement({ userId, thirdPartyId, type, startDate, endDate } = {}) {
    const query = this.installmentRepository
      .createQueryBuilder('installment')
      .innerJoin('installment.debt', 'debt')
      .innerJoin('debt.thirdParty', 'thirdParty')
      .leftJoin('debt.card', 'card')
      .select('debt.id', 'debtId')
      .addSelect('installment.id', 'installmentId')
      .addSelect('debt.description', 'description')
      .addSelect('debt.type', 'type')
      .addSelect('debt.date', 'debtDate')
      .addSelect('installment.dueDate', 'dueDate')
      .addSelect('installment.amount', 'amount')
      .addSelect('installment.installmentNumber', 'installmentNumber')
      .addSelect('installment.totalInstallments', 'totalInstallments')
      .addSelect('installment.paid', 'paid')
      .addSelect('installment.paymentDate', 'paymentDate')
      .addSelect('thirdParty.id', 'thirdPartyId')
      .addSelect('thirdParty.name', 'thirdPartyName')
      .addSelect('card.name', 'cardName')
      .addSelect('debt.cardId', 'cardId')
      .where('debt.userId = :userId', { userId });

    if (thirdPartyId) {
      query.andWhere('debt.thirdPartyId = :thirdPartyId', { thirdPartyId });
    }

    if (type) {
      query.andWhere('debt.type = :type', { type });
    }

    if (startDate && endDate) {
      query.andWhere('installment.dueDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      query.andWhere('installment.dueDate >= :startDate', { startDate });
    } else if (endDate) {
      query.andWhere('installment.dueDate <= :endDate', { endDate });
    }

    query
      .orderBy('installment.dueDate', 'ASC')
      .addOrderBy('installment.installmentNumber', 'ASC');

    return await query.getRawMany();
  }
}

