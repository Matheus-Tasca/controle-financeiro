/**
 * @typedef {Object} UpdateCardDTO
 * @property {string} id
 * @property {string} [name]
 * @property {number} [closingDay]
 * @property {number} [dueDay]
 */

export class UpdateCardUseCase {
  constructor(repository) {
    this.repository = repository;
  }

  /**
   * @param {UpdateCardDTO} data
   */
  async execute({ id, userId, name, closingDay, dueDay }) {
    if (!id) {
      throw new Error('Card ID is required');
    }

    const card = await this.repository.findById(id, userId);

    if (!card) {
      throw new Error('Card not found');
    }

    if (name && name !== card.name) {
      const existsWithName = await this.repository.findByName(name, userId);
      if (existsWithName) {
        throw new Error('Card name already in use');
      }
      card.name = name;
    }

    if (closingDay) card.closingDay = closingDay;
    if (dueDay) card.dueDay = dueDay;
    card.updatedAt = new Date();

    return await this.repository.save(card);
  }
}
