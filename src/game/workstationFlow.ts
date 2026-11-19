/**
 * The corner workstation's production flow (moved out of IsoArenaCanvas.tsx, REFACTOR_MAP area 4):
 * copy the camera card to the laptop (quick) → print onto magnet sheets (the long step, runs on its
 * own while the photographer goes back to shooting — printQueue.ts) → cut the printed sheets.
 * The canvas owns the player, upgrades and supplies; this module only acts on them.
 */

import { sound } from './sound';
import { cardCopySec, cardLimits } from './cameraCard';
import {
  createPrintQueue,
  enqueuePrint,
  isPrinting,
  photosInPrinter,
  printRemainingSec,
  printSecPerSheet,
  stepPrint,
} from './printQueue';
import { consumePrint, planPrint, printBlockMessageHe, type SupplyState } from './supplies';
import {
  calculateCardTransferTiming,
  PHOTOS_PER_SHEET,
  calculateWorkstationJobTiming,
  getWorkstationSpeedMultiplier,
  type PhotographerUpgradeLevels,
} from './rules';

/** The player fields this flow reads and writes (the canvas player object fits). */
export interface WorkstationPlayer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  direction: string;
  photosInCamera: number;
  photosOnComputer: number;
  cameraOnDesk: boolean;
  transferAnimTimer: number;
  transferAnimDuration: number;
  transferBatch: number;
  uncutSheetsAtStation: number;
  cutMagnetsInHand: number;
  isNearStation: boolean;
  isSeatedAtStation: boolean;
  wasNearStation: boolean;
  standUpCooldown: number;
  atCutter: boolean;
  stationActionTimer: number;
  printerAnimTimer: number;
  printerAnimDuration: number;
  printerTotalSheets: number;
  cutterAnimTimer: number;
  cutterAnimDuration: number;
  cutterTotalSheets: number;
  stationFeedbackText: string | null;
  stationFeedbackTimer: number;
}

export interface WorkstationDeps {
  player: WorkstationPlayer;
  workstationPos: { x: number; y: number };
  cutterPos: { x: number; y: number };
  upgrades(): PhotographerUpgradeLevels;
  getSupplies(): SupplyState;
  setSupplies(s: SupplyState): void;
  spawnParticles(x: number, y: number, count: number, color: string, speed: number, life: number): void;
  spawnPaperScraps(x: number, y: number, count?: number): void;
  /** Magnets were cut: score + combo chime. */
  onCut(batch: number): void;
  /** Push the HUD now. */
  emitHud(): void;
}

export function createWorkstationFlow(deps: WorkstationDeps) {
  const { player } = deps;
  const printer = createPrintQueue();
  const secPerSheet = () => printSecPerSheet(getWorkstationSpeedMultiplier(deps.upgrades().turbo_station));
  const printerBusyHe = () =>
    `🖨️ המדפסת עובדת — ${printer.sheets.length} דפים נשארו (${printRemainingSec(printer, secPerSheet()).toFixed(0)} שנ'). אפשר ללכת לצלם ולחזור לחתוך ✂️`;
  /** Keep the printer animation fields in step with the queue (the renderer reads them). */
  const syncPrinterAnim = () => {
    const per = secPerSheet();
    player.printerTotalSheets = printer.runSheets;
    player.printerAnimDuration = printer.runSheets * per;
    player.printerAnimTimer = printRemainingSec(printer, per);
  };

  /** Every frame: the printer keeps printing whether or not the photographer is at the station. */
  const tickPrinter = (dt: number) => {
    tickCutter(dt);
    if (!isPrinting(printer)) return;
    const out = stepPrint(printer, dt, secPerSheet());
    for (const photos of out) {
      // standing at the cutter: a sheet that comes out goes straight under the blade (Shahar, 19.11)
      if (player.atCutter) {
        enqueuePrint(cutter, photos);
        syncCutterAnim();
      } else player.uncutSheetsAtStation += photos;
      sound.playMagnetPrint();
      deps.spawnParticles(deps.workstationPos.x - 6, deps.workstationPos.y + 4, 14, '#38bdf8', 110, 42);
    }
    syncPrinterAnim();
    if (out.length > 0 && !isPrinting(printer)) {
      player.stationFeedbackText = `✅ ההדפסה הסתיימה — ${player.uncutSheetsAtStation} מגנטים מחכים לחיתוך ✂️`;
      player.stationFeedbackTimer = 3;
    }
    if (out.length > 0) deps.emitHud();
  };

  /** The guillotine works the same way as the printer queue, but only while he stands at it. */
  const cutter = createPrintQueue();
  const cutSecPerSheet = () =>
    calculateWorkstationJobTiming(PHOTOS_PER_SHEET, getWorkstationSpeedMultiplier(deps.upgrades().turbo_station)).secondsPerSheet;
  const syncCutterAnim = () => {
    const per = cutSecPerSheet();
    player.cutterTotalSheets = cutter.runSheets;
    player.cutterAnimDuration = cutter.runSheets * per;
    player.cutterAnimTimer = printRemainingSec(cutter, per);
  };
  const tickCutter = (dt: number) => {
    if (!isPrinting(cutter)) return;
    if (!player.atCutter) {
      // he walked off: the cutter stops, the rest waits at the station
      const left = photosInPrinter(cutter);
      cutter.sheets = [];
      cutter.progress = 0;
      player.uncutSheetsAtStation += left;
      player.cutterAnimTimer = 0;
      player.stationFeedbackText = `✂️ החיתוך נעצר — ${left} מגנטים מחכים בעמדה. יש לך ${player.cutMagnetsInHand} ביד 🧲`;
      player.stationFeedbackTimer = 2.6;
      deps.emitHud();
      return;
    }
    const out = stepPrint(cutter, dt, cutSecPerSheet());
    for (const photos of out) {
      player.cutMagnetsInHand += photos;
      deps.onCut(photos);
      sound.playMagnetCutter();
      deps.spawnPaperScraps(deps.workstationPos.x + 18, deps.workstationPos.y + 4, 18);
      deps.spawnParticles(deps.workstationPos.x + 18, deps.workstationPos.y + 4, 14, '#22d3ee', 120, 40);
    }
    syncCutterAnim();
    if (out.length > 0) {
      if (!isPrinting(cutter)) {
        player.stationFeedbackText = `✂️ טראח! ${player.cutMagnetsInHand} מגנטים ביד — רוץ ללוח והדבק [E]! 🧲`;
        player.stationFeedbackTimer = 3;
      }
      deps.emitHud();
    }
  };

  const resetPrinter = () => {
    cutter.sheets = [];
    cutter.progress = 0;
    player.cutterAnimTimer = 0;
    printer.sheets = [];
    printer.progress = 0;
    printer.runSheets = 0;
    printer.runDone = 0;
    player.printerAnimTimer = 0;
  };

  // Step 1 at Corner Workstation: put the camera down on the desk, card into the laptop,
  // and copy the photos. While the camera is on the desk the photographer can't shoot.
  const transferCardToComputer = () => {
    if (player.transferAnimTimer > 0) {
      player.stationFeedbackText = `💾 מעביר תמונות למחשב... (${player.transferAnimTimer.toFixed(1)} שנ')`;
      player.stationFeedbackTimer = 1.6;
      return;
    }
    if (player.photosInCamera <= 0) {
      player.stationFeedbackText = 'אין תמונות במצלמה! צלם אורחים ברחבה ובשולחנות 📸';
      player.stationFeedbackTimer = 2.2;
      sound.playDanceBump();
      return;
    }

    const batch = player.photosInCamera;
    const speedMult = getWorkstationSpeedMultiplier(deps.upgrades().turbo_station);
    const job = calculateCardTransferTiming(batch, speedMult);
    const copySec = cardCopySec(job.totalDurationSec, batch, cardLimits(deps.upgrades().pro_sdcard).capacity, speedMult);

    player.cameraOnDesk = true;
    player.photosInCamera = 0; // card is in the laptop now
    player.transferBatch = batch;
    player.transferAnimDuration = copySec;
    player.transferAnimTimer = copySec;
    player.stationActionTimer = Math.max(player.stationActionTimer, copySec);
    sound.playDanceBump();
    deps.spawnParticles(deps.workstationPos.x - 30, deps.workstationPos.y + 6, 10, '#4ade80', 90, 40);

    player.stationFeedbackText = `💾 המצלמה על השולחן והכרטיס במחשב — מעביר ${batch} תמונות (${copySec.toFixed(1)} שנ'${copySec > job.totalDurationSec ? ' · כרטיס עמוס = איטי' : ''}). אי אפשר לצלם עכשיו!`;
    player.stationFeedbackTimer = Math.max(2.6, copySec + 0.8);
    deps.emitHud();
  };

  // Called when the copy finishes: photos are on the laptop, ready for the thermal printer
  const finishCardTransfer = () => {
    player.photosOnComputer += player.transferBatch;
    player.transferBatch = 0;
    sound.playComboChime(1);
    player.stationFeedbackText = player.isSeatedAtStation
      ? `✅ ${player.photosOnComputer} תמונות במחשב! לחץ [E] להדפסה 🖨️ · קום מהכסא כדי לקחת את המצלמה`
      : `✅ ההעברה הסתיימה! קח את המצלמה מהשולחן 📷`;
    player.stationFeedbackTimer = 3;
    deps.emitHud();
  };

  // Step 2 at Corner Workstation: Print the transferred photos via the Thermal Printer onto magnetic sheets
  // Timing: Every 4 photos = 1 sheet = 0.5 seconds (scaled by turbo_station upgrade)!
  const developAtWorkstation = () => {
    // photos already on the laptop can print while the next card is still copying
    if (player.transferAnimTimer > 0 && player.photosOnComputer <= 0) {
      transferCardToComputer(); // shows the "still copying" message
      return;
    }
    if (player.photosOnComputer <= 0) {
      if (player.photosInCamera > 0) {
        // Photos are still on the camera card → copy them to the laptop first
        transferCardToComputer();
        return;
      }
      if (isPrinting(printer)) {
        player.stationFeedbackText = printerBusyHe();
        player.stationFeedbackTimer = 2.4;
        return;
      }
      player.stationFeedbackText = 'אין תמונות במחשב! צלם אורחים והעבר את התמונות מהמצלמה 📸💾';
      player.stationFeedbackTimer = 2.2;
      sound.playDanceBump();
      return;
    }

    // Supplies: blank magnet sheets + toner, and the printer may be jammed
    const plan = planPrint(deps.getSupplies(), player.photosOnComputer);
    if (plan.blockedBy) {
      player.stationFeedbackText = printBlockMessageHe(plan.blockedBy);
      player.stationFeedbackTimer = 3;
      sound.playDanceBump();
      deps.emitHud();
      return;
    }
    const batch = plan.photos;
    player.photosOnComputer -= batch;
    deps.setSupplies(consumePrint(deps.getSupplies(), plan.sheets, Math.random()));
    const sheets = enqueuePrint(printer, batch);
    syncPrinterAnim();
    sound.playDanceBump();

    player.stationFeedbackText = `🖨️ נשלחו ${batch} תמונות להדפסה (${sheets} דפים · ${printRemainingSec(printer, secPerSheet()).toFixed(0)} שנ'). קח את המצלמה ולך לצלם — חזור לחתוך כשהדפים יוצאים ✂️`;
    if (plan.limitedBy) {
      player.stationFeedbackText += ` · ${player.photosOnComputer} תמונות נשארו במחשב — ${printBlockMessageHe(plan.limitedBy)}`;
    } else if (deps.getSupplies().jammed) {
      player.stationFeedbackText += ' · ⚠️ המדפסת נתקעה בסוף ההדפסה — צריך ערכת תיקון מהרכב 🚗';
    }
    player.stationFeedbackTimer = 4;
    deps.emitHud();
  };

  // Step 2 at Corner Workstation: Cut the magnetic sheets using the KW-triO Blue Guillotine Cutter
  // Timing: Every 4 photos = 1 sheet = 0.5 seconds (scaled by turbo_station upgrade)!
  const cutAtWorkstation = () => {
    if (player.uncutSheetsAtStation <= 0) {
      if (player.photosOnComputer > 0 || player.photosInCamera > 0) {
        developAtWorkstation();
        return;
      }
      if (isPrinting(printer)) {
        player.stationFeedbackText = printerBusyHe();
        player.stationFeedbackTimer = 2.4;
        return;
      }
      player.stationFeedbackText = 'אין דפי מגנט לחיתוך! פתח קודם תמונות במדפסת התרמית 🖨️';
      player.stationFeedbackTimer = 2.2;
      sound.playDanceBump();
      return;
    }

    // Cut sheet by sheet: each sheet's magnets go into his hand as it is cut. Walking away stops
    // the cutter; the sheets not cut yet wait at the station (Shahar, 19.11).
    const batch = player.uncutSheetsAtStation;
    player.uncutSheetsAtStation = 0;
    enqueuePrint(cutter, batch);
    syncCutterAnim();

    // Get up from the chair and step over to the cutter (only when actually at the workstation)
    if (player.isNearStation) {
      player.isSeatedAtStation = false;
      player.atCutter = true;
      player.x = deps.cutterPos.x;
      player.y = deps.cutterPos.y;
      player.vx = 0;
      player.vy = 0;
      player.direction = 'NE';
      player.wasNearStation = true;
      player.standUpCooldown = Math.max(player.standUpCooldown, 0.5);
    }

    player.stationFeedbackText = `✂️ חותך ${cutter.runSheets} דפים (${printRemainingSec(cutter, cutSecPerSheet()).toFixed(0)} שנ'). זוז כדי לעצור ולחזור לצלם — מה שנחתך כבר ביד 🧲`;
    player.stationFeedbackTimer = 3;
    deps.emitHud();
  };

  return {
    transferCardToComputer,
    finishCardTransfer,
    developAtWorkstation,
    cutAtWorkstation,
    tickPrinter,
    resetPrinter,
    /** Photos still inside the printer (for the HUD). */
    photosPrinting: () => photosInPrinter(printer),
  };
}
