/** Deja el HTML en una sola línea (mismo comportamiento que tenía el botón de exportar minificado). */
export const minifyHtml = (html: string): string =>
  html
    .replace(/\r?\n/g, '')
    .replace(/\s\s+/g, ' ')
    .trim();
