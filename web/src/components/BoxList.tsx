import type { StrategyAnalysis } from '../types.js';
import { BoxCard } from './BoxCard.js';

interface BoxListProps {
  strategy?: StrategyAnalysis;
}

export function BoxList({ strategy }: BoxListProps) {
  if (!strategy) {
    return (
      <div className="p-8 text-center text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800">
        No se encontró información para la estrategia seleccionada.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Detalle por Caja — {strategy.strategy} ({strategy.boxes.length} cajas)
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {strategy.boxes.map((box) => (
          <BoxCard key={box.boxId} box={box} />
        ))}
      </div>
    </div>
  );
}
