export class DeleteCardUseCase {
  constructor(repository) {
    this.repository = repository;
  }

  /**
   * @param {string} id
   */
  async execute(id, userId) {
    if (!id) {
      throw new Error('Card ID is required');
    }

    const cardExists = await this.repository.findById(id, userId);

    if (!cardExists) {
      throw new Error('Card not found');
    }

    await this.repository.deactivate(id, userId);
  }
}
