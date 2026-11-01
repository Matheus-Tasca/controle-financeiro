import { randomUUID } from 'node:crypto';

export class InvestmentMovement {
  constructor({
    id,
    userId,
    bankId,
    type,
    amount,
    previousBalance,
    newBalance,
    date,
    createdAt,
  } = {}) {
    this.id = id || randomUUID();
    this.userId = userId;
    this.bankId = bankId;
    this.type = type;
    this.amount = Number(amount);
    this.previousBalance = Number(previousBalance);
    this.newBalance = Number(newBalance);
    this.date = date;
    this.createdAt = createdAt || new Date();
  }
}

