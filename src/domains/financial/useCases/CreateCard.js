import { Card } from '../entities/Card.js';

/**
 * @typedef {Object} CreateCardDTO
 * @property {string} userId
 * @property {string} name
 * @property {number} closingDay
 * @property {number} dueDay
 */

export class CreateCardUseCase {
  constructor(repository) {
    this.repository = repository;
  }

  /**
   * @param {CreateCardDTO} data
   */
  async execute({ userId, name, closingDay, dueDay }) {
    if (!name || !closingDay || !dueDay) {
      throw new Error('Card required data is missing');
    }

    const cardWithSameName = await this.repository.findByName(name, userId);
    if (cardWithSameName) {
      throw new Error('Card with this name already exists');
    }

    const newCard = new Card({
      userId,
      name,
      closingDay,
      dueDay,
    });

    await this.repository.save(newCard);
  }
}
