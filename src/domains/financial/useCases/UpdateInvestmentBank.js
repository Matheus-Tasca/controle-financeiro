export class UpdateInvestmentBankUseCase {
  constructor(repository) {
    this.repository = repository;
  }

  async execute({ id, userId, name, active }) {
    if (!id) {
      throw new Error('Bank ID is required');
    }

    const bank = await this.repository.findById(id, userId);
    if (!bank) {
      throw new Error('Bank not found');
    }

    if (name && typeof name === 'string' && name.trim()) {
      const trimmedName = name.trim();
      if (trimmedName !== bank.name) {
        const existsWithName = await this.repository.findByName(
          trimmedName,
          userId
        );
        if (existsWithName) {
          throw new Error('Bank name already in use');
        }
        bank.name = trimmedName;
      }
    }

    if (active !== undefined && active !== null) {
      bank.active = Boolean(active);
    }
    bank.updatedAt = new Date();

    return await this.repository.save(bank);
  }
}

