import { AlertCircle, Box, CheckCircle2, Zap } from 'lucide-react';
import type { BoxAnalysis, BoxReportOption } from '../types.js';

interface BoxCardProps {
  box: BoxAnalysis;
}

function RateBadge({ label, icon, option, color }: { label: string; icon: React.ReactNode; option?: BoxReportOption; color: string }) {
  if (!option) {
    return (
      <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60 text-xs text-slate-500 flex items-center gap-1.5">
        <AlertCircle className="w-3.5 h-3.5 text-amber-500/70" /> Sin tarifa
      </div>
    );
  }

  return (
    <div className={`p-2.5 rounded-lg border text-xs space-y-1 ${color}`}>
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider">
        <span className="flex items-center gap-1">{icon} {label}</span>
        <span>{option.estimatedDays} {option.estimatedDays === 1 ? 'día' : 'días'}</span>
      </div>
      <div className="flex items-baseline justify-between font-medium">
        <span className="truncate max-w-[130px]">{option.carrier} ({option.service})</span>
        <span className="font-bold shrink-0">${option.totalPriceMxn} MXN</span>
      </div>
    </div>
  );
}

export function BoxCard({ box }: BoxCardProps) {
  return (
    <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 space-y-3 hover:border-slate-700 transition">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4 text-indigo-400" />
          <h4 className="font-bold text-white text-sm">{box.boxId}</h4>
          {box.billableWeightKg && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              {box.billableWeightKg} kg facturable
            </span>
          )}
        </div>
      </div>

      {box.containedSkus && (
        <p className="text-xs text-slate-400 line-clamp-1" title={box.containedSkus}>
          <strong className="text-slate-300">SKUs:</strong> {box.containedSkus}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
        <RateBadge
          label="Más Barato"
          icon={<CheckCircle2 className="w-3 h-3 text-emerald-400" />}
          option={box.cheapest}
          color="bg-emerald-950/20 border-emerald-500/20 text-emerald-200"
        />
        <RateBadge
          label="Más Rápido"
          icon={<Zap className="w-3 h-3 text-sky-400" />}
          option={box.fastest}
          color="bg-sky-950/20 border-sky-500/20 text-sky-200"
        />
        <RateBadge
          label="Mejor Balance"
          icon={<CheckCircle2 className="w-3 h-3 text-indigo-400" />}
          option={box.bestBalance}
          color="bg-indigo-950/20 border-indigo-500/20 text-indigo-200"
        />
      </div>
    </div>
  );
}
