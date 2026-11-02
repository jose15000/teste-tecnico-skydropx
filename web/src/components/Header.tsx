import { Play, RefreshCw, Truck } from 'lucide-react';

interface HeaderProps {
  loading: boolean;
  running: boolean;
  onRefresh: () => void;
  onRun: () => void;
}

export function Header({ loading, running, onRefresh, onRun }: HeaderProps) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-20 px-4 py-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              Skydropx Shipping Optimizer
            </h1>
            <p className="text-xs text-slate-400">Reporte de Análisis y Comparación de Estrategias</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading || running}
            className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg border border-slate-700 transition flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            title="Recargar reporte"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <button
            onClick={onRun}
            disabled={loading || running}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg font-medium text-xs shadow-lg shadow-indigo-600/20 transition flex items-center gap-2 cursor-pointer"
          >
            <Play className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
            <span>{running ? 'Ejecutando...' : 'Re-ejecutar Pipeline'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
