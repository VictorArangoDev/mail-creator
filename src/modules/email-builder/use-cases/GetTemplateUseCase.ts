import type { ITemplateRepository } from '../domain/ports/ITemplateRepository';
import type { Template } from '../domain/entities/Template';
import { TemplateNotFoundError, TemplateValidationError } from '../domain/errors';

export class GetTemplateUseCase {
  constructor(private readonly repository: ITemplateRepository) {}

  async execute(rawId: unknown): Promise<Template> {
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new TemplateValidationError('El id de la plantilla no es válido');
    }

    const template = await this.repository.getById(id);
    if (!template) throw new TemplateNotFoundError(id);
    return template;
  }
}
