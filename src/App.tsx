import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GameState,
  MagnetFrameId,
  UpgradeId,
  cycleMagnetFrame,
} from './game/rules';
import {
  CharacterAndSizeConfig,
  DEFAULT_CHARACTER_AND_SIZE_CONFIG,
  SpriteAtlasSchema,
  downloadSpriteSheetPNG,
  extractSpriteSheetAtlas,
  generateDefaultIsoSpriteSheetRGBA,
  keyOutChromaGreenRGBA,
  loadUploadedPhotographerSpriteSheet,
} from './game/spriteExtractor';
import { sound } from './game/sound';
import { GameHud, HudSnapshot } from './components/GameHud';
import { IsoArenaCanvas } from './components/IsoArenaCanvas';
import { MobileControls, VirtualInputState } from './components/MobileControls';
import { SpriteAtlasModal } from './components/SpriteAtlasModal';
import { TitleAndModals } from './components/TitleAndModals';
import { MagnetBoardModal } from './components/MagnetBoardModal';
import { MagnetWorkstationModal } from './components/MagnetWorkstationModal';

export default function App() {
  // Support ?autostart=1 to boot directly into 'playing'
  const [gameState, setGameState] = useState<GameState>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return 'playing';
      }
    }
    return 'title';
  });

  const [characterConfig, setCharacterConfig] =
    useState<CharacterAndSizeConfig>(DEFAULT_CHARACTER_AND_SIZE_CONFIG);

  // Initialize sprite sheet RGBA buffer, HTMLCanvasElement, and pixel-by-pixel extracted atlas
  const [sheetState, setSheetState] = useState<{
    atlas: SpriteAtlasSchema;
    canvas: HTMLCanvasElement | null;
  }>(() => {
    const width = 512;
    const height = 1024;
    const rawRgba = generateDefaultIsoSpriteSheetRGBA(width, height, {
      style: DEFAULT_CHARACTER_AND_SIZE_CONFIG.photographerStyle,
    });
    const rgba = keyOutChromaGreenRGBA(rawRgba);
    const atlas = extractSpriteSheetAtlas(rgba, width, height, 4, 8);
    let canvas: HTMLCanvasElement | null = null;
    if (typeof document !== 'undefined') {
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const imgData = new ImageData(new Uint8ClampedArray(rgba), width, height);
        ctx.putImageData(imgData, 0, 0);
      }
    }
    return { atlas, canvas };
  });

  // Automatically load the attached pixel-art photographer sprite sheet on startup
  useEffect(() => {
    let active = true;
    loadUploadedPhotographerSpriteSheet().then((loaded) => {
      if (active && loaded && loaded.atlas.frames.length > 0) {
        setSheetState(loaded);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const [isAtlasOpen, setIsAtlasOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [weaponMode, setWeaponMode] = useState<'pulse' | 'scatter'>('pulse');
  const [selectedFrame, setSelectedFrame] = useState<MagnetFrameId>('gold');
  const [runId, setRunId] = useState(1);

  const [endSummary, setEndSummary] = useState({
    victory: false,
    score: 0,
    bestScore: 0,
    wave: 1,
    kills: 0,
  });

  const [hud, setHud] = useState<HudSnapshot>({
    hp: 100,
    maxHp: 100,
    ghostHp: 100,
    dashCharge: 1,
    score: 0,
    bestScore: 0,
    combo: 0,
    wave: 1,
    weaponMode: 'pulse',
    selectedFrame: 'gold',
    upgradeLevels: {
      turbo_station: 0,
      pro_sdcard: 0,
      sneakers: 0,
    },
  });

  // Synchronize gameState to document.body.dataset.state immediately
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  const handleStartGame = useCallback(() => {
    document.body.dataset.state = 'playing';
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setIsAtlasOpen(false);
    setRunId((id) => id + 1);
    setGameState('playing');
  }, []);

  const handleResumeGame = useCallback(() => {
    document.body.dataset.state = 'playing';
    setIsAtlasOpen(false);
    setGameState('playing');
  }, []);

  const handleReturnTitle = useCallback(() => {
    document.body.dataset.state = 'title';
    setIsAtlasOpen(false);
    setGameState('title');
  }, []);

  const handleToggleMute = useCallback(() => {
    sound.muted = !sound.muted;
    setMuted(sound.muted);
  }, []);

  const handleDownloadSprite = useCallback(() => {
    downloadSpriteSheetPNG(
      sheetState.canvas,
      true,
      characterConfig.exportScale,
      characterConfig.photographerWidthRatio,
      characterConfig.photographerHeightRatio
    );
  }, [
    sheetState.canvas,
    characterConfig.exportScale,
    characterConfig.photographerWidthRatio,
    characterConfig.photographerHeightRatio,
  ]);

  const handleAdjustScale = useCallback((delta: number) => {
    setCharacterConfig((prev) => ({
      ...prev,
      photographerScale: Number(
        Math.max(0.6, Math.min(2.4, prev.photographerScale + delta)).toFixed(2)
      ),
    }));
  }, []);

  const [stationTrigger, setStationTrigger] = useState(0);
  const handleStationAction = useCallback(() => {
    setStationTrigger((v) => v + 1);
  }, []);

  const [developTrigger, setDevelopTrigger] = useState(0);
  const handleDevelopAction = useCallback(() => {
    setDevelopTrigger((v) => v + 1);
  }, []);

  const [cutTrigger, setCutTrigger] = useState(0);
  const handleCutAction = useCallback(() => {
    setCutTrigger((v) => v + 1);
  }, []);

  const [callGuestsTrigger, setCallGuestsTrigger] = useState(0);
  const handleCallGuests = useCallback(() => {
    setCallGuestsTrigger((v) => v + 1);
  }, []);

  const [takeMagnetTrigger, setTakeMagnetTrigger] = useState(0);
  const handleTakeMagnet = useCallback(() => {
    setTakeMagnetTrigger((v) => v + 1);
  }, []);

  const [upgradeRequest, setUpgradeRequest] = useState<{
    id: UpgradeId;
    seq: number;
  } | null>(null);

  const handleUpgrade = useCallback((id: UpgradeId) => {
    setUpgradeRequest((prev) => ({ id, seq: (prev?.seq ?? 0) + 1 }));
  }, []);

  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const [isWorkstationModalOpen, setIsWorkstationModalOpen] = useState(false);

  const virtualInputRef = useRef<VirtualInputState>({
    moveX: 0,
    moveY: 0,
    isShooting: false,
    isDashing: false,
    triggerStation: false,
  });

  const [mobileControlsOverride, setMobileControlsOverride] = useState<boolean | null>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('mobile') === '1' || p.get('touch') === '1') return true;
      if (p.get('mobile') === '0') return false;
    }
    return null;
  });

  const [isMobileScreen, setIsMobileScreen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.innerWidth < 1024
    );
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileScreen(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.innerWidth < 1024
      );
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const showMobileControls =
    mobileControlsOverride !== null ? mobileControlsOverride : isMobileScreen;

  const handleGameOver = useCallback(
    (victory: boolean, finalScore: number, wave: number, kills: number) => {
      document.body.dataset.state = 'gameover';
      setEndSummary((prev) => ({
        victory,
        score: finalScore,
        bestScore: Math.max(prev.bestScore, finalScore),
        wave,
        kills,
      }));
      setGameState('gameover');
    },
    []
  );

  // Global keyboard shortcuts for Title Start, Pause, Restart, Weapon Switch, Magnet Frame, Magnet Board, Workstation, and Character/Sprite Editor
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isAtlasOpen) {
        if (e.code === 'Escape') {
          setIsAtlasOpen(false);
        }
        return;
      }

      if (isBoardModalOpen) {
        if (e.code === 'Escape') {
          setIsBoardModalOpen(false);
        }
        return;
      }

      if (isWorkstationModalOpen) {
        if (e.code === 'Escape') {
          setIsWorkstationModalOpen(false);
        } else if (e.code === 'KeyG') {
          e.preventDefault();
          setSelectedFrame((prev) => cycleMagnetFrame(prev));
        }
        return;
      }

      if (gameState === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleStartGame();
        } else if (e.code === 'KeyI' || e.code === 'KeyE') {
          e.preventDefault();
          setIsAtlasOpen(true);
        }
        return;
      }

      if (gameState === 'gameover') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleStartGame();
        } else if (e.code === 'KeyI') {
          e.preventDefault();
          setIsAtlasOpen(true);
        }
        return;
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        setGameState((prev) => (prev === 'playing' ? 'paused' : 'playing'));
      } else if (e.code === 'KeyE') {
        e.preventDefault();
        handleStationAction();
      } else if (e.code === 'KeyC') {
        e.preventDefault();
        handleCallGuests();
      } else if (e.code === 'KeyG') {
        e.preventDefault();
        setSelectedFrame((prev) => cycleMagnetFrame(prev));
      } else if (e.code === 'KeyB') {
        e.preventDefault();
        setIsBoardModalOpen((v) => !v);
      } else if (e.code === 'KeyV') {
        e.preventDefault();
        setIsWorkstationModalOpen((v) => !v);
      } else if (e.code === 'KeyI') {
        e.preventDefault();
        setIsAtlasOpen((v) => !v);
      } else if (e.code === 'KeyM') {
        handleToggleMute();
      } else if (e.code === 'KeyR') {
        handleStartGame();
      } else if (e.code === 'Digit1') {
        setWeaponMode('pulse');
      } else if (e.code === 'Digit2') {
        setWeaponMode('scatter');
      } else if (e.code === 'Equal' || e.code === 'NumpadAdd') {
        handleAdjustScale(0.1);
      } else if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
        handleAdjustScale(-0.1);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    gameState,
    isAtlasOpen,
    isBoardModalOpen,
    isWorkstationModalOpen,
    handleStartGame,
    handleToggleMute,
    handleAdjustScale,
    handleStationAction,
    handleCallGuests,
    handleTakeMagnet,
  ]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
      {/* Isolated 60fps Isometric Canvas */}
      <IsoArenaCanvas
        gameState={isAtlasOpen || isBoardModalOpen || isWorkstationModalOpen ? 'paused' : gameState}
        atlas={sheetState.atlas}
        sheetCanvas={sheetState.canvas}
        characterConfig={characterConfig}
        weaponMode={weaponMode}
        selectedFrame={selectedFrame}
        runId={runId}
        stationTrigger={stationTrigger}
        developTrigger={developTrigger}
        cutTrigger={cutTrigger}
        callGuestsTrigger={callGuestsTrigger}
        takeMagnetTrigger={takeMagnetTrigger}
        upgradeRequest={upgradeRequest}
        virtualInputRef={virtualInputRef}
        onOpenBoardModal={() => setIsBoardModalOpen(true)}
        onOpenWorkstationModal={() => setIsWorkstationModalOpen(true)}
        onHudUpdate={setHud}
        onGameOver={handleGameOver}
      />

      {/* World-Matched Perimeter HUD when playing */}
      {gameState === 'playing' && (
        <GameHud
          hud={{ ...hud, weaponMode, selectedFrame }}
          muted={muted}
          photographerScale={characterConfig.photographerScale}
          showMobileControls={showMobileControls}
          onToggleMobileControls={() =>
            setMobileControlsOverride((prev) =>
              prev !== null ? !prev : !isMobileScreen
            )
          }
          onAdjustScale={handleAdjustScale}
          onToggleMute={handleToggleMute}
          onPause={() => setGameState('paused')}
          onRestart={handleStartGame}
          onOpenAtlas={() => setIsAtlasOpen(true)}
          onDownloadSprite={handleDownloadSprite}
          onSelectWeapon={setWeaponMode}
          onSelectFrame={setSelectedFrame}
          onPurchaseUpgrade={handleUpgrade}
          onStationAction={handleStationAction}
          onCallGuests={handleCallGuests}
          onTakeMagnet={handleTakeMagnet}
          onOpenBoardModal={() => setIsBoardModalOpen(true)}
          onOpenWorkstationModal={() => setIsWorkstationModalOpen(true)}
        />
      )}

      {/* Smartphone Virtual Joystick & Touch Action Overlay */}
      {gameState === 'playing' && (
        <MobileControls
          virtualInputRef={virtualInputRef}
          isNearStation={Boolean(hud.isAtMagnetStation)}
          isNearBoard={Boolean(hud.isNearBoard)}
          photosInCamera={hud.photosInCamera ?? 0}
          photosOnComputer={hud.photosOnComputer ?? 0}
          transferRemainingSec={hud.transferRemainingSec ?? 0}
          uncutSheetsAtStation={hud.uncutSheetsAtStation ?? 0}
          cutMagnetsInHand={hud.cutMagnetsInHand ?? 0}
          availableMagnets={hud.availableMagnetsOnBoard ?? 0}
          weaponMode={weaponMode}
          onSelectWeapon={setWeaponMode}
          onStationAction={handleStationAction}
          onCallGuests={handleCallGuests}
          visible={showMobileControls}
        />
      )}

      {/* Magnet Board Easel Stand Close-Up Modal (מתמונת לוח המגנטים) */}
      <MagnetBoardModal
        isOpen={isBoardModalOpen}
        onClose={() => setIsBoardModalOpen(false)}
        availableMagnets={hud.availableMagnetsOnBoard ?? 0}
        totalPrinted={hud.totalMagnetsPrinted ?? hud.magnetsPrinted ?? 0}
        magnetsTakenByGuests={hud.magnetsTakenByGuests ?? 0}
        onCallGuests={handleCallGuests}
        onTakeMagnet={handleTakeMagnet}
      />

      {/* Far-Corner Magnet Workstation Close-Up Modal (שולחן + מדפסת טרמית + מחשב נייד + ניירות דבק + חותך גליוטינה) */}
      <MagnetWorkstationModal
        isOpen={isWorkstationModalOpen}
        onClose={() => setIsWorkstationModalOpen(false)}
        photosInCamera={hud.photosOnComputer ?? 0}
        maxPhotosInCamera={hud.maxPhotosInCamera ?? 12}
        photosOnCameraCard={hud.photosInCamera ?? 0}
        isTransferringCard={(hud.photosTransferring ?? 0) > 0}
        transferRemainingSec={hud.transferRemainingSec ?? 0}
        onTransferPhotos={handleDevelopAction}
        uncutSheetsAtStation={hud.uncutSheetsAtStation ?? 0}
        cutMagnetsInHand={hud.cutMagnetsInHand ?? 0}
        availableMagnetsOnBoard={hud.availableMagnetsOnBoard ?? 0}
        score={hud.score}
        selectedFrame={selectedFrame}
        onSelectFrame={setSelectedFrame}
        upgradeLevels={hud.upgradeLevels}
        onPurchaseUpgrade={handleUpgrade}
        onDevelopPhotos={handleDevelopAction}
        onCutMagnets={handleCutAction}
        onDevelopSheets={handleDevelopAction}
        onCutSheets={handleCutAction}
        onOpenBoardModal={() => {
          setIsWorkstationModalOpen(false);
          setIsBoardModalOpen(true);
        }}
      />

      {/* Title Screen & Pause / Victory / Game Over Modals */}
      <TitleAndModals
        gameState={gameState}
        victory={endSummary.victory}
        score={gameState === 'gameover' ? endSummary.score : hud.score}
        bestScore={Math.max(endSummary.bestScore, hud.bestScore)}
        waveReached={gameState === 'gameover' ? endSummary.wave : hud.wave}
        enemiesDefeated={endSummary.kills}
        totalFramesExtracted={sheetState.atlas.frames.length}
        onStartGame={handleStartGame}
        onResumeGame={handleResumeGame}
        onReturnTitle={handleReturnTitle}
        onOpenAtlas={() => setIsAtlasOpen(true)}
        onDownloadSprite={handleDownloadSprite}
      />

      {/* Interactive Character Editor, Sprite Size Studio & Foot Anchor JSON Extractor */}
      <SpriteAtlasModal
        isOpen={isAtlasOpen}
        initialTab="editor"
        onClose={() => setIsAtlasOpen(false)}
        atlas={sheetState.atlas}
        sheetCanvas={sheetState.canvas}
        characterConfig={characterConfig}
        onUpdateCharacterConfig={setCharacterConfig}
        onUpdateAtlas={(newAtlas, newCanvas) =>
          setSheetState({ atlas: newAtlas, canvas: newCanvas })
        }
      />
    </main>
  );
}
