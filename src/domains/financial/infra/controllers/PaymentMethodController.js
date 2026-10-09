import { PaymentMethodRepository } from '../repositories/PaymentMethodRepository.js';
import { GetTopPaymentMethods } from '../../useCases/GetTopPaymentMethods.js';
import { GetAllPaymentMethods } from '../../useCases/GetAllPaymentMethods.js';
import { TransactionSchema } from '../../../../shared/infra/typeorm/schemas/TransactionSchema.js';
import { InstallmentSchema } from '../../../../shared/infra/typeorm/schemas/InstallmentSchema.js';
import { sendInternalError } from '../../../../shared/infra/http/errors.js';

export class PaymentMethodController {
  constructor() {
    this.paymentMethodRepository = new PaymentMethodRepository(
      TransactionSchema,
      InstallmentSchema
    );
  }

  async getTopPaymentMethods(req, res) {
    try {
      const useCase = new GetTopPaymentMethods(this.paymentMethodRepository);
      const data = await useCase.execute(req.userId);
      return res.status(200).json({ data });
    } catch (error) {
      return sendInternalError(req, res, error, 'paymentMethods.top');
    }
  }

  async getAllPaymentMethods(req, res) {
    try {
      const useCase = new GetAllPaymentMethods(this.paymentMethodRepository);
      const data = await useCase.execute(req.userId);
      return res.status(200).json({ data });
    } catch (error) {
      return sendInternalError(req, res, error, 'paymentMethods.list');
    }
  }

  async getActivePaymentMethods(req, res) {
    try {
      const data = await this.paymentMethodRepository.getActivePaymentMethods();
      return res.status(200).json({ data });
    } catch (error) {
      return sendInternalError(req, res, error, 'paymentMethods.active');
    }
  }
}
