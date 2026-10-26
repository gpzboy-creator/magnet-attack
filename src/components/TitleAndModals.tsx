import React from 'react';
import { GameState } from '../game/rules';

interface TitleAndModalsProps {
  gameState: GameState;
  victory: boolean;
  score: number;
  bestScore: number;
  waveReached: number;
  enemiesDefeated: number;
  totalFramesExtracted: number;
  onStartGame: () => void;
  onResumeGame: () => void;
  onReturnTitle: () => void;
  onOpenAtlas: () => void;
  onDownloadSprite: () => void;
}

export const TitleAndModals: React.FC<TitleAndModalsProps> = ({
  gameState,
  victory,
  score,
  bestScore,
  waveReached,
  enemiesDefeated,
  onStartGame,
  onResumeGame,
  onReturnTitle,
  onOpenAtlas,
  onDownloadSprite,
}) => {
  if (gameState === 'playing') return null;

  if (gameState === 'title') {
    return (
      <div
        dir="rtl"
        className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-5 sm:p-10 select-none"
      >
        {/* Top Row: Left Ornate Crest + Hebrew Title, Right PC & MOBILE device badges */}
        <div
          dir="ltr"
          className="flex flex-wrap items-start justify-between gap-4 w-full"
        >
          {/* Top-Left: Ornate White Filigree Crest + Hebrew Title Lockup & Start CTAs */}
          <div className="flex flex-col items-start gap-3 max-w-3xl pointer-events-auto">
            <div className="flex items-center gap-4">
              <svg
                viewBox="0 0 96 110"
                className="w-16 h-20 sm:w-20 sm:h-24 shrink-0 drop-shadow-[0_3px_3px_rgba(0,0,0,0.95)]"
                role="img"
                aria-label="סמל Magnet Attack"
              >
                <polygon
                  points="48,6 60,48 48,92 36,48"
                  fill="#ffffff"
                  stroke="#1c1410"
                  strokeWidth="3"
                />
                <line
                  x1="48"
                  y1="10"
                  x2="48"
                  y2="88"
                  stroke="#1c1410"
                  strokeWidth="2.5"
                />
                <path
                  d="M36,18 C16,24 10,48 18,68 C24,82 36,88 44,94 C28,92 10,78 8,54 C6,34 18,16 36,18 Z"
                  fill="#ffffff"
                  stroke="#1c1410"
                  strokeWidth="2.5"
                />
                <path
                  d="M60,18 C80,24 86,48 78,68 C72,82 60,88 52,94 C68,92 86,78 88,54 C90,34 78,16 60,18 Z"
                  fill="#ffffff"
                  stroke="#1c1410"
                  strokeWidth="2.5"
                />
                <circle
                  cx="40"
                  cy="98"
                  r="5"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="3"
                />
                <circle
                  cx="56"
                  cy="98"
                  r="5"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="3"
                />
              </svg>

              {/* Title lockup: Latin display title (LTR) + Hebrew subtitle (RTL) */}
              <div className="ma-title-lockup flex flex-col items-start min-w-0">
                <h1 dir="ltr" lang="en" className="ma-title" aria-label="Magnet Attack">
                  <span className="ma-title-text" data-text="MAGNET ATTACK" aria-hidden="true">
                    MAGNET ATTACK
                  </span>
                  <span className="ma-title-flash" aria-hidden="true" />
                </h1>
                <p dir="rtl" lang="he" className="ma-subtitle">
                  צלם מגנטים
                </p>
              </div>
            </div>

            {/* Primary & Secondary CTAs */}
            <div dir="rtl" className="flex flex-wrap items-center gap-3 pl-2">
              <button
                type="button"
                data-start="true"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onStartGame();
                }}
                className="px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-sm sm:text-base tracking-wide transition-colors shadow-xl border-2 border-stone-950 whitespace-nowrap shrink-0 cursor-pointer"
              >
                התחל לצלם מגנטים ברחבה [Enter]
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onDownloadSprite();
                }}
                className="px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 border-2 border-stone-950 text-stone-950 font-black text-xs sm:text-sm transition-colors shadow-xl whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>הורד ספרייט PNG</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onOpenAtlas();
                }}
                className="px-4 py-2.5 rounded-lg bg-stone-950/90 hover:bg-stone-900 border-2 border-amber-400/80 text-amber-300 font-bold text-xs sm:text-sm transition-colors shadow-xl whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                <span>עריכת דמויות וגודל [I]</span>
              </button>
            </div>
          </div>

          {/* Top-Right: PC & MOBILE device badges */}
          <div className="flex items-center gap-3 pointer-events-auto">
            <div className="flex flex-col items-center gap-1">
              <div className="w-12 h-11 rounded border-2 border-white bg-stone-950/90 flex flex-col items-center justify-center p-1 shadow">
                <div className="w-8 h-5 rounded-xs border-2 border-white" />
                <div className="w-3 h-1 bg-white mt-0.5" />
              </div>
              <span className="text-[10px] font-mono font-bold text-white tracking-wider">
                PC
              </span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="w-12 h-11 rounded border-2 border-white bg-stone-950/90 flex items-center justify-center shadow">
                <div className="w-5 h-8 rounded-xs border-2 border-white flex flex-col justify-between p-0.5">
                  <div className="w-full h-0.5 bg-white/60" />
                  <div className="w-1.5 h-1.5 rounded-full bg-white mx-auto" />
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-white tracking-wider">
                MOBILE
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Banner with Game Concept and Flat Control Hints (Small & Docked at Bottom) */}
        <div className="flex flex-col items-center gap-1 w-full text-center mt-auto">
          <div
            dir="rtl"
            className="text-xs sm:text-sm font-bold text-amber-100 bg-stone-950/85 px-3 py-1 rounded-md border border-amber-500/40 shadow"
          >
            צלם אורחים רוקדים ובשולחנות · שב על הכסא בעמדת המגנטים בפינה לפיתוח וחיתוך · הדבק על הלוח ליד הרחבה!
          </div>

          <div
            dir="rtl"
            className="text-[10px] sm:text-[11px] font-mono text-stone-300 bg-stone-950/85 px-3 py-0.5 rounded border border-stone-700/80"
          >
            📱 בסמארטפון: ג'ויסטיק וכפתורי מגע · 💻 במחשב: WASD תנועה (ישיבה אוטומטית על כסא העמדה וקימה בתזוזה) · עכבר/J צילום · E פיתוח/חיתוך/הדבקה · Space ספרינט
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'paused') {
    return (
      <div
        dir="rtl"
        className="fixed inset-0 z-30 flex items-center justify-center p-6 bg-stone-950/80 pointer-events-auto"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="האירוע מושהה"
          className="w-full max-w-md rounded-xl bg-stone-900 border-2 border-amber-400/60 p-6 shadow-2xl text-amber-50 flex flex-col gap-5"
        >
          <h2 className="text-2xl font-black tracking-tight text-amber-300">
            הפסקה בצילומי החתונה
          </h2>

          <div className="grid grid-cols-2 gap-3 font-mono tabular-nums">
            <div className="rounded-lg bg-stone-950 border border-stone-800 p-3">
              <div className="text-[11px] text-amber-200/70">ניקוד שמחה</div>
              <div className="text-xl font-bold text-white">
                {Math.round(score)}
              </div>
            </div>
            <div className="rounded-lg bg-stone-950 border border-stone-800 p-3">
              <div className="text-[11px] text-amber-200/70">שלב באירוע</div>
              <div className="text-xl font-bold text-amber-400">
                שלב {Math.round(waveReached)}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onResumeGame}
              className="w-full py-2.5 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-sm transition-colors"
            >
              חזור לצלם באירוע [Esc]
            </button>
            <button
              type="button"
              onClick={onOpenAtlas}
              className="w-full py-2.5 px-4 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-200 font-bold text-sm transition-colors"
            >
              עריכת דמויות ואטלס ספרייטים [I]
            </button>
            <button
              type="button"
              onClick={onStartGame}
              className="w-full py-2.5 px-4 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-sm transition-colors"
            >
              התחל אירוע מחדש [R]
            </button>
            <button
              type="button"
              onClick={onReturnTitle}
              className="w-full py-2.5 px-4 rounded-lg bg-stone-950 hover:bg-stone-800 text-stone-400 font-semibold text-sm transition-colors"
            >
              חזרה למסך הפתיחה
            </button>
          </div>
        </div>
      </div>
    );
  }

  // gameState === 'gameover'
  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-30 flex items-center justify-center p-6 bg-stone-950/85 pointer-events-auto"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={victory ? 'החתונה הוכתרה בהצלחה' : 'סיום סט הריקודים'}
        className="w-full max-w-md rounded-xl bg-stone-900 border-2 border-amber-400/70 p-6 shadow-2xl text-amber-50 flex flex-col gap-5"
      >
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-amber-400">
            {victory
              ? 'כל האורחים קיבלו מגנטים מרהיבים למקרר!'
              : 'המוזיקה הסתיימה! האורחים נהנו והודו על המגנטים'}
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white mt-1">
            {victory ? 'אלוף צילומי המגנטים!' : 'סיום סט הצילומים'}
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-3 font-mono tabular-nums">
          <div className="rounded-lg bg-stone-950 border border-stone-800 p-3">
            <div className="text-[10px] text-amber-200/70">ניקוד שמחה</div>
            <div className="text-lg font-bold text-white">
              {Math.round(score)}
            </div>
          </div>
          <div className="rounded-lg bg-stone-950 border border-stone-800 p-3">
            <div className="text-[10px] text-amber-200/70">שיא אירוע</div>
            <div className="text-lg font-bold text-amber-400">
              {Math.round(bestScore)}
            </div>
          </div>
          <div className="rounded-lg bg-stone-950 border border-stone-800 p-3">
            <div className="text-[10px] text-amber-200/70">מגנטים שהודפסו</div>
            <div className="text-lg font-bold text-emerald-400">
              {Math.round(enemiesDefeated)} 🧲
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            data-start="true"
            onClick={onStartGame}
            className="w-full py-3 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-sm transition-colors cursor-pointer"
          >
            {victory ? 'צלם חתונה נוספת [Enter]' : 'הדרן - נגן שוב [Enter]'}
          </button>
          <button
            type="button"
            onClick={onOpenAtlas}
            className="w-full py-2.5 px-4 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-200 font-bold text-sm transition-colors cursor-pointer"
          >
            עריכת דמויות וגודל [I]
          </button>
          <button
            type="button"
            onClick={onReturnTitle}
            className="w-full py-2.5 px-4 rounded-lg bg-stone-950 hover:bg-stone-800 text-stone-400 font-semibold text-sm transition-colors cursor-pointer"
          >
            מסך הפתיחה
          </button>
        </div>
      </div>
    </div>
  );
};
