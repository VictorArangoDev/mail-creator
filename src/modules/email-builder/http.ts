import { json } from '../../shared/http/response';
import { TemplateNotFoundError, TemplateValidationError } from './domain/errors';

/** Traduce errores del módulo a respuestas HTTP sin filtrar detalles internos de la BD. */
export const templateErrorResponse = (error: unknown): Response => {
  if (error instanceof TemplateValidationError) return json({ error: error.message }, 400);
  if (error instanceof TemplateNotFoundError) return json({ error: error.message }, 404);

  console.error('[templates]', error);
  return json({ error: 'No se pudo completar la operación con las plantillas' }, 500);
};
