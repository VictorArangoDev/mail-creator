import type { APIRoute } from 'astro';
import { createTemplateUseCases } from '../../../modules/email-builder/composition';
import { templateErrorResponse } from '../../../modules/email-builder/http';
import { TemplateValidationError } from '../../../modules/email-builder/domain/errors';
import { json, readJson } from '../../../shared/http/response';

export const prerender = false;

/** GET /api/templates?name=Bienvenida → versiones guardadas (sin contenido). */
export const GET: APIRoute = async ({ url }) => {
  try {
    const templates = await createTemplateUseCases().list.execute(url.searchParams.get('name'));
    return json({ templates });
  } catch (error) {
    return templateErrorResponse(error);
  }
};

/** POST /api/templates { name, design, html } → crea una versión nueva. */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await readJson(request);
    if (!body) throw new TemplateValidationError('El cuerpo de la petición debe ser un JSON válido');

    const saved = await createTemplateUseCases().save.execute({
      name: body.name,
      design: body.design,
      html: body.html,
    });
    return json(saved, 201);
  } catch (error) {
    return templateErrorResponse(error);
  }
};
