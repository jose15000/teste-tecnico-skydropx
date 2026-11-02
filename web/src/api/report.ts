import type { AutomationReport } from '../types.js';

const API_BASE = 'http://localhost:3000';

export async function fetchAutomationReport(): Promise<AutomationReport> {
  const res = await fetch(`${API_BASE}/automation/report`);
  if (!res.ok) {
    throw new Error(`Error al obtener reporte (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export async function triggerAutomationRun(): Promise<void> {
  const res = await fetch(`${API_BASE}/automation/run`, { method: 'POST' });
  if (!res.ok) {
    throw new Error(`Error al ejecutar automatización (${res.status}): ${await res.text()}`);
  }
}
