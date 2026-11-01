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

export class GetDashboardUseCase {
  constructor(repository) {
    this.repository = repository;
  }

  async execute(input) {
    const { userId, startDate, endDate } = normalizeFilters(input);

    try {
      const incomes = await this.repository.getDashboardIncomes(
        userId,
        startDate,
        endDate
      );
      const expenses = await this.repository.getDashboardExpenses(
        userId,
        startDate,
        endDate
      );

      return {
        incomes,
        expenses,
      };
    } catch (error) {
      throw new Error(`Error getting dashboard: ${error.message || error}`);
    }
  }
}
