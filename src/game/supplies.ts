/**
 * Printing supplies & the photographer's car (pure logic, tested).
 *
 *  - Every printed magnet sheet uses 1 blank magnet sheet and some toner.
 *  - A print job can jam the printer; a jammed printer needs the repair kit from the car.
 *  - At the car (parking lot) the photographer loads what the station needs and carries it back;
 *    the load is delivered when he reaches the workstation.
 */

export const SUPPLY = {
  /** Blank magnet sheets at the station at the start of an event. */
  startSheets: 10,
  /** Sheets in one pack taken from the car. */
  sheetsPerPack: 16,
  /** Most blank sheets the station holds. */
  maxSheets: 24,
  /** Toner %, used per printed sheet. */
  tonerStart: 70,
  tonerPerSheet: 6,
  /** Photos printed on one magnet sheet (matches the workstation timing). */
  photosPerSheet: 4,
  /** Chance that a print job jams the printer. */
  jamChance: 0.12,
  /** Seconds standing at the open trunk to load the supplies. */
  loadSec: 1.6,
} as const;

export interface SupplyState {
  sheets: number;
  toner: number;
  jammed: boolean;
}

export interface CarriedLoad {
  sheets: number;
  toner: boolean;
  repairKit: boolean;
}

export const EMPTY_LOAD: CarriedLoad = { sheets: 0, toner: false, repairKit: false };

export function createSupplies(): SupplyState {
  return { sheets: SUPPLY.startSheets, toner: SUPPLY.tonerStart, jammed: false };
}

export type PrintBlock = 'jam' | 'toner' | 'sheets';

/**
 * How many of `photos` can be printed now. Partial jobs print what the sheets and toner allow;
 * the rest stays on the computer.
 */
export function planPrint(
  state: SupplyState,
  photos: number
): { photos: number; sheets: number; blockedBy: PrintBlock | null; limitedBy: PrintBlock | null } {
  if (state.jammed) return { photos: 0, sheets: 0, blockedBy: 'jam', limitedBy: null };
  const sheetsWanted = Math.ceil(Math.max(0, photos) / SUPPLY.photosPerSheet);
  const tonerSheets = Math.floor(state.toner / SUPPLY.tonerPerSheet);
  const sheets = Math.min(sheetsWanted, state.sheets, tonerSheets);
  if (sheets <= 0) {
    return { photos: 0, sheets: 0, blockedBy: state.sheets <= 0 ? 'sheets' : 'toner', limitedBy: null };
  }
  const limitedBy: PrintBlock | null =
    sheets < sheetsWanted ? (state.sheets < tonerSheets ? 'sheets' : 'toner') : null;
  return { photos: Math.min(photos, sheets * SUPPLY.photosPerSheet), sheets, blockedBy: null, limitedBy };
}

/** Uses the supplies for a print job; `roll` in [0,1) decides whether the printer jams afterwards. */
export function consumePrint(state: SupplyState, sheets: number, roll: number): SupplyState {
  return {
    sheets: Math.max(0, state.sheets - sheets),
    toner: Math.max(0, state.toner - sheets * SUPPLY.tonerPerSheet),
    jammed: roll < SUPPLY.jamChance,
  };
}

/** What to take from the trunk: only what the station needs (always tops up sheets when not full). */
export function loadFromCar(state: SupplyState): CarriedLoad {
  return {
    sheets: Math.max(0, Math.min(SUPPLY.sheetsPerPack, SUPPLY.maxSheets - state.sheets)),
    toner: state.toner < 60,
    repairKit: state.jammed,
  };
}

export function isEmptyLoad(load: CarriedLoad): boolean {
  return load.sheets <= 0 && !load.toner && !load.repairKit;
}

/** Delivers the carried load at the workstation. */
export function deliverLoad(state: SupplyState, load: CarriedLoad): SupplyState {
  return {
    sheets: Math.min(SUPPLY.maxSheets, state.sheets + load.sheets),
    toner: load.toner ? 100 : state.toner,
    jammed: load.repairKit ? false : state.jammed,
  };
}

/** Short Hebrew reason the printer can't print. */
export function printBlockMessageHe(block: PrintBlock): string {
  if (block === 'jam') return '⚠️ המדפסת נתקעה! צריך ערכת תיקון מהרכב בחניה 🚗';
  if (block === 'toner') return '🖨️ נגמר הטונר! יש מחסנית חדשה ברכב בחניה 🚗';
  return '📄 נגמרו דפי המגנט! יש חבילה ברכב בחניה 🚗';
}

export function describeLoadHe(load: CarriedLoad): string {
  const parts: string[] = [];
  if (load.sheets > 0) parts.push(`${load.sheets} דפי מגנט`);
  if (load.toner) parts.push('מחסנית טונר');
  if (load.repairKit) parts.push('ערכת תיקון');
  return parts.join(' + ');
}
