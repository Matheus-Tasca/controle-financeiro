import { EntryCategory } from '../entities/EntryCategory.js';

export class CreateEntryCategoryUseCase {
  constructor(repository) {
    this.repository = repository;
  }

  /**
   * @param {Object} data
   * @param {string} data.description
   * @param {boolean} [data.active]
   */
  async execute({ userId, description, active }) {
    if (!description) {
      throw new Error('Description is required');
    }

    const categoryExists = await this.repository.findByDescription(
      description,
      userId
    );

    if (categoryExists) {
      throw new Error('Entry category already exists');
    }

    const newEntryCategory = new EntryCategory({
      userId,
      description,
      active,
    });

    try {
      return await this.repository.save(newEntryCategory);
    } catch (error) {
      throw new Error(`Failed to create entry category`, { cause: error });
    }
  }
}
