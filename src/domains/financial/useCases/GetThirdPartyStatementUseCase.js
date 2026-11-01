import { toDateString } from '../utils/installmentDates.js';

export class GetThirdPartyStatementUseCase {
  constructor(debtRepository) {
    this.debtRepository = debtRepository;
  }

  async execute({ userId, thirdPartyId, type, startDate, endDate }) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const rawRecords = await this.debtRepository.getStatement({
      userId,
      thirdPartyId,
      type,
      startDate,
      endDate,
    });

    const installments = rawRecords.map((record) => ({
      installmentId: record.installmentId,
      debtId: record.debtId,
      description: record.description || '',
      type: record.type,
      debtDate: toDateString(record.debtDate),
      dueDate: toDateString(record.dueDate),
      amount: Number(record.amount),
      installmentNumber: Number(record.installmentNumber),
      totalInstallments: Number(record.totalInstallments),
      paid: Boolean(record.paid),
      paymentDate: record.paymentDate ? toDateString(record.paymentDate) : null,
      thirdPartyId: record.thirdPartyId,
      thirdPartyName: record.thirdPartyName,
      cardName: record.cardName || null,
      cardId: record.cardId || null,
    }));

    const summary = installments.reduce(
      (acc, item) => {
        acc.totalAmount += item.amount;
        if (item.paid) {
          acc.totalPaid += item.amount;
        } else {
          acc.totalPending += item.amount;
        }

        if (item.type === 'a_receber') {
          acc.totalReceivable += item.amount;
          if (item.paid) {
            acc.paidReceivable += item.amount;
          } else {
            acc.pendingReceivable += item.amount;
          }
        } else if (item.type === 'a_pagar') {
          acc.totalPayable += item.amount;
          if (item.paid) {
            acc.paidPayable += item.amount;
          } else {
            acc.pendingPayable += item.amount;
          }
        }

        return acc;
      },
      {
        totalAmount: 0,
        totalPaid: 0,
        totalPending: 0,
        totalReceivable: 0,
        paidReceivable: 0,
        pendingReceivable: 0,
        totalPayable: 0,
        paidPayable: 0,
        pendingPayable: 0,
      }
    );

    summary.netBalance = summary.pendingReceivable - summary.pendingPayable;

    return {
      startDate: startDate || null,
      endDate: endDate || null,
      thirdPartyId: thirdPartyId || null,
      type: type || null,
      summary,
      installments,
    };
  }
}

