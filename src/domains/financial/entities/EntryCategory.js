import { randomUUID } from 'node:crypto';

export class EntryCategory {
  constructor({ userId, description, active = true } = {}) {
    this.id = randomUUID();
    this.userId = userId;
    this.description = description;
    this.active = active ?? true;
  }
}
