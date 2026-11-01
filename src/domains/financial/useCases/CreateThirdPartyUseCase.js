import { ThirdParty } from '../entities/ThirdParty.js';

export class CreateThirdPartyUseCase {
  constructor(repository) {
    this.repository = repository;
  }

  async execute({ userId, name }) {
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (!trimmedName) {
      throw new Error('Third party name is required');
    }

    const existing = await this.repository.findByName(trimmedName, userId);
    if (existing) {
      throw new Error('Third party with this name already exists');
    }

    const thirdParty = new ThirdParty({
      userId,
      name: trimmedName,
      active: true,
    });

    return await this.repository.save(thirdParty);
  }
}

