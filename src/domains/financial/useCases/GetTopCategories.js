export class GetTopCategories {
  constructor(repository) {
    this.repository = repository;
  }

  async execute(userId) {
    try {
      return await this.repository.getTopCategories(userId);
    } catch (error) {
      throw new Error(`Error getting dashboard ${error}`);
    }
  }
}
