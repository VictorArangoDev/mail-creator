import { describe, it, expect } from 'vitest';
import { CompareConfigsUseCase } from './CompareConfigsUseCase';
import { TABLE_DEFINITIONS } from '../domain/config/tableDefinitions'; 

describe('CompareConfigsUseCase', () => {
  const useCase = new CompareConfigsUseCase();

  describe('Estrategia SIMPLE (SettingsByProduct)', () => {
    const def = TABLE_DEFINITIONS.SettingsByProduct;
    const row = (id: number, settingId: number, value: string) => ({
      SettingsByProductId: id, ProductId: 1965, SettingId: settingId, Value: value,
    });

    it('detecta IGUAL', () => {
      const r = useCase.execute(def, 1965, [row(1, 1, 'True')], [row(10, 1, 'True')]);
      expect(r.items[0].status).toBe('IGUAL');
      expect(r.stats.iguales).toBe(1);
    });

    it('detecta DIFERENTE y registra el campo', () => {
      const r = useCase.execute(def, 1965, [row(1, 1, 'True')], [row(10, 1, 'False')]);
      expect(r.items[0].status).toBe('DIFERENTE');
      expect(r.items[0].differences).toEqual([
        { field: 'Value', testValue: 'True', prodValue: 'False' },
      ]);
    });

    it('detecta NUEVO_EN_TEST y NUEVO_EN_PROD', () => {
      const r = useCase.execute(
        def, 1965,
        [row(1, 1, 'True'), row(2, 2, 'True')],
        [row(10, 1, 'True'), row(11, 3, 'False')]
      );
      expect(r.stats.nuevosEnTest).toBe(1);
      expect(r.stats.nuevosEnProd).toBe(1);
    });

    it('calcula totales correctos', () => {
      const r = useCase.execute(
        def, 1965,
        [row(1, 1, 'True'), row(2, 2, 'False'), row(3, 3, 'True')],
        [row(10, 1, 'True'), row(11, 2, 'True')]
      );
      expect(r.stats).toEqual({
        totalTest: 3,
        totalProd: 2,
        iguales: 1,
        diferentes: 1,
        nuevosEnTest: 1,
        nuevosEnProd: 0,
        totalComparados: 3,
      });
    });

    it('normaliza nulls y strings vacíos', () => {
      const r = useCase.execute(
        def, 1965,
        [{ ...row(1, 1, ''), Value: null }],
        [row(10, 1, '')]
      );
      expect(r.items[0].status).toBe('IGUAL'); // null y '' normalizan igual
    });
  });

  describe('Estrategia COMPOSITE_KEY (Template)', () => {
    const def = TABLE_DEFINITIONS.Template;

    it('usa (TemplateId, Name) como llave', () => {
      const test = [
        { TemplateId: 965, Name: 'A', Config: 'X' },
        { TemplateId: 965, Name: 'B', Config: 'Y' },
      ];
      const prod = [
        { TemplateId: 965, Name: 'A', Config: 'X' },
        { TemplateId: 965, Name: 'B', Config: 'Z' },
      ];
      const r = useCase.execute(def, 965, test, prod);

      expect(r.stats.iguales).toBe(1);
      expect(r.stats.diferentes).toBe(1);
      expect(r.items.find(i => i.displayKey === '965|B')?.status).toBe('DIFERENTE');
    });
  });
});