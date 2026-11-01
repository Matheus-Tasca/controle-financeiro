function normalizeFilters(input) {
  if (typeof input === 'object' && input !== null) {
    return {
      userId: input.userId,
      startDate: input.startDate,
      endDate: input.endDate,
    };
  }
  return { userId: input };
}

export class GetTopCategories {
  constructor(repository) {
    this.repository = repository;
  }

  async execute(input) {
    const { userId, startDate, endDate } = normalizeFilters(input);

    try {
      return await this.repository.getTopCategories(userId, startDate, endDate);
    } catch (error) {
      throw new Error(`Error getting top categories: ${error.message || error}`);
    }
  }
}
