import type { Template, TemplateDesign, TemplateSummary } from '../domain/entities/Template';

const request = async <T>(input: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? 'No se pudo completar la operación');
  return data as T;
};

export const templatesApi = {
  list: async (): Promise<TemplateSummary[]> =>
    (await request<{ templates: TemplateSummary[] }>('/api/templates')).templates,

  get: (id: number): Promise<Template> => request<Template>(`/api/templates/${id}`),

  save: (payload: { name: string; design: TemplateDesign; html: string }): Promise<TemplateSummary> =>
    request<TemplateSummary>('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
};
