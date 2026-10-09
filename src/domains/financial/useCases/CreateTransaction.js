import { Installment } from '../entities/Installment.js';
import { Transaction } from '../entities/Transaction.js';
import { calculateInstallmentDueDates } from '../utils/installmentDates.js';

const PAYMENT_METHOD_CREDIT_CARD = 'cartao_credito';

export class CreateTransactionUseCase {
  constructor(transacitonRepository, cardRepository) {
    this.transacitonRepository = transacitonRepository;
    this.cardRepository = cardRepository;
  }

  async execute({
    userId,
    description,
    categoryId,
    transactionType,
    date,
    paymentMethodId,
    cardId,
    installment,
  }) {
    if (
      !categoryId ||
      !transactionType ||
      !paymentMethodId ||
      !installment?.amount ||
      !date
    ) {
      throw new Error('Transaction required data is missing');
    }
    if (
      !(await this.transacitonRepository.categoryBelongsToUser(
        categoryId,
        userId
      ))
    ) {
      throw new Error('Entry category not found');
    }
    if (
      cardId &&
      !(await this.transacitonRepository.cardBelongsToUser(cardId, userId))
    ) {
      throw new Error('Card not found');
    }

    const newTransaction = new Transaction({
      userId,
      description,
      categoryId,
      transactionType,
      date,
      paymentMethodId,
      cardId,
    });

    const installments = await this.generateInstallments({
      transactionId: newTransaction.id,
      paymentMethodId,
      installmentData: installment,
      transactionDate: date,
      cardId,
      userId,
    });

    try {
      return await this.transacitonRepository.createWithInstallments(
        newTransaction,
        installments
      );
    } catch (error) {
      throw new Error(
        `Failed to create transaction and installments:  ${error}`
      );
    }
  }

  async generateInstallments({
    transactionId,
    paymentMethodId,
    installmentData,
    transactionDate,
    cardId,
    userId,
  }) {
    const isCreditCard = paymentMethodId === PAYMENT_METHOD_CREDIT_CARD;
    const totalInstallments = isCreditCard
      ? installmentData.totalInstallments || 1
      : 1;
    const totalAmount = installmentData.amount;
    const baseValue = Math.floor(totalAmount / totalInstallments);
    const cents = totalAmount % totalInstallments;
    const installments = [];

    if (isCreditCard) {
      const card = await this.cardRepository.findDateInformationByCardId(
        cardId,
        userId
      );
      if (!card) throw new Error('Card not found');
      const { closingDay, dueDay } = card;
      const dueDates = calculateInstallmentDueDates({
        transactionDate,
        closingDay,
        dueDay,
        totalInstallments,
      });

      for (
        let currentInstallment = 1;
        currentInstallment <= totalInstallments;
        currentInstallment++
      ) {
        const firstInstallment = currentInstallment === 1;
        installments.push(
          new Installment({
            transactionId,
            installmentNumber: currentInstallment,
            totalInstallments,
            amount: firstInstallment ? baseValue + cents : baseValue,
            dueDate: dueDates[currentInstallment - 1],
          })
        );
      }

      return installments;
    }

    installments.push(
      new Installment({
        transactionId,
        installmentNumber: 1,
        totalInstallments,
        amount: baseValue,
        dueDate: transactionDate,
      })
    );

    return installments;
  }
}
