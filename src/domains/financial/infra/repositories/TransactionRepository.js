import { AppDataSource } from '../../../../shared/infra/typeorm/data-source.js';
import { TransactionSchema } from '../../../../shared/infra/typeorm/schemas/TransactionSchema.js';
import { InstallmentSchema } from '../../../../shared/infra/typeorm/schemas/InstallmentSchema.js';
import { EntryCategorySchema } from '../../../../shared/infra/typeorm/schemas/EntryCategorySchema.js';
import { CardSchema } from '../../../../shared/infra/typeorm/schemas/CardSchema.js';

export class TransactionRepository {
  constructor() {
    this.transactionRepository = AppDataSource.getRepository(TransactionSchema);
    this.installmentRepository = AppDataSource.getRepository(InstallmentSchema);
  }

  async createWithInstallments(transactionData, installmentsData) {
    return await AppDataSource.transaction(
      async (transactionalEntityManager) => {
        const transaction = transactionalEntityManager.create(
          TransactionSchema,
          transactionData
        );
        const savedTransaction =
          await transactionalEntityManager.save(transaction);

        await transactionalEntityManager.insert(
          InstallmentSchema,
          installmentsData
        );

        return savedTransaction;
      }
    );
  }

  findById(id, userId) {
    return this.transactionRepository.findOne({
      where: { id, userId },
      relations: {
        installment: true,
      },
    });
  }

  async save(transaction) {
    if (transaction.installment && transaction.installment.length > 0) {
      return await AppDataSource.transaction(async (manager) => {
        const saved = await manager.save(TransactionSchema, transaction);
        await manager.save(InstallmentSchema, transaction.installment);
        return saved;
      });
    }
    return this.transactionRepository.save(transaction);
  }

  categoryBelongsToUser(categoryId, userId) {
    return AppDataSource.getRepository(EntryCategorySchema)
      .findOneBy({ id: categoryId, userId })
      .then(Boolean);
  }

  cardBelongsToUser(cardId, userId) {
    return AppDataSource.getRepository(CardSchema)
      .findOneBy({ id: cardId, userId })
      .then(Boolean);
  }

  async delete(id, userId) {
    return await AppDataSource.transaction(
      async (transactionalEntityManager) => {
        await transactionalEntityManager.delete(InstallmentSchema, {
          transactionId: id,
        });
        return await transactionalEntityManager.delete(TransactionSchema, {
          id,
          userId,
        });
      }
    );
  }

  async getDashboardExpenses(userId, startDate, endDate) {
    const result = await this.transactionRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.installment', 'installment')
      .select('SUM(installment.amount)', 'value')
      .where('installment.dueDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('transaction.userId = :userId', { userId })
      .andWhere('transaction.transactionType = :exitType', {
        exitType: 'saida',
      })
      .getRawOne();

    return Number(result?.value) || 0;
  }

  async getDashboardIncomes(userId, startDate, endDate) {
    const result = await this.transactionRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.installment', 'installment')
      .select('SUM(installment.amount)', 'value')
      .where('installment.dueDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('transaction.userId = :userId', { userId })
      .andWhere('transaction.transactionType = :enterType', {
        enterType: 'entrada',
      })
      .getRawOne();

    return Number(result?.value) || 0;
  }

  async getTopCategories(userId, startDate, endDate) {
    return this.transactionRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.installment', 'installment')
      .innerJoin('transaction.category', 'category')
      .select('category.description', 'nome')
      .addSelect('SUM(installment.amount)', 'total')
      .where('installment.dueDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('transaction.userId = :userId', { userId })
      .andWhere('transaction.transactionType = :type', { type: 'saida' })
      .groupBy('category.description')
      .orderBy('total', 'DESC')
      .limit(5)
      .getRawMany();
  }

  async getStatementInstallments(startDate, endDate, userId) {
    return this.installmentRepository
      .createQueryBuilder('installment')
      .innerJoin('installment.transaction', 'transaction')
      .leftJoin('transaction.card', 'card')
      .leftJoin('transaction.category', 'category')
      .select('transaction.id', 'transactionId')
      .addSelect('installment.installmentId', 'installmentId')
      .addSelect('transaction.description', 'description')
      .addSelect('transaction.transactionType', 'transactionType')
      .addSelect('transaction.date', 'transactionDate')
      .addSelect('installment.dueDate', 'dueDate')
      .addSelect('installment.amount', 'amount')
      .addSelect('installment.installmentNumber', 'installmentNumber')
      .addSelect('installment.totalInstallments', 'totalInstallments')
      .addSelect('card.name', 'cardName')
      .addSelect('category.description', 'categoryName')
      .addSelect('transaction.categoryId', 'categoryId')
      .addSelect('transaction.paymentMethodId', 'paymentMethodId')
      .addSelect('transaction.cardId', 'cardId')
      .where('installment.dueDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('transaction.userId = :userId', { userId })
      .orderBy('installment.dueDate', 'ASC')
      .addOrderBy('transaction.createdAt', 'ASC')
      .getRawMany();
  }
}
