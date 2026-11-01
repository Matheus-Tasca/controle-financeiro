export class GetAllThirdPartiesUseCase {
  constructor(repository) {
    this.repository = repository;
  }

  async execute({ userId, type, withBalances = true, activeOnly = false } = {}) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (withBalances) {
      return await this.repository.getBalances(userId, { type });
    }

    return await this.repository.findAll(userId, { activeOnly });
  }
}

