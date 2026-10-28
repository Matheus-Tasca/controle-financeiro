export class GetAllInvestmentBanksUseCase {
  constructor(repository) {
    this.repository = repository;
  }

  async execute(userId, { activeOnly = false } = {}) {
    return this.repository.findAll(userId, { activeOnly });
  }
}

