import React, { useState, useRef, useEffect, useCallback } from 'react';

export type WeaponMode = 'pulse' | 'scatter';

export interface VirtualInputState {
  moveX: number; // -1 to 1
  moveY: number; // -1 to 1
  isShooting: boolean;
  isDashing: boolean;
  triggerStation: boolean;
}

interface MobileControlsProps {
  virtualInputRef: React.MutableRefObject<VirtualInputState>;
  isNearStation: boolean;
  isNearBoard?: boolean;
  photosInCamera: number;
  /** Photos copied to the laptop, ready to print */
  photosOnComputer?: number;
  /** Seconds left of an in-progress camera → laptop copy (0 when idle) */
  transferRemainingSec?: number;
  uncutSheetsAtStation?: number;
  cutMagnetsInHand?: number;
  availableMagnets?: number;
  weaponMode: WeaponMode;
  onSelectWeapon: (mode: WeaponMode) => void;
  onStationAction?: () => void;
  onCallGuests?: () => void;
  visible?: boolean;
}

const JOYSTICK_RADIUS = 42;

export const MobileControls: React.FC<MobileControlsProps> = ({
  virtualInputRef,
  isNearStation,
  isNearBoard = false,
  photosInCamera,
  photosOnComputer = 0,
  transferRemainingSec = 0,
  uncutSheetsAtStation = 0,
  cutMagnetsInHand = 0,
  availableMagnets = 0,
  weaponMode,
  onSelectWeapon,
  onStationAction,
  onCallGuests,
  visible = true,
}) => {
  const [controlMode, setControlMode] = useState<'analog' | 'dpad'>('analog');
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [activeDpadDirs, setActiveDpadDirs] = useState<{ [key: string]: boolean }>({});

  const baseRef = useRef<HTMLDivElement>(null);
  const activePointerId = useRef<number | null>(null);
  const baseCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Reset virtual input on unmount
  useEffect(() => {
    return () => {
      virtualInputRef.current.moveX = 0;
      virtualInputRef.current.moveY = 0;
      virtualInputRef.current.isShooting = false;
      virtualInputRef.current.isDashing = false;
      virtualInputRef.current.triggerStation = false;
    };
  }, [virtualInputRef]);

  // Handle pointer down on joystick base
  const handleJoystickPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== null) return;
    activePointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);

    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    baseCenterRef.current = { x: centerX, y: centerY };

    updateJoystickPos(e.clientX, e.clientY);
  };

  const updateJoystickPos = (clientX: number, clientY: number) => {
    const dx = clientX - baseCenterRef.current.x;
    const dy = clientY - baseCenterRef.current.y;
    const dist = Math.hypot(dx, dy);

    let clampedX = dx;
    let clampedY = dy;
    if (dist > JOYSTICK_RADIUS) {
      clampedX = (dx / dist) * JOYSTICK_RADIUS;
      clampedY = (dy / dist) * JOYSTICK_RADIUS;
    }

    setKnobPos({ x: clampedX, y: clampedY });

    // Map to normalized -1..1 inputs
    const normX = clampedX / JOYSTICK_RADIUS;
    const normY = clampedY / JOYSTICK_RADIUS;
    virtualInputRef.current.moveX = normX;
    virtualInputRef.current.moveY = normY;
  };

  const handleJoystickPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activePointerId.current) return;
    updateJoystickPos(e.clientX, e.clientY);
  };

  const handleJoystickPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activePointerId.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    activePointerId.current = null;
    setIsDragging(false);
    setKnobPos({ x: 0, y: 0 });
    virtualInputRef.current.moveX = 0;
    virtualInputRef.current.moveY = 0;
  };

  // D-Pad handlers
  const handleDpadDir = useCallback(
    (dir: 'up' | 'down' | 'left' | 'right', pressed: boolean) => {
      setActiveDpadDirs((prev) => {
        const next = { ...prev, [dir]: pressed };
        let x = 0;
        let y = 0;
        if (next.up) y -= 1;
        if (next.down) y += 1;
        if (next.left) x -= 1;
        if (next.right) x += 1;

        const len = Math.hypot(x, y);
        if (len > 0) {
          virtualInputRef.current.moveX = x / len;
          virtualInputRef.current.moveY = y / len;
        } else {
          virtualInputRef.current.moveX = 0;
          virtualInputRef.current.moveY = 0;
        }
        return next;
      });
    },
    [virtualInputRef]
  );

  // Shoot button handlers
  const handleShootStart = (e: React.PointerEvent) => {
    e.preventDefault();
    virtualInputRef.current.isShooting = true;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(12);
      } catch {
        // ignore
      }
    }
  };

  const handleShootEnd = (e: React.PointerEvent) => {
    e.preventDefault();
    virtualInputRef.current.isShooting = false;
  };

  // Dash button handlers
  const handleDashTrigger = (e: React.PointerEvent) => {
    e.preventDefault();
    virtualInputRef.current.isDashing = true;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(18);
      } catch {
        // ignore
      }
    }
  };

  // Station trigger handlers
  const handleStationTrigger = (e: React.PointerEvent) => {
    e.preventDefault();
    virtualInputRef.current.triggerStation = true;
    onStationAction?.();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(25);
      } catch {
        // ignore
      }
    }
  };

  if (!visible) return null;

  return (
    <div
      data-testid="mobile-controls-root"
      className="fixed inset-x-0 bottom-0 pointer-events-none select-none z-20 pb-4 px-3 sm:px-6 flex items-end justify-between"
      style={{ touchAction: 'none' }}
    >
      {/* Left: Virtual Joystick or D-Pad */}
      <div className="flex flex-col items-center pointer-events-auto">
        {/* Toggle Mode: Analog Stick vs D-Pad */}
        <div className="mb-2 flex items-center gap-1 bg-stone-950/80 backdrop-blur-sm border border-amber-500/40 rounded-full px-2 py-0.5 shadow-md">
          <button
            type="button"
            onClick={() => setControlMode('analog')}
            className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full transition-colors ${
              controlMode === 'analog'
                ? 'bg-amber-400 text-stone-950 font-black'
                : 'text-amber-200/80 hover:text-white'
            }`}
          >
            🕹️ סטיק
          </button>
          <button
            type="button"
            onClick={() => setControlMode('dpad')}
            className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full transition-colors ${
              controlMode === 'dpad'
                ? 'bg-amber-400 text-stone-950 font-black'
                : 'text-amber-200/80 hover:text-white'
            }`}
          >
            🎛️ חיצים
          </button>
        </div>

        {controlMode === 'analog' ? (
          /* Analog Touch Joystick */
          <div
            ref={baseRef}
            data-testid="virtual-joystick-base"
            onPointerDown={handleJoystickPointerDown}
            onPointerMove={handleJoystickPointerMove}
            onPointerUp={handleJoystickPointerUp}
            onPointerCancel={handleJoystickPointerUp}
            className={`relative rounded-full border-3 border-amber-400/60 bg-stone-950/75 backdrop-blur-sm flex items-center justify-center shadow-2xl transition-shadow ${
              isDragging ? 'shadow-amber-500/40 ring-4 ring-amber-400/30' : ''
            }`}
            style={{
              width: `${JOYSTICK_RADIUS * 2 + 30}px`,
              height: `${JOYSTICK_RADIUS * 2 + 30}px`,
              touchAction: 'none',
            }}
          >
            {/* Direction hints on the base ring */}
            <span className="absolute top-1.5 text-amber-300/60 text-[11px] font-mono select-none">▲</span>
            <span className="absolute bottom-1.5 text-amber-300/60 text-[11px] font-mono select-none">▼</span>
            <span className="absolute left-1.5 text-amber-300/60 text-[11px] font-mono select-none">◀</span>
            <span className="absolute right-1.5 text-amber-300/60 text-[11px] font-mono select-none">▶</span>

            {/* Inner guideline circles */}
            <div className="w-16 h-16 rounded-full border border-dashed border-amber-400/30 pointer-events-none" />

            {/* Draggable Knob */}
            <div
              data-testid="virtual-joystick-knob"
              className="absolute w-14 h-14 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 border-2 border-stone-950 shadow-lg flex items-center justify-center transition-transform pointer-events-none"
              style={{
                transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                boxShadow: isDragging
                  ? '0 0 16px rgba(251, 191, 36, 0.9), inset 0 2px 4px rgba(255, 255, 255, 0.6)'
                  : '0 4px 8px rgba(0,0,0,0.5)',
              }}
            >
              <div className="w-4 h-4 rounded-full bg-stone-950/60 border border-amber-200/50" />
            </div>
          </div>
        ) : (
          /* 4-Way D-Pad Buttons for precision */
          <div
            data-testid="virtual-dpad-grid"
            className="grid grid-cols-3 gap-1 bg-stone-950/80 backdrop-blur-sm p-1.5 rounded-2xl border-2 border-amber-500/50 shadow-2xl"
            style={{ touchAction: 'none' }}
          >
            <div />
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                handleDpadDir('up', true);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                handleDpadDir('up', false);
              }}
              onPointerCancel={(e) => {
                e.preventDefault();
                handleDpadDir('up', false);
              }}
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl border-2 transition-all ${
                activeDpadDirs.up
                  ? 'bg-amber-400 text-stone-950 border-amber-300 scale-95'
                  : 'bg-stone-900 text-amber-200 border-stone-700 hover:bg-stone-800'
              }`}
            >
              ▲
            </button>
            <div />

            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                handleDpadDir('left', true);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                handleDpadDir('left', false);
              }}
              onPointerCancel={(e) => {
                e.preventDefault();
                handleDpadDir('left', false);
              }}
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl border-2 transition-all ${
                activeDpadDirs.left
                  ? 'bg-amber-400 text-stone-950 border-amber-300 scale-95'
                  : 'bg-stone-900 text-amber-200 border-stone-700 hover:bg-stone-800'
              }`}
            >
              ◀
            </button>
            <div className="w-12 h-12 rounded-xl bg-stone-950/50 flex items-center justify-center text-[10px] text-stone-400 font-mono">
              הזז
            </div>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                handleDpadDir('right', true);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                handleDpadDir('right', false);
              }}
              onPointerCancel={(e) => {
                e.preventDefault();
                handleDpadDir('right', false);
              }}
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl border-2 transition-all ${
                activeDpadDirs.right
                  ? 'bg-amber-400 text-stone-950 border-amber-300 scale-95'
                  : 'bg-stone-900 text-amber-200 border-stone-700 hover:bg-stone-800'
              }`}
            >
              ▶
            </button>

            <div />
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                handleDpadDir('down', true);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                handleDpadDir('down', false);
              }}
              onPointerCancel={(e) => {
                e.preventDefault();
                handleDpadDir('down', false);
              }}
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl border-2 transition-all ${
                activeDpadDirs.down
                  ? 'bg-amber-400 text-stone-950 border-amber-300 scale-95'
                  : 'bg-stone-900 text-amber-200 border-stone-700 hover:bg-stone-800'
              }`}
            >
              ▼
            </button>
            <div />
          </div>
        )}
      </div>

      {/* Right: Mobile Action Buttons (Photo Flash, Dash, Magnet Station, Lens Toggle) */}
      <div className="flex flex-col items-end gap-2 pointer-events-auto">
        {/* Step 1 / Step 2 / Step 3 Context Action Button */}
        {(isNearStation ||
          isNearBoard ||
          photosInCamera > 0 ||
          photosOnComputer > 0 ||
          uncutSheetsAtStation > 0 ||
          cutMagnetsInHand > 0) && (
          <button
            type="button"
            onPointerDown={handleStationTrigger}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-stone-950 font-black text-xs sm:text-sm border-2 border-stone-950 shadow-xl transition-transform active:scale-95 ${
              cutMagnetsInHand > 0
                ? 'bg-emerald-400 hover:bg-emerald-300 ring-4 ring-emerald-400/50 animate-pulse'
                : uncutSheetsAtStation > 0
                ? 'bg-cyan-400 hover:bg-cyan-300 ring-4 ring-cyan-400/50 animate-pulse'
                : isNearStation
                ? 'bg-amber-300 hover:bg-amber-200 ring-4 ring-amber-400/50 animate-pulse'
                : 'bg-amber-500/90 text-stone-950'
            }`}
          >
            <span className="text-base">
              {cutMagnetsInHand > 0
                ? '🧲'
                : uncutSheetsAtStation > 0
                ? '✂️'
                : transferRemainingSec > 0 || (photosOnComputer === 0 && photosInCamera > 0)
                ? '💾'
                : '🖨️'}
            </span>
            <span>
              {cutMagnetsInHand > 0
                ? isNearBoard
                  ? `שלב 4: הדבק ${cutMagnetsInHand} מגנטים בלוח!`
                  : `קח ${cutMagnetsInHand} מגנטים ללוח הרחבה`
                : uncutSheetsAtStation > 0
                ? isNearStation
                  ? `שלב 3: חתוך ${uncutSheetsAtStation} מגנטים בחותך!`
                  : `גש לחתוך (${uncutSheetsAtStation} דפים)`
                : transferRemainingSec > 0
                ? `מעביר למחשב… ${transferRemainingSec.toFixed(1)} שנ'`
                : photosOnComputer > 0
                ? isNearStation
                  ? `שלב 2: הדפס ${photosOnComputer} תמונות`
                  : `לעמדה בפינה (${photosOnComputer} במחשב)`
                : isNearStation
                ? `שלב 1: העבר ${photosInCamera} תמונות למחשב`
                : `לעמדה בפינה (${photosInCamera} תמונות)`}
            </span>
          </button>
        )}

        {/* Call Guests To Take Magnets */}
        {availableMagnets > 0 && onCallGuests && (
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              onCallGuests();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-stone-950 font-black text-xs border-2 border-stone-950 shadow-xl active:scale-95"
          >
            <span>📢</span>
            <span>קרא לאורחים למגנטים ({availableMagnets})</span>
            <span>🧲</span>
          </button>
        )}

        {/* Secondary Row: Dash & Lens Toggle */}
        <div className="flex items-center gap-2">
          {/* Lens Switch */}
          <button
            type="button"
            onClick={() => onSelectWeapon(weaponMode === 'pulse' ? 'scatter' : 'pulse')}
            className="w-12 h-12 rounded-xl bg-stone-950/85 backdrop-blur-sm border-2 border-amber-400/70 text-amber-200 flex flex-col items-center justify-center shadow-lg active:scale-95"
            aria-label="החלף עדשה"
          >
            <span className="text-xs">🔄</span>
            <span className="text-[9px] font-bold mt-0.5">
              {weaponMode === 'pulse' ? '35mm' : 'רחב'}
            </span>
          </button>

          {/* Dash Button */}
          <button
            type="button"
            onPointerDown={handleDashTrigger}
            className="w-13 h-13 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-stone-950 border-2 border-stone-950 flex flex-col items-center justify-center font-black shadow-xl active:scale-90 transition-transform"
            aria-label="ספרינט / דילוג"
          >
            <span className="text-lg leading-none">💨</span>
            <span className="text-[9px] font-black uppercase mt-0.5">ספרינט</span>
          </button>
        </div>

        {/* Primary Shoot / Flash Button */}
        <button
          type="button"
          data-testid="mobile-btn-shoot"
          onPointerDown={handleShootStart}
          onPointerUp={handleShootEnd}
          onPointerCancel={handleShootEnd}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-stone-950 border-3 border-stone-950 shadow-2xl flex flex-col items-center justify-center font-black active:scale-90 active:shadow-amber-500/60 ring-4 ring-amber-400/40 transition-transform"
          aria-label="צלם תמונה ופלאש"
        >
          <span className="text-2xl leading-none">📸</span>
          <span className="text-[11px] font-black tracking-wide mt-0.5">פלאש</span>
        </button>
      </div>
    </div>
  );
};
