import { randomUUID } from 'node:crypto';

export class ThirdParty {
  constructor({
    id,
    userId,
    name,
    active = true,
    createdAt,
    updatedAt,
  } = {}) {
    this.id = id || randomUUID();
    this.userId = userId;
    this.name = name;
    this.active = active ?? true;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }
}
