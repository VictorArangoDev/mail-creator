/** Diseño JSON del editor (Unlayer). Es la fuente de verdad para volver a editar. */
export type TemplateDesign = Record<string, unknown>;

/** Datos mínimos para crear una versión nueva de una plantilla. */
export interface NewTemplate {
  name: string;
  design: TemplateDesign;
  /** HTML ya renderizado a partir del diseño (derivado, no se edita a mano). */
  html: string;
}

/** Metadatos de una versión guardada (sin el contenido pesado). */
export interface TemplateSummary {
  id: number;
  name: string;
  version: number;
  createdAt: string;
}

export interface Template extends TemplateSummary {
  design: TemplateDesign;
  html: string;
}
