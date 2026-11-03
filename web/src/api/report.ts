import type { AutomationReport, GeneratedLabel, GenerateLabelsResult } from '../types.js';

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

export async function fetchLabels(): Promise<GeneratedLabel[]> {
  const res = await fetch(`${API_BASE}/labels`);
  if (!res.ok) {
    throw new Error(`Error al obtener guías (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export async function triggerGenerateLabels(): Promise<GenerateLabelsResult> {
  const res = await fetch(`${API_BASE}/labels/generate`, { method: 'POST' });
  if (!res.ok) {
    throw new Error(`Error al generar guías (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

