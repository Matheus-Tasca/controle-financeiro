import { TransactionRepository } from '../repositories/TransactionRepository.js';
import { CardRepository } from '../repositories/CardRepository.js';
import { CreateTransactionUseCase } from '../../useCases/CreateTransaction.js';
import { UpdateTransactionUseCase } from '../../useCases/UpdateTransaction.js';
import { DeleteTransactionUseCase } from '../../useCases/DeleteTransactionUseCase.js';
import { GetDashboardUseCase } from '../../useCases/GetDashboard.js';
import { GetTopCategories } from '../../useCases/GetTopCategories.js';
import { GetTransactionStatement } from '../../useCases/GetTransactionStatement.js';
import {
  sendInternalError,
  sendPublicError,
} from '../../../../shared/infra/http/errors.js';

export class TransactionController {
  async createTransaction(req, res) {
    try {
      const transactionRepository = new TransactionRepository();
      const cardRepository = new CardRepository();
      const useCase = new CreateTransactionUseCase(
        transactionRepository,
        cardRepository
      );

      await useCase.execute({ ...req.body, userId: req.userId });

      return res
        .status(201)
        .json({ message: 'Transaction created successfully' });
    } catch (error) {
      return sendPublicError(req, res, error, {
        operation: 'transaction.create',
        messages: [
          'Transaction required data is missing',
          'Entry category not found',
          'Card not found',
        ],
      });
    }
  }

  async updateTransaction(req, res) {
    try {
      const { id } = req.params;

      const repository = new TransactionRepository();
      const useCase = new UpdateTransactionUseCase(repository);

      const updatedTransaction = await useCase.execute({
        id,
        userId: req.userId,
        description: req.body?.description,
        categoryId: req.body?.categoryId,
        transactionType: req.body?.transactionType,
        date: req.body?.date,
        paymentMethodId: req.body?.paymentMethodId,
        cardId: req.body?.cardId,
      });

      return res.status(200).json({
        message: 'Transaction updated successfully',
        data: updatedTransaction,
      });
    } catch (error) {
      const statusCode = error.message === 'Transaction not found' ? 404 : 400;
      return sendPublicError(req, res, error, {
        status: statusCode,
        operation: 'transaction.update',
        messages: [
          'Transaction ID is required',
          'Transaction not found',
          'Entry category not found',
          'Card not found',
        ],
      });
    }
  }

  async deleteTransaction(req, res) {
    try {
      const { id } = req.params;

      const repository = new TransactionRepository();
      const useCase = new DeleteTransactionUseCase(repository);

      await useCase.execute(id, req.userId);

      return res
        .status(200)
        .json({ message: 'Transaction deleted successfully' });
    } catch (error) {
      const statusCode = error.message === 'Transaction not found' ? 404 : 400;
      return sendPublicError(req, res, error, {
        status: statusCode,
        operation: 'transaction.delete',
        messages: ['Transaction ID is required', 'Transaction not found'],
      });
    }
  }

  async getDashboard(req, res) {
    try {
      const transactionRepository = new TransactionRepository();
      const useCase = new GetDashboardUseCase(transactionRepository);

      const data = await useCase.execute(req.userId);

      return res.status(200).json({ ...data });
    } catch (error) {
      return sendInternalError(req, res, error, 'dashboard.get');
    }
  }

  async getTopCategories(req, res) {
    try {
      const repository = new TransactionRepository();
      const useCase = new GetTopCategories(repository);
      const data = await useCase.execute(req.userId);
      return res.status(200).json(data);
    } catch (error) {
      return sendInternalError(req, res, error, 'dashboard.topCategories');
    }
  }

  async getStatement(req, res) {
    try {
      const { startDate, endDate } = req.query;
      if (
        !startDate ||
        !endDate ||
        !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
      ) {
        return res.status(400).json({
          error: 'startDate and endDate are required in YYYY-MM-DD format',
        });
      }
      if (startDate > endDate) {
        return res
          .status(400)
          .json({ error: 'startDate must be before or equal to endDate' });
      }
      const repository = new TransactionRepository();
      const useCase = new GetTransactionStatement(repository);
      const data = await useCase.execute({
        startDate,
        endDate,
        userId: req.userId,
      });
      return res.status(200).json(data);
    } catch (error) {
      return sendInternalError(req, res, error, 'transaction.statement');
    }
  }
}
