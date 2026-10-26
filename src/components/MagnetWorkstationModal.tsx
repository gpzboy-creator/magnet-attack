import React, { useEffect, useRef, useState } from 'react';
import {
  MAGNET_FRAMES,
  MAGNET_FRAME_ORDER,
  MAX_UPGRADE_LEVEL,
  MagnetFrameId,
  PHOTOS_PER_SHEET,
  PhotographerUpgradeLevels,
  SECONDS_PER_SHEET,
  UpgradeId,
  calculateWorkstationJobTiming,
  getUpgradeCost,
  getWorkstationSheetProgress,
  getWorkstationSpeedMultiplier,
} from '../game/rules';
import {
  drawPixelGuillotineCutter,
  drawPixelLaptop,
  drawPixelThermalPrinter,
} from '../game/workstationPixelArt';

export interface MagnetWorkstationModalProps {
  isOpen: boolean;
  onClose: () => void;
  photosInCamera: number;
  maxPhotosInCamera?: number;
  uncutSheetsAtStation: number;
  cutMagnetsInHand: number;
  availableMagnetsOnBoard?: number;
  selectedFrame?: MagnetFrameId;
  onSelectFrame?: (frame: MagnetFrameId) => void;
  upgradeLevels?: PhotographerUpgradeLevels;
  score?: number;
  onPurchaseUpgrade?: (id: UpgradeId) => void;
  onDevelopPhotos?: () => void;
  onCutMagnets?: () => void;
  onDevelopSheets?: () => void;
  onCutSheets?: () => void;
  onOpenBoardModal?: () => void;
}

export const MagnetWorkstationModal: React.FC<MagnetWorkstationModalProps> = ({
  isOpen,
  onClose,
  photosInCamera,
  maxPhotosInCamera = 12,
  uncutSheetsAtStation,
  cutMagnetsInHand,
  selectedFrame = 'gold',
  onSelectFrame,
  upgradeLevels = { turbo_station: 0, pro_sdcard: 0, sneakers: 0 },
  score = 0,
  onPurchaseUpgrade,
  onDevelopPhotos,
  onCutMagnets,
  onDevelopSheets,
  onCutSheets,
}) => {
  // Active timed print job state (0.5s per 4 photos = 1 sheet)
  const [printJob, setPrintJob] = useState<{
    active: boolean;
    startTimeMs: number;
    totalDurationSec: number;
    remainingSec: number;
    totalSheets: number;
    photoCount: number;
  }>({
    active: false,
    startTimeMs: 0,
    totalDurationSec: 0,
    remainingSec: 0,
    totalSheets: 0,
    photoCount: 0,
  });

  // Active timed cut job state (0.5s per 4 photos = 1 sheet)
  const [cutJob, setCutJob] = useState<{
    active: boolean;
    startTimeMs: number;
    totalDurationSec: number;
    remainingSec: number;
    totalSheets: number;
    photoCount: number;
  }>({
    active: false,
    startTimeMs: 0,
    totalDurationSec: 0,
    remainingSec: 0,
    totalSheets: 0,
    photoCount: 0,
  });

  const laptopCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const printerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cutterCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Refs for latest state inside 60fps animation loop
  const stateRef = useRef({
    photosInCamera,
    uncutSheetsAtStation,
    cutMagnetsInHand,
    printJob,
    cutJob,
  });
  stateRef.current = {
    photosInCamera,
    uncutSheetsAtStation,
    cutMagnetsInHand,
    printJob,
    cutJob,
  };

  useEffect(() => {
    if (!isOpen) return;

    let rafId = 0;
    const openStartMs = performance.now();

    const animate = (now: number) => {
      const clockSec = (now - openStartMs) / 1000;
      const cur = stateRef.current;

      // Compute exact wall-clock remaining time for active print job (0.5s per 4 photos = 1 sheet)
      let printRemSec = 0;
      let isPrintingNow = cur.printJob.active;
      if (cur.printJob.active) {
        const elapsed = Math.max(0, (now - cur.printJob.startTimeMs) / 1000);
        printRemSec = Math.max(0, cur.printJob.totalDurationSec - elapsed);
        isPrintingNow = printRemSec > 0;
        setPrintJob((prev) =>
          prev.active
            ? {
                ...prev,
                active: printRemSec > 0,
                remainingSec: printRemSec,
              }
            : prev
        );
      }

      // Compute exact wall-clock remaining time for active cut job (0.5s per 4 photos = 1 sheet)
      let cutRemSec = 0;
      let isCuttingNow = cur.cutJob.active;
      if (cur.cutJob.active) {
        const elapsed = Math.max(0, (now - cur.cutJob.startTimeMs) / 1000);
        cutRemSec = Math.max(0, cur.cutJob.totalDurationSec - elapsed);
        isCuttingNow = cutRemSec > 0;
        setCutJob((prev) =>
          prev.active
            ? {
                ...prev,
                active: cutRemSec > 0,
                remainingSec: cutRemSec,
              }
            : prev
        );
      }

      const pProg = getWorkstationSheetProgress(
        printRemSec,
        cur.printJob.totalDurationSec,
        cur.printJob.totalSheets
      );

      const cProg = getWorkstationSheetProgress(
        cutRemSec,
        cur.cutJob.totalDurationSec,
        cur.cutJob.totalSheets
      );

      const idleUncutSheets = Math.ceil(cur.uncutSheetsAtStation / PHOTOS_PER_SHEET);

      // 1. Render Pixel-Art Laptop
      const lapCanvas = laptopCanvasRef.current;
      if (lapCanvas) {
        const ctx = lapCanvas.getContext('2d');
        if (ctx) {
          drawPixelLaptop(ctx, 0, 0, lapCanvas.width, lapCanvas.height, {
            isPrinting: isPrintingNow,
            isCutting: isCuttingNow,
            photosInCamera: cur.photosInCamera,
            uncutSheets: idleUncutSheets,
            sheetProgress: isPrintingNow ? pProg.sheetProgress : 0,
            currentSheet: isPrintingNow ? pProg.currentSheet : 1,
            totalSheets: isPrintingNow
              ? cur.printJob.totalSheets
              : Math.ceil(cur.photosInCamera / PHOTOS_PER_SHEET),
            timeSec: clockSec,
          });
        }
      }

      // 2. Render Pixel-Art Mitsubishi Thermal Photo Printer
      const prnCanvas = printerCanvasRef.current;
      if (prnCanvas) {
        const ctx = prnCanvas.getContext('2d');
        if (ctx) {
          const sheetsInTray = isPrintingNow
            ? pProg.completedSheets
            : idleUncutSheets;
          drawPixelThermalPrinter(ctx, 0, 0, prnCanvas.width, prnCanvas.height, {
            isPrinting: isPrintingNow,
            sheetProgress: isPrintingNow ? pProg.sheetProgress : 0,
            currentSheet: isPrintingNow ? pProg.currentSheet : 1,
            totalSheets: isPrintingNow ? cur.printJob.totalSheets : 0,
            sheetsInTray,
            photosQueued: cur.photosInCamera,
            timeSec: clockSec,
          });
        }
      }

      // 3. Render Pixel-Art KW-triO 3925 Blue Guillotine Cutter
      const cutCanvas = cutterCanvasRef.current;
      if (cutCanvas) {
        const ctx = cutCanvas.getContext('2d');
        if (ctx) {
          drawPixelGuillotineCutter(ctx, 0, 0, cutCanvas.width, cutCanvas.height, {
            isCutting: isCuttingNow,
            cutProgress: isCuttingNow ? cProg.sheetProgress : 0,
            currentSheet: isCuttingNow ? cProg.currentSheet : 1,
            totalSheets: isCuttingNow ? cur.cutJob.totalSheets : 0,
            uncutSheetsWaiting: isCuttingNow
              ? Math.max(1, cur.cutJob.totalSheets - cProg.completedSheets)
              : isPrintingNow
              ? pProg.completedSheets
              : idleUncutSheets,
            cutMagnetsReady: cur.cutMagnetsInHand,
            timeSec: clockSec,
          });
        }
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [isOpen]);

  const pendingPrintTimerRef = useRef<number | null>(null);
  const pendingCutTimerRef = useRef<number | null>(null);
  const pendingPrintCallbackRef = useRef<(() => void) | null>(null);
  const pendingCutCallbackRef = useRef<(() => void) | null>(null);

  // If modal closes while a print/cut timer is mid-flight, flush immediately so player never loses progress
  useEffect(() => {
    if (!isOpen) {
      if (pendingPrintTimerRef.current !== null) {
        window.clearTimeout(pendingPrintTimerRef.current);
        pendingPrintTimerRef.current = null;
        if (pendingPrintCallbackRef.current) {
          const fn = pendingPrintCallbackRef.current;
          pendingPrintCallbackRef.current = null;
          fn();
        }
      }
      if (pendingCutTimerRef.current !== null) {
        window.clearTimeout(pendingCutTimerRef.current);
        pendingCutTimerRef.current = null;
        if (pendingCutCallbackRef.current) {
          const fn = pendingCutCallbackRef.current;
          pendingCutCallbackRef.current = null;
          fn();
        }
      }
      setPrintJob((p) => (p.active ? { ...p, active: false, remainingSec: 0 } : p));
      setCutJob((c) => (c.active ? { ...c, active: false, remainingSec: 0 } : c));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const speedMult = getWorkstationSpeedMultiplier(upgradeLevels.turbo_station);
  const printTiming = calculateWorkstationJobTiming(photosInCamera, speedMult);
  const cutTiming = calculateWorkstationJobTiming(uncutSheetsAtStation, speedMult);

  const activePrintSheetInfo = getWorkstationSheetProgress(
    printJob.remainingSec,
    printJob.totalDurationSec,
    printJob.totalSheets
  );

  const activeCutSheetInfo = getWorkstationSheetProgress(
    cutJob.remainingSec,
    cutJob.totalDurationSec,
    cutJob.totalSheets
  );

  const handleDevelopClick = () => {
    if (photosInCamera <= 0 || printJob.active) return;
    const job = calculateWorkstationJobTiming(photosInCamera, speedMult);
    setPrintJob({
      active: true,
      startTimeMs: performance.now(),
      totalDurationSec: job.totalDurationSec,
      remainingSec: job.totalDurationSec,
      totalSheets: job.sheetCount,
      photoCount: job.photoCount,
    });

    const fireDevelop = () => {
      if (typeof onDevelopPhotos === 'function') {
        onDevelopPhotos();
      } else if (typeof onDevelopSheets === 'function') {
        onDevelopSheets();
      }
    };

    pendingPrintCallbackRef.current = fireDevelop;
    pendingPrintTimerRef.current = window.setTimeout(() => {
      pendingPrintTimerRef.current = null;
      pendingPrintCallbackRef.current = null;
      fireDevelop();
    }, job.durationMs);
  };

  const handleCutClick = () => {
    if (uncutSheetsAtStation <= 0 || cutJob.active || printJob.active) return;
    const job = calculateWorkstationJobTiming(uncutSheetsAtStation, speedMult);
    setCutJob({
      active: true,
      startTimeMs: performance.now(),
      totalDurationSec: job.totalDurationSec,
      remainingSec: job.totalDurationSec,
      totalSheets: job.sheetCount,
      photoCount: job.photoCount,
    });

    const fireCut = () => {
      if (typeof onCutMagnets === 'function') {
        onCutMagnets();
      } else if (typeof onCutSheets === 'function') {
        onCutSheets();
      }
    };

    pendingCutCallbackRef.current = fireCut;
    pendingCutTimerRef.current = window.setTimeout(() => {
      pendingCutTimerRef.current = null;
      pendingCutCallbackRef.current = null;
      fireCut();
    }, job.durationMs);
  };

  const activeFrameCfg = MAGNET_FRAMES[selectedFrame];
  const turboCost = getUpgradeCost('turbo_station', upgradeLevels.turbo_station);
  const sdCost = getUpgradeCost('pro_sdcard', upgradeLevels.pro_sdcard);
  const sneakersCost = getUpgradeCost('sneakers', upgradeLevels.sneakers);

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="עמדת פיתוח וחיתוך מגנטים בפינת האולם"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-950/85 backdrop-blur-md select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-stone-900 border-2 border-amber-500/70 rounded-2xl shadow-2xl p-4 sm:p-5 flex flex-col gap-3 text-stone-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
          <div className="flex items-center gap-3">
            <span className="text-2xl sm:text-3xl">🖨️✂️</span>
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-amber-300">
                עמדת פיתוח וחיתוך מגנטים · אנימציית פיקסל מקצועית
              </h2>
              <p className="text-xs text-stone-400">
                כל דף מכיל {PHOTOS_PER_SHEET} תמונות · זמן בסיס: {SECONDS_PER_SHEET} שנ' לדף (מהירות נוכחית: x{speedMult.toFixed(2)})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center justify-center font-bold text-lg cursor-pointer transition-colors"
            aria-label="סגור חלון עמדת מגנטים"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 3-Step Pipeline Status Bar */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 bg-stone-950/80 border border-stone-800 rounded-xl p-2.5 text-center">
          <div className={`flex flex-col p-2 rounded-lg border ${photosInCamera > 0 ? 'border-amber-400 bg-amber-500/10' : 'border-stone-800'}`}>
            <span className="text-[11px] font-bold text-amber-300 uppercase">
              📸 1. תמונות בכרטיס ({Math.ceil(photosInCamera / PHOTOS_PER_SHEET)} דפים)
            </span>
            <span dir="ltr" className="text-xl sm:text-2xl font-black font-mono text-amber-300">
              {photosInCamera} / {maxPhotosInCamera}
            </span>
          </div>
          <div className={`flex flex-col p-2 rounded-lg border ${uncutSheetsAtStation > 0 ? 'border-cyan-400 bg-cyan-500/10 animate-pulse' : 'border-stone-800'}`}>
            <span className="text-[11px] font-bold text-cyan-300 uppercase">
              📄 2. תמונות על דפי מגנט לחיתוך ({Math.ceil(uncutSheetsAtStation / PHOTOS_PER_SHEET)} דפים)
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-cyan-300">{uncutSheetsAtStation}</span>
          </div>
          <div className={`flex flex-col p-2 rounded-lg border ${cutMagnetsInHand > 0 ? 'border-emerald-400 bg-emerald-500/10' : 'border-stone-800'}`}>
            <span className="text-[11px] font-bold text-emerald-300 uppercase">
              🧲 3. מגנטים חתוכים ביד (להדבקה בלוח)
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400">{cutMagnetsInHand}</span>
          </div>
        </div>

        {/* Frame Design Selector & Workstation Upgrades Strip */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 bg-stone-950/90 border border-stone-800 rounded-xl p-2.5">
          {/* Magnet Frame Style Selector (Table Preferences) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
              <span className="font-black text-amber-300">🎨 מסגרת מגנט [G] (+50% בונוס בהתאמה):</span>
              <span className="text-amber-100/90 font-medium">מועדף ע"י: {activeFrameCfg.preferredByHe}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {MAGNET_FRAME_ORDER.map((fId) => {
                const f = MAGNET_FRAMES[fId];
                const isSelected = selectedFrame === fId;
                return (
                  <button
                    key={fId}
                    type="button"
                    onClick={() => onSelectFrame?.(fId)}
                    className={`px-2 py-1.5 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-stone-800 text-white border-2 shadow-md scale-[1.02]'
                        : 'bg-stone-900/80 text-stone-400 border-stone-800 hover:bg-stone-800/60'
                    }`}
                    style={{
                      borderColor: isSelected ? f.borderColor : undefined,
                    }}
                  >
                    <span>{f.icon}</span>
                    <span className="truncate">{f.shortHe}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Equipment Upgrades */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-black text-cyan-300">⚡ שדרוגי ציוד ועמדה (ניקוד זמין: {Math.round(score)}):</span>
              <span className="text-stone-400">משדרג הדפסה, כרטיס זיכרון וריצה</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                disabled={upgradeLevels.turbo_station >= MAX_UPGRADE_LEVEL || score < turboCost}
                onClick={() => onPurchaseUpgrade?.('turbo_station')}
                className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold flex items-center justify-between gap-1 cursor-pointer transition-all ${
                  upgradeLevels.turbo_station >= MAX_UPGRADE_LEVEL
                    ? 'bg-emerald-950/50 border-emerald-600/50 text-emerald-300 cursor-default'
                    : score >= turboCost
                    ? 'bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-400 text-cyan-200'
                    : 'bg-stone-900 border-stone-800 text-stone-500 cursor-not-allowed'
                }`}
              >
                <span className="truncate">⚡ טורבו Lv.{upgradeLevels.turbo_station}</span>
                <span className="font-mono">
                  {upgradeLevels.turbo_station >= MAX_UPGRADE_LEVEL ? 'MAX' : `${turboCost}`}
                </span>
              </button>

              <button
                type="button"
                disabled={upgradeLevels.pro_sdcard >= MAX_UPGRADE_LEVEL || score < sdCost}
                onClick={() => onPurchaseUpgrade?.('pro_sdcard')}
                className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold flex items-center justify-between gap-1 cursor-pointer transition-all ${
                  upgradeLevels.pro_sdcard >= MAX_UPGRADE_LEVEL
                    ? 'bg-emerald-950/50 border-emerald-600/50 text-emerald-300 cursor-default'
                    : score >= sdCost
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-400 text-amber-200'
                    : 'bg-stone-900 border-stone-800 text-stone-500 cursor-not-allowed'
                }`}
              >
                <span className="truncate">💾 כרטיס Lv.{upgradeLevels.pro_sdcard}</span>
                <span className="font-mono">
                  {upgradeLevels.pro_sdcard >= MAX_UPGRADE_LEVEL ? 'MAX' : `${sdCost}`}
                </span>
              </button>

              <button
                type="button"
                disabled={upgradeLevels.sneakers >= MAX_UPGRADE_LEVEL || score < sneakersCost}
                onClick={() => onPurchaseUpgrade?.('sneakers')}
                className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold flex items-center justify-between gap-1 cursor-pointer transition-all ${
                  upgradeLevels.sneakers >= MAX_UPGRADE_LEVEL
                    ? 'bg-emerald-950/50 border-emerald-600/50 text-emerald-300 cursor-default'
                    : score >= sneakersCost
                    ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-400 text-emerald-200'
                    : 'bg-stone-900 border-stone-800 text-stone-500 cursor-not-allowed'
                }`}
              >
                <span className="truncate">👟 נעליים Lv.{upgradeLevels.sneakers}</span>
                <span className="font-mono">
                  {upgradeLevels.sneakers >= MAX_UPGRADE_LEVEL ? 'MAX' : `${sneakersCost}`}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Rectangular Workstation Table Top Surface */}
        <div className="bg-gradient-to-b from-amber-950/50 via-stone-900 to-stone-950 border-2 border-amber-800/60 rounded-2xl p-3.5 sm:p-4 shadow-inner">
          <div className="text-xs font-bold text-amber-200/90 mb-2.5 flex items-center justify-between">
            <span>🪵 שולחן עבודה פינתי · 4 תמונות בדף = {(SECONDS_PER_SHEET / speedMult).toFixed(2)} שניות להדפסה ולחיתוך</span>
            <span className="font-mono text-stone-400">PIXEL-ART WORKSTATION</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            {/* 1. Pixel-Art Laptop + Adhesive Magnet Papers */}
            <div className="bg-stone-950/90 border border-stone-800 rounded-xl p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-1 mb-2 min-h-[24px]">
                  <span className="text-xs sm:text-sm font-black text-sky-300 whitespace-nowrap">💻 מחשב נייד + דפי הדבקה</span>
                  <span className="text-[10px] bg-sky-950 text-sky-300 px-2 py-0.5 rounded border border-sky-700 font-mono whitespace-nowrap">
                    {photosInCamera > 0
                      ? `${Math.ceil(photosInCamera / PHOTOS_PER_SHEET)} דפים (${photosInCamera} תמונות)`
                      : '4 תמונות לדף'}
                  </span>
                </div>

                {/* Live Pixel-Art Laptop Canvas */}
                <div className="relative rounded-xl overflow-hidden bg-slate-950 border-2 border-stone-700 shadow-lg flex items-center justify-center h-44">
                  <canvas
                    ref={laptopCanvasRef}
                    width={224}
                    height={156}
                    style={{ imageRendering: 'pixelated' }}
                    className="w-full h-full object-contain"
                  />
                  {printJob.active && (
                    <div className="absolute bottom-2 inset-x-2 bg-stone-950/90 border border-sky-400/70 rounded-lg px-2.5 py-1 flex items-center justify-between text-[11px] font-bold text-sky-300">
                      <span>⚡ משדר דף {activePrintSheetInfo.currentSheet}/{printJob.totalSheets} למדפסת...</span>
                      <span className="font-mono">{printJob.remainingSec.toFixed(1)}s</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-2.5 bg-stone-900/90 border border-stone-800 rounded-lg py-2 px-2.5 text-[11px] text-stone-300 flex items-center justify-between">
                <span>📄 4 תמונות בכל דף מגנט (0.5 שנ')</span>
                <span className="font-mono text-amber-300 font-bold">← USB</span>
              </div>
            </div>

            {/* 2. Pixel-Art Thermal Printer (Mitsubishi Electric Reference) */}
            <div className="bg-stone-950/90 border border-stone-800 rounded-xl p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-1 mb-2 min-h-[24px]">
                  <span className="text-xs sm:text-sm font-black text-amber-300 whitespace-nowrap">🖨️ מדפסת תרמית מקצועית</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold whitespace-nowrap ${
                      printJob.active
                        ? 'bg-cyan-400 text-stone-950 animate-pulse'
                        : photosInCamera > 0
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {printJob.active
                      ? `דף ${activePrintSheetInfo.currentSheet}/${printJob.totalSheets} (${printJob.remainingSec.toFixed(1)}s)`
                      : photosInCamera > 0
                      ? `${printTiming.sheetCount} דפים · ${printTiming.totalDurationSec.toFixed(1)} שנ'`
                      : 'ממתין לתמונות'}
                  </span>
                </div>

                <div className="relative rounded-xl overflow-hidden bg-slate-950 border-2 border-stone-700 shadow-lg flex items-center justify-center h-44">
                  <canvas
                    ref={printerCanvasRef}
                    width={224}
                    height={156}
                    style={{ imageRendering: 'pixelated' }}
                    className="w-full h-full object-contain"
                  />
                  {/* Mini Reference Photo Badge in top-left corner */}
                  <img
                    src={`${import.meta.env.BASE_URL}assets/aistudio/images_2d9246ef.jpg`}
                    alt="מדפסת תרמית מקורית"
                    className="absolute top-1.5 left-1.5 w-10 h-10 object-contain bg-white rounded border border-stone-600 p-0.5 shadow"
                  />

                  {printJob.active && (
                    <div className="absolute bottom-2 inset-x-2 bg-stone-950/95 border border-cyan-400 rounded-lg px-2.5 py-1.5 shadow-lg">
                      <div className="flex items-center justify-between text-[11px] font-black text-cyan-300 mb-1">
                        <span>
                          🖨️ מוציא דף {activePrintSheetInfo.currentSheet} מתוך {printJob.totalSheets}...
                        </span>
                        <span className="font-mono">{printJob.remainingSec.toFixed(1)} שנ'</span>
                      </div>
                      <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-400 to-amber-300 transition-all duration-75"
                          style={{ width: `${Math.round(activePrintSheetInfo.overallProgress * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleDevelopClick}
                disabled={photosInCamera <= 0 || printJob.active}
                className={`mt-2.5 w-full py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  printJob.active
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-500 cursor-wait'
                    : photosInCamera > 0
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 border-amber-200 shadow-lg active:scale-95'
                    : 'bg-stone-800 text-stone-500 border-stone-700 cursor-not-allowed'
                }`}
              >
                <span>🖨️</span>
                <span>
                  {printJob.active
                    ? `מדפיס דף ${activePrintSheetInfo.currentSheet}/${printJob.totalSheets} (${printJob.remainingSec.toFixed(1)} שנ')...`
                    : photosInCamera > 0
                    ? `שלב 1: הדפס ${photosInCamera} תמונות (${printTiming.sheetCount} דפים · ${printTiming.totalDurationSec} שנ')`
                    : 'אין תמונות במצלמה לפיתוח'}
                </span>
              </button>
            </div>

            {/* 3. Pixel-Art Guillotine Cutter (KW-triO 3925 Reference) */}
            <div className="bg-stone-950/90 border border-stone-800 rounded-xl p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-black text-cyan-300">✂️ חותך גליוטינה (KW-triO)</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      cutJob.active
                        ? 'bg-amber-400 text-stone-950 animate-pulse'
                        : uncutSheetsAtStation > 0
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 animate-pulse'
                        : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {cutJob.active
                      ? `חותך דף ${activeCutSheetInfo.currentSheet}/${cutJob.totalSheets} (${cutJob.remainingSec.toFixed(1)}s)`
                      : uncutSheetsAtStation > 0
                      ? `${cutTiming.sheetCount} דפים · ${cutTiming.totalDurationSec.toFixed(1)} שנ'`
                      : 'ממתין לדפי מגנט'}
                  </span>
                </div>

                <div className="relative rounded-xl overflow-hidden bg-slate-950 border-2 border-stone-700 shadow-lg flex items-center justify-center h-44">
                  <canvas
                    ref={cutterCanvasRef}
                    width={224}
                    height={156}
                    style={{ imageRendering: 'pixelated' }}
                    className="w-full h-full object-contain"
                  />
                  {/* Mini Reference Photo Badge in top-left corner */}
                  <img
                    src={`${import.meta.env.BASE_URL}assets/aistudio/3507_100620211652394_138ea7bb.jpg`}
                    alt="חותך גליוטינה מקורי"
                    className="absolute top-1.5 left-1.5 w-10 h-10 object-contain bg-white rounded border border-stone-600 p-0.5 shadow"
                  />

                  {cutJob.active && (
                    <div className="absolute bottom-2 inset-x-2 bg-stone-950/95 border border-amber-400 rounded-lg px-2.5 py-1.5 shadow-lg">
                      <div className="flex items-center justify-between text-[11px] font-black text-amber-300 mb-1">
                        <span>
                          ✂️ חותך דף {activeCutSheetInfo.currentSheet} מתוך {cutJob.totalSheets} (טראח!)...
                        </span>
                        <span className="font-mono">{cutJob.remainingSec.toFixed(1)} שנ'</span>
                      </div>
                      <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-400 to-cyan-400 transition-all duration-75"
                          style={{ width: `${Math.round(activeCutSheetInfo.overallProgress * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleCutClick}
                disabled={uncutSheetsAtStation <= 0 || cutJob.active || printJob.active}
                className={`mt-2.5 w-full py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  cutJob.active
                    ? 'bg-amber-950 text-amber-300 border-amber-500 cursor-wait'
                    : uncutSheetsAtStation > 0 && !printJob.active
                    ? 'bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 text-stone-950 border-cyan-200 shadow-lg active:scale-95 animate-bounce'
                    : 'bg-stone-800 text-stone-500 border-stone-700 cursor-not-allowed'
                }`}
              >
                <span>✂️</span>
                <span>
                  {cutJob.active
                    ? `חותך דף ${activeCutSheetInfo.currentSheet}/${cutJob.totalSheets} (${cutJob.remainingSec.toFixed(1)} שנ')...`
                    : printJob.active
                    ? 'ממתין לסיום הוצאת הדפים מהמדפסת...'
                    : uncutSheetsAtStation > 0
                    ? `שלב 2: חתוך ${uncutSheetsAtStation} מגנטים (${cutTiming.sheetCount} דפים · ${cutTiming.totalDurationSec} שנ')`
                    : 'הדפס קודם תמונות במדפסת'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Instruction & Close */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-800">
          <div className="text-xs sm:text-sm text-emerald-300 font-bold flex items-center gap-2">
            {cutMagnetsInHand > 0 ? (
              <>
                <span className="text-lg">🏃‍♂️🧲</span>
                <span>
                  יש לך {cutMagnetsInHand} מגנטים חתוכים ביד! חזור לרחבה והדבק אותם על לוח המגנטים!
                </span>
              </>
            ) : (
              <span className="text-stone-400">
                טיפ: כל 4 תמונות מודפסות על דף מגנט אחד ב-0.5 שניות ונחתכות ב-0.5 שניות!
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-sm transition-colors cursor-pointer shadow-lg"
          >
            {cutMagnetsInHand > 0 ? 'רוץ להדביק על לוח המגנטים! [Esc]' : 'חזרה לאולם [Esc]'}
          </button>
        </div>
      </div>
    </div>
  );
};
