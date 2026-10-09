export class UpdateEntryCategoryUseCase {
  constructor(repository) {
    this.repository = repository;
  }

  /**
   * @param {Object} data
   * @param {string} data.id
   * @param {string} [data.description]
   * @param {boolean} [data.active]
   */
  async execute({ id, userId, description, active }) {
    if (!id) {
      throw new Error('Entry category ID is required');
    }

    const category = await this.repository.findById(id, userId);

    if (!category) {
      throw new Error('Entry category not found');
    }

    if (description !== undefined) {
      const categoryWithSameDescription =
        await this.repository.findByDescription(description, userId);

      if (
        categoryWithSameDescription &&
        categoryWithSameDescription.id !== id
      ) {
        throw new Error('Entry category description already in use');
      }
      category.description = description;
    }

    if (active !== undefined) {
      category.active = active;
    }

    try {
      return await this.repository.save(category);
    } catch (error) {
      throw new Error(`Failed to update entry category`, { cause: error });
    }
  }
}
