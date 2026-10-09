export class GetAllPaymentMethods {
  constructor(repository) {
    this.repository = repository;
  }

  async execute(userId) {
    try {
      return await this.repository.getAllPaymentMethods(userId);
    } catch (error) {
      throw new Error(`Error getting all payment methods ${error}`);
    }
  }
}
