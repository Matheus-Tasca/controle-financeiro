export class DeleteInvestmentBankUseCase {
  constructor(repository) {
    this.repository = repository;
  }

  async execute(id, userId) {
    if (!id) {
      throw new Error('Bank ID is required');
    }

    const bankExists = await this.repository.findById(id, userId);
    if (!bankExists) {
      throw new Error('Bank not found');
    }

    await this.repository.deactivate(id, userId);
  }
}

