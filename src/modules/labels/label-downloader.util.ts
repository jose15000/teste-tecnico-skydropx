import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { SkydropxShipmentResponse } from '../../interfaces/skydropx.interface.js';

export async function savePdfFromUrl(url: string, destPath: string): Promise<string> {
  const dir = path.dirname(destPath);
  await fs.mkdir(dir, { recursive: true });

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download PDF (${res.status}) from ${url}`);

  await fs.writeFile(destPath, Buffer.from(await res.arrayBuffer()));
  return destPath;
}

export async function extractAndSaveLabel(
  shipment: SkydropxShipmentResponse,
  boxId: string,
  pollFn?: (id: string) => Promise<SkydropxShipmentResponse>,
): Promise<{ trackingNumber: string; pdfFilename: string }> {
  let pkg = shipment.included?.find((i) => i.attributes?.label_url);
  if (!pkg?.attributes?.label_url && shipment.data?.id && pollFn) {
    const ready = await pollFn(shipment.data.id);
    pkg = ready.included?.find((i) => i.attributes?.label_url);
  }

  const trackingNumber = String(
    pkg?.attributes?.tracking_number ||
    shipment.data?.attributes?.master_tracking_number ||
    shipment.data?.id ||
    'UNKNOWN',
  );

  let pdfFilename = path.join('labels', `${boxId}_${trackingNumber}.pdf`);
  if (pkg?.attributes?.label_url) {
    pdfFilename = await savePdfFromUrl(pkg.attributes.label_url, pdfFilename);
  }
  return { trackingNumber, pdfFilename };
}
