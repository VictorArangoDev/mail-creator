import { describe, expect, it } from 'vitest';
import { SaveTemplateUseCase } from './SaveTemplateUseCase';
import { TemplateValidationError } from '../domain/errors';
import type { ITemplateRepository } from '../domain/ports/ITemplateRepository';
import type { NewTemplate, TemplateSummary } from '../domain/entities/Template';

class InMemoryRepository implements ITemplateRepository {
  saved: NewTemplate[] = [];

  async save(template: NewTemplate): Promise<TemplateSummary> {
    this.saved.push(template);
    const version = this.saved.filter((t) => t.name === template.name).length;
    return { id: this.saved.length, name: template.name, version, createdAt: new Date().toISOString() };
  }
  async getById() {
    return null;
  }
  async list() {
    return [];
  }
}

const validInput = {
  name: '  Bienvenida  ',
  design: { body: { rows: [] } },
  html: '<html><body>Hola</body></html>',
};

describe('SaveTemplateUseCase', () => {
  it('guarda diseño y HTML con el nombre sin espacios sobrantes', async () => {
    const repo = new InMemoryRepository();
    const result = await new SaveTemplateUseCase(repo).execute(validInput);

    expect(result.name).toBe('Bienvenida');
    expect(repo.saved[0].design).toEqual(validInput.design);
    expect(repo.saved[0].html).toBe(validInput.html);
  });

  it('crea una versión nueva al guardar el mismo nombre otra vez', async () => {
    const useCase = new SaveTemplateUseCase(new InMemoryRepository());
    await useCase.execute(validInput);
    const second = await useCase.execute(validInput);

    expect(second.version).toBe(2);
  });

  it.each([
    ['nombre vacío', { ...validInput, name: '   ' }],
    ['nombre muy largo', { ...validInput, name: 'x'.repeat(201) }],
    ['diseño sin body', { ...validInput, design: { foo: 1 } }],
    ['diseño que no es objeto', { ...validInput, design: 'texto' }],
    ['HTML vacío', { ...validInput, html: '  ' }],
    ['HTML que no es texto', { ...validInput, html: 123 }],
  ])('rechaza %s', async (_label, input) => {
    const repo = new InMemoryRepository();
    await expect(new SaveTemplateUseCase(repo).execute(input)).rejects.toBeInstanceOf(
      TemplateValidationError,
    );
    expect(repo.saved).toHaveLength(0);
  });
});
