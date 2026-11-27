import { useEffect, useState } from 'react';
import type { TemplateSummary } from '../domain/entities/Template';
import { templatesApi } from './templatesApi';

interface OpenTemplateDialogProps {
  open: boolean;
  onOpenTemplate: (template: TemplateSummary) => void;
  onClose: () => void;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

export function OpenTemplateDialog({ open, onOpenTemplate, onClose }: OpenTemplateDialogProps) {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    templatesApi
      .list()
      .then((items) => !cancelled && setTemplates(items))
      .catch((err: Error) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4"
      onKeyDown={(event) => event.key === 'Escape' && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="open-template-title"
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 id="open-template-title" className="text-lg font-semibold text-slate-900">
          Abrir plantilla
        </h2>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          {loading && <p className="text-sm text-slate-500">Cargando plantillas…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && !error && templates.length === 0 && (
            <p className="text-sm text-slate-500">
              Todavía no hay plantillas guardadas. Usa «Guardar plantilla» para crear la primera.
            </p>
          )}

          <ul className="divide-y divide-slate-100">
            {templates.map((template) => (
              <li key={template.id}>
                <button
                  type="button"
                  onClick={() => onOpenTemplate(template)}
                  className="flex w-full items-center justify-between gap-4 px-2 py-3 text-left hover:bg-slate-50"
                >
                  <span className="truncate text-sm font-medium text-slate-900">
                    {template.name} <span className="font-normal text-slate-500">v{template.version}</span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">{formatDate(template.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
