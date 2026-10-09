export class DeleteEntryCategoryUseCase {
  constructor(repository) {
    this.repository = repository;
  }

  /**
   * @param {string} id
   */
  async execute(id, userId) {
    if (!id) {
      throw new Error('Entry category ID is required');
    }

    const categoryExists = await this.repository.findById(id, userId);

    if (!categoryExists) {
      throw new Error('Entry category not found');
    }

    await this.repository.delete(id, userId);
  }
}
