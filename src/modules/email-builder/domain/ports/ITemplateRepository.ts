import type { NewTemplate, Template, TemplateSummary } from '../entities/Template';

export interface ITemplateRepository {
  /**
   * Guarda una versión nueva. Si ya existe una plantilla con el mismo nombre,
   * la versión es la siguiente (v1, v2, v3...). Nunca sobrescribe versiones anteriores.
   */
  save(template: NewTemplate): Promise<TemplateSummary>;

  /** Devuelve una versión completa (diseño + HTML) o null si no existe. */
  getById(id: number): Promise<Template | null>;

  /** Lista versiones sin contenido, de la más reciente a la más antigua. */
  list(name?: string): Promise<TemplateSummary[]>;
}
