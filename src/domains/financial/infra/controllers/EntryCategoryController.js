import { EntryCategoryRepository } from '../repositories/EntryCategoryRepository.js';
import { CreateEntryCategoryUseCase } from '../../useCases/CreateEntryCategoryUseCase.js';
import { UpdateEntryCategoryUseCase } from '../../useCases/UpdateEntryCategoryUseCase.js';
import { DeleteEntryCategoryUseCase } from '../../useCases/DeleteEntryCategoryUseCase.js';
import { GetAllCategories } from '../../useCases/GetAllCategories.js';
import {
  sendInternalError,
  sendPublicError,
} from '../../../../shared/infra/http/errors.js';

export class EntryCategoryController {
  async getAllEntryCategories(req, res) {
    try {
      const repository = new EntryCategoryRepository();
      const useCase = new GetAllCategories(repository);
      const data = await useCase.execute(req.userId);
      return res.status(200).json({ data });
    } catch (error) {
      return sendInternalError(req, res, error, 'category.list');
    }
  }

  async createEntryCategory(req, res) {
    try {
      const repository = new EntryCategoryRepository();
      const useCase = new CreateEntryCategoryUseCase(repository);

      const category = await useCase.execute({
        ...req.body,
        userId: req.userId,
      });

      return res.status(201).json({
        message: 'Entry category created successfully',
        data: category,
      });
    } catch (error) {
      const statusCode =
        error.message === 'Entry category already exists' ? 409 : 400;
      return sendPublicError(req, res, error, {
        status: statusCode,
        operation: 'category.create',
        messages: ['Description is required', 'Entry category already exists'],
      });
    }
  }

  async updateEntryCategory(req, res) {
    try {
      const { id } = req.params;

      const repository = new EntryCategoryRepository();
      const useCase = new UpdateEntryCategoryUseCase(repository);

      const updatedCategory = await useCase.execute({
        id,
        userId: req.userId,
        description: req.body?.description,
        active: req.body?.active,
      });

      return res.status(200).json({
        message: 'Entry category updated successfully',
        data: updatedCategory,
      });
    } catch (error) {
      const statusCode =
        error.message === 'Entry category not found' ? 404 : 400;
      return sendPublicError(req, res, error, {
        status: statusCode,
        operation: 'category.update',
        messages: [
          'Entry category ID is required',
          'Entry category not found',
          'Entry category description already in use',
        ],
      });
    }
  }

  async deleteEntryCategory(req, res) {
    try {
      const { id } = req.params;

      const repository = new EntryCategoryRepository();
      const useCase = new DeleteEntryCategoryUseCase(repository);

      await useCase.execute(id, req.userId);

      return res
        .status(200)
        .json({ message: 'Entry category deleted successfully' });
    } catch (error) {
      const statusCode =
        error.message === 'Entry category not found' ? 404 : 400;
      return sendPublicError(req, res, error, {
        status: statusCode,
        operation: 'category.delete',
        messages: ['Entry category ID is required', 'Entry category not found'],
      });
    }
  }
}
