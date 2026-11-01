import { randomUUID } from 'node:crypto';

export class ThirdPartyInstallment {
  constructor({
    id,
    debtId,
    installmentNumber,
    totalInstallments,
    amount,
    dueDate,
    paid = false,
    paymentDate = null,
    createdAt,
    updatedAt,
  } = {}) {
    this.id = id || randomUUID();
    this.debtId = debtId;
    this.installmentNumber = installmentNumber;
    this.totalInstallments = totalInstallments;
    this.amount = amount;
    this.dueDate = dueDate;
    this.paid = paid ?? false;
    this.paymentDate = paymentDate;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }
}
