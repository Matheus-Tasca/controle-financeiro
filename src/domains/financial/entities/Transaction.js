import { randomUUID } from 'node:crypto';

export class Transaction {
  constructor({
    description,
    userId,
    categoryId,
    transactionType,
    date,
    paymentMethodId,
    cardId,
    updatedAt,
  } = {}) {
    this.id = randomUUID();
    this.userId = userId;
    this.description = description;
    this.categoryId = categoryId;
    this.transactionType = transactionType;
    this.date = date;
    this.paymentMethodId = paymentMethodId;
    this.cardId = cardId;
    this.updatedAt = new Date();
    this.createdAt = new Date();
  }
}
