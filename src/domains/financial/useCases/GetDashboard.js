export class GetDashboardUseCase {
  constructor(repository) {
    this.repository = repository;
  }

  async execute(input) {
    const { userId, startDate, endDate } =
      typeof input === 'object' && input !== null ? input : { userId: input };

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
      throw new Error(`Error getting dashboard ${error}`);
    }
  }
}
