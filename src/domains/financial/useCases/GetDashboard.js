export class GetDashboardUseCase {
  constructor(repository) {
    this.repository = repository;
  }

  async execute(userId) {
    try {
      const incomes = await this.repository.getDashboardIncomes(userId);
      const expenses = await this.repository.getDashboardExpenses(userId);

      return {
        incomes,
        expenses,
      };
    } catch (error) {
      throw new Error(`Error getting dashboard ${error}`);
    }
  }
}
