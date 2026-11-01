import { ThirdPartyDebt } from '../entities/ThirdPartyDebt.js';
import { ThirdPartyInstallment } from '../entities/ThirdPartyInstallment.js';
import {
  calculateInstallmentDueDates,
  buildDueDate,
} from '../utils/installmentDates.js';

export class CreateThirdPartyDebtUseCase {
  constructor(debtRepository, cardRepository) {
    this.debtRepository = debtRepository;
    this.cardRepository = cardRepository;
  }

  async execute({
    userId,
    thirdPartyId,
    type,
    description,
    date,
    totalAmount,
    totalInstallments = 1,
    cardId = null,
    firstDueDate = null,
  }) {
    if (!thirdPartyId || !type || !description || !date || !totalAmount) {
      throw new Error('Third party debt required data is missing');
    }

    if (type !== 'a_pagar' && type !== 'a_receber') {
      throw new Error('Invalid type: must be "a_pagar" or "a_receber"');
    }

    const thirdPartyBelongsToUser =
      await this.debtRepository.thirdPartyBelongsToUser(thirdPartyId, userId);
    if (!thirdPartyBelongsToUser) {
      throw new Error('Third party not found');
    }

    const parsedInstallmentCount = Math.max(1, parseInt(totalInstallments, 10) || 1);
    const totalAmountInCents = parseInt(totalAmount, 10);
    if (isNaN(totalAmountInCents) || totalAmountInCents <= 0) {
      throw new Error('Total amount must be a positive integer in cents');
    }

    let resolvedCardId = null;
    let dueDates = [];

    if (type === 'a_receber' && cardId) {
      const cardBelongsToUser =
        await this.debtRepository.cardBelongsToUser(cardId, userId);
      if (!cardBelongsToUser) {
        throw new Error('Card not found');
      }

      const card = await this.cardRepository.findDateInformationByCardId(
        cardId,
        userId
      );
      if (!card) {
        throw new Error('Card date information not found');
      }

      resolvedCardId = cardId;
      dueDates = calculateInstallmentDueDates({
        transactionDate: date,
        closingDay: card.closingDay,
        dueDay: card.dueDay,
        totalInstallments: parsedInstallmentCount,
      });
    } else {
      const initialDate = firstDueDate || date;
      const [year, month, day] = String(initialDate)
        .slice(0, 10)
        .split('-')
        .map(Number);

      for (let i = 0; i < parsedInstallmentCount; i++) {
        const dueDate = buildDueDate(year, month - 1 + i, day);
        dueDates.push(dueDate);
      }
    }

    const debt = new ThirdPartyDebt({
      userId,
      thirdPartyId,
      type,
      description,
      date,
      totalAmount: totalAmountInCents,
      totalInstallments: parsedInstallmentCount,
      cardId: resolvedCardId,
    });

    const baseAmount = Math.floor(totalAmountInCents / parsedInstallmentCount);
    const remainder = totalAmountInCents % parsedInstallmentCount;

    const installments = [];
    for (let i = 0; i < parsedInstallmentCount; i++) {
      const installmentNumber = i + 1;
      const amount = i === 0 ? baseAmount + remainder : baseAmount;

      installments.push(
        new ThirdPartyInstallment({
          debtId: debt.id,
          installmentNumber,
          totalInstallments: parsedInstallmentCount,
          amount,
          dueDate: dueDates[i],
          paid: false,
          paymentDate: null,
        })
      );
    }

    return await this.debtRepository.createWithInstallments(debt, installments);
  }
}

