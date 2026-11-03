import { AlertCircle, CheckCircle2, FileText, Loader2, Send } from 'lucide-react';
import type { GeneratedLabel } from '../types.js';

interface Props {
  labels: GeneratedLabel[];
  errors?: { boxId: string; error: string }[];
  generating: boolean;
  onGenerate: () => void;
}

export function LabelsCard({ labels, errors = [], generating, onGenerate }: Props) {
  const hasLabels = labels.length > 0;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            Guías de Envío Generadas (Parte 5)
          </h2>
          <p className="text-xs text-slate-400">
            Descarga de PDFs a <code className="text-slate-300">/labels</code> e integración con Skydropx
          </p>
        </div>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-all shadow-md active:scale-95 cursor-pointer"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Emitiendo en Skydropx...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>{hasLabels ? 'Re-verificar / Emitir Guías' : 'Emitir Guías en Skydropx'}</span>
            </>
          )}
        </button>
      </div>

      {errors.length > 0 && (
        <div className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-950/30 text-rose-300 text-xs space-y-1">
          <div className="font-semibold flex items-center gap-1.5 text-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            Errores al emitir guías en Skydropx ({errors.length}):
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-rose-300/90 pl-1">
            {errors.map((e, idx) => (
              <li key={idx} className="truncate" title={e.error}>
                <span className="font-medium text-rose-200">{e.boxId}:</span> {e.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!hasLabels ? (
        <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/40 text-center text-xs sm:text-sm text-slate-400">
          Ninguna guía emitida aún. Haz clic en el botón superior para generarlas con la recomendación final.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {labels.map((label) => (
            <div
              key={label.boxId}
              className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 text-xs sm:text-sm flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {label.boxId}
                </span>
                <span className="text-xs font-mono font-medium text-emerald-300">
                  ${label.price.toFixed(2)} MXN
                </span>
              </div>
              <div className="text-xs text-slate-400">
                <p className="text-slate-300 font-medium">{label.carrier} - {label.service}</p>
                <p className="font-mono text-slate-400 mt-1">Guía: {label.trackingNumber}</p>
                <p className="font-mono text-[11px] text-slate-500 truncate mt-0.5" title={label.pdfFilename}>
                  {label.pdfFilename}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
