import { AppDataSource } from '../../../../shared/infra/typeorm/data-source.js';
import { PaymentMethodSchema } from '../../../../shared/infra/typeorm/schemas/PaymentMethodSchema.js';

export class PaymentMethodRepository {
  constructor(transactionSchema, installmentSchema) {
    this.paymentMethodRepository =
      AppDataSource.getRepository(PaymentMethodSchema);
    this.transactionRepository = AppDataSource.getRepository(transactionSchema);
    this.installmentRepository = AppDataSource.getRepository(installmentSchema);
  }

  async getTopPaymentMethods(userId) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();
    return await this.transactionRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.installment', 'installment')
      .innerJoin('transaction.paymentMethod', 'paymentMethod')
      .select('paymentMethod.name', 'description')
      .addSelect('SUM(installment.amount)', 'value')
      .where('installment.dueDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('transaction.userId = :userId', { userId })
      .andWhere('transaction.transactionType = :expenseType', {
        expenseType: 'saida',
      })
      .groupBy('paymentMethod.name')
      .orderBy('value', 'DESC')
      .limit(3)
      .getRawMany();
  }

  async getAllPaymentMethods(userId) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();

    return await this.transactionRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.installment', 'installment')
      .innerJoin('transaction.paymentMethod', 'paymentMethod')
      .select('paymentMethod.name', 'description')
      .addSelect('SUM(installment.amount)', 'value')
      .where('installment.dueDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('transaction.userId = :userId', { userId })
      .andWhere('transaction.transactionType = :expenseType', {
        expenseType: 'saida',
      })
      .groupBy('paymentMethod.name')
      .orderBy('value', 'DESC')
      .getRawMany();
  }

  getActivePaymentMethods() {
    return this.paymentMethodRepository
      .createQueryBuilder('paymentMethod')
      .select('paymentMethod.id', 'id')
      .addSelect('paymentMethod.name', 'name')
      .orderBy('paymentMethod.name', 'ASC')
      .getRawMany()
      .then((methods) =>
        methods.map((method) => ({ ...method, active: true }))
      );
  }
}
