import { Installment } from '../entities/Installment.js';
import { Transaction } from '../entities/Transaction.js';
import { calculateInstallmentDueDates } from '../utils/installmentDates.js';

const PAYMENT_METHOD_CREDIT_CARD = 'cartao_credito';

export class CreateTransactionUseCase {
  constructor(transactionRepository, cardRepository) {
    this.transactionRepository = transactionRepository;
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

    const categoryBelongsToUser =
      await this.transactionRepository.categoryBelongsToUser(categoryId, userId);
    if (!categoryBelongsToUser) {
      throw new Error('Entry category not found');
    }

    if (cardId) {
      const cardBelongsToUser =
        await this.transactionRepository.cardBelongsToUser(cardId, userId);
      if (!cardBelongsToUser) {
        throw new Error('Card not found');
      }
    }

    const transaction = new Transaction({
      userId,
      description,
      categoryId,
      transactionType,
      date,
      paymentMethodId,
      cardId,
    });

    const installments = await this.generateInstallments({
      transactionId: transaction.id,
      paymentMethodId,
      installmentData: installment,
      transactionDate: date,
      cardId,
      userId,
    });

    try {
      return await this.transactionRepository.createWithInstallments(
        transaction,
        installments
      );
    } catch (error) {
      throw new Error(
        `Failed to create transaction and installments: ${error.message || error}`
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
    const totalInstallmentCount = isCreditCard
      ? installmentData.totalInstallments || 1
      : 1;

    const totalAmountInCents = installmentData.amount;
    const baseInstallmentAmountInCents = Math.floor(
      totalAmountInCents / totalInstallmentCount
    );
    const remainderCents = totalAmountInCents % totalInstallmentCount;

    if (isCreditCard) {
      const card = await this.cardRepository.findDateInformationByCardId(
        cardId,
        userId
      );
      if (!card) {
        throw new Error('Card not found');
      }

      const { closingDay, dueDay } = card;
      const dueDates = calculateInstallmentDueDates({
        transactionDate,
        closingDay,
        dueDay,
        totalInstallments: totalInstallmentCount,
      });

      const installments = [];
      for (
        let currentInstallmentNumber = 1;
        currentInstallmentNumber <= totalInstallmentCount;
        currentInstallmentNumber++
      ) {
        const isFirstInstallment = currentInstallmentNumber === 1;
        // O valor restante da divisão inteira de centavos é adicionado à primeira parcela
        const installmentAmount = isFirstInstallment
          ? baseInstallmentAmountInCents + remainderCents
          : baseInstallmentAmountInCents;

        installments.push(
          new Installment({
            transactionId,
            installmentNumber: currentInstallmentNumber,
            totalInstallments: totalInstallmentCount,
            amount: installmentAmount,
            dueDate: dueDates[currentInstallmentNumber - 1],
          })
        );
      }

      return installments;
    }

    return [
      new Installment({
        transactionId,
        installmentNumber: 1,
        totalInstallments: 1,
        amount: totalAmountInCents,
        dueDate: transactionDate,
      }),
    ];
  }
}
