/**
 * @typedef {Object} UpdateTransactionDTO
 * @property {string} id
 * @property {string} userId
 * @property {string} [description]
 * @property {string} [categoryId]
 * @property {string} [transactionType]
 * @property {Date|string} [date]
 * @property {string} [paymentMethodId]
 * @property {string} [cardId]
 * @property {number} [amount]
 */

export class UpdateTransactionUseCase {
  constructor(repository) {
    this.repository = repository;
  }

  /**
   * @param {UpdateTransactionDTO} data
   */
  async execute({
    id,
    userId,
    description,
    categoryId,
    transactionType,
    date,
    paymentMethodId,
    cardId,
    amount,
  }) {
    if (!id) {
      throw new Error('Transaction ID is required');
    }

    const transaction = await this.repository.findById(id, userId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (
      categoryId &&
      !(await this.repository.categoryBelongsToUser(categoryId, userId))
    ) {
      throw new Error('Entry category not found');
    }

    if (cardId && !(await this.repository.cardBelongsToUser(cardId, userId))) {
      throw new Error('Card not found');
    }

    this.applyTransactionUpdates(transaction, {
      description,
      categoryId,
      transactionType,
      date,
      paymentMethodId,
      cardId,
    });

    this.syncSingleInstallment(transaction, { date, amount });

    return await this.repository.save(transaction);
  }

  applyTransactionUpdates(transaction, updates) {
    if (updates.description !== undefined) {
      transaction.description = updates.description;
    }
    if (updates.categoryId) {
      transaction.categoryId = updates.categoryId;
    }
    if (updates.transactionType) {
      transaction.transactionType = updates.transactionType;
    }
    if (updates.date) {
      transaction.date = new Date(updates.date);
    }
    if (updates.paymentMethodId) {
      transaction.paymentMethodId = updates.paymentMethodId;
    }
    if (updates.cardId !== undefined) {
      transaction.cardId = updates.cardId;
    }
    transaction.updatedAt = new Date();
  }

  syncSingleInstallment(transaction, { date, amount }) {
    const hasSingleInstallment =
      Array.isArray(transaction.installment) &&
      transaction.installment.length === 1;

    if (!hasSingleInstallment) {
      return;
    }

    const singleInstallment = transaction.installment[0];
    if (date) {
      singleInstallment.dueDate = new Date(date);
    }

    const hasValidAmount =
      amount !== undefined && amount !== null && Number(amount) > 0;
    if (hasValidAmount) {
      singleInstallment.amount = Math.round(Number(amount));
    }

    singleInstallment.updatedAt = new Date();
  }
}
