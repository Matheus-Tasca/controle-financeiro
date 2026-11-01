import { InvestmentBank } from '../entities/InvestmentBank.js';
import { InvestmentMovement } from '../entities/InvestmentMovement.js';

export class CreateInvestmentBankUseCase {
  constructor(bankRepository, movementRepository) {
    this.bankRepository = bankRepository;
    this.movementRepository = movementRepository;
  }

  async execute({ userId, name, initialBalance = 0 }) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new Error('Bank name is required');
    }

    const trimmedName = name.trim();
    const exists = await this.bankRepository.findByName(trimmedName, userId);
    if (exists) {
      throw new Error('Bank with this name already exists');
    }

    const balanceInCents = Math.max(0, Math.round(Number(initialBalance) || 0));

    const newBank = new InvestmentBank({
      userId,
      name: trimmedName,
      currentBalance: balanceInCents,
      active: true,
    });

    const savedBank = await this.bankRepository.save(newBank);

    if (balanceInCents > 0 && this.movementRepository) {
      const today = new Date().toISOString().split('T')[0];
      const movement = new InvestmentMovement({
        userId,
        bankId: savedBank.id,
        type: 'aporte',
        amount: balanceInCents,
        previousBalance: 0,
        newBalance: balanceInCents,
        date: today,
      });
      await this.movementRepository.save(movement);
    }

    return savedBank;
  }
}

