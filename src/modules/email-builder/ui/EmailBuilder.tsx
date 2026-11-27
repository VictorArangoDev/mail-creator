import { useCallback, useEffect, useRef, useState, type ElementRef } from 'react';
import { EmailEditor} from 'react-email-editor';
import type { TemplateDesign, TemplateSummary } from '../domain/entities/Template';
import { Toolbar } from './Toolbar';
import { SaveTemplateDialog } from './SaveTemplateDialog';
import { OpenTemplateDialog } from './OpenTemplateDialog';
import { templatesApi } from './templatesApi';
import { downloadFile, pickTextFile, todayStamp } from './lib/files';
import { minifyHtml } from './lib/minifyHtml';
import { exportHtml, saveDesign, type UnlayerEditor } from './unlayer';

const UNLAYER_PROJECT_ID = Number(import.meta.env.PUBLIC_UNLAYER_PROJECT_ID ?? 276321);

type Notice = { type: 'success' | 'error'; text: string };
type Dialog = 'save' | 'open' | null;

export default function EmailBuilder() {
  const editorRef = useRef<ElementRef<typeof EmailEditor>>(null);
  const [ready, setReady] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  /** Plantilla abierta desde la BD: sirve para sugerir guardar una versión nueva. */
  const [currentName, setCurrentName] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const getEditor = useCallback((): UnlayerEditor => {
    const editor = editorRef.current?.editor as unknown as UnlayerEditor | undefined;
    if (!editor) throw new Error('El editor todavía se está cargando');
    return editor;
  }, []);

  /** Ejecuta una acción y muestra el error en pantalla en vez de dejarlo en la consola. */
  const run = useCallback(async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Ocurrió un error inesperado' });
    }
  }, []);

  const handleExportHtml = () =>
    run(async () => {
      const { html } = await exportHtml(getEditor());
      downloadFile(`plantilla-${todayStamp()}.html`, html, 'text/html');
    });

  const handleExportMinified = () =>
    run(async () => {
      const { html } = await exportHtml(getEditor());
      downloadFile(`plantilla-${todayStamp()}-Minify.html`, minifyHtml(html), 'text/html');
    });

  const handleSaveJson = () =>
    run(async () => {
      const design = await saveDesign(getEditor());
      downloadFile(`plantilla-${todayStamp()}.json`, JSON.stringify(design), 'application/json');
    });

  const handleImportJson = () =>
    run(async () => {
      const text = await pickTextFile('.json');
      if (text === null) return;

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('El archivo no es un JSON válido');
      }

      const candidate = (parsed as { design?: unknown })?.design ?? parsed;
      if (typeof candidate !== 'object' || candidate === null || !('body' in candidate)) {
        throw new Error('El JSON no corresponde a un diseño del editor');
      }

      getEditor().loadDesign(candidate as TemplateDesign);
      setCurrentName(null);
      setNotice({ type: 'success', text: 'JSON importado' });
    });

  const handleSaveTemplate = (name: string) =>
    run(async () => {
      setSaving(true);
      try {
        // El HTML solo lo puede generar el editor, así que viaja junto al diseño en la misma petición.
        const { design, html } = await exportHtml(getEditor());
        const saved = await templatesApi.save({ name, design, html });
        setCurrentName(saved.name);
        setDialog(null);
        setNotice({ type: 'success', text: `Plantilla guardada: ${saved.name} v${saved.version}` });
      } finally {
        setSaving(false);
      }
    });

  const handleOpenTemplate = (summary: TemplateSummary) =>
    run(async () => {
      const template = await templatesApi.get(summary.id);
      getEditor().loadDesign(template.design);
      setCurrentName(template.name);
      setDialog(null);
      setNotice({ type: 'success', text: `Plantilla abierta: ${template.name} v${template.version}` });
    });

  return (
    <div className="flex h-screen flex-col">
      <Toolbar
        disabled={!ready}
        onSaveTemplate={() => setDialog('save')}
        onOpenTemplate={() => setDialog('open')}
        onExportHtml={handleExportHtml}
        onExportMinified={handleExportMinified}
        onSaveJson={handleSaveJson}
        onImportJson={handleImportJson}
      />

      <div className="min-h-0 flex-1">
        <EmailEditor
          ref={editorRef}
          minHeight="100%"
          style={{ height: '100vh'  }}
          projectId={UNLAYER_PROJECT_ID}
          onReady={() => setReady(true)}
          options={{
            displayMode: 'email',
            features: { stockImages: true },
            id: 'dy-email-editor',
          }}
        />
      </div>

      <SaveTemplateDialog
        open={dialog === 'save'}
        saving={saving}
        currentName={currentName}
        onSave={handleSaveTemplate}
        onClose={() => setDialog(null)}
      />
      <OpenTemplateDialog
        open={dialog === 'open'}
        onOpenTemplate={handleOpenTemplate}
        onClose={() => setDialog(null)}
      />

      {notice && (
        <div
          role="status"
          className={`fixed bottom-4 right-4 z-50 max-w-sm rounded-lg px-4 py-3 text-sm text-white shadow-lg ${
            notice.type === 'success' ? 'bg-slate-900' : 'bg-red-600'
          }`}
        >
          {notice.text}
        </div>
      )}
    </div>
  );
}
