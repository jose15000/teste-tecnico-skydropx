import { Clock, DollarSign, Layers } from 'lucide-react';
import type { StrategyAnalysis } from '../types.js';

interface StrategyComparisonProps {
  strategies: StrategyAnalysis[];
  selectedStrategy: string;
  onSelect: (strategy: string) => void;
}

export function StrategyComparison({ strategies, selectedStrategy, onSelect }: StrategyComparisonProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
        Comparación de Estrategias de Empaque
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {strategies.map((strat) => {
          const isSelected = selectedStrategy === strat.strategy;
          return (
            <div
              key={strat.strategy}
              onClick={() => onSelect(strat.strategy)}
              className={`p-4 rounded-xl border transition cursor-pointer relative ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-950/20 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500'
                  : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-white text-base">{strat.strategy}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                  {strat.totalBoxes} {strat.totalBoxes === 1 ? 'Caja' : 'Cajas'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-emerald-400" /> Más Barato
                  </span>
                  <p className="font-semibold text-emerald-300 mt-0.5">${strat.totalCostCheapestMxn} MXN</p>
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-indigo-400" /> Mejor Balance
                  </span>
                  <p className="font-semibold text-indigo-300 mt-0.5">${strat.totalCostBestBalanceMxn} MXN</p>
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-sky-400" /> Tiempo Máx.
                  </span>
                  <p className="font-semibold text-sky-300 mt-0.5">{strat.maxDeliveryDaysBestBalance} d</p>
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-purple-400" /> Couriers
                  </span>
                  <p className="font-semibold text-purple-300 mt-0.5">{strat.carrierCount}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
