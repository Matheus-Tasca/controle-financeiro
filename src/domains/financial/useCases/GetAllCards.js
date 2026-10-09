export class GetAllCardsUseCase {
  constructor(repository) {
    this.repository = repository;
  }

  async execute(options = {}) {
    return this.repository.findAllWithTransactionsCount(options);
  }
}
