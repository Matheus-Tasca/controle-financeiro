export class DeleteTransactionUseCase {
  constructor(repository) {
    this.repository = repository;
  }

  /**
   * @param {string} id
   */
  async execute(id, userId) {
    if (!id) {
      throw new Error('Transaction ID is required');
    }

    const transactionExists = await this.repository.findById(id, userId);

    if (!transactionExists) {
      throw new Error('Transaction not found');
    }

    await this.repository.delete(id, userId);
  }
}
