import { randomUUID } from 'node:crypto';

export class ThirdPartyDebt {
  constructor({
    id,
    userId,
    thirdPartyId,
    type,
    description,
    date,
    totalAmount,
    totalInstallments,
    cardId = null,
    createdAt,
    updatedAt,
    installments,
  } = {}) {
    this.id = id || randomUUID();
    this.userId = userId;
    this.thirdPartyId = thirdPartyId;
    this.type = type;
    this.description = description;
    this.date = date;
    this.totalAmount = totalAmount;
    this.totalInstallments = totalInstallments;
    this.cardId = cardId;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
    if (installments) {
      this.installments = installments;
    }
  }
}
