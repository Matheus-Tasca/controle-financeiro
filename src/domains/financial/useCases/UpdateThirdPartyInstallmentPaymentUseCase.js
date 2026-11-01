import { todayAsString } from '../utils/installmentDates.js';

export class UpdateThirdPartyInstallmentPaymentUseCase {
  constructor(debtRepository) {
    this.debtRepository = debtRepository;
  }

  async execute({ installmentId, userId, paid, paymentDate }) {
    if (!installmentId) {
      throw new Error('Installment ID is required');
    }

    const installment = await this.debtRepository.findInstallmentById(
      installmentId,
      userId
    );
    if (!installment) {
      throw new Error('Installment not found');
    }

    const isPaid = Boolean(paid);
    const resolvedPaymentDate = isPaid ? paymentDate || todayAsString() : null;

    await this.debtRepository.updateInstallmentPayment(installmentId, {
      paid: isPaid,
      paymentDate: resolvedPaymentDate,
    });

    return {
      id: installmentId,
      paid: isPaid,
      paymentDate: resolvedPaymentDate,
    };
  }
}

