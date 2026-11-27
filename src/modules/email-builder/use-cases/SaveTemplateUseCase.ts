import type { ITemplateRepository } from '../domain/ports/ITemplateRepository';
import type { TemplateDesign, TemplateSummary } from '../domain/entities/Template';
import { TemplateValidationError } from '../domain/errors';

const MAX_NAME_LENGTH = 200;
/** Tope de caracteres para HTML y JSON (Netlify limita el cuerpo a ~6 MB). */
const MAX_CONTENT_LENGTH = 4_000_000;

export interface SaveTemplateInput {
  name: unknown;
  design: unknown;
  html: unknown;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Un diseño exportado por Unlayer siempre trae un objeto `body`. */
const isDesign = (value: unknown): value is TemplateDesign =>
  isPlainObject(value) && isPlainObject(value.body);

export class SaveTemplateUseCase {
  constructor(private readonly repository: ITemplateRepository) {}

  async execute(input: SaveTemplateInput): Promise<TemplateSummary> {
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (!name) {
      throw new TemplateValidationError('El nombre de la plantilla es obligatorio');
    }
    if (name.length > MAX_NAME_LENGTH) {
      throw new TemplateValidationError(`El nombre no puede superar ${MAX_NAME_LENGTH} caracteres`);
    }

    if (!isDesign(input.design)) {
      throw new TemplateValidationError('El JSON no tiene el formato de un diseño del editor');
    }

    if (typeof input.html !== 'string' || !input.html.trim()) {
      throw new TemplateValidationError('El HTML de la plantilla está vacío');
    }

    if (
      input.html.length > MAX_CONTENT_LENGTH ||
      JSON.stringify(input.design).length > MAX_CONTENT_LENGTH
    ) {
      throw new TemplateValidationError('La plantilla es demasiado grande para guardarla');
    }

    return this.repository.save({ name, design: input.design, html: input.html });
  }
}
