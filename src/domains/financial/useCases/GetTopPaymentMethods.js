export class GetTopPaymentMethods {
  constructor(repository) {
    this.repository = repository;
  }

  async execute(userId) {
    try {
      return await this.repository.getTopPaymentMethods(userId);
    } catch (error) {
      throw new Error(`Error getting top payment methods ${error}`);
    }
  }
}
