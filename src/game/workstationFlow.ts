/**
 * The corner workstation's production flow (moved out of IsoArenaCanvas.tsx, REFACTOR_MAP area 4):
 * copy the camera card to the laptop → print onto magnet sheets → cut on the guillotine.
 * The canvas owns the player, upgrades and supplies; this module only acts on them.
 */

import { sound } from './sound';
import { cardCopySec, cardLimits } from './cameraCard';
import { consumePrint, planPrint, printBlockMessageHe, type SupplyState } from './supplies';
import {
  calculateCardTransferTiming,
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
  scheduleTimeout(fn: () => void, delayMs: number): void;
  /** Magnets were cut: score + combo chime. */
  onCut(batch: number): void;
  /** Push the HUD now. */
  emitHud(): void;
}

export function createWorkstationFlow(deps: WorkstationDeps) {
  const { player } = deps;

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
    if (player.transferAnimTimer > 0) {
      transferCardToComputer(); // shows the "still copying" message
      return;
    }
    if (player.photosOnComputer <= 0) {
      if (player.photosInCamera > 0) {
        // Photos are still on the camera card → copy them to the laptop first
        transferCardToComputer();
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
    const speedMult = getWorkstationSpeedMultiplier(deps.upgrades().turbo_station);
    const job = calculateWorkstationJobTiming(batch, speedMult);

    player.photosOnComputer -= batch;
    deps.setSupplies(consumePrint(deps.getSupplies(), plan.sheets, Math.random()));
    player.uncutSheetsAtStation += batch;
    player.printerAnimDuration = job.totalDurationSec;
    player.printerAnimTimer = job.totalDurationSec;
    player.printerTotalSheets = job.sheetCount;
    player.stationActionTimer = job.totalDurationSec;
    const sheetIntervalMs = Math.max(120, Math.round(job.secondsPerSheet * 1000));
    for (let s = 0; s < job.sheetCount; s++) {
      deps.scheduleTimeout(() => {
        sound.playMagnetPrint();
        deps.spawnParticles(deps.workstationPos.x - 6, deps.workstationPos.y + 4, 14, '#38bdf8', 110, 42);
      }, s * sheetIntervalMs);
    }

    player.stationFeedbackText = `🖨️ מדפיס ${job.sheetCount} דפי מגנט (${batch} תמונות · ${job.totalDurationSec.toFixed(1)} שנ')! לחץ [E] לחיתוך! ✂️`;
    if (plan.limitedBy) {
      player.stationFeedbackText += ` · ${player.photosOnComputer} תמונות נשארו במחשב — ${printBlockMessageHe(plan.limitedBy)}`;
    } else if (deps.getSupplies().jammed) {
      player.stationFeedbackText += ' · ⚠️ המדפסת נתקעה בסוף ההדפסה — צריך ערכת תיקון מהרכב 🚗';
    }
    player.stationFeedbackTimer = Math.max(3.2, job.totalDurationSec + 1.8);
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
      player.stationFeedbackText = 'אין דפי מגנט לחיתוך! פתח קודם תמונות במדפסת התרמית 🖨️';
      player.stationFeedbackTimer = 2.2;
      sound.playDanceBump();
      return;
    }

    const batch = player.uncutSheetsAtStation;
    const speedMult = getWorkstationSpeedMultiplier(deps.upgrades().turbo_station);
    const job = calculateWorkstationJobTiming(batch, speedMult);
    player.uncutSheetsAtStation = 0;
    player.cutMagnetsInHand += batch;
    player.cutterAnimDuration = job.totalDurationSec;
    player.cutterAnimTimer = job.totalDurationSec;
    player.cutterTotalSheets = job.sheetCount;
    player.stationActionTimer = job.totalDurationSec;

    deps.onCut(batch);

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

    const sheetIntervalMs = Math.max(120, Math.round(job.secondsPerSheet * 1000));
    for (let s = 0; s < job.sheetCount; s++) {
      // Chop sound lands when the blade slices (≈42% into each sheet), matching the full-cut pose
      deps.scheduleTimeout(() => {
        sound.playMagnetCutter();
        deps.spawnPaperScraps(deps.workstationPos.x + 18, deps.workstationPos.y + 4, 18);
        deps.spawnParticles(deps.workstationPos.x + 18, deps.workstationPos.y + 4, 14, '#22d3ee', 120, 40);
      }, Math.round((s + 0.42) * sheetIntervalMs));
    }

    player.stationFeedbackText = `✂️ טראח! נחתכו ${batch} מגנטים (${job.sheetCount} דפים · ${job.totalDurationSec.toFixed(1)} שנ')! רוץ ללוח המגנטים והדבק [E]! 🧲`;
    player.stationFeedbackTimer = Math.max(3.5, job.totalDurationSec + 1.8);
    deps.emitHud();
  };

  return { transferCardToComputer, finishCardTransfer, developAtWorkstation, cutAtWorkstation };
}
