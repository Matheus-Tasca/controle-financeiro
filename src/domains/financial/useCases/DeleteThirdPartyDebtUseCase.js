export class DeleteThirdPartyDebtUseCase {
  constructor(debtRepository) {
    this.debtRepository = debtRepository;
  }

  async execute(id, userId) {
    if (!id) {
      throw new Error('Debt ID is required');
    }

    const debt = await this.debtRepository.findById(id, userId);
    if (!debt) {
      throw new Error('Debt not found');
    }

    await this.debtRepository.delete(id, userId);
    return { deleted: true };
  }
}

