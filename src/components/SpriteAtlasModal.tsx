import React, { useEffect, useRef, useState } from 'react';
import {
  CharacterAndSizeConfig,
  DEFAULT_CHARACTER_AND_SIZE_CONFIG,
  ExtractedSpriteFrame,
  FacialHairStyle,
  GuestHatType,
  ISO_ANIM_STATES,
  ISO_DIRECTIONS,
  IsoAnimState,
  IsoDirection,
  PhotographerStyleConfig,
  SpriteAtlasSchema,
  downloadSingleFramePNG,
  downloadSpriteSheetPNG,
  extractSpriteSheetAtlas,
  generateDefaultIsoSpriteSheetRGBA,
  keyOutChromaGreenRGBA,
  loadUploadedPhotographerSpriteSheet,
  normalizeLoadedSpriteSheetImage,
} from '../game/spriteExtractor';

interface SpriteAtlasModalProps {
  isOpen: boolean;
  initialTab?: 'editor' | 'inspector' | 'json';
  onClose: () => void;
  atlas: SpriteAtlasSchema;
  sheetCanvas: HTMLCanvasElement | null;
  characterConfig: CharacterAndSizeConfig;
  onUpdateCharacterConfig: (newConfig: CharacterAndSizeConfig) => void;
  onUpdateAtlas: (newAtlas: SpriteAtlasSchema, newCanvas: HTMLCanvasElement) => void;
}

const HAIR_PRESETS = ['#3c2319', '#141418', '#b47b2a', '#8c2d19', '#64748b'];
const VEST_PRESETS = ['#422c23', '#18181b', '#1e3a5f', '#5c1d2e', '#2d422c'];
const SHIRT_PRESETS = ['#f8fafc', '#bae6fd', '#fef3c7', '#e2e8f0', '#27272a'];
const TIE_PRESETS = ['#6e7234', '#dc2626', '#f59e0b', '#0284c7', '#7c3aed'];
const PANTS_PRESETS = ['#402a22', '#18181b', '#1e293b', '#334155', '#475569'];
const FLASH_PRESETS = ['#facc15', '#38bdf8', '#fb923c', '#f43f5e', '#a3e635'];

export const SpriteAtlasModal: React.FC<SpriteAtlasModalProps> = ({
  isOpen,
  initialTab = 'editor',
  onClose,
  atlas,
  sheetCanvas,
  characterConfig,
  onUpdateCharacterConfig,
  onUpdateAtlas,
}) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'inspector' | 'json'>(
    initialTab
  );
  const [selectedDir, setSelectedDir] = useState<IsoDirection | 'ALL'>('ALL');
  const [selectedState, setSelectedState] = useState<IsoAnimState | 'ALL'>('ALL');
  const [selectedFrameId, setSelectedFrameId] = useState<string>(
    atlas.frames.find((f) => f.id === 's_idle')?.id ??
      atlas.frames[0]?.id ??
      's_idle'
  );
  const [copied, setCopied] = useState(false);
  const [useAnchorLock, setUseAnchorLock] = useState(true);
  const [chromaBg, setChromaBg] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);

  // Pixel Brush state for direct pixel editing on the selected sprite cell
  const [brushColor, setBrushColor] = useState('#facc15');
  const [brushMode, setBrushMode] = useState<'paint' | 'erase'>('paint');
  const [isPainting, setIsPainting] = useState(false);
  const [selectedGuestIdx, setSelectedGuestIdx] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sheetPreviewRef = useRef<HTMLCanvasElement | null>(null);
  const pixelEditorCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const filteredFrames = atlas.frames.filter(
    (f) =>
      (selectedDir === 'ALL' || f.direction === selectedDir) &&
      (selectedState === 'ALL' || f.state === selectedState)
  );

  const activeFrame: ExtractedSpriteFrame =
    atlas.frames.find((f) => f.id === selectedFrameId) ||
    filteredFrames[0] ||
    atlas.frames[0];

  const cleanJsonOutput = JSON.stringify(
    {
      frames: atlas.frames.map((f) => ({
        direction: f.direction,
        state: f.state,
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        anchorX: f.anchorX,
        anchorY: f.anchorY,
      })),
    },
    null,
    2
  );

  // Regenerate all 32 frames when photographer style changes
  const applyPhotographerStyle = (partialStyle: Partial<PhotographerStyleConfig>) => {
    const nextStyle: PhotographerStyleConfig = {
      ...characterConfig.photographerStyle,
      ...partialStyle,
    };
    const nextConfig: CharacterAndSizeConfig = {
      ...characterConfig,
      photographerStyle: nextStyle,
    };
    onUpdateCharacterConfig(nextConfig);

    const width = 512;
    const height = 1024;
    const rgba = generateDefaultIsoSpriteSheetRGBA(width, height, {
      style: nextStyle,
    });
    const newAtlas = extractSpriteSheetAtlas(rgba, width, height, 4, 8);
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const ctx = offscreen.getContext('2d');
    if (ctx) {
      ctx.putImageData(
        new ImageData(new Uint8ClampedArray(rgba), width, height),
        0,
        0
      );
      onUpdateAtlas(newAtlas, offscreen);
    }
  };

  // Draw the zoomed-in interactive Pixel Brush & Size Preview Canvas in the 'editor' tab
  useEffect(() => {
    if (!isOpen || activeTab !== 'editor' || !pixelEditorCanvasRef.current || !sheetCanvas || !activeFrame) {
      return;
    }
    const canvas = pixelEditorCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (chromaBg) {
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      const tile = 12;
      for (let y = 0; y < canvas.height; y += tile) {
        for (let x = 0; x < canvas.width; x += tile) {
          ctx.fillStyle = (x / tile + y / tile) % 2 === 0 ? '#0f172a' : '#1e293b';
          ctx.fillRect(x, y, tile, tile);
        }
      }
    }

    const originX = canvas.width * 0.5;
    const originY = canvas.height * 0.84;

    // Isometric ground tile diamond proportional to photographerScale
    const pScale = characterConfig.photographerScale;
    const wRatio = characterConfig.photographerWidthRatio;
    const hRatio = characterConfig.photographerHeightRatio;

    ctx.strokeStyle = chromaBg ? 'rgba(12, 8, 6, 0.5)' : 'rgba(245, 158, 11, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(originX, originY - 26);
    ctx.lineTo(originX + 52, originY);
    ctx.lineTo(originX, originY + 26);
    ctx.lineTo(originX - 52, originY);
    ctx.closePath();
    ctx.stroke();

    // Draw scaled sprite frame centered on ground-foot anchor
    const baseZoom = 1.55;
    const dw = activeFrame.width * baseZoom * (pScale / 1.25) * wRatio;
    const dh = activeFrame.height * baseZoom * (pScale / 1.25) * hRatio;
    const drawX = originX - activeFrame.anchorX * dw;
    const drawY = originY - activeFrame.anchorY * dh;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      sheetCanvas,
      activeFrame.x,
      activeFrame.y,
      activeFrame.width,
      activeFrame.height,
      drawX,
      drawY,
      dw,
      dh
    );

    if (showOverlay) {
      ctx.strokeStyle = chromaBg ? '#0284c7' : '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(drawX, drawY, dw, dh);

      // Foot anchor crosshair
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(originX, originY, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [
    isOpen,
    activeTab,
    sheetCanvas,
    activeFrame,
    characterConfig,
    chromaBg,
    showOverlay,
    atlas,
  ]);

  // Paint or erase a pixel directly on the sprite sheet when clicking/dragging on the editor canvas
  const handlePixelCanvasPaint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!sheetCanvas || !activeFrame || !pixelEditorCanvasRef.current) return;
    const canvas = pixelEditorCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const originX = canvas.width * 0.5;
    const originY = canvas.height * 0.84;
    const baseZoom = 1.55;
    const pScale = characterConfig.photographerScale;
    const wRatio = characterConfig.photographerWidthRatio;
    const hRatio = characterConfig.photographerHeightRatio;

    const dw = activeFrame.width * baseZoom * (pScale / 1.25) * wRatio;
    const dh = activeFrame.height * baseZoom * (pScale / 1.25) * hRatio;
    const drawX = originX - activeFrame.anchorX * dw;
    const drawY = originY - activeFrame.anchorY * dh;

    const relX = (clickX - drawX) / dw;
    const relY = (clickY - drawY) / dh;
    if (relX < 0 || relX > 1 || relY < 0 || relY > 1) return;

    const sheetPx = Math.floor(activeFrame.x + relX * activeFrame.width);
    const sheetPy = Math.floor(activeFrame.y + relY * activeFrame.height);

    const nextCanvas = document.createElement('canvas');
    nextCanvas.width = sheetCanvas.width;
    nextCanvas.height = sheetCanvas.height;
    const ctx = nextCanvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(sheetCanvas, 0, 0);

    if (brushMode === 'erase') {
      ctx.clearRect(sheetPx, sheetPy, 2, 2);
    } else {
      ctx.fillStyle = brushColor;
      ctx.fillRect(sheetPx, sheetPy, 2, 2);
    }

    const imgData = ctx.getImageData(0, 0, nextCanvas.width, nextCanvas.height);
    const nextAtlas = extractSpriteSheetAtlas(
      imgData.data,
      nextCanvas.width,
      nextCanvas.height,
      4,
      8
    );
    onUpdateAtlas(nextAtlas, nextCanvas);
  };

  // Draw the full 4x8 sprite sheet in the 'inspector' tab
  useEffect(() => {
    if (!isOpen || activeTab !== 'inspector' || !sheetPreviewRef.current || !sheetCanvas) {
      return;
    }
    const canvas = sheetPreviewRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = sheetCanvas.width;
    canvas.height = sheetCanvas.height;
    ctx.imageSmoothingEnabled = false;

    if (chromaBg) {
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      const tile = 16;
      for (let y = 0; y < canvas.height; y += tile) {
        for (let x = 0; x < canvas.width; x += tile) {
          ctx.fillStyle = (x / tile + y / tile) % 2 === 0 ? '#0f172a' : '#1e293b';
          ctx.fillRect(x, y, tile, tile);
        }
      }
    }

    ctx.drawImage(sheetCanvas, 0, 0);

    if (showOverlay) {
      const { columns, rows, cellWidth, cellHeight } = atlas.spriteSheet;
      ctx.strokeStyle = chromaBg
        ? 'rgba(12, 8, 6, 0.22)'
        : 'rgba(148, 163, 184, 0.2)';
      ctx.lineWidth = 1;
      for (let c = 1; c < columns; c++) {
        ctx.beginPath();
        ctx.moveTo(c * cellWidth, 0);
        ctx.lineTo(c * cellWidth, canvas.height);
        ctx.stroke();
      }
      for (let r = 1; r < rows; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * cellHeight);
        ctx.lineTo(canvas.width, r * cellHeight);
        ctx.stroke();
      }

      for (const f of atlas.frames) {
        const isSelected = f.id === activeFrame?.id;
        ctx.strokeStyle = isSelected
          ? '#dc2626'
          : chromaBg
          ? '#0284c7'
          : 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = isSelected ? 2.5 : 1.25;
        ctx.strokeRect(f.x, f.y, f.width, f.height);

        const ax = f.x + f.anchorX * Math.max(1, f.width - 1);
        const ay = f.y + f.anchorY * Math.max(1, f.height - 1);

        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(ax, ay, isSelected ? 4.5 : 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [isOpen, atlas, sheetCanvas, activeFrame, activeTab, chromaBg, showOverlay]);

  // Live animated turntable in 'inspector' tab
  useEffect(() => {
    if (!isOpen || activeTab !== 'inspector' || !previewCanvasRef.current || !sheetCanvas) {
      return;
    }
    let animId = 0;
    let tick = 0;
    const isHeadless =
      navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);

    const renderPreview = () => {
      const canvas = previewCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      tick++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (chromaBg) {
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const originX = canvas.width * 0.5;
      const originY = canvas.height * 0.78;

      ctx.strokeStyle = chromaBg
        ? 'rgba(12, 8, 6, 0.55)'
        : 'rgba(245, 158, 11, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(originX, originY - 28);
      ctx.lineTo(originX + 56, originY);
      ctx.lineTo(originX, originY + 28);
      ctx.lineTo(originX - 56, originY);
      ctx.closePath();
      ctx.stroke();

      ctx.strokeStyle = chromaBg ? '#dc2626' : '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(originX - 24, originY);
      ctx.lineTo(originX + 24, originY);
      ctx.moveTo(originX, originY - 12);
      ctx.lineTo(originX, originY + 12);
      ctx.stroke();

      const cycleStates: IsoAnimState[] = ['idle', 'walk_1', 'idle', 'walk_2', 'shoot'];
      const animState = isHeadless
        ? activeFrame?.state ?? 'idle'
        : cycleStates[Math.floor(tick / 14) % cycleStates.length];
      const previewDir = activeFrame?.direction ?? 'S';
      const frameToDraw =
        atlas.frames.find(
          (f) => f.direction === previewDir && f.state === animState
        ) || activeFrame;

      if (frameToDraw) {
        const scale =
          1.4 *
          (characterConfig.photographerScale / 1.25);
        const dw =
          frameToDraw.width * scale * characterConfig.photographerWidthRatio;
        const dh =
          frameToDraw.height * scale * characterConfig.photographerHeightRatio;

        const drawX = useAnchorLock
          ? originX - frameToDraw.anchorX * dw
          : originX - dw * 0.5 + ((frameToDraw.x % 128) - 44) * scale;
        const drawY = useAnchorLock
          ? originY - frameToDraw.anchorY * dh
          : originY - dh + ((frameToDraw.y % 128) - 42) * scale;

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          sheetCanvas,
          frameToDraw.x,
          frameToDraw.y,
          frameToDraw.width,
          frameToDraw.height,
          drawX,
          drawY,
          dw,
          dh
        );

        if (showOverlay) {
          ctx.strokeStyle = chromaBg ? '#0284c7' : 'rgba(56, 189, 248, 0.7)';
          ctx.lineWidth = 1.25;
          ctx.strokeRect(drawX, drawY, dw, dh);
        }
      }

      if (!isHeadless) {
        animId = requestAnimationFrame(renderPreview);
      }
    };

    renderPreview();
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [
    isOpen,
    atlas,
    sheetCanvas,
    activeFrame,
    useAnchorLock,
    activeTab,
    chromaBg,
    showOverlay,
    characterConfig,
  ]);

  if (!isOpen) return null;

  const handleCopyJson = () => {
    navigator.clipboard?.writeText(cleanJsonOutput).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadChromaSheet = () => {
    downloadSpriteSheetPNG(
      sheetCanvas,
      true,
      characterConfig.exportScale,
      characterConfig.photographerWidthRatio,
      characterConfig.photographerHeightRatio
    );
  };

  const handleDownloadTransparentSheet = () => {
    downloadSpriteSheetPNG(
      sheetCanvas,
      false,
      characterConfig.exportScale,
      characterConfig.photographerWidthRatio,
      characterConfig.photographerHeightRatio
    );
  };

  const handleDownloadActiveFrame = () => {
    if (activeFrame) {
      downloadSingleFramePNG(
        sheetCanvas,
        activeFrame,
        chromaBg,
        characterConfig.exportScale * 2,
        characterConfig.photographerWidthRatio,
        characterConfig.photographerHeightRatio
      );
    }
  };

  const handleResetDefaults = () => {
    onUpdateCharacterConfig(DEFAULT_CHARACTER_AND_SIZE_CONFIG);
    loadUploadedPhotographerSpriteSheet().then((loaded) => {
      if (loaded && loaded.atlas.frames.length > 0) {
        onUpdateAtlas(loaded.atlas, loaded.canvas);
        setSelectedFrameId(loaded.atlas.frames[0].id);
      } else {
        applyPhotographerStyle(DEFAULT_CHARACTER_AND_SIZE_CONFIG.photographerStyle);
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const normalized = normalizeLoadedSpriteSheetImage(img, true);
        if (normalized && normalized.atlas.frames.length > 0) {
          onUpdateAtlas(normalized.atlas, normalized.canvas);
          setSelectedFrameId(normalized.atlas.frames[0].id);
          return;
        }
        const offscreen = document.createElement('canvas');
        offscreen.width = img.width;
        offscreen.height = img.height;
        const ctx = offscreen.getContext('2d');
        if (!ctx) return;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        const extracted = extractSpriteSheetAtlas(
          imgData.data,
          img.width,
          img.height,
          4,
          8
        );
        const keyedRgba = keyOutChromaGreenRGBA(imgData.data);
        ctx.putImageData(
          new ImageData(new Uint8ClampedArray(keyedRgba), img.width, img.height),
          0,
          0
        );
        if (extracted.frames.length > 0) {
          onUpdateAtlas(extracted, offscreen);
          setSelectedFrameId(extracted.frames[0].id);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const selectedGuest =
    characterConfig.guestOutfits[selectedGuestIdx] ||
    characterConfig.guestOutfits[0];

  const updateSelectedGuest = (
    patch: Partial<typeof selectedGuest>
  ) => {
    const nextGuests = characterConfig.guestOutfits.map((g, idx) =>
      idx === selectedGuestIdx ? { ...g, ...patch } : g
    );
    onUpdateCharacterConfig({
      ...characterConfig,
      guestOutfits: nextGuests,
    });
  };

  const scaledFrameW = activeFrame
    ? Math.round(
        activeFrame.width *
          characterConfig.photographerScale *
          characterConfig.photographerWidthRatio
      )
    : 38;
  const scaledFrameH = activeFrame
    ? Math.round(
        activeFrame.height *
          characterConfig.photographerScale *
          characterConfig.photographerHeightRatio
      )
    : 104;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="עורך דמויות, התאמת גודל ספרייט ואטלס"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 pointer-events-auto"
    >
      <div className="w-full max-w-6xl max-h-[92vh] flex flex-col rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div
          dir="rtl"
          className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-800 bg-slate-950/70"
        >
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-amber-400">
              עורך דמויות, התאמת גודל ספרייט ואטלס איזומטרי (#00FF00)
            </h2>
            <p className="text-xs text-slate-400">
              התאם את גודל הספרייט ({scaledFrameW}×{scaledFrameH}px במשחק) · ערוך את צבעי הצלם והאורחים · הורד PNG מותאם
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'editor'
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                עריכת דמויות וגודל ספרייט
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('inspector')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'inspector'
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                דף ספרייטים 4×8 (#00FF00)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('json')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'json'
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                סכמת JSON
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadChromaSheet}
              className="px-3 py-2 text-xs font-bold rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              הורד #00FF00 PNG ({characterConfig.exportScale}x)
            </button>

            <button
              type="button"
              onClick={handleDownloadTransparentSheet}
              className="px-3 py-2 text-xs font-bold rounded-lg bg-teal-500 text-slate-950 hover:bg-teal-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              הורד PNG שקוף
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Character & Sprite Editor"
              className="px-3 py-2 text-xs font-bold rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              חזור למשחק
            </button>
          </div>
        </div>

        {/* TAB 1: CHARACTER & SPRITE SIZE STUDIO */}
        {activeTab === 'editor' && (
          <div
            dir="rtl"
            className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-5 overflow-y-auto"
          >
            {/* Column 1 (4 cols): Sprite Size & Aspect Ratio Controls + Live Pixel Canvas */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-amber-400">
                    1. התאמת גודל הספרייט והדמויות
                  </h3>
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className="px-2 py-0.5 text-[11px] font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  >
                    איפוס לברירת מחדל
                  </button>
                </div>

                {/* Quick Size Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '0.8x קטן', val: 0.8 },
                    { label: '1.0x רגיל', val: 1.0 },
                    { label: '1.25x מותאם', val: 1.25 },
                    { label: '1.6x גדול', val: 1.6 },
                    { label: '2.0x ענק', val: 2.0 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() =>
                        onUpdateCharacterConfig({
                          ...characterConfig,
                          photographerScale: preset.val,
                        })
                      }
                      className={`px-2 py-1 text-xs font-bold rounded transition-colors cursor-pointer ${
                        Math.abs(characterConfig.photographerScale - preset.val) < 0.03
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Photographer Scale Slider */}
                <label className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-300 font-sans font-semibold">
                      גודל ספרייט הצלם במשחק:
                    </span>
                    <span className="text-amber-400 font-bold">
                      {characterConfig.photographerScale.toFixed(2)}x ({scaledFrameW}×
                      {scaledFrameH}px)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.6}
                    max={2.4}
                    step={0.05}
                    value={characterConfig.photographerScale}
                    onChange={(e) =>
                      onUpdateCharacterConfig({
                        ...characterConfig,
                        photographerScale: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </label>

                {/* Width & Height Aspect Ratios */}
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-xs">
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-300 font-sans">רוחב יחסי:</span>
                      <span className="text-sky-400">
                        {Math.round(characterConfig.photographerWidthRatio * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.75}
                      max={1.4}
                      step={0.05}
                      value={characterConfig.photographerWidthRatio}
                      onChange={(e) =>
                        onUpdateCharacterConfig({
                          ...characterConfig,
                          photographerWidthRatio: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-sky-400 cursor-pointer"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-xs">
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-300 font-sans">גובה יחסי:</span>
                      <span className="text-sky-400">
                        {Math.round(characterConfig.photographerHeightRatio * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.75}
                      max={1.4}
                      step={0.05}
                      value={characterConfig.photographerHeightRatio}
                      onChange={(e) =>
                        onUpdateCharacterConfig({
                          ...characterConfig,
                          photographerHeightRatio: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-sky-400 cursor-pointer"
                    />
                  </label>
                </div>

                {/* Wedding Guests Scale Slider */}
                <label className="flex flex-col gap-1 text-xs pt-1 border-t border-slate-800">
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-300 font-sans font-semibold">
                      גודל דמויות האורחים באולם:
                    </span>
                    <span className="text-emerald-400 font-bold">
                      {characterConfig.guestScale.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.6}
                    max={2.0}
                    step={0.05}
                    value={characterConfig.guestScale}
                    onChange={(e) =>
                      onUpdateCharacterConfig({
                        ...characterConfig,
                        guestScale: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </label>

                {/* PNG Export Resolution Multiplier */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs">
                  <span className="text-slate-300 font-semibold">
                    רזולוציית ייצוא PNG:
                  </span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4].map((sc) => (
                      <button
                        key={sc}
                        type="button"
                        onClick={() =>
                          onUpdateCharacterConfig({
                            ...characterConfig,
                            exportScale: sc,
                          })
                        }
                        className={`px-2 py-0.5 rounded font-mono font-bold cursor-pointer ${
                          characterConfig.exportScale === sc
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {sc}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Interactive Live Size & Pixel Brush Preview */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-3.5 flex flex-col items-center gap-2.5">
                <div className="w-full flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">
                    תצוגה חיה וציור פיקסלים ({activeFrame?.direction} · {activeFrame?.state})
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setChromaBg((v) => !v)}
                      className="px-2 py-0.5 text-[11px] rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-pointer"
                    >
                      {chromaBg ? '#00FF00' : 'שקוף'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setBrushMode((m) => (m === 'paint' ? 'erase' : 'paint'))
                      }
                      className={`px-2 py-0.5 text-[11px] rounded cursor-pointer ${
                        brushMode === 'paint'
                          ? 'bg-amber-400 text-slate-950 font-bold'
                          : 'bg-rose-500 text-white font-bold'
                      }`}
                    >
                      {brushMode === 'paint' ? 'מכחול' : 'מחק'}
                    </button>
                    <input
                      type="color"
                      aria-label="צבע מכחול פיקסלים"
                      value={brushColor}
                      onChange={(e) => {
                        setBrushColor(e.target.value);
                        setBrushMode('paint');
                      }}
                      className="w-6 h-5 rounded cursor-pointer bg-transparent border-0"
                    />
                  </div>
                </div>

                {/* Direction & State Quick Switcher for Preview */}
                <div className="w-full flex flex-wrap items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    {ISO_DIRECTIONS.map((dir) => (
                      <button
                        key={dir}
                        type="button"
                        onClick={() => {
                          const target = atlas.frames.find(
                            (f) =>
                              f.direction === dir &&
                              f.state === (activeFrame?.state || 'idle')
                          );
                          if (target) setSelectedFrameId(target.id);
                        }}
                        className={`px-1.5 py-0.5 text-[10px] font-mono rounded cursor-pointer ${
                          activeFrame?.direction === dir
                            ? 'bg-amber-400 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {dir}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    {ISO_ANIM_STATES.map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          const target = atlas.frames.find(
                            (f) =>
                              f.direction === (activeFrame?.direction || 'S') &&
                              f.state === st
                          );
                          if (target) setSelectedFrameId(target.id);
                        }}
                        className={`px-1.5 py-0.5 text-[10px] font-mono rounded cursor-pointer ${
                          activeFrame?.state === st
                            ? 'bg-sky-400 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <canvas
                  ref={pixelEditorCanvasRef}
                  width={230}
                  height={200}
                  onMouseDown={(e) => {
                    setIsPainting(true);
                    handlePixelCanvasPaint(e);
                  }}
                  onMouseMove={(e) => {
                    if (isPainting) handlePixelCanvasPaint(e);
                  }}
                  onMouseUp={() => setIsPainting(false)}
                  onMouseLeave={() => setIsPainting(false)}
                  style={{ imageRendering: 'pixelated' }}
                  className="rounded-lg border border-slate-800 cursor-crosshair"
                />

                <button
                  type="button"
                  onClick={handleDownloadActiveFrame}
                  className="w-full py-2 px-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-colors cursor-pointer"
                >
                  הורד פריים נוכחי בגודל מותאם ({activeFrame?.id}.png)
                </button>
              </div>
            </div>

            {/* Column 2 (4 cols): Photographer Character Appearance & Palette Editor */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-4 flex flex-col gap-3.5 h-full">
                <h3 className="text-sm font-black text-amber-400">
                  2. עריכת דמות הצלם (כל 32 הפריימים)
                </h3>

                {/* Facial Hair Selector */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-300">
                    סגנון פנים ושפם:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'mustache', label: 'שפם מסודר' },
                        { id: 'beard', label: 'זקן מלא' },
                        { id: 'clean', label: 'מגולח' },
                      ] as { id: FacialHairStyle; label: string }[]
                    ).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          applyPhotographerStyle({ facialHair: item.id })
                        }
                        className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                          characterConfig.photographerStyle.facialHair === item.id
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hair Color */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-300">
                    צבע שיער ושפם:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {HAIR_PRESETS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        aria-label={`Hair color ${col}`}
                        onClick={() => applyPhotographerStyle({ hairColor: col })}
                        style={{ backgroundColor: col }}
                        className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                          characterConfig.photographerStyle.hairColor === col
                            ? 'border-amber-400 scale-110'
                            : 'border-slate-700'
                        }`}
                      />
                    ))}
                    <input
                      type="color"
                      aria-label="בחר צבע שיער"
                      value={characterConfig.photographerStyle.hairColor}
                      onChange={(e) =>
                        applyPhotographerStyle({ hairColor: e.target.value })
                      }
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                  </div>
                </div>

                {/* Waistcoat / Vest Color */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-300">
                    צבע וסט מחויט:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {VEST_PRESETS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        aria-label={`Vest color ${col}`}
                        onClick={() => applyPhotographerStyle({ vestColor: col })}
                        style={{ backgroundColor: col }}
                        className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                          characterConfig.photographerStyle.vestColor === col
                            ? 'border-amber-400 scale-110'
                            : 'border-slate-700'
                        }`}
                      />
                    ))}
                    <input
                      type="color"
                      aria-label="בחר צבע וסט"
                      value={characterConfig.photographerStyle.vestColor}
                      onChange={(e) =>
                        applyPhotographerStyle({ vestColor: e.target.value })
                      }
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                  </div>
                </div>

                {/* Shirt Color */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-300">
                    צבע חולצה מכופתרת:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {SHIRT_PRESETS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        aria-label={`Shirt color ${col}`}
                        onClick={() => applyPhotographerStyle({ shirtColor: col })}
                        style={{ backgroundColor: col }}
                        className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                          characterConfig.photographerStyle.shirtColor === col
                            ? 'border-amber-400 scale-110'
                            : 'border-slate-700'
                        }`}
                      />
                    ))}
                    <input
                      type="color"
                      aria-label="בחר צבע חולצה"
                      value={characterConfig.photographerStyle.shirtColor}
                      onChange={(e) =>
                        applyPhotographerStyle({ shirtColor: e.target.value })
                      }
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                  </div>
                </div>

                {/* Tie Color */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-300">
                    צבע עניבה:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {TIE_PRESETS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        aria-label={`Tie color ${col}`}
                        onClick={() => applyPhotographerStyle({ tieColor: col })}
                        style={{ backgroundColor: col }}
                        className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                          characterConfig.photographerStyle.tieColor === col
                            ? 'border-amber-400 scale-110'
                            : 'border-slate-700'
                        }`}
                      />
                    ))}
                    <input
                      type="color"
                      aria-label="בחר צבע עניבה"
                      value={characterConfig.photographerStyle.tieColor}
                      onChange={(e) =>
                        applyPhotographerStyle({ tieColor: e.target.value })
                      }
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                  </div>
                </div>

                {/* Trousers Color */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-300">
                    צבע מכנסיים:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {PANTS_PRESETS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        aria-label={`Pants color ${col}`}
                        onClick={() => applyPhotographerStyle({ pantsColor: col })}
                        style={{ backgroundColor: col }}
                        className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                          characterConfig.photographerStyle.pantsColor === col
                            ? 'border-amber-400 scale-110'
                            : 'border-slate-700'
                        }`}
                      />
                    ))}
                    <input
                      type="color"
                      aria-label="בחר צבע מכנסיים"
                      value={characterConfig.photographerStyle.pantsColor}
                      onChange={(e) =>
                        applyPhotographerStyle({ pantsColor: e.target.value })
                      }
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                  </div>
                </div>

                {/* Camera Flash Burst Color */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-300">
                    צבע הבזק פלאש (Shoot):
                  </span>
                  <div className="flex items-center gap-1.5">
                    {FLASH_PRESETS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        aria-label={`Flash color ${col}`}
                        onClick={() => applyPhotographerStyle({ flashColor: col })}
                        style={{ backgroundColor: col }}
                        className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                          characterConfig.photographerStyle.flashColor === col
                            ? 'border-amber-400 scale-110'
                            : 'border-slate-700'
                        }`}
                      />
                    ))}
                    <input
                      type="color"
                      aria-label="בחר צבע פלאש"
                      value={characterConfig.photographerStyle.flashColor}
                      onChange={(e) =>
                        applyPhotographerStyle({ flashColor: e.target.value })
                      }
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                  </div>
                </div>

                <div className="mt-auto pt-3 border-t border-slate-800 flex flex-col gap-2">
                  <label className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs text-center cursor-pointer transition-colors">
                    העלה דף ספרייטים חיצוני (PNG / #00FF00)
                    <input
                      type="file"
                      accept="image/png,image/webp,image/jpeg"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Column 3 (4 cols): Wedding Guests & Hall Characters Editor */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-4 flex flex-col gap-3.5 h-full">
                <h3 className="text-sm font-black text-amber-400">
                  3. עריכת דמויות האורחים והחופה באולם
                </h3>

                {/* Select Guest Slot */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-300">
                    בחר דמות אורח לעריכה:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-0.5">
                    {characterConfig.guestOutfits.map((g, idx) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setSelectedGuestIdx(idx)}
                        className={`px-2.5 py-1.5 rounded-lg text-right text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                          selectedGuestIdx === idx
                            ? 'bg-amber-400/20 border border-amber-400 text-amber-300'
                            : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/40"
                          style={{ backgroundColor: g.outfit }}
                        />
                        <span className="truncate">{g.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedGuest && (
                  <div className="flex flex-col gap-3 pt-2 border-t border-slate-800">
                    {/* Outfit Color */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">
                        צבע חליפה / שמלה:
                      </span>
                      <div className="flex items-center gap-1.5">
                        {[
                          '#7e4a88',
                          '#334155',
                          '#d47a7a',
                          '#3b7a8c',
                          '#f8fafc',
                          '#1e293b',
                        ].map((col) => (
                          <button
                            key={col}
                            type="button"
                            onClick={() => updateSelectedGuest({ outfit: col })}
                            style={{ backgroundColor: col }}
                            className={`w-5 h-5 rounded-full border-2 cursor-pointer ${
                              selectedGuest.outfit === col
                                ? 'border-amber-400 scale-110'
                                : 'border-slate-700'
                            }`}
                          />
                        ))}
                        <input
                          type="color"
                          aria-label="צבע לבוש אורח"
                          value={selectedGuest.outfit}
                          onChange={(e) =>
                            updateSelectedGuest({ outfit: e.target.value })
                          }
                          className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                        />
                      </div>
                    </div>

                    {/* Guest Hair Color */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">
                        צבע שיער האורח:
                      </span>
                      <div className="flex items-center gap-1.5">
                        {HAIR_PRESETS.map((col) => (
                          <button
                            key={col}
                            type="button"
                            onClick={() => updateSelectedGuest({ hair: col })}
                            style={{ backgroundColor: col }}
                            className={`w-5 h-5 rounded-full border-2 cursor-pointer ${
                              selectedGuest.hair === col
                                ? 'border-amber-400 scale-110'
                                : 'border-slate-700'
                            }`}
                          />
                        ))}
                        <input
                          type="color"
                          aria-label="צבע שיער אורח"
                          value={selectedGuest.hair}
                          onChange={(e) =>
                            updateSelectedGuest({ hair: e.target.value })
                          }
                          className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                        />
                      </div>
                    </div>

                    {/* Suit vs Dress Toggle */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">
                        סגנון לבוש:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateSelectedGuest({ isDress: false })}
                          className={`px-3 py-1 rounded text-xs font-bold cursor-pointer ${
                            !selectedGuest.isDress
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          חליפה מחויטת
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSelectedGuest({ isDress: true })}
                          className={`px-3 py-1 rounded text-xs font-bold cursor-pointer ${
                            selectedGuest.isDress
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          שמלת ערב / כלה
                        </button>
                      </div>
                    </div>

                    {/* Hat / Veil Selector */}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-slate-300">
                        כובע / אביזר ראש:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {(
                          [
                            { id: 'none', label: 'ללא' },
                            { id: 'green_top', label: 'צילינדר ירוק' },
                            { id: 'black_top', label: 'צילינדר שחור' },
                            { id: 'cone', label: 'כובע מסיבה' },
                            { id: 'veil', label: 'הינומת כלה' },
                          ] as { id: GuestHatType; label: string }[]
                        ).map((h) => (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() => updateSelectedGuest({ hat: h.id })}
                            className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer ${
                              selectedGuest.hat === h.id
                                ? 'bg-emerald-400 text-slate-950'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {h.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Speech Bubble Sign Text */}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-slate-300">
                        שלט מעל הראש:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {[
                          { val: null, label: 'ללא שלט' },
                          { val: 'FUNNS', label: 'FUNNS' },
                          { val: 'SHOW', label: 'SHOW' },
                          { val: 'מזל טוב!', label: 'מזל טוב!' },
                          { val: 'מגנט!', label: 'מגנט!' },
                        ].map((s) => (
                          <button
                            key={s.label}
                            type="button"
                            onClick={() => updateSelectedGuest({ sign: s.val })}
                            className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer ${
                              selectedGuest.sign === s.val
                                ? 'bg-sky-400 text-slate-950'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-auto pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-colors cursor-pointer"
                  >
                    שמור והחל שינויים באולם החתונה
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: 4x8 CHROMA SPRITE SHEET INSPECTOR */}
        {activeTab === 'inspector' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-y-auto">
            <div className="lg:col-span-5 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setChromaBg((v) => !v)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      chromaBg
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {chromaBg ? 'BG: #00FF00 Chroma' : 'BG: Checkerboard'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOverlay((v) => !v)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      showOverlay
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {showOverlay ? 'BBox & Anchor: ON' : 'Raw Pixel Sheet'}
                  </button>
                </div>

                <label className="cursor-pointer px-2.5 py-1 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 text-amber-300 transition-colors whitespace-nowrap shrink-0">
                  Upload Sheet
                  <input
                    type="file"
                    accept="image/png,image/webp,image/jpeg"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-2 overflow-auto max-h-[460px] flex justify-center">
                <canvas
                  ref={sheetPreviewRef}
                  style={{ imageRendering: 'pixelated' }}
                  className="max-w-full h-auto rounded"
                />
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedDir('ALL')}
                    className={`px-2 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                      selectedDir === 'ALL'
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    All
                  </button>
                  {ISO_DIRECTIONS.map((dir) => (
                    <button
                      key={dir}
                      type="button"
                      onClick={() => setSelectedDir(dir)}
                      className={`px-2 py-1 text-xs font-mono rounded transition-colors cursor-pointer ${
                        selectedDir === dir
                          ? 'bg-amber-500 text-slate-950 font-semibold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {dir}
                    </button>
                  ))}
                </div>

                <select
                  aria-label="Filter by animation state"
                  value={selectedState}
                  onChange={(e) =>
                    setSelectedState(e.target.value as IsoAnimState | 'ALL')
                  }
                  className="px-2 py-1 text-xs rounded bg-slate-800 text-slate-200 border border-slate-700"
                >
                  <option value="ALL">All States</option>
                  {ISO_ANIM_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/60 max-h-[420px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/90">
                      <th className="py-2 px-2">Dir</th>
                      <th className="py-2 px-2">State</th>
                      <th className="py-2 px-2">BBox (x,y,w×h)</th>
                      <th className="py-2 px-2">Anchor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFrames.map((f) => {
                      const active = f.id === activeFrame?.id;
                      return (
                        <tr
                          key={f.id}
                          onClick={() => setSelectedFrameId(f.id)}
                          className={`cursor-pointer border-b border-slate-800/60 transition-colors ${
                            active
                              ? 'bg-amber-500/15 text-amber-300'
                              : 'hover:bg-slate-800/50 text-slate-300'
                          }`}
                        >
                          <td className="py-1.5 px-2 font-bold">{f.direction}</td>
                          <td className="py-1.5 px-2">{f.state}</td>
                          <td className="py-1.5 px-2">
                            {f.x},{f.y} ({f.width}×{f.height})
                          </td>
                          <td className="py-1.5 px-2 text-sky-300">
                            ({f.anchorX.toFixed(2)}, {f.anchorY.toFixed(2)})
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:col-span-3 flex flex-col gap-4">
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 flex flex-col items-center gap-3">
                <div className="w-full flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">
                    Ground-Foot Anchor Preview
                  </span>
                  <button
                    type="button"
                    onClick={() => setUseAnchorLock((v) => !v)}
                    className={`px-2 py-0.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                      useAnchorLock
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {useAnchorLock ? 'Anchor Lock: ON' : 'Anchor Lock: OFF'}
                  </button>
                </div>

                <canvas
                  ref={previewCanvasRef}
                  width={200}
                  height={190}
                  style={{ imageRendering: 'pixelated' }}
                  className="rounded border border-slate-800/80 bg-slate-900"
                />

                {activeFrame && (
                  <div className="w-full text-xs font-mono tabular-nums space-y-1.5 pt-2 border-t border-slate-800 text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Frame ID:</span>
                      <span className="text-amber-400 font-bold">
                        {activeFrame.id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tight BBox:</span>
                      <span>
                        x:{activeFrame.x} y:{activeFrame.y} ({activeFrame.width}×
                        {activeFrame.height})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Foot Contact:</span>
                      <span className="text-sky-400">
                        anchorX: {activeFrame.anchorX.toFixed(4)} · anchorY:{' '}
                        {activeFrame.anchorY.toFixed(4)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadActiveFrame}
                      className="w-full mt-2 py-2 px-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Download Single Frame ({activeFrame.id}.png)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: EXTRACTED JSON SCHEMA */}
        {activeTab === 'json' && (
          <div className="p-6 flex flex-col gap-3 overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Complete JSON Schema ({atlas.frames.length} active non-empty
                isometric frames with tight bounding boxes &amp; normalized
                ground-plane anchors)
              </span>
              <button
                type="button"
                onClick={handleCopyJson}
                className="px-3 py-1.5 text-xs font-bold rounded bg-sky-500 text-slate-950 hover:bg-sky-400 cursor-pointer"
              >
                {copied ? 'Copied JSON!' : 'Copy Valid JSON'}
              </button>
            </div>
            <pre
              data-testid="extracted-atlas-json"
              className="w-full h-[460px] overflow-auto rounded-lg bg-slate-950 border border-slate-800 p-4 text-xs font-mono text-sky-300 leading-relaxed select-all"
            >
              {cleanJsonOutput}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
