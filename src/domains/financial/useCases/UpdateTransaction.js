/**
 * @typedef {Object} UpdateTransactionDTO
 * @property {string} id
 * @property {string} [name]
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

    if (description !== undefined) transaction.description = description;
    if (categoryId) transaction.categoryId = categoryId;
    if (transactionType) transaction.transactionType = transactionType;
    if (date) transaction.date = new Date(date);
    if (paymentMethodId) transaction.paymentMethodId = paymentMethodId;
    if (cardId !== undefined) transaction.cardId = cardId;
    transaction.updatedAt = new Date();

    if (transaction.installment && transaction.installment.length === 1) {
      const singleInstallment = transaction.installment[0];
      if (date) {
        singleInstallment.dueDate = new Date(date);
      }
      if (amount !== undefined && amount !== null && Number(amount) > 0) {
        singleInstallment.amount = Math.round(Number(amount));
      }
      singleInstallment.updatedAt = new Date();
    }

    return await this.repository.save(transaction);
  }
}
