import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { fetchAutomationReport, triggerAutomationRun } from './api/report.js';
import { BoxList } from './components/BoxList.js';
import { Header } from './components/Header.js';
import { RecommendationCard } from './components/RecommendationCard.js';
import { StrategyComparison } from './components/StrategyComparison.js';
import type { AutomationReport } from './types.js';

export function App() {
  const [report, setReport] = useState<AutomationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('MIN_BOXES');

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAutomationReport();
      setReport(data);
      if (data.recommendation?.strategy) {
        setSelectedStrategy(data.recommendation.strategy);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido al cargar reporte');
    } finally {
      setLoading(false);
    }
  };

  const handleRun = async () => {
    try {
      setRunning(true);
      setError(null);
      await triggerAutomationRun();
      await loadReport();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al ejecutar pipeline');
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    void loadReport();
  }, []);

  const currentStrategy = report?.strategies.find((s) => s.strategy === selectedStrategy);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
      <Header loading={loading} running={running} onRefresh={loadReport} onRun={handleRun} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {loading && !report && (
          <div className="flex flex-col items-center justify-center p-16 text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            <p className="text-sm">Cargando reporte de análisis...</p>
          </div>
        )}

        {report && (
          <>
            <RecommendationCard recommendation={report.recommendation} />
            <StrategyComparison
              strategies={report.strategies}
              selectedStrategy={selectedStrategy}
              onSelect={setSelectedStrategy}
            />
            <BoxList strategy={currentStrategy} />
          </>
        )}
      </main>
    </div>
  );
}
