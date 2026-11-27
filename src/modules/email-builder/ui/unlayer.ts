import type { TemplateDesign } from '../domain/entities/Template';

/** Parte de la API del editor de Unlayer que usa la app. */
export interface UnlayerEditor {
  exportHtml(callback: (data: { design: TemplateDesign; html: string }) => void): void;
  saveDesign(callback: (design: TemplateDesign) => void): void;
  loadDesign(design: TemplateDesign): void;
}

export const exportHtml = (editor: UnlayerEditor) =>
  new Promise<{ design: TemplateDesign; html: string }>((resolve) => editor.exportHtml(resolve));

export const saveDesign = (editor: UnlayerEditor) =>
  new Promise<TemplateDesign>((resolve) => editor.saveDesign(resolve));
