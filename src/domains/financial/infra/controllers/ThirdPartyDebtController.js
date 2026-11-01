import { ThirdPartyDebtRepository } from '../repositories/ThirdPartyDebtRepository.js';
import { CardRepository } from '../repositories/CardRepository.js';
import { CreateThirdPartyDebtUseCase } from '../../useCases/CreateThirdPartyDebtUseCase.js';
import { DeleteThirdPartyDebtUseCase } from '../../useCases/DeleteThirdPartyDebtUseCase.js';
import { UpdateThirdPartyInstallmentPaymentUseCase } from '../../useCases/UpdateThirdPartyInstallmentPaymentUseCase.js';
import { GetThirdPartyStatementUseCase } from '../../useCases/GetThirdPartyStatementUseCase.js';
import {
  sendInternalError,
  sendPublicError,
} from '../../../../shared/infra/http/errors.js';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class ThirdPartyDebtController {
  async createDebt(req, res) {
    try {
      const debtRepository = new ThirdPartyDebtRepository();
      const cardRepository = new CardRepository();
      const useCase = new CreateThirdPartyDebtUseCase(
        debtRepository,
        cardRepository
      );

      const debt = await useCase.execute({
        userId: req.userId,
        thirdPartyId: req.body?.thirdPartyId,
        type: req.body?.type,
        description: req.body?.description,
        date: req.body?.date,
        totalAmount: req.body?.totalAmount,
        totalInstallments: req.body?.totalInstallments,
        cardId: req.body?.cardId,
        firstDueDate: req.body?.firstDueDate,
      });

      return res.status(201).json({
        message: 'Third party debt created successfully',
        data: debt,
      });
    } catch (error) {
      return sendPublicError(req, res, error, {
        operation: 'thirdPartyDebt.create',
        messages: [
          'Third party debt required data is missing',
          'Invalid type: must be "a_pagar" or "a_receber"',
          'Third party not found',
          'Card not found',
          'Card date information not found',
          'Total amount must be a positive integer in cents',
        ],
      });
    }
  }

  async deleteDebt(req, res) {
    try {
      const { id } = req.params;
      const debtRepository = new ThirdPartyDebtRepository();
      const useCase = new DeleteThirdPartyDebtUseCase(debtRepository);

      await useCase.execute(id, req.userId);

      return res.status(200).json({
        message: 'Third party debt deleted successfully',
      });
    } catch (error) {
      const statusCode = error.message === 'Debt not found' ? 404 : 400;
      return sendPublicError(req, res, error, {
        status: statusCode,
        operation: 'thirdPartyDebt.delete',
        messages: ['Debt ID is required', 'Debt not found'],
      });
    }
  }

  async updateInstallmentPayment(req, res) {
    try {
      const { id } = req.params;
      const debtRepository = new ThirdPartyDebtRepository();
      const useCase = new UpdateThirdPartyInstallmentPaymentUseCase(
        debtRepository
      );

      const result = await useCase.execute({
        installmentId: id,
        userId: req.userId,
        paid: req.body?.paid,
        paymentDate: req.body?.paymentDate,
      });

      return res.status(200).json({
        message: 'Installment payment updated successfully',
        data: result,
      });
    } catch (error) {
      const statusCode = error.message === 'Installment not found' ? 404 : 400;
      return sendPublicError(req, res, error, {
        status: statusCode,
        operation: 'thirdPartyDebt.updatePayment',
        messages: ['Installment ID is required', 'Installment not found'],
      });
    }
  }

  async getStatement(req, res) {
    try {
      const { startDate, endDate, thirdPartyId, type } = req.query;

      if (startDate && !ISO_DATE_PATTERN.test(startDate)) {
        return res
          .status(400)
          .json({ error: 'startDate must be in YYYY-MM-DD format' });
      }

      if (endDate && !ISO_DATE_PATTERN.test(endDate)) {
        return res
          .status(400)
          .json({ error: 'endDate must be in YYYY-MM-DD format' });
      }

      if (startDate && endDate && startDate > endDate) {
        return res
          .status(400)
          .json({ error: 'startDate must be before or equal to endDate' });
      }

      const debtRepository = new ThirdPartyDebtRepository();
      const useCase = new GetThirdPartyStatementUseCase(debtRepository);

      const statement = await useCase.execute({
        userId: req.userId,
        thirdPartyId: thirdPartyId || null,
        type: type || null,
        startDate: startDate || null,
        endDate: endDate || null,
      });

      return res.status(200).json({ data: statement });
    } catch (error) {
      return sendInternalError(req, res, error, 'thirdPartyDebt.statement');
    }
  }
}

