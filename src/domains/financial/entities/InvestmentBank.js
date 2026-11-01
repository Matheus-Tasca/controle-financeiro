import { randomUUID } from 'node:crypto';

export class InvestmentBank {
  constructor({
    id,
    userId,
    name,
    currentBalance = 0,
    active = true,
    createdAt,
    updatedAt,
  } = {}) {
    this.id = id || randomUUID();
    this.userId = userId;
    this.name = name;
    this.currentBalance = Number(currentBalance) || 0;
    this.active = active ?? true;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }
}

