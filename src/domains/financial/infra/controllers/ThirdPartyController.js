import { ThirdPartyRepository } from '../repositories/ThirdPartyRepository.js';
import { CreateThirdPartyUseCase } from '../../useCases/CreateThirdPartyUseCase.js';
import { GetAllThirdPartiesUseCase } from '../../useCases/GetAllThirdPartiesUseCase.js';
import { UpdateThirdPartyUseCase } from '../../useCases/UpdateThirdPartyUseCase.js';
import { DeleteThirdPartyUseCase } from '../../useCases/DeleteThirdPartyUseCase.js';
import {
  sendInternalError,
  sendPublicError,
} from '../../../../shared/infra/http/errors.js';

export class ThirdPartyController {
  async getAllThirdParties(req, res) {
    try {
      const repository = new ThirdPartyRepository();
      const useCase = new GetAllThirdPartiesUseCase(repository);
      const data = await useCase.execute({
        userId: req.userId,
        type: req.query.type,
        withBalances: req.query.withBalances !== 'false',
        activeOnly: req.query.activeOnly === 'true',
      });
      return res.status(200).json({ data });
    } catch (error) {
      return sendInternalError(req, res, error, 'thirdParty.list');
    }
  }

  async createThirdParty(req, res) {
    try {
      const repository = new ThirdPartyRepository();
      const useCase = new CreateThirdPartyUseCase(repository);

      const thirdParty = await useCase.execute({
        userId: req.userId,
        name: req.body?.name,
      });

      return res.status(201).json({
        message: 'Third party created successfully',
        data: thirdParty,
      });
    } catch (error) {
      return sendPublicError(req, res, error, {
        operation: 'thirdParty.create',
        messages: [
          'Third party name is required',
          'Third party with this name already exists',
        ],
      });
    }
  }

  async updateThirdParty(req, res) {
    try {
      const { id } = req.params;
      const repository = new ThirdPartyRepository();
      const useCase = new UpdateThirdPartyUseCase(repository);

      const updated = await useCase.execute({
        id,
        userId: req.userId,
        name: req.body?.name,
        active: req.body?.active,
      });

      return res.status(200).json({
        message: 'Third party updated successfully',
        data: updated,
      });
    } catch (error) {
      const statusCode = error.message === 'Third party not found' ? 404 : 400;
      return sendPublicError(req, res, error, {
        status: statusCode,
        operation: 'thirdParty.update',
        messages: [
          'Third party ID is required',
          'Third party not found',
          'Third party name cannot be empty',
          'Third party with this name already exists',
        ],
      });
    }
  }

  async deleteThirdParty(req, res) {
    try {
      const { id } = req.params;
      const repository = new ThirdPartyRepository();
      const useCase = new DeleteThirdPartyUseCase(repository);

      const result = await useCase.execute(id, req.userId);

      return res.status(200).json({
        message: result.deactivated
          ? 'Third party deactivated successfully'
          : 'Third party deleted successfully',
        ...result,
      });
    } catch (error) {
      const statusCode = error.message === 'Third party not found' ? 404 : 400;
      return sendPublicError(req, res, error, {
        status: statusCode,
        operation: 'thirdParty.delete',
        messages: ['Third party ID is required', 'Third party not found'],
      });
    }
  }
}

