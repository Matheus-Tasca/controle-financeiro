import { randomUUID } from 'node:crypto';

export class Card {
  constructor({
    id,
    userId,
    name,
    closingDay,
    dueDay,
    active = true,
    createdAt,
    updatedAt,
  } = {}) {
    this.id = id || randomUUID();
    this.userId = userId;
    this.name = name;
    this.closingDay = closingDay;
    this.dueDay = dueDay;
    this.active = active ?? true;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}
