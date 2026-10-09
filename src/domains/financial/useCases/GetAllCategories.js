export class GetAllCategories {
  constructor(repository) {
    this.repository = repository;
  }

  async execute(userId) {
    try {
      return await this.repository.getAllCategories(userId);
    } catch (error) {
      throw new Error(`Error getting all categories ${error}`);
    }
  }
}
