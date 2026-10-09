import { AppDataSource } from '../../../../shared/infra/typeorm/data-source.js';
import { EntryCategorySchema } from '../../../../shared/infra/typeorm/schemas/EntryCategorySchema.js';
import { ILike } from 'typeorm';

export class EntryCategoryRepository {
  constructor() {
    this.entryCategoryRepository =
      AppDataSource.getRepository(EntryCategorySchema);
  }

  save(newEntryCategory) {
    return this.entryCategoryRepository.save(newEntryCategory);
  }

  findByDescription(description, userId) {
    return this.entryCategoryRepository.findOneBy({
      description: ILike(description),
      userId,
    });
  }

  findById(id, userId) {
    return this.entryCategoryRepository.findOneBy({
      id,
      userId,
    });
  }

  delete(id, userId) {
    return this.entryCategoryRepository.delete({ id, userId });
  }

  getAllCategories(userId) {
    return this.entryCategoryRepository.find({
      where: { userId },
      order: { description: 'ASC' },
    });
  }
}
