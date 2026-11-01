export class UpdateThirdPartyUseCase {
  constructor(repository) {
    this.repository = repository;
  }

  async execute({ id, userId, name, active }) {
    if (!id) {
      throw new Error('Third party ID is required');
    }

    const thirdParty = await this.repository.findById(id, userId);
    if (!thirdParty) {
      throw new Error('Third party not found');
    }

    if (name !== undefined) {
      const trimmedName = typeof name === 'string' ? name.trim() : '';
      if (!trimmedName) {
        throw new Error('Third party name cannot be empty');
      }

      const duplicate = await this.repository.findByName(trimmedName, userId);
      if (duplicate && duplicate.id !== id) {
        throw new Error('Third party with this name already exists');
      }

      thirdParty.name = trimmedName;
    }

    if (active !== undefined) {
      thirdParty.active = Boolean(active);
    }

    thirdParty.updatedAt = new Date();

    return await this.repository.save(thirdParty);
  }
}

