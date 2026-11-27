import { useEffect, useRef, useState, type FormEvent } from 'react';

interface SaveTemplateDialogProps {
  open: boolean;
  saving: boolean;
  /** Nombre de la plantilla abierta desde la base de datos, si hay una. */
  currentName: string | null;
  onSave: (name: string) => void;
  onClose: () => void;
}

export function SaveTemplateDialog({ open, saving, currentName, onSave, onClose }: SaveTemplateDialogProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(currentName ?? '');
    inputRef.current?.focus();
  }, [open, currentName]);

  if (!open) return null;

  const trimmed = name.trim();
  const isNewVersion = currentName !== null && trimmed === currentName;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (trimmed && !saving) onSave(trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4"
      onKeyDown={(event) => event.key === 'Escape' && onClose()}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-template-title"
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 id="save-template-title" className="text-lg font-semibold text-slate-900">
          Guardar plantilla
        </h2>

        <label htmlFor="template-name" className="mt-4 block text-sm font-medium text-slate-700">
          Nombre de la plantilla
        </label>
        <input
          id="template-name"
          ref={inputRef}
          value={name}
          maxLength={200}
          onChange={(event) => setName(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
        />
        <p className="mt-2 text-sm text-slate-500">
          {isNewVersion
            ? 'Se guardará como una versión nueva. Las anteriores se conservan.'
            : 'Si ya existe una plantilla con este nombre, se guardará como versión nueva.'}
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!trimmed || saving}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar plantilla'}
          </button>
        </div>
      </form>
    </div>
  );
}
