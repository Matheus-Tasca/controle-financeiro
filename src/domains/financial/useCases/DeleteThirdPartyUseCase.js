export class DeleteThirdPartyUseCase {
  constructor(repository) {
    this.repository = repository;
  }

  async execute(id, userId) {
    if (!id) {
      throw new Error('Third party ID is required');
    }

    const thirdParty = await this.repository.findById(id, userId);
    if (!thirdParty) {
      throw new Error('Third party not found');
    }

    const debtCount = await this.repository.countDebts(id);
    if (debtCount > 0) {
      await this.repository.deactivate(id, userId);
      return { deactivated: true };
    }

    await this.repository.delete(id, userId);
    return { deleted: true };
  }
}

