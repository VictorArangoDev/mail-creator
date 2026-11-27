import type { APIRoute } from 'astro';
import { createTemplateUseCases } from '../../../modules/email-builder/composition';
import { templateErrorResponse } from '../../../modules/email-builder/http';
import { json } from '../../../shared/http/response';

export const prerender = false;

/** GET /api/templates/:id → plantilla completa (diseño JSON + HTML). */
export const GET: APIRoute = async ({ params }) => {
  try {
    const template = await createTemplateUseCases().get.execute(params.id);
    return json(template);
  } catch (error) {
    return templateErrorResponse(error);
  }
};
