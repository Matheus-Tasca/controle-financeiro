import { CardRepository } from '../repositories/CardRepository.js';
import { CreateCardUseCase } from '../../useCases/CreateCard.js';
import { UpdateCardUseCase } from '../../useCases/UpdateCard.js';
import { DeleteCardUseCase } from '../../useCases/DeleteCardUseCase.js';
import { GetAllCardsUseCase } from '../../useCases/GetAllCards.js';
import {
  sendInternalError,
  sendPublicError,
} from '../../../../shared/infra/http/errors.js';

export class CardController {
  async getAllCards(req, res) {
    try {
      const repository = new CardRepository();
      const useCase = new GetAllCardsUseCase(repository);
      const data = await useCase.execute({
        userId: req.userId,
        activeOnly: req.query.activeOnly === 'true',
      });
      return res.status(200).json({ data });
    } catch (error) {
      return sendInternalError(req, res, error, 'card.list');
    }
  }

  async createCard(req, res) {
    try {
      const repository = new CardRepository();
      const useCase = new CreateCardUseCase(repository);

      await useCase.execute({ ...req.body, userId: req.userId });

      return res.status(201).json({ message: 'Card created successfully' });
    } catch (error) {
      return sendPublicError(req, res, error, {
        operation: 'card.create',
        messages: [
          'Card required data is missing',
          'Card with this name already exists',
        ],
      });
    }
  }

  async updateCard(req, res) {
    try {
      const { id } = req.params;

      const repository = new CardRepository();
      const useCase = new UpdateCardUseCase(repository);

      const updatedCard = await useCase.execute({
        id,
        userId: req.userId,
        name: req.body?.name,
        closingDay: req.body?.closingDay,
        dueDay: req.body?.dueDay,
        active: req.body?.active,
      });

      return res.status(200).json({
        message: 'Card updated successfully',
        data: updatedCard,
      });
    } catch (error) {
      const statusCode = error.message === 'Card not found' ? 404 : 400;
      return sendPublicError(req, res, error, {
        status: statusCode,
        operation: 'card.update',
        messages: [
          'Card ID is required',
          'Card not found',
          'Card name already in use',
        ],
      });
    }
  }

  async deleteCard(req, res) {
    try {
      const { id } = req.params;

      const repository = new CardRepository();
      const useCase = new DeleteCardUseCase(repository);

      await useCase.execute(id, req.userId);

      return res.status(200).json({ message: 'Card deleted successfully' });
    } catch (error) {
      const statusCode = error.message === 'Card not found' ? 404 : 400;
      return sendPublicError(req, res, error, {
        status: statusCode,
        operation: 'card.delete',
        messages: ['Card ID is required', 'Card not found'],
      });
    }
  }
}
