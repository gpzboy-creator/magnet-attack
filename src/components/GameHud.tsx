import React, { useState } from 'react';
import {
  DancefloorCrowdStats,
  MAGNET_FRAMES,
  MAGNET_FRAME_ORDER,
  MAX_UPGRADE_LEVEL,
  MagnetDeliveryTrackerState,
  MagnetFrameId,
  PhotographerUpgradeLevels,
  UpgradeId,
  VipEventState,
  createInitialMagnetDeliveryTracker,
  getUpgradeCost,
} from '../game/rules';

export interface HudSnapshot {
  hp: number; // Party Joy & Hype (0 to 100%)
  maxHp: number;
  ghostHp: number;
  dashCharge: number;
  score: number;
  bestScore: number;
  combo: number;
  wave: number;
  magnetsPrinted?: number;
  targetMagnets?: number;
  trackTimeSec?: number;
  stageTitleHe?: string;
  photosInCamera?: number;
  /** Photos copied to the laptop, ready to print */
  photosOnComputer?: number;
  /** Photos currently being copied from the camera card */
  photosTransferring?: number;
  transferRemainingSec?: number;
  /** Camera is lying on the workstation desk (card in the laptop) → can't shoot */
  cameraOnDesk?: boolean;
  maxPhotosInCamera?: number;
  uncutSheetsAtStation?: number;
  cutMagnetsInHand?: number;
  activeWorkflowObjective?:
    | 'dancefloor'
    | 'workstation_transfer'
    | 'workstation_develop'
    | 'workstation_cut'
    | 'board_stick';
  isAtMagnetStation?: boolean;
  isSeatedAtStation?: boolean;
  stationFeedbackText?: string | null;
  availableMagnetsOnBoard?: number;
  totalMagnetsPrinted?: number;
  magnetsTakenByGuests?: number;
  isNearBoard?: boolean;
  vipEvent?: VipEventState | null;
  selectedFrame?: MagnetFrameId;
  upgradeLevels?: PhotographerUpgradeLevels;
  crowdStats?: DancefloorCrowdStats;
  magnetDeliveryTracker?: MagnetDeliveryTrackerState;
  weaponMode: 'pulse' | 'scatter';
}

interface GameHudProps {
  hud: HudSnapshot;
  muted: boolean;
  photographerScale: number;
  showMobileControls?: boolean;
  onToggleMobileControls?: () => void;
  onAdjustScale: (delta: number) => void;
  onToggleMute: () => void;
  onPause: () => void;
  onRestart: () => void;
  onOpenAtlas: () => void;
  onDownloadSprite: () => void;
  onSelectWeapon: (mode: 'pulse' | 'scatter') => void;
  onSelectFrame?: (frame: MagnetFrameId) => void;
  onPurchaseUpgrade?: (id: UpgradeId) => void;
  onStationAction?: () => void;
  onCallGuests?: () => void;
  onTakeMagnet?: () => void;
  onOpenBoardModal?: () => void;
  onOpenWorkstationModal?: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  muted,
  photographerScale,
  showMobileControls = false,
  onToggleMobileControls,
  onAdjustScale,
  onToggleMute,
  onPause,
  onRestart,
  onOpenAtlas,
  onDownloadSprite,
  onSelectWeapon,
  onSelectFrame,
  onPurchaseUpgrade,
  onStationAction,
  onCallGuests,
  onOpenBoardModal,
  onOpenWorkstationModal,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const sockets = [0, 1, 2, 3, 4];
  const magnetsPrinted = hud.magnetsPrinted ?? 0;
  const targetMagnets = hud.targetMagnets ?? 10;
  const trackTimeSec = hud.trackTimeSec ?? 60;
  const minutes = Math.floor(trackTimeSec / 60);
  const seconds = trackTimeSec % 60;
  const formattedTime = `${minutes}:${String(seconds).padStart(2, '0')}`;
  const photosInCamera = hud.photosInCamera ?? 0;
  const maxPhotosInCamera = hud.maxPhotosInCamera ?? 12;
  const uncutSheetsAtStation = hud.uncutSheetsAtStation ?? 0;
  const photosOnComputer = hud.photosOnComputer ?? 0;
  const photosTransferring = hud.photosTransferring ?? 0;
  const transferRemainingSec = hud.transferRemainingSec ?? 0;
  const cameraOnDesk = hud.cameraOnDesk ?? false;
  const cutMagnetsInHand = hud.cutMagnetsInHand ?? 0;
  const isNearStation = hud.isAtMagnetStation ?? false;
  const availableOnBoard = hud.availableMagnetsOnBoard ?? 0;
  const selectedFrame: MagnetFrameId = hud.selectedFrame ?? 'gold';
  const upgradeLevels: PhotographerUpgradeLevels = hud.upgradeLevels ?? {
    turbo_station: 0,
    pro_sdcard: 0,
    sneakers: 0,
  };
  const vipEvent = hud.vipEvent ?? null;
  const crowdStats = hud.crowdStats ?? {
    dancerCount: 16,
    recruitingCount: 2,
    seatedCount: 2,
    totalGuests: 20,
    dancerPct: 80,
    recruitingPct: 10,
    seatedPct: 10,
    isRatioReversed: false,
    isWarningZone: false,
    statusHe: '💃 80% רוקדים · 🤝 10% מקימים · 🪑 10% יושבים',
  };
  const deliveryTracker = hud.magnetDeliveryTracker ?? createInitialMagnetDeliveryTracker();

  // Dynamic Toast Alert ONLY when an active event/warning/bonus occurs (no permanent static clutter!)
  const dynamicToastMessage =
    hud.stationFeedbackText ||
    (deliveryTracker.isLate
      ? `🚨 איחור בהוצאת ${deliveryTracker.pendingCount} מגנטים ללוח! שמחת האורחים יורדת – רוץ לעמדה וללוח מיד!`
      : crowdStats.isRatioReversed
      ? '🚨 יחס הפוך! רוב האורחים יושבים! צלם את האירוע הנכון והוצא מגנט בזמן!'
      : null);

  return (
    <div className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-between p-1.5 sm:p-2.5 select-none overflow-hidden">
      {/* Top Row: Left Joy/Crowd + Center Unified Pipeline & Score + Right Compact Controls */}
      <div className="flex flex-wrap items-start justify-between gap-1.5 sm:gap-2.5 w-full">
        {/* Top-Left: Guest Joy Meter + On-Time Magnet SLA + 80/10/10 Crowd Ratio */}
        <div
          className={`flex flex-col gap-1 bg-stone-950/95 border rounded-lg px-2 py-1 sm:px-2.5 sm:py-1.5 shadow-lg ${
            crowdStats.isRatioReversed || deliveryTracker.isLate
              ? 'border-rose-500 animate-pulse'
              : crowdStats.isWarningZone || deliveryTracker.urgencyLevel === 'hurry'
              ? 'border-amber-400'
              : 'border-amber-500/50'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold tracking-wider text-amber-200">
                שמחת האורחים
              </span>
              <div
                className="flex items-center gap-0.5"
                aria-label={`Wedding Joy ${Math.round(hud.hp)}%`}
              >
                {sockets.map((idx) => {
                  const socketThreshold = (idx + 1) * 20;
                  const halfThreshold = idx * 20 + 10;
                  const state =
                    hud.hp >= socketThreshold
                      ? 'full'
                      : hud.hp >= halfThreshold
                      ? 'half'
                      : 'empty';

                  return (
                    <svg
                      key={idx}
                      viewBox="0 0 24 24"
                      className="w-3 h-3 sm:w-3.5 sm:h-3.5"
                      aria-hidden="true"
                    >
                      <rect
                        x="3"
                        y="3"
                        width="18"
                        height="18"
                        rx="2"
                        fill="#1c1410"
                        stroke="#785c3c"
                        strokeWidth="2"
                      />
                      {state === 'full' && (
                        <>
                          <rect
                            x="5"
                            y="5"
                            width="14"
                            height="14"
                            rx="1"
                            fill="#f59e0b"
                          />
                          <path
                            d="M12 16.5l-4.2-4.1a2.6 2.6 0 0 1 3.6-3.7l.6.6.6-.6a2.6 2.6 0 0 1 3.6 3.7L12 16.5z"
                            fill="#fffbeb"
                          />
                        </>
                      )}
                      {state === 'half' && (
                        <>
                          <rect
                            x="5"
                            y="5"
                            width="7"
                            height="14"
                            rx="1"
                            fill="#f59e0b"
                          />
                          <path
                            d="M12 16.5l-4.2-4.1a2.6 2.6 0 0 1 3.6-3.7l.6.6"
                            stroke="#fffbeb"
                            strokeWidth="2"
                            fill="none"
                          />
                        </>
                      )}
                    </svg>
                  );
                })}
              </div>
              <span className="text-xs sm:text-sm font-bold font-mono tabular-nums text-amber-400">
                {Math.round(hud.hp)}%
              </span>
            </div>

            {/* On-Time Magnet Delivery SLA Indicator (Single source of truth, no duplicate VIP text!) */}
            <span
              data-testid="hud-joy-drivers"
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                deliveryTracker.urgencyLevel === 'late'
                  ? 'bg-rose-950/90 border-rose-500 text-rose-300 font-black animate-pulse'
                  : deliveryTracker.urgencyLevel === 'hurry'
                  ? 'bg-amber-950/90 border-amber-400 text-amber-200 animate-pulse'
                  : deliveryTracker.urgencyLevel === 'on_time'
                  ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-200'
                  : 'bg-stone-900/80 border-stone-700 text-emerald-300'
              }`}
              title="זמן להוצאת מגנט ללוח בזמן"
            >
              {deliveryTracker.urgencyLevel === 'idle'
                ? '⏱️ מגנט: מוכן'
                : deliveryTracker.urgencyLevel === 'late'
                ? `🚨 איחור (${deliveryTracker.pendingCount})!`
                : `⏱️ הוצא מגנט: ${Math.ceil(deliveryTracker.remainingSec)}s`}
            </span>
          </div>

          {/* Continuous Joy Bar with Delayed Ghost Trail */}
          <div className="w-full h-1.5 bg-stone-900 rounded overflow-hidden relative border border-stone-700">
            <div
              className="absolute inset-y-0 left-0 bg-amber-600/70"
              style={{
                width: `${Math.max(0, Math.min(100, (hud.ghostHp / hud.maxHp) * 100))}%`,
              }}
            />
            <div
              className="absolute inset-y-0 left-0 bg-amber-400"
              style={{
                width: `${Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100))}%`,
              }}
            />
          </div>

          {/* Dancefloor vs. Seated Ratio Bar (80% Dancing / 10% Recruiting / 10% Seated) */}
          <div
            data-testid="hud-crowd-ratio"
            className="flex flex-col gap-0.5 pt-0.5 border-t border-stone-800/80"
          >
            <div className="flex items-center justify-between gap-2 text-[9px] font-bold">
              <span
                className={
                  crowdStats.isRatioReversed ? 'text-rose-400' : 'text-emerald-300'
                }
              >
                💃 {crowdStats.dancerPct}% רוקדים
              </span>
              <span className="text-sky-300">
                🤝 {crowdStats.recruitingPct}%
              </span>
              <span
                className={
                  crowdStats.isRatioReversed
                    ? 'text-rose-400 font-black'
                    : crowdStats.isWarningZone
                    ? 'text-amber-300'
                    : 'text-stone-300'
                }
              >
                🪑 {crowdStats.seatedPct}% יושבים
              </span>
            </div>
            <div className="w-full h-1 bg-stone-900 rounded overflow-hidden flex border border-stone-700">
              <div
                className="h-full bg-emerald-400 transition-all duration-300"
                style={{ width: `${crowdStats.dancerPct}%` }}
              />
              <div
                className="h-full bg-sky-400 transition-all duration-300"
                style={{ width: `${crowdStats.recruitingPct}%` }}
              />
              <div
                className="h-full bg-rose-500 transition-all duration-300"
                style={{ width: `${crowdStats.seatedPct}%` }}
              />
            </div>
          </div>

          {/* Compact Sprint / Dash Charge */}
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-bold tracking-wider text-emerald-300">
              האצה [רווח]
            </span>
            <div className="flex-1 h-1 bg-stone-900 rounded overflow-hidden border border-stone-700">
              <div
                className="h-full bg-emerald-400"
                style={{
                  width: `${Math.round(Math.max(0, Math.min(1, hud.dashCharge)) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Top-Center: Unified Production Pipeline Pill + Quota + Score + DJ Time */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 bg-stone-950/92 border border-amber-500/50 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5 shadow-lg order-3 sm:order-2">
          {/* Magnets Quota */}
          <div className="flex items-center gap-1 pr-1.5 border-r border-stone-800">
            <span className="text-[10px] font-bold text-amber-300">🧲</span>
            <span
              data-testid="hud-magnets"
              className="text-xs sm:text-base font-black font-mono tabular-nums text-white leading-none"
            >
              {magnetsPrinted}/{targetMagnets}
            </span>
          </div>

          {/* Unified 3-Stage Production Pipeline Pill (Camera -> Cutter -> Hand) */}
          <div
            data-testid="hud-pipeline-pill"
            className="flex items-center gap-1 bg-stone-900/90 border border-stone-700/80 rounded-md px-1.5 py-0.5 text-[10px] sm:text-xs font-mono font-bold"
          >
            <span
              className={`px-1 py-0.2 rounded flex items-center gap-0.5 ${
                photosInCamera >= maxPhotosInCamera
                  ? 'bg-rose-500/30 text-rose-200 border border-rose-400 animate-bounce'
                  : photosInCamera > 0
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-400/60'
                  : 'text-stone-400'
              }`}
              title={
                cameraOnDesk
                  ? 'המצלמה על שולחן העבודה — אי אפשר לצלם'
                  : 'שלב 1: תמונות בכרטיס הזיכרון במצלמה'
              }
            >
              <span className={cameraOnDesk ? 'opacity-40' : undefined}>📸</span>
              <span data-testid="hud-photos-in-camera">
                {cameraOnDesk ? '—' : `${photosInCamera}/${maxPhotosInCamera}`}
              </span>
            </span>

            <span className="text-stone-500 text-[10px]">›</span>

            <span
              className={`px-1 py-0.2 rounded flex items-center gap-0.5 ${
                photosTransferring > 0
                  ? 'bg-lime-500/25 text-lime-200 border border-lime-400/60 animate-pulse'
                  : photosOnComputer > 0
                  ? 'bg-lime-500/25 text-lime-300 border border-lime-400/60'
                  : 'text-stone-500'
              }`}
              title="שלב 2: תמונות שהועברו מהמצלמה למחשב ומוכנות להדפסה"
            >
              <span>💻</span>
              <span data-testid="hud-photos-on-computer">
                {photosTransferring > 0
                  ? `${transferRemainingSec.toFixed(1)}s`
                  : photosOnComputer}
              </span>
            </span>

            <span className="text-stone-500 text-[10px]">›</span>

            <span
              className={`px-1 py-0.2 rounded flex items-center gap-0.5 ${
                uncutSheetsAtStation > 0
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/60 animate-pulse'
                  : 'text-stone-500'
              }`}
              title="שלב 3: דפי מגנט מודפסים הממתינים לחיתוך בעמדה"
            >
              <span>✂️</span>
              <span data-testid="hud-uncut-sheets">{uncutSheetsAtStation}</span>
            </span>

            <span className="text-stone-500 text-[10px]">›</span>

            <span
              className={`px-1 py-0.2 rounded flex items-center gap-0.5 ${
                cutMagnetsInHand > 0
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/60 animate-pulse'
                  : 'text-stone-500'
              }`}
              title="שלב 4: מגנטים חתוכים ביד להדבקה על הלוח"
            >
              <span>🧲</span>
              <span data-testid="hud-cut-magnets">{cutMagnetsInHand}</span>
            </span>
          </div>

          {/* Score */}
          <div className="flex items-center gap-1 pl-1">
            <span className="text-[10px] text-amber-300">⭐</span>
            <span
              data-testid="hud-score"
              className="text-xs sm:text-base font-bold font-mono tabular-nums text-amber-400 leading-none"
            >
              {Math.round(hud.score)}
            </span>
          </div>

          {/* DJ Track Timer */}
          <div className="flex items-center gap-1 pr-1 border-r border-stone-800">
            <span className="text-[10px] text-cyan-300">🎵</span>
            <span className="text-xs sm:text-base font-bold font-mono tabular-nums text-cyan-300 leading-none">
              {formattedTime}
            </span>
          </div>

          {/* Corner Workstation Quick Modal Button */}
          {onOpenWorkstationModal && (
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenWorkstationModal();
              }}
              className="pointer-events-auto flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/80 text-cyan-300 text-[10px] sm:text-[11px] font-bold cursor-pointer transition-all active:scale-95"
              aria-label="פתח עמדת פיתוח וחיתוך מגנטים"
            >
              <span>🖨️</span>
              <span className="hidden md:inline">עמדה</span>
            </button>
          )}

          {/* Easel Board Quick Modal Button with Merged Available Magnets Count */}
          {onOpenBoardModal && (
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenBoardModal();
              }}
              className="pointer-events-auto flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/80 text-amber-300 text-[10px] sm:text-[11px] font-bold cursor-pointer transition-all active:scale-95"
              aria-label="פתח לוח מגנטים חצובה"
            >
              <span>🖼️</span>
              <span className="hidden md:inline">לוח</span>
              <span className="font-mono text-emerald-300 font-black">
                ({availableOnBoard})
              </span>
            </button>
          )}
        </div>

        {/* Top-Right: Clean Primary Controls (Settings Gear ⚙️ + Mute 🔊 + Pause ⏸️) */}
        <div className="relative flex items-center gap-1 sm:gap-1.5 pointer-events-auto order-2 sm:order-3">
          <button
            type="button"
            tabIndex={-1}
            data-testid="hud-settings-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              setSettingsOpen((v) => !v);
            }}
            aria-label="הגדרות וכלי עריכה"
            title="הגדרות, עריכת דמויות [I], ג'ויסטיק וגודל ספרייט"
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
              settingsOpen
                ? 'bg-amber-400 border-stone-950 text-stone-950'
                : 'bg-stone-950/95 border-amber-200/40 text-amber-200 hover:bg-stone-800'
            }`}
          >
            <span className="text-xs sm:text-sm">⚙️</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            aria-label={muted ? 'Unmute Audio [M]' : 'Mute Audio [M]'}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-stone-950/95 border border-amber-200/40 text-amber-100 hover:bg-stone-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            {muted ? (
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            aria-label="Pause Game [P]"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-stone-950/95 border border-amber-200/40 text-amber-100 hover:bg-stone-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          </button>

          {/* Collapsible Secondary Tools & Settings Popover */}
          {settingsOpen && (
            <div
              dir="rtl"
              className="absolute top-10 right-0 z-50 w-56 bg-stone-950/98 border border-amber-400/70 rounded-xl p-2.5 shadow-2xl flex flex-col gap-2 text-xs text-stone-100"
            >
              <div className="flex items-center justify-between border-b border-stone-800 pb-1">
                <span className="font-bold text-amber-300">⚙️ כלי משחק ותצוגה</span>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="text-stone-400 hover:text-white px-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSettingsOpen(false);
                  onOpenAtlas();
                }}
                className="w-full py-1.5 px-2 rounded-lg bg-stone-900 hover:bg-amber-500/20 border border-amber-400/50 text-amber-200 font-bold flex items-center justify-between cursor-pointer"
              >
                <span>✏️ עריכת דמויות וספרייט</span>
                <span className="font-mono text-[10px]">[I]</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSettingsOpen(false);
                  onDownloadSprite();
                }}
                className="w-full py-1.5 px-2 rounded-lg bg-stone-900 hover:bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold flex items-center justify-between cursor-pointer"
              >
                <span>⬇️ הורד דף ספרייטים</span>
                <span className="font-mono text-[10px]">PNG</span>
              </button>

              <button
                type="button"
                onClick={() => onToggleMobileControls?.()}
                className={`w-full py-1.5 px-2 rounded-lg border font-bold flex items-center justify-between cursor-pointer ${
                  showMobileControls
                    ? 'bg-amber-400 text-stone-950 border-stone-950'
                    : 'bg-stone-900 text-stone-200 border-stone-700'
                }`}
              >
                <span>📱 ג'ויסטיק מגע בנייד</span>
                <span>{showMobileControls ? 'פעיל' : 'כבוי'}</span>
              </button>

              <div className="flex items-center justify-between bg-stone-900 border border-stone-800 rounded-lg px-2 py-1">
                <span className="text-[11px] text-stone-300">גודל צלם:</span>
                <div className="flex items-center gap-1.5 font-mono">
                  <button
                    type="button"
                    onClick={() => onAdjustScale(-0.1)}
                    className="w-5 h-5 rounded bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-emerald-300 font-bold">
                    {photographerScale.toFixed(2)}x
                  </span>
                  <button
                    type="button"
                    onClick={() => onAdjustScale(0.1)}
                    className="w-5 h-5 rounded bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSettingsOpen(false);
                  onRestart();
                }}
                className="w-full py-1.5 px-2 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/50 text-rose-200 font-bold flex items-center justify-between cursor-pointer"
              >
                <span>🔄 התחל סבב מחדש</span>
                <span className="font-mono text-[10px]">[R]</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Live VIP Event Banner (Single, clean, centered below top bar) */}
      {vipEvent && vipEvent.remainingSec > 0 && (
        <div
          dir="rtl"
          data-testid="hud-vip-event"
          className="self-center mt-0.5 bg-stone-950/95 border border-amber-400 rounded-lg px-2.5 py-1 shadow-lg flex items-center gap-2 text-[10px] sm:text-xs font-bold text-amber-200 max-w-full"
        >
          <span className="bg-amber-400 text-stone-950 font-black px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] whitespace-nowrap">
            ⭐ רגע VIP
          </span>
          <span className="truncate">{vipEvent.titleHe}</span>
          <span className="font-mono text-emerald-300 font-black whitespace-nowrap">
            [{vipEvent.photosCaptured}/{vipEvent.requiredPhotos}]
          </span>
          <span
            className="px-1.5 py-0.5 rounded border text-[9px] whitespace-nowrap hidden sm:inline"
            style={{
              borderColor: MAGNET_FRAMES[vipEvent.preferredFrame].borderColor,
              color: MAGNET_FRAMES[vipEvent.preferredFrame].accentColor,
            }}
          >
            {MAGNET_FRAMES[vipEvent.preferredFrame].icon} {MAGNET_FRAMES[vipEvent.preferredFrame].shortHe}
          </span>
          <span className="font-mono text-amber-400 whitespace-nowrap">
            ⏱️ {Math.ceil(vipEvent.remainingSec)}s
          </span>
          <span className="text-amber-300 font-mono whitespace-nowrap hidden md:inline">
            (+{vipEvent.bonusScore})
          </span>
        </div>
      )}

      {/* Context-Sensitive Action Buttons & Dynamic Toast + Unified Responsive Bottom Dock */}
      <div className="flex flex-col items-center gap-1 w-full mt-auto z-30">
        {/* Context Action Buttons when standing near Workstation or Board */}
        <div className="flex flex-wrap justify-center items-center gap-1.5 pointer-events-auto">
          {isNearStation &&
            onStationAction &&
            uncutSheetsAtStation === 0 &&
            photosTransferring === 0 &&
            photosOnComputer === 0 &&
            photosInCamera > 0 && (
              <button
                type="button"
                onClick={onStationAction}
                className="px-2.5 py-1 rounded-lg bg-lime-400 hover:bg-lime-300 text-stone-950 font-black text-[11px] sm:text-xs border border-stone-950 shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <span>💾</span>
                <span>שלב 1: העבר {photosInCamera} תמונות מהמצלמה למחשב! [E]</span>
              </button>
            )}

          {isNearStation && photosTransferring > 0 && (
            <div className="px-2.5 py-1 rounded-lg bg-stone-900/90 text-lime-200 font-black text-[11px] sm:text-xs border border-lime-400/70 shadow-md flex items-center gap-1.5">
              <span>💾</span>
              <span>
                מעביר {photosTransferring} תמונות למחשב… {transferRemainingSec.toFixed(1)} שנ' · המצלמה על השולחן
              </span>
            </div>
          )}

          {isNearStation &&
            onStationAction &&
            uncutSheetsAtStation === 0 &&
            photosTransferring === 0 &&
            photosOnComputer > 0 && (
              <button
                type="button"
                onClick={onStationAction}
                className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-[11px] sm:text-xs border border-stone-950 shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <span>🖨️</span>
                <span>שלב 2: הדפס {photosOnComputer} תמונות במדפסת! [E]</span>
              </button>
            )}

          {isNearStation && onStationAction && uncutSheetsAtStation > 0 && (
            <button
              type="button"
              onClick={onStationAction}
              className="px-2.5 py-1 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-stone-950 font-black text-[11px] sm:text-xs border border-stone-950 shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <span>✂️</span>
              <span>שלב 3: חתוך {uncutSheetsAtStation} מגנטים בחותך! [E]</span>
            </button>
          )}

          {hud.isNearBoard && onStationAction && cutMagnetsInHand > 0 && (
            <button
              type="button"
              onClick={onStationAction}
              className="px-2.5 py-1 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-black text-[11px] sm:text-xs border border-stone-950 shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <span>🧲</span>
              <span>שלב 4: הדבק {cutMagnetsInHand} מגנטים על הלוח! [E]</span>
            </button>
          )}

          {(hud.isNearBoard || availableOnBoard > 0) && onCallGuests && (
            <button
              type="button"
              onClick={onCallGuests}
              className="px-2.5 py-1 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-black text-[10px] sm:text-[11px] border border-stone-950 shadow flex items-center gap-1 cursor-pointer transition-all active:scale-95"
            >
              <span>📢</span>
              <span>קרא לאורחים ללוח [C] ({availableOnBoard})</span>
            </button>
          )}
        </div>

        {/* Dynamic Toast Banner (Shown ONLY on active feedback, late magnet warning, or reversed ratio!) */}
        {dynamicToastMessage && (
          <div
            dir="rtl"
            className={`px-3 py-0.5 rounded-md border text-[10px] sm:text-xs font-bold tracking-tight truncate max-w-full sm:max-w-lg shadow-md ${
              deliveryTracker.isLate || crowdStats.isRatioReversed
                ? 'bg-rose-600/95 text-white border-rose-300 animate-pulse'
                : 'bg-amber-400/95 text-stone-950 border-stone-950'
            }`}
          >
            {dynamicToastMessage}
          </div>
        )}

        {/* Unified Compact Bottom Dock: Lens [1/2] + Frame Selector [G] + Equipment Upgrades */}
        <div
          className={`flex flex-wrap items-center justify-center gap-1 sm:gap-2 bg-stone-950/92 border border-amber-500/40 rounded-lg px-2 py-1 shadow-lg pointer-events-auto max-w-full ${
            showMobileControls ? 'mb-36 sm:mb-0' : ''
          }`}
        >
          {/* Camera Mode Selector [1 / 2] */}
          <div className="flex items-center gap-0.5 bg-stone-900 rounded p-0.5 border border-stone-800">
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onSelectWeapon('pulse');
              }}
              className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-mono transition-colors whitespace-nowrap cursor-pointer ${
                hud.weaponMode === 'pulse'
                  ? 'bg-amber-400 text-stone-950 font-bold'
                  : 'text-amber-100 hover:bg-stone-800'
              }`}
            >
              📷 DSLR [1]
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onSelectWeapon('scatter');
              }}
              className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-mono transition-colors whitespace-nowrap cursor-pointer ${
                hud.weaponMode === 'scatter'
                  ? 'bg-emerald-400 text-stone-950 font-bold'
                  : 'text-amber-100 hover:bg-stone-800'
              }`}
            >
              פלאש רחב [2]
            </button>
          </div>

          {/* Magnet Frame Style Selector [G] (Responsive: icons on small screens, short text on sm+) */}
          <div
            data-testid="hud-frame-selector"
            className="flex items-center gap-0.5 bg-stone-900 rounded p-0.5 border border-stone-800"
          >
            <span className="text-[9px] text-amber-300 font-bold px-1 hidden lg:inline">
              מסגרת [G]:
            </span>
            {MAGNET_FRAME_ORDER.map((fId) => {
              const f = MAGNET_FRAMES[fId];
              const isSel = selectedFrame === fId;
              return (
                <button
                  key={fId}
                  type="button"
                  tabIndex={-1}
                  title={`${f.nameHe} · מועדף ע"י ${f.preferredByHe}`}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSelectFrame?.(fId);
                  }}
                  className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-0.5 ${
                    isSel
                      ? 'bg-stone-800 text-white border'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                  }`}
                  style={{
                    borderColor: isSel ? f.borderColor : 'transparent',
                  }}
                >
                  <span>{f.icon}</span>
                  <span className="hidden sm:inline">{f.shortHe}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Equipment Upgrades */}
          <div
            data-testid="hud-upgrades"
            className="flex items-center gap-1 bg-stone-900 rounded p-0.5 border border-stone-800 text-[9px] sm:text-[10px]"
          >
            {(['turbo_station', 'pro_sdcard', 'sneakers'] as UpgradeId[]).map((uId) => {
              const lvl = upgradeLevels[uId];
              const cost = getUpgradeCost(uId, lvl);
              const isMax = lvl >= MAX_UPGRADE_LEVEL;
              const canAfford = !isMax && hud.score >= cost;
              const icon = uId === 'turbo_station' ? '⚡' : uId === 'pro_sdcard' ? '💾' : '👟';
              const shortLabel =
                uId === 'turbo_station' ? 'טורבו' : uId === 'pro_sdcard' ? 'כרטיס' : 'נעליים';
              return (
                <button
                  key={uId}
                  type="button"
                  tabIndex={-1}
                  disabled={!canAfford}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onPurchaseUpgrade?.(uId);
                  }}
                  title={isMax ? `${shortLabel} שודרג למקסימום!` : `שדרג ${shortLabel} בעלות ${cost} נקודות`}
                  className={`px-1.5 py-0.5 rounded font-bold whitespace-nowrap transition-all flex items-center gap-0.5 ${
                    isMax
                      ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-600/40 cursor-default'
                      : canAfford
                      ? 'bg-cyan-500/25 hover:bg-cyan-500/40 text-cyan-200 border border-cyan-400 cursor-pointer animate-pulse'
                      : 'bg-stone-900/70 text-stone-500 border border-stone-800 cursor-not-allowed'
                  }`}
                >
                  <span>{icon}</span>
                  <span className="hidden md:inline">{shortLabel}</span>
                  <span>Lv.{lvl}</span>
                  {!isMax && <span className="font-mono text-[8px] text-amber-300">({cost})</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};



