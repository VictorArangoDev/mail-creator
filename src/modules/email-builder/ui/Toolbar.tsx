import { useEffect, useRef, useState } from 'react';

interface ToolbarProps {
  disabled: boolean;
  onSaveTemplate: () => void;
  onOpenTemplate: () => void;
  onExportHtml: () => void;
  onExportMinified: () => void;
  onSaveJson: () => void;
  onImportJson: () => void;
}

const menuItemClass =
  'flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50';

export function Toolbar(props: ToolbarProps) {
  const { disabled } = props;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  const runFromMenu = (action: () => void) => () => {
    setMenuOpen(false);
    action();
  };

  return (
    <nav className="relative z-20 flex items-center justify-between bg-white px-4 py-3">
      <img src="/logo.png" className="h-8" alt="Cadena" />

      <div className="flex items-center gap-2">
        <a
          href="/"
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          <img src="/icons/home.svg" alt="" className="h-5 w-5" />
          Inicio
        </a>

        <button
          type="button"
          disabled={disabled}
          onClick={props.onOpenTemplate}
          className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Abrir plantilla
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={props.onSaveTemplate}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Guardar plantilla
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Exportar
          </button>

          {menuOpen && (
            <ul
              role="menu"
              className="absolute right-0 top-full z-30 mt-2 w-60 overflow-hidden rounded-lg bg-white py-2 shadow-lg ring-1 ring-slate-200"
            >
              <li role="none">
                <button role="menuitem" disabled={disabled} className={menuItemClass} onClick={runFromMenu(props.onExportHtml)}>
                  <img src="/icons/export.svg" alt="" className="h-5 w-5" />
                  Exportar HTML
                </button>
              </li>
              <li role="none">
                <button role="menuitem" disabled={disabled} className={menuItemClass} onClick={runFromMenu(props.onExportMinified)}>
                  <img src="/icons/export-minify.svg" alt="" className="h-5 w-5" />
                  Exportar HTML minificado
                </button>
              </li>
              <li role="none">
                <button role="menuitem" disabled={disabled} className={menuItemClass} onClick={runFromMenu(props.onSaveJson)}>
                  <img src="/icons/save.svg" alt="" className="h-5 w-5" />
                  Guardar JSON
                </button>
              </li>
              <li role="none">
                <button role="menuitem" disabled={disabled} className={menuItemClass} onClick={runFromMenu(props.onImportJson)}>
                  <img src="/icons/import.svg" alt="" className="h-5 w-5" />
                  Importar JSON
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>
    </nav>
  );
}
