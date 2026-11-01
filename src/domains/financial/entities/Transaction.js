import { randomUUID } from 'node:crypto';

export class Transaction {
  constructor({
    id,
    description,
    userId,
    categoryId,
    transactionType,
    date,
    paymentMethodId,
    cardId,
    createdAt,
    updatedAt,
  } = {}) {
    this.id = id || randomUUID();
    this.userId = userId;
    this.description = description;
    this.categoryId = categoryId;
    this.transactionType = transactionType;
    this.date = date;
    this.paymentMethodId = paymentMethodId;
    this.cardId = cardId;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }
}
