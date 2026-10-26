import React, { useEffect, useRef, useState } from 'react';
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
import {
  HUD_IDLE_OPACITY,
  computeFadeOpacity,
  computeHudLayout,
  computeHudScale,
  hasMeaningfulChange,
} from '../game/hudVisibility';
import './hud/microHud.css';

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

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Timestamp (performance.now) of the last meaningful change of `value`. */
function useLastChange(value: number, epsilon = 0.5): number {
  const ref = useRef({ value, at: -Infinity });
  if (hasMeaningfulChange(ref.current.value, value, epsilon)) {
    ref.current = { value, at: performance.now() };
  }
  return ref.current.at;
}

/** Viewport-driven HUD scale + layout mode. */
function useHudViewport(): { scale: number; layout: 'compact' | 'regular' } {
  const read = () => ({
    scale: computeHudScale(window.innerWidth, window.innerHeight),
    layout: computeHudLayout(window.innerWidth, window.innerHeight),
  });
  const [state, setState] = useState(read);
  useEffect(() => {
    const onResize = () => setState(read());
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);
  return state;
}

/** Hold Tab or Alt to reveal every HUD value with labels. */
function useRevealKey(): [boolean, (on: boolean) => void] {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const isRevealKey = (e: KeyboardEvent) => e.key === 'Tab' || e.key === 'Alt';
    const down = (e: KeyboardEvent) => {
      if (!isRevealKey(e)) return;
      e.preventDefault(); // keep Tab from moving focus / Alt from opening the browser menu
      setRevealed(true);
    };
    const up = (e: KeyboardEvent) => {
      if (!isRevealKey(e)) return;
      e.preventDefault();
      setRevealed(false);
    };
    const reset = () => setRevealed(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', reset);
    };
  }, []);
  return [revealed, setRevealed];
}

const UPGRADE_META: Record<UpgradeId, { icon: string; labelHe: string }> = {
  turbo_station: { icon: '⚡', labelHe: 'טורבו לעמדה' },
  pro_sdcard: { icon: '💾', labelHe: 'כרטיס זיכרון' },
  sneakers: { icon: '👟', labelHe: 'נעלי ריצה' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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
  const [upgradesOpen, setUpgradesOpen] = useState(false);
  const [revealKeyHeld, setRevealKeyHeld] = useRevealKey();
  const [tapRevealUntil, setTapRevealUntil] = useState(0);
  const { scale, layout } = useHudViewport();

  // ---- Derived values -------------------------------------------------------
  const magnetsPrinted = hud.magnetsPrinted ?? 0;
  const targetMagnets = hud.targetMagnets ?? 10;
  const trackTimeSec = hud.trackTimeSec ?? 60;
  const formattedTime = `${Math.floor(trackTimeSec / 60)}:${String(trackTimeSec % 60).padStart(2, '0')}`;
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
  const crowd = hud.crowdStats ?? {
    dancerCount: 16,
    recruitingCount: 2,
    seatedCount: 2,
    totalGuests: 20,
    dancerPct: 80,
    recruitingPct: 10,
    seatedPct: 10,
    isRatioReversed: false,
    isWarningZone: false,
    statusHe: '',
  };
  const delivery = hud.magnetDeliveryTracker ?? createInitialMagnetDeliveryTracker();
  const joyPct = Math.max(0, Math.min(100, (hud.hp / Math.max(1, hud.maxHp)) * 100));
  const ghostPct = Math.max(0, Math.min(100, (hud.ghostHp / Math.max(1, hud.maxHp)) * 100));
  const pipelineCount =
    photosInCamera + photosTransferring + photosOnComputer + uncutSheetsAtStation + cutMagnetsInHand;
  const affordableUpgrades = (['turbo_station', 'pro_sdcard', 'sneakers'] as UpgradeId[]).filter(
    (u) => upgradeLevels[u] < MAX_UPGRADE_LEVEL && hud.score >= getUpgradeCost(u, upgradeLevels[u])
  ).length;

  // ---- Visibility -------------------------------------------------------------
  const now = performance.now();
  const revealed = revealKeyHeld || now < tapRevealUntil || settingsOpen || upgradesOpen;
  const joyChangedAt = useLastChange(joyPct, 1);
  const crowdChangedAt = useLastChange(crowd.dancerPct, 1);
  const progressChangedAt = Math.max(
    useLastChange(magnetsPrinted),
    useLastChange(hud.score, 1)
  );
  const pipelineChangedAt = useLastChange(pipelineCount);
  const loadoutChangedAt = Math.max(
    useLastChange(hud.weaponMode === 'pulse' ? 0 : 1),
    useLastChange(MAGNET_FRAME_ORDER.indexOf(selectedFrame)),
    useLastChange(affordableUpgrades)
  );

  const vitalsWarning =
    joyPct < 60 ||
    crowd.isRatioReversed ||
    crowd.isWarningZone ||
    delivery.urgencyLevel === 'hurry' ||
    delivery.urgencyLevel === 'late';
  const timerCritical = trackTimeSec <= 15;
  const isTouch = showMobileControls;

  const vitalsOpacity = computeFadeOpacity({
    msSinceChange: now - Math.max(joyChangedAt, crowdChangedAt),
    idleOpacity: HUD_IDLE_OPACITY.vitals,
    forceVisible: revealed || vitalsWarning,
  });
  const progressOpacity = computeFadeOpacity({
    msSinceChange: now - progressChangedAt,
    idleOpacity: HUD_IDLE_OPACITY.progress,
    forceVisible: revealed || timerCritical,
  });
  const pipelineOpacity = computeFadeOpacity({
    msSinceChange: now - pipelineChangedAt,
    // Never fully hidden while something is in the pipeline or the camera is on the desk
    idleOpacity: pipelineCount > 0 || cameraOnDesk ? 0.75 : HUD_IDLE_OPACITY.pipeline,
    forceVisible: revealed || cameraOnDesk || isNearStation,
  });
  const loadoutOpacity = computeFadeOpacity({
    msSinceChange: now - loadoutChangedAt,
    idleOpacity: HUD_IDLE_OPACITY.loadout,
    forceVisible: revealed,
  });

  // ---- Contextual prompt (one at a time, highest priority first) --------------
  let prompt: { icon: string; text: string; key: string; onClick?: () => void } | null = null;
  if (hud.isNearBoard && cutMagnetsInHand > 0) {
    prompt = { icon: '🧲', key: 'E', text: `הדבק ${cutMagnetsInHand} על הלוח`, onClick: onStationAction };
  } else if (isNearStation && uncutSheetsAtStation > 0) {
    prompt = { icon: '✂️', key: 'E', text: `חתוך ${uncutSheetsAtStation}`, onClick: onStationAction };
  } else if (isNearStation && photosTransferring > 0) {
    prompt = { icon: '💾', key: '…', text: `מעביר ${photosTransferring} · ${transferRemainingSec.toFixed(1)}s` };
  } else if (isNearStation && photosOnComputer > 0) {
    prompt = { icon: '🖨️', key: 'E', text: `הדפס ${photosOnComputer}`, onClick: onStationAction };
  } else if (isNearStation && photosInCamera > 0) {
    prompt = { icon: '💾', key: 'E', text: `העבר ${photosInCamera} למחשב`, onClick: onStationAction };
  }
  const showCallGuests = (hud.isNearBoard || availableOnBoard > 0) && Boolean(onCallGuests);

  // ---- Toast (one line, only when there's something to say) -------------------
  const toastCritical = delivery.isLate || crowd.isRatioReversed;
  const toast =
    hud.stationFeedbackText ||
    (delivery.isLate
      ? `🚨 איחור במגנטים (${delivery.pendingCount}) — לעמדה וללוח!`
      : crowd.isRatioReversed
      ? '🚨 רוב האורחים יושבים — צלם את האירוע והוצא מגנט!'
      : null);

  const cycleFrame = () => {
    const idx = MAGNET_FRAME_ORDER.indexOf(selectedFrame);
    onSelectFrame?.(MAGNET_FRAME_ORDER[(idx + 1) % MAGNET_FRAME_ORDER.length]);
  };
  const blurThen = (fn?: () => void) => (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    fn?.();
  };

  // ---- Cluster fragments --------------------------------------------------------
  const pipelineChips = (
    <div data-testid="hud-pipeline-pill" className="mhud-row" style={{ flexWrap: 'wrap', gap: '0.25em' }}>
      {(photosInCamera > 0 || cameraOnDesk) && (
        <span
          className={`mhud-pill ${photosInCamera >= maxPhotosInCamera ? 'warn pulse' : ''}`}
          title={cameraOnDesk ? 'המצלמה על שולחן העבודה' : 'תמונות במצלמה'}
        >
          <span style={{ opacity: cameraOnDesk ? 0.45 : 1 }}>📸</span>
          <span className="num" data-testid="hud-photos-in-camera">
            {cameraOnDesk ? '—' : `${photosInCamera}/${maxPhotosInCamera}`}
          </span>
        </span>
      )}
      {(photosTransferring > 0 || photosOnComputer > 0) && (
        <span className="mhud-pill" style={{ color: 'var(--lime)' }} title="תמונות במחשב">
          <span>💻</span>
          <span className="num" data-testid="hud-photos-on-computer">
            {photosTransferring > 0 ? `${transferRemainingSec.toFixed(1)}s` : photosOnComputer}
          </span>
        </span>
      )}
      {uncutSheetsAtStation > 0 && (
        <span className="mhud-pill" style={{ color: 'var(--cyan)' }} title="דפים לחיתוך">
          <span>✂️</span>
          <span className="num" data-testid="hud-uncut-sheets">{uncutSheetsAtStation}</span>
        </span>
      )}
      {cutMagnetsInHand > 0 && (
        <span className="mhud-pill pulse" style={{ color: 'var(--emerald)' }} title="מגנטים ביד">
          <span>🧲</span>
          <span className="num" data-testid="hud-cut-magnets">{cutMagnetsInHand}</span>
        </span>
      )}
    </div>
  );

  const loadoutIcons = (
    <div data-testid="hud-loadout" className="mhud-row" style={{ position: 'relative' }}>
      <button
        type="button"
        tabIndex={-1}
        className="mhud-icon"
        title={hud.weaponMode === 'pulse' ? 'DSLR [1] · החלף לפלאש רחב [2]' : 'פלאש רחב [2] · החלף ל-DSLR [1]'}
        aria-label="מצב מצלמה"
        onClick={blurThen(() => onSelectWeapon(hud.weaponMode === 'pulse' ? 'scatter' : 'pulse'))}
      >
        {hud.weaponMode === 'pulse' ? '📷' : '💥'}
      </button>
      <button
        type="button"
        tabIndex={-1}
        data-testid="hud-frame-selector"
        className="mhud-icon"
        title={`מסגרת: ${MAGNET_FRAMES[selectedFrame].nameHe} [G]`}
        aria-label="מסגרת מגנט"
        style={{ boxShadow: `inset 0 0 0 0.14em ${MAGNET_FRAMES[selectedFrame].borderColor}` }}
        onClick={blurThen(cycleFrame)}
      >
        {MAGNET_FRAMES[selectedFrame].icon}
      </button>
      <button
        type="button"
        tabIndex={-1}
        data-testid="hud-upgrades"
        className={`mhud-icon ${upgradesOpen ? 'is-on' : ''}`}
        title="שדרוגים"
        aria-label="שדרוגים"
        onClick={blurThen(() => {
          setUpgradesOpen((v) => !v);
          setSettingsOpen(false);
        })}
      >
        ⬆️
        {affordableUpgrades > 0 && <span className="mhud-badge num">{affordableUpgrades}</span>}
      </button>
      {onOpenWorkstationModal && (
        <button
          type="button"
          tabIndex={-1}
          className="mhud-icon"
          title="עמדת המגנטים [V]"
          aria-label="עמדת המגנטים"
          onClick={blurThen(onOpenWorkstationModal)}
        >
          🖨️
        </button>
      )}
      {onOpenBoardModal && (
        <button
          type="button"
          tabIndex={-1}
          className="mhud-icon"
          title="לוח המגנטים [B]"
          aria-label="לוח המגנטים"
          onClick={blurThen(onOpenBoardModal)}
        >
          🖼️
          {availableOnBoard > 0 && <span className="mhud-badge num">{availableOnBoard}</span>}
        </button>
      )}

      {upgradesOpen && (
        <div
          dir="rtl"
          className="mhud-pop"
          style={isTouch ? { top: '2.4em', right: 0 } : { bottom: '2.4em', right: 0 }}
        >
          {(['turbo_station', 'pro_sdcard', 'sneakers'] as UpgradeId[]).map((uId) => {
            const lvl = upgradeLevels[uId];
            const cost = getUpgradeCost(uId, lvl);
            const isMax = lvl >= MAX_UPGRADE_LEVEL;
            const canAfford = !isMax && hud.score >= cost;
            return (
              <button
                key={uId}
                type="button"
                disabled={!canAfford}
                onClick={() => onPurchaseUpgrade?.(uId)}
              >
                <span>
                  {UPGRADE_META[uId].icon} {UPGRADE_META[uId].labelHe}{' '}
                  <span className="num">Lv.{lvl}</span>
                </span>
                <span className="num" style={{ color: canAfford ? 'var(--emerald)' : 'var(--ink-dim)' }}>
                  {isMax ? 'MAX' : `⭐${cost}`}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  // ---- Render ------------------------------------------------------------------
  return (
    <div
      data-hud-root
      className="mhud"
      data-layout={layout}
      data-touch={isTouch ? '' : undefined}
      data-reveal={revealed ? '' : undefined}
      style={{ ['--hud-scale' as string]: String(scale) }}
    >
      {/* ── TOP-LEFT: vitals (joy · crowd · delivery timer · dash) ───────────── */}
      <div
        className="mhud-tl"
        style={{ opacity: vitalsOpacity, pointerEvents: isTouch ? 'auto' : 'none' }}
        onPointerDown={() => isTouch && setTapRevealUntil(performance.now() + 3500)}
      >
        <div className="mhud-row" aria-label={`שמחת האורחים ${Math.round(joyPct)}%`}>
          <span className={joyPct < 35 ? 'pulse' : undefined}>{joyPct < 35 ? '💔' : '❤️'}</span>
          <div className="mhud-bar">
            <i style={{ width: `${ghostPct}%`, background: 'rgba(251,191,36,0.45)' }} />
            <i
              style={{
                width: `${joyPct}%`,
                background: joyPct < 35 ? 'var(--rose)' : joyPct < 60 ? '#fb923c' : 'var(--amber)',
              }}
            />
          </div>
          <span className={`num ${joyPct < 35 ? 'warn' : ''}`}>{Math.round(joyPct)}%</span>
          <span className="mhud-label reveal-only">שמחה</span>
        </div>

        <div data-testid="hud-crowd-ratio" className="mhud-row" title={crowd.statusHe}>
          <span style={{ width: '1.2em' }} />
          <div className="mhud-bar thin segmented" style={{ opacity: 0.9 }}>
            <i style={{ width: `${crowd.dancerPct}%`, background: 'var(--emerald)' }} />
            <i style={{ width: `${crowd.recruitingPct}%`, background: 'var(--sky)' }} />
            <i style={{ width: `${crowd.seatedPct}%`, background: 'var(--rose)' }} />
          </div>
          <span className={`mhud-label ${crowd.isRatioReversed ? 'warn' : 'reveal-only'}`}>
            <span className="num">💃{crowd.dancerPct} 🪑{crowd.seatedPct}</span>
          </span>
        </div>

        {delivery.urgencyLevel !== 'idle' && (
          <span
            data-testid="hud-joy-drivers"
            className={`mhud-pill ${delivery.urgencyLevel === 'late' ? 'warn pulse' : delivery.urgencyLevel === 'hurry' ? 'pulse' : ''}`}
            title="זמן להוצאת מגנט ללוח"
          >
            {delivery.urgencyLevel === 'late' ? '🚨' : '⏱️'}
            <span className="num">
              {delivery.urgencyLevel === 'late' ? delivery.pendingCount : `${Math.ceil(delivery.remainingSec)}s`}
            </span>
            <span className="mhud-label reveal-only">מגנט ללוח</span>
          </span>
        )}

        {hud.dashCharge < 0.99 && (
          <div className="mhud-row" title="האצה [רווח]">
            <span style={{ width: '1.2em' }} />
            <div className="mhud-bar hair">
              <i style={{ width: `${Math.round(Math.max(0, hud.dashCharge) * 100)}%`, background: 'var(--emerald)' }} />
            </div>
          </div>
        )}

        {/* Touch layout: production pipeline lives under the vitals (bottom corners hold the controls) */}
        {isTouch && <div style={{ opacity: pipelineOpacity }}>{pipelineChips}</div>}
      </div>

      {/* ── TOP-RIGHT: progress (quota · score · DJ timer) + system icons ────── */}
      <div className="mhud-tr">
        <div className="mhud-row" style={{ opacity: progressOpacity }}>
          <span className="mhud-pill" title="מגנטים בשלב">
            🧲 <span className="num" data-testid="hud-magnets">{magnetsPrinted}/{targetMagnets}</span>
          </span>
          <span className="mhud-pill" title="ניקוד">
            ⭐ <span className="num" data-testid="hud-score">{Math.round(hud.score)}</span>
          </span>
          <span className={`mhud-pill ${timerCritical ? 'warn pulse' : ''}`} title="זמן לשיר">
            ♫ <span className="num">{formattedTime}</span>
          </span>
        </div>
        {/* Quota progress hairline under the numbers */}
        <div className="mhud-bar hair" style={{ width: '100%', opacity: progressOpacity * 0.9 }}>
          <i
            style={{
              width: `${Math.min(100, (magnetsPrinted / Math.max(1, targetMagnets)) * 100)}%`,
              background: 'var(--amber)',
            }}
          />
        </div>

        <div
          className="mhud-row"
          style={{ opacity: revealed ? 1 : HUD_IDLE_OPACITY.systemIcons, position: 'relative' }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '')}
        >
          <button
            type="button"
            tabIndex={-1}
            data-testid="hud-settings-btn"
            className={`mhud-icon ${settingsOpen ? 'is-on' : ''}`}
            aria-label="הגדרות"
            title="הגדרות · החזק Tab להצגת כל הנתונים"
            onClick={blurThen(() => {
              setSettingsOpen((v) => !v);
              setUpgradesOpen(false);
            })}
          >
            ⚙️
          </button>
          <button
            type="button"
            tabIndex={-1}
            className="mhud-icon"
            aria-label={muted ? 'הפעל צליל [M]' : 'השתק [M]'}
            onClick={blurThen(onToggleMute)}
          >
            {muted ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>
          <button type="button" tabIndex={-1} className="mhud-icon" aria-label="השהה [P]" onClick={blurThen(onPause)}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          </button>

          {settingsOpen && (
            <div dir="rtl" className="mhud-pop" style={{ top: '2.4em', right: 0 }}>
              <button type="button" onClick={() => { setSettingsOpen(false); onOpenAtlas(); }}>
                <span>✏️ עריכת דמויות</span>
                <span className="mhud-key">I</span>
              </button>
              <button type="button" onClick={() => { setSettingsOpen(false); onDownloadSprite(); }}>
                <span>⬇️ הורד ספרייטים</span>
                <span className="num">PNG</span>
              </button>
              <button type="button" onClick={() => onToggleMobileControls?.()}>
                <span>📱 ג'ויסטיק מגע</span>
                <span>{showMobileControls ? 'פעיל' : 'כבוי'}</span>
              </button>
              <div className="row-static">
                <span>גודל צלם</span>
                <span className="mhud-row">
                  <button type="button" onClick={() => onAdjustScale(-0.1)}>−</button>
                  <span className="num">{photographerScale.toFixed(2)}x</span>
                  <button type="button" onClick={() => onAdjustScale(0.1)}>+</button>
                </span>
              </div>
              <button type="button" onClick={() => { setSettingsOpen(false); onRestart(); }}>
                <span>🔄 התחל מחדש</span>
                <span className="mhud-key">R</span>
              </button>
              <div className="row-static mhud-label">החזק Tab / Alt להצגת כל הנתונים</div>
            </div>
          )}
        </div>

        {/* Touch layout: loadout sits under the system icons */}
        {isTouch && <div style={{ opacity: loadoutOpacity }}>{loadoutIcons}</div>}
      </div>

      {/* ── TOP STRIP (center): live VIP moment ─────────────────────────────── */}
      {(vipEvent && vipEvent.remainingSec > 0) || (isTouch && toast) ? (
        <div className="mhud-top">
          {vipEvent && vipEvent.remainingSec > 0 && (
            <span
              dir="rtl"
              data-testid="hud-vip-event"
              className="mhud-pill"
              style={{ background: 'rgba(120, 53, 15, 0.62)', maxWidth: '100%', overflow: 'hidden' }}
              title={vipEvent.titleHe}
            >
              <span>⭐</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{vipEvent.titleHe}</span>
              <span className="num" style={{ color: 'var(--emerald)' }}>
                {vipEvent.photosCaptured}/{vipEvent.requiredPhotos}
              </span>
              <span>{MAGNET_FRAMES[vipEvent.preferredFrame].icon}</span>
              <span className="num">{Math.ceil(vipEvent.remainingSec)}s</span>
            </span>
          )}
          {isTouch && toast && (
            <span dir="rtl" className={`mhud-pill mhud-toast ${toastCritical ? 'critical' : ''}`}>
              {toast}
            </span>
          )}
        </div>
      ) : null}

      {/* ── BOTTOM-LEFT: production pipeline (non-empty stages only) ─────────── */}
      {!isTouch && (
        <div className="mhud-bl" style={{ opacity: pipelineOpacity }}>
          {pipelineChips}
        </div>
      )}

      {/* ── BOTTOM-RIGHT: loadout (lens · frame · upgrades · station · board) ── */}
      {!isTouch && (
        <div className="mhud-br" style={{ opacity: loadoutOpacity }}>
          {loadoutIcons}
        </div>
      )}

      {/* ── BOTTOM STRIP (center): contextual prompt + one-line toast ────────── */}
      {!isTouch && (toast || prompt || showCallGuests) && (
        <div className="mhud-bottom">
          {toast && (
            <span dir="rtl" className={`mhud-pill mhud-toast ${toastCritical ? 'critical' : ''}`}>
              {toast}
            </span>
          )}
          {(prompt || showCallGuests) && (
            <div className="mhud-row">
              {prompt && (
                <button
                  type="button"
                  dir="rtl"
                  className="mhud-pill mhud-prompt"
                  onClick={prompt.onClick}
                  disabled={!prompt.onClick}
                >
                  <span className="mhud-key">{prompt.key}</span>
                  <span>{prompt.icon}</span>
                  <span>{prompt.text}</span>
                </button>
              )}
              {showCallGuests && (
                <button type="button" dir="rtl" className="mhud-pill mhud-prompt" onClick={onCallGuests}>
                  <span className="mhud-key">C</span>
                  <span>📢</span>
                  <span className="num">{availableOnBoard}</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
