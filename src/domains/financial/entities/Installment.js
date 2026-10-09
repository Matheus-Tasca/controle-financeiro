import { randomUUID } from 'node:crypto';

export class Installment {
  constructor({
    amount,
    transactionId,
    installmentNumber,
    totalInstallments,
    dueDate,
  } = {}) {
    this.installmentId = randomUUID();
    this.amount = amount;
    this.transactionId = transactionId;
    this.installmentNumber = installmentNumber;
    this.totalInstallments = totalInstallments;
    this.dueDate = dueDate;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}
