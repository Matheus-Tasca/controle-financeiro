import { InvestmentBankRepository } from '../repositories/InvestmentBankRepository.js';
import { InvestmentMovementRepository } from '../repositories/InvestmentMovementRepository.js';
import { CreateInvestmentBankUseCase } from '../../useCases/CreateInvestmentBank.js';
import { UpdateInvestmentBankUseCase } from '../../useCases/UpdateInvestmentBank.js';
import { DeleteInvestmentBankUseCase } from '../../useCases/DeleteInvestmentBank.js';
import { GetAllInvestmentBanksUseCase } from '../../useCases/GetAllInvestmentBanks.js';
import { CreateInvestmentMovementUseCase } from '../../useCases/CreateInvestmentMovement.js';
import { GetInvestmentsSummaryUseCase } from '../../useCases/GetInvestmentsSummary.js';
import {
  sendInternalError,
  sendPublicError,
} from '../../../../shared/infra/http/errors.js';

export class InvestmentController {
  async getSummary(req, res) {
    try {
      const bankRepo = new InvestmentBankRepository();
      const movementRepo = new InvestmentMovementRepository();
      const useCase = new GetInvestmentsSummaryUseCase(bankRepo, movementRepo);

      const summary = await useCase.execute({
        userId: req.userId,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
      });

      return res.status(200).json(summary);
    } catch (error) {
      return sendInternalError(req, res, error, 'investment.summary');
    }
  }

  async getAllBanks(req, res) {
    try {
      const bankRepo = new InvestmentBankRepository();
      const useCase = new GetAllInvestmentBanksUseCase(bankRepo);

      const banks = await useCase.execute(req.userId, {
        activeOnly: req.query.activeOnly === 'true',
      });

      return res.status(200).json({ data: banks });
    } catch (error) {
      return sendInternalError(req, res, error, 'investment.banks.list');
    }
  }

  async createBank(req, res) {
    try {
      const { name, initialBalance } = req.body || {};
      const bankRepo = new InvestmentBankRepository();
      const movementRepo = new InvestmentMovementRepository();
      const useCase = new CreateInvestmentBankUseCase(bankRepo, movementRepo);

      const bank = await useCase.execute({
        userId: req.userId,
        name,
        initialBalance,
      });

      return res.status(201).json({
        message: 'Banco criado com sucesso',
        data: bank,
      });
    } catch (error) {
      return sendPublicError(req, res, error, {
        operation: 'investment.bank.create',
        messages: [
          'Bank name is required',
          'Bank with this name already exists',
        ],
      });
    }
  }

  async updateBank(req, res) {
    try {
      const { id } = req.params;
      const { name, active } = req.body || {};
      const bankRepo = new InvestmentBankRepository();
      const useCase = new UpdateInvestmentBankUseCase(bankRepo);

      const updated = await useCase.execute({
        id,
        userId: req.userId,
        name,
        active,
      });

      return res.status(200).json({
        message: 'Banco atualizado com sucesso',
        data: updated,
      });
    } catch (error) {
      return sendPublicError(req, res, error, {
        operation: 'investment.bank.update',
        messages: [
          'Bank ID is required',
          'Bank not found',
          'Bank name already in use',
        ],
      });
    }
  }

  async deleteBank(req, res) {
    try {
      const { id } = req.params;
      const bankRepo = new InvestmentBankRepository();
      const useCase = new DeleteInvestmentBankUseCase(bankRepo);

      await useCase.execute(id, req.userId);

      return res.status(200).json({ message: 'Banco desativado com sucesso' });
    } catch (error) {
      return sendPublicError(req, res, error, {
        operation: 'investment.bank.delete',
        messages: ['Bank ID is required', 'Bank not found'],
      });
    }
  }

  async createMovement(req, res) {
    try {
      const { bankId, type, amount, newBalance, date } = req.body || {};
      const bankRepo = new InvestmentBankRepository();
      const movementRepo = new InvestmentMovementRepository();
      const useCase = new CreateInvestmentMovementUseCase(
        bankRepo,
        movementRepo
      );

      const result = await useCase.execute({
        userId: req.userId,
        bankId,
        type,
        amount,
        newBalance,
        date,
      });

      return res.status(201).json({
        message: 'Movimentação registrada com sucesso',
        data: result,
      });
    } catch (error) {
      return sendPublicError(req, res, error, {
        operation: 'investment.movement.create',
        messages: [
          'Bank ID is required',
          'Invalid movement type. Must be "aporte" or "retirada"',
          'Bank not found',
          'Novo saldo ou valor do aporte é obrigatório',
          'O valor da retirada deve ser maior que zero',
          'Saldo insuficiente para realizar a retirada',
        ],
      });
    }
  }
}

