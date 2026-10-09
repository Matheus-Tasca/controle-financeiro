import { AppDataSource } from '../../../../shared/infra/typeorm/data-source.js';
import { CardSchema } from '../../../../shared/infra/typeorm/schemas/CardSchema.js';
import { ILike } from 'typeorm';

export class CardRepository {
  constructor() {
    this.cardRepository = AppDataSource.getRepository(CardSchema);
  }

  save(newCard) {
    return this.cardRepository.save(newCard);
  }

  findById(id, userId) {
    return this.cardRepository.findOneBy({ id, userId });
  }

  findByName(name, userId) {
    return this.cardRepository.findOneBy({
      name: ILike(name),
      userId,
    });
  }

  findDateInformationByCardId(cardId, userId) {
    return this.cardRepository.findOne({
      where: { id: cardId, userId },
      select: {
        closingDay: true,
        dueDay: true,
      },
    });
  }

  deactivate(id, userId) {
    return this.cardRepository.update({ id, userId }, { active: false });
  }

  async findAllWithTransactionsCount({ userId, activeOnly = false } = {}) {
    const query = this.cardRepository
      .createQueryBuilder('card')
      .leftJoin('card.transactions', 'transaction')
      .addSelect('COUNT(transaction.id)', 'transactionsCount')
      .orderBy('card.name', 'ASC');
    query.where('card.userId = :userId', { userId });
    if (activeOnly) query.andWhere('card.active = :active', { active: true });
    query.groupBy('card.id');

    const { entities, raw } = await query.getRawAndEntities();
    return entities.map((card, index) => ({
      ...card,
      transactionsCount: Number(raw[index].transactionsCount || 0),
    }));
  }
}
