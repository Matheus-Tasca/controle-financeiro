import { InvestmentMovement } from '../entities/InvestmentMovement.js';

export class CreateInvestmentMovementUseCase {
  constructor(bankRepository, movementRepository) {
    this.bankRepository = bankRepository;
    this.movementRepository = movementRepository;
  }

  async execute({ userId, bankId, type, amount, newBalance, date }) {
    if (!bankId) {
      throw new Error('Bank ID is required');
    }
    if (!type || !['aporte', 'retirada'].includes(type)) {
      throw new Error('Invalid movement type. Must be "aporte" or "retirada"');
    }

    const bank = await this.bankRepository.findById(bankId, userId);
    if (!bank) {
      throw new Error('Bank not found');
    }

    const previousBalance = Number(bank.currentBalance) || 0;
    let targetBalance = previousBalance;
    let movementAmount = 0;

    if (type === 'aporte') {
      if (newBalance !== undefined && newBalance !== null) {
        targetBalance = Math.max(0, Math.round(Number(newBalance)));
        movementAmount = Math.abs(targetBalance - previousBalance);
      } else if (amount !== undefined && amount !== null) {
        movementAmount = Math.max(0, Math.round(Number(amount)));
        targetBalance = previousBalance + movementAmount;
      } else {
        throw new Error('Novo saldo ou valor do aporte é obrigatório');
      }
    } else if (type === 'retirada') {
      movementAmount = Math.round(Number(amount));
      if (!movementAmount || movementAmount <= 0) {
        throw new Error('O valor da retirada deve ser maior que zero');
      }
      if (movementAmount > previousBalance) {
        throw new Error('Saldo insuficiente para realizar a retirada');
      }
      targetBalance = previousBalance - movementAmount;
    }

    const movementDate = date || new Date().toISOString().split('T')[0];

    // Atualiza saldo do banco
    await this.bankRepository.updateBalance(bankId, userId, targetBalance);

    // Registra a movimentação
    const movement = new InvestmentMovement({
      userId,
      bankId,
      type,
      amount: movementAmount,
      previousBalance,
      newBalance: targetBalance,
      date: movementDate,
    });

    const savedMovement = await this.movementRepository.save(movement);

    return {
      movement: savedMovement,
      bank: {
        id: bank.id,
        name: bank.name,
        currentBalance: targetBalance,
      },
    };
  }
}

