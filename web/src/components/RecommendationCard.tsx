import { Award, Clock, DollarSign, Layers } from 'lucide-react';
import type { Recommendation } from '../types.js';

interface RecommendationCardProps {
  recommendation: Recommendation;
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-900/60 to-slate-900/80 p-5 shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
            <Award className="w-3.5 h-3.5" />
            Estrategia Recomendada
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {recommendation.strategy}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            {recommendation.reason}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2.5 sm:gap-4 shrink-0 bg-slate-950/50 p-3 rounded-lg border border-slate-800">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-emerald-400" /> Total
            </span>
            <p className="text-sm sm:text-base font-bold text-emerald-300">
              ${recommendation.totalCostMxn.toLocaleString('es-MX')} MXN
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-sky-400" /> Entrega
            </span>
            <p className="text-sm sm:text-base font-bold text-sky-300">
              {recommendation.maxDeliveryDays} {recommendation.maxDeliveryDays === 1 ? 'día' : 'días'}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
              <Layers className="w-3 h-3 text-purple-400" /> Courier
            </span>
            <p className="text-sm sm:text-base font-bold text-purple-300">
              {recommendation.carrierCount} {recommendation.carrierCount === 1 ? 'courier' : 'couriers'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
