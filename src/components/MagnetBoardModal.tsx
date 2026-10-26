import React from 'react';

export interface MagnetBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableMagnets: number;
  totalPrinted: number;
  magnetsTakenByGuests: number;
  onCallGuests: () => void;
  onTakeMagnet: () => void;
}

export const MagnetBoardModal: React.FC<MagnetBoardModalProps> = ({
  isOpen,
  onClose,
  availableMagnets,
  totalPrinted,
  magnetsTakenByGuests,
  onCallGuests,
  onTakeMagnet,
}) => {
  if (!isOpen) return null;

  const mockMagnetItems = [
    { id: 1, title: 'רחבת הריקודים 💃', sub: 'מעגל סוער!', color: 'from-amber-400 to-orange-500', icon: '🕺' },
    { id: 2, title: 'הזוג המאושר 👰🤵', sub: 'רגע בלתי נשכח', color: 'from-pink-400 to-rose-500', icon: '💍' },
    { id: 3, title: 'משפחת החתן 🥂', sub: 'שולחן 1 · לחיים!', color: 'from-blue-400 to-indigo-500', icon: '🍷' },
    { id: 4, title: 'משפחת הכלה 💖', sub: 'שולחן 3 · התרגשות', color: 'from-rose-400 to-red-500', icon: '💐' },
    { id: 5, title: 'החבר\'ה מהעבודה 🎉', sub: 'עושים שמח!', color: 'from-emerald-400 to-teal-500', icon: '🍻' },
    { id: 6, title: 'הורה באקסטזה 💫', sub: 'כולם באוויר!', color: 'from-purple-400 to-violet-500', icon: '⚡' },
    { id: 7, title: 'סלפי עם הצלם 📸', sub: 'חיוך ענק לפלאש', color: 'from-amber-300 to-yellow-500', icon: '✨' },
    { id: 8, title: 'החברים מהלימודים 🎓', sub: 'חוגגים עד אור הבוקר', color: 'from-cyan-400 to-sky-600', icon: '🎆' },
  ];

  // Show magnets based on what has been printed
  const displayCount = Math.max(3, Math.min(8, totalPrinted));
  const activeMagnets = mockMagnetItems.slice(0, displayCount);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="לוח מגנטים לאורחים"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-950/80 backdrop-blur-md animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-stone-900 border-2 border-amber-500/70 rounded-2xl shadow-2xl p-4 sm:p-6 flex flex-col gap-4 text-stone-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🧲</span>
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-amber-300">
                לוח מגנטים למזכרת · מעמד חצובה ליד הרחבה
              </h2>
              <p className="text-xs sm:text-sm text-stone-400">
                הלוח הלבן מוצב צמוד לרחבת הריקודים – אורחים יכולים לגשת ולקחת את המגנט שלהם!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center justify-center font-bold text-lg cursor-pointer transition-colors"
            aria-label="סגור"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 bg-stone-950/70 border border-stone-800 rounded-xl p-3 text-center">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-amber-300/80 uppercase">🧲 סה״כ הודפסו</span>
            <span className="text-xl sm:text-3xl font-black font-mono text-amber-300">{totalPrinted}</span>
          </div>
          <div className="flex flex-col border-x border-stone-800">
            <span className="text-[11px] font-bold text-emerald-300/80 uppercase">✨ ממתינים בלוח</span>
            <span className="text-xl sm:text-3xl font-black font-mono text-emerald-400">{availableMagnets}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-pink-300/80 uppercase">🥳 נלקחו ע״י אורחים</span>
            <span className="text-xl sm:text-3xl font-black font-mono text-pink-400">{magnetsTakenByGuests}</span>
          </div>
        </div>

        {/* Main Easel Presentation View */}
        <div className="relative flex flex-col md:flex-row items-center gap-6 bg-gradient-to-b from-stone-950 to-stone-900 border border-stone-800 rounded-xl p-4 sm:p-6 overflow-hidden">
          {/* Authentic Easel Stand Visual (from user attachment) */}
          <div className="relative w-48 sm:w-64 shrink-0 flex flex-col items-center">
            <div className="relative rounded-lg overflow-hidden shadow-2xl border border-stone-700/60 bg-white">
              <img
                src={`${import.meta.env.BASE_URL}assets/aistudio/___-__-_______f37299ea.jpg`}
                alt="לוח מגנטים חצובה"
                className="w-full h-auto object-contain max-h-72"
              />
              <div className="absolute top-2 left-2 right-2 bg-stone-900/90 text-amber-300 font-bold text-[10px] text-center py-0.5 rounded px-1 shadow">
                מעמד חצובה רשמי ליד הרחבה
              </div>
            </div>
          </div>

          {/* Magnetic Whiteboard Surface with attached souvenir magnets */}
          <div className="flex-1 w-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-bold text-amber-200">
                המגנטים שעל הלוח כרגע:
              </span>
              <span className="text-xs text-stone-400 font-mono">
                {availableMagnets > 0
                  ? `יש ${availableMagnets} מגנטים פנויים לאיסוף`
                  : 'כל המגנטים נאספו על ידי האורחים!'}
              </span>
            </div>

            {/* Grid of Polaroid Photo Magnets */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 bg-stone-950/60 p-3 rounded-xl border border-stone-800">
              {activeMagnets.map((m, idx) => {
                const isTaken = idx >= availableMagnets;
                return (
                  <div
                    key={m.id}
                    className={`relative p-2 rounded-lg border flex flex-col items-center text-center transition-all ${
                      isTaken
                        ? 'bg-stone-900/40 border-stone-800 opacity-60'
                        : 'bg-white border-stone-400 shadow-md hover:scale-105 hover:shadow-amber-400/30'
                    }`}
                  >
                    {/* Magnet button icon pin */}
                    <div className="w-3 h-3 rounded-full bg-red-600 border border-stone-900 shadow -mt-1 mb-1" />

                    {/* Photo area */}
                    <div
                      className={`w-full aspect-square rounded bg-gradient-to-br ${m.color} flex flex-col items-center justify-center text-white shadow-inner`}
                    >
                      <span className="text-2xl drop-shadow">{m.icon}</span>
                      <span className="text-[9px] font-bold mt-1 drop-shadow-sm text-stone-950 px-1 bg-white/80 rounded">
                        חתונה 2026
                      </span>
                    </div>

                    {/* Polaroid Bottom Caption */}
                    <div className="mt-1.5 w-full">
                      <div className="text-[11px] font-black text-stone-950 leading-tight truncate">
                        {m.title}
                      </div>
                      <div className="text-[9px] text-stone-600 truncate">{m.sub}</div>
                    </div>

                    {/* Status Badge */}
                    <div className="mt-1">
                      {isTaken ? (
                        <span className="text-[9px] font-bold text-stone-400 bg-stone-800 px-1.5 py-0.5 rounded">
                          נלקח ✓
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                          זמין לאורח ✨
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Controls for Guests and Player */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onCallGuests();
              }}
              disabled={availableMagnets <= 0}
              className={`px-4 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 border shadow-lg transition-all cursor-pointer ${
                availableMagnets > 0
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 border-amber-300 active:scale-95'
                  : 'bg-stone-800 text-stone-500 border-stone-700 cursor-not-allowed'
              }`}
            >
              <span className="text-base">📢</span>
              <span>קרא לאורחים לקחת מגנטים מהלוח! [C]</span>
              <span className="text-xs bg-stone-950/30 px-1.5 py-0.5 rounded text-stone-950 font-mono">
                {availableMagnets}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onTakeMagnet();
              }}
              disabled={availableMagnets <= 0}
              className={`px-3.5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 border transition-all cursor-pointer ${
                availableMagnets > 0
                  ? 'bg-stone-800 hover:bg-stone-700 text-emerald-300 border-emerald-500/50 active:scale-95'
                  : 'bg-stone-800 text-stone-500 border-stone-700 cursor-not-allowed'
              }`}
            >
              <span>🧲</span>
              <span>קח מגנט למזכרת אישית</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-sm transition-colors cursor-pointer"
          >
            חזרה לרחבת הריקודים [Esc]
          </button>
        </div>
      </div>
    </div>
  );
};
