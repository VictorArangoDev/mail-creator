import type { ITemplateRepository } from '../domain/ports/ITemplateRepository';
import type { TemplateSummary } from '../domain/entities/Template';

export class ListTemplatesUseCase {
  constructor(private readonly repository: ITemplateRepository) {}

  execute(name?: string | null): Promise<TemplateSummary[]> {
    const filter = name?.trim();
    return this.repository.list(filter ? filter : undefined);
  }
}
