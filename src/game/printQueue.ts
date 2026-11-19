/**
 * The thermal printer runs on its own (Shahar, 19.11): copying the card is quick, printing is the
 * long step, and it keeps going while the photographer walks off to shoot. Sheets come out one by
 * one; only printed sheets can be cut. More photos can be sent while it prints (they queue up).
 * Pure logic, tested in printQueue.test.ts.
 */

import { PHOTOS_PER_SHEET } from './rules.ts';

export const PRINT = {
  /** Seconds per magnet sheet (4 photos) before the turbo speed-up. */
  secPerSheet: 2.0,
} as const;

export interface PrintQueue {
  /** Photos on each queued sheet; the first one is in the printer. */
  sheets: number[];
  /** Seconds into the sheet being printed. */
  progress: number;
  /** Sheets in the current run (since the printer was last idle) and how many came out. */
  runSheets: number;
  runDone: number;
}

export const createPrintQueue = (): PrintQueue => ({ sheets: [], progress: 0, runSheets: 0, runDone: 0 });

export const isPrinting = (q: PrintQueue): boolean => q.sheets.length > 0;

/** Send photos to the printer (split into sheets of 4). Returns the number of sheets added. */
export function enqueuePrint(q: PrintQueue, photos: number): number {
  let left = Math.max(0, Math.floor(photos));
  if (left === 0) return 0;
  if (!isPrinting(q)) {
    q.runSheets = 0;
    q.runDone = 0;
    q.progress = 0;
  }
  let added = 0;
  while (left > 0) {
    const n = Math.min(PHOTOS_PER_SHEET, left);
    q.sheets.push(n);
    left -= n;
    added++;
  }
  q.runSheets += added;
  return added;
}

/** Advance the printer. Returns the photos on each sheet that came out during this step. */
export function stepPrint(q: PrintQueue, dt: number, secPerSheet: number): number[] {
  const out: number[] = [];
  const per = Math.max(0.05, secPerSheet);
  let t = Math.max(0, dt);
  while (t > 0 && q.sheets.length > 0) {
    const need = per - q.progress;
    if (t < need) {
      q.progress += t;
      break;
    }
    t -= need;
    q.progress = 0;
    out.push(q.sheets.shift()!);
    q.runDone++;
  }
  if (q.sheets.length === 0) q.progress = 0;
  return out;
}

/** Seconds until the last queued sheet is out. */
export const printRemainingSec = (q: PrintQueue, secPerSheet: number): number =>
  q.sheets.length === 0 ? 0 : q.sheets.length * secPerSheet - q.progress;

/** Photos still inside the printer (queued or printing). */
export const photosInPrinter = (q: PrintQueue): number => q.sheets.reduce((a, b) => a + b, 0);

export const printSecPerSheet = (speedMult: number): number => PRINT.secPerSheet / Math.max(0.25, speedMult);
