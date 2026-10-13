export class GetTopCategories {
  constructor(repository) {
    this.repository = repository;
  }

  async execute(input) {
    const { userId, startDate, endDate } =
      typeof input === 'object' && input !== null ? input : { userId: input };

    try {
      return await this.repository.getTopCategories(userId, startDate, endDate);
    } catch (error) {
      throw new Error(`Error getting dashboard ${error}`);
    }
  }
}
