import type { Enviroment } from '../../compared/domain/entities/TableConfig';
import { SqlServerTemplateRepository } from './infrastructure/SqlServerTemplateRepository';
import { SaveTemplateUseCase } from './use-cases/SaveTemplateUseCase';
import { GetTemplateUseCase } from './use-cases/GetTemplateUseCase';
import { ListTemplatesUseCase } from './use-cases/ListTemplatesUseCase';

/** Entorno donde viven las plantillas. TEST por defecto; se cambia con TEMPLATES_DB_ENV=PROD. */
const templatesEnv: Enviroment = import.meta.env.TEMPLATES_DB_ENV === 'PROD' ? 'PROD' : 'TEST';

/** Único lugar donde se conectan los casos de uso con la implementación concreta. */
export const createTemplateUseCases = () => {
  const repository = new SqlServerTemplateRepository(templatesEnv);
  return {
    save: new SaveTemplateUseCase(repository),
    get: new GetTemplateUseCase(repository),
    list: new ListTemplatesUseCase(repository),
  };
};
