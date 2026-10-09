import { randomUUID } from 'node:crypto';

export class User {
  constructor({ id, username, passwordHash } = {}) {
    this.id = id || randomUUID();
    this.username = username;
    this.passwordHash = passwordHash;
  }
}
