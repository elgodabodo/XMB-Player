import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ControllerType } from '../types';
import { soundFx } from '../services/soundFx';
import { Play, Pause, RotateCcw, X, Trophy, Sparkles, Award } from 'lucide-react';
import { ControllerButtonBadge } from './PS3Icons';

interface TetrisGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  controllerType?: ControllerType;
  controllerConnected?: boolean;
}

// 10 columns x 20 rows standard board
const COLS = 10;
const ROWS = 20;

// Tetromino Definitions & Colors
type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

const TETROMINOES: Record<TetrominoType, { shape: number[][]; color: string; glow: string }> = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: '#06b6d4', // Cyan
    glow: 'rgba(6,182,212,0.8)',
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: '#3b82f6', // Blue
    glow: 'rgba(59,130,246,0.8)',
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: '#f97316', // Orange
    glow: 'rgba(249,115,22,0.8)',
  },
  O: {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: '#eab308', // Yellow
    glow: 'rgba(234,179,8,0.8)',
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    color: '#22c55e', // Green
    glow: 'rgba(34,197,94,0.8)',
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: '#a855f7', // Purple
    glow: 'rgba(168,85,247,0.8)',
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    color: '#ef4444', // Red
    glow: 'rgba(239,68,68,0.8)',
  },
};

const TYPES: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

// Authentic Classic NES / Arcade Tetris Frame-Accurate Speed Table (in milliseconds)
const getClassicTetrisSpeed = (lvl: number): number => {
  const SPEED_TABLE: Record<number, number> = {
    1: 800,  // 48 frames
    2: 716,  // 43 frames
    3: 633,  // 38 frames
    4: 550,  // 33 frames
    5: 466,  // 28 frames
    6: 383,  // 23 frames
    7: 300,  // 18 frames
    8: 216,  // 13 frames
    9: 133,  // 8 frames (famous high-speed jump)
    10: 100, // 6 frames
    11: 83,  // 5 frames
    12: 83,  // 5 frames
    13: 67,  // 4 frames
    14: 67,  // 4 frames
    15: 67,  // 4 frames
    16: 50,  // 3 frames
    17: 50,  // 3 frames
    18: 50,  // 3 frames
  };

  if (lvl in SPEED_TABLE) {
    return SPEED_TABLE[lvl];
  }
  if (lvl >= 29) {
    return 17; // Level 29+ Killscreen (1 frame per drop)
  }
  if (lvl >= 19) {
    return 33; // Level 19-28 (2 frames per drop)
  }
  return 50;
};

// 7-Bag Random Generator
function generateBag(): TetrominoType[] {
  const bag = [...TYPES];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

export const TetrisGameModal: React.FC<TetrisGameModalProps> = ({
  isOpen,
  onClose,
  controllerType = 'ds4_ds5',
  controllerConnected = false,
}) => {
  const [grid, setGrid] = useState<string[][]>(() =>
    Array.from({ length: ROWS }, () => Array(COLS).fill(''))
  );
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [highScore, setHighScore] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('xmb_tetris_highscore') || '0', 10);
    }
    return 0;
  });

  const [bag, setBag] = useState<TetrominoType[]>(() => generateBag());
  const [nextPiece, setNextPiece] = useState<TetrominoType>(() => generateBag()[0]);
  const [holdPiece, setHoldPiece] = useState<TetrominoType | null>(null);
  const [canHold, setCanHold] = useState(true);

  const [currentPiece, setCurrentPiece] = useState<{
    type: TetrominoType;
    shape: number[][];
    x: number;
    y: number;
  } | null>(null);

  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const prevGpButtonsRef = useRef<{ [idx: number]: boolean }>({});
  const prevGpAxesRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dropTimerRef = useRef<number | null>(null);

  // Clean Exit
  const handleClose = useCallback(() => {
    soundFx.playCancel();
    onClose();
    setTimeout(() => {
      window.focus();
      if (document.body) document.body.focus();
    }, 50);
  }, [onClose]);

  // Spawn Next Piece
  const spawnPiece = useCallback((customType?: TetrominoType) => {
    let pieceType: TetrominoType;
    let nextBag = [...bag];

    if (customType) {
      pieceType = customType;
    } else {
      if (nextBag.length === 0) {
        nextBag = generateBag();
      }
      pieceType = nextBag.shift()!;
      setBag(nextBag);
    }

    if (nextBag.length === 0) {
      nextBag = generateBag();
      setBag(nextBag);
    }
    setNextPiece(nextBag[0]);

    const shape = TETROMINOES[pieceType].shape.map((row) => [...row]);
    const startX = Math.floor((COLS - shape[0].length) / 2);
    const startY = 0;

    // Check collision on spawn (Game Over check)
    setGrid((currentGrid) => {
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c] && currentGrid[startY + r]?.[startX + c]) {
            setIsGameOver(true);
            soundFx.playCancel();
            return currentGrid;
          }
        }
      }
      return currentGrid;
    });

    setCurrentPiece({
      type: pieceType,
      shape,
      x: startX,
      y: startY,
    });
    setCanHold(true);
  }, [bag]);

  // Restart Game
  const handleRestart = useCallback(() => {
    soundFx.playGameBoot();
    setGrid(Array.from({ length: ROWS }, () => Array(COLS).fill('')));
    setScore(0);
    setLines(0);
    setLevel(1);
    setIsGameOver(false);
    setIsPaused(false);
    setHoldPiece(null);
    setCanHold(true);
    const initialBag = generateBag();
    const firstPiece = initialBag.shift()!;
    setBag(initialBag);
    setNextPiece(initialBag[0]);

    const shape = TETROMINOES[firstPiece].shape.map((row) => [...row]);
    setCurrentPiece({
      type: firstPiece,
      shape,
      x: Math.floor((COLS - shape[0].length) / 2),
      y: 0,
    });
  }, []);

  // Initialize on open
  useEffect(() => {
    if (isOpen) {
      handleRestart();
    }
  }, [isOpen, handleRestart]);

  // Check Collision
  const checkCollision = useCallback(
    (shape: number[][], offsetX: number, offsetY: number, currentGrid = grid) => {
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) {
            const newX = offsetX + c;
            const newY = offsetY + r;
            if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
            if (newY >= 0 && currentGrid[newY][newX] !== '') return true;
          }
        }
      }
      return false;
    },
    [grid]
  );

  // Rotate Matrix Clockwise
  const rotateShape = (matrix: number[][]) => {
    const N = matrix.length;
    const result: number[][] = Array.from({ length: N }, () => Array(N).fill(0));
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        result[c][N - 1 - r] = matrix[r][c];
      }
    }
    return result;
  };

  // Lock Piece into Grid & Clear Lines
  const lockPiece = useCallback(() => {
    if (!currentPiece) return;

    soundFx.playTick();
    const newGrid = grid.map((row) => [...row]);
    const { shape, x, y, type } = currentPiece;
    const color = TETROMINOES[type].color;

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] && y + r >= 0 && y + r < ROWS && x + c >= 0 && x + c < COLS) {
          newGrid[y + r][x + c] = color;
        }
      }
    }

    // Line Clears
    let clearedLines = 0;
    const filteredGrid: string[][] = [];

    for (let r = 0; r < ROWS; r++) {
      if (newGrid[r].every((cell) => cell !== '')) {
        clearedLines++;
      } else {
        filteredGrid.push(newGrid[r]);
      }
    }

    while (filteredGrid.length < ROWS) {
      filteredGrid.unshift(Array(COLS).fill(''));
    }

    if (clearedLines > 0) {
      soundFx.playSettingChanged();
      // Authentic Classic Tetris scoring (Single: 40, Double: 100, Triple: 300, Tetris: 1200) * Level
      const points = [0, 40, 100, 300, 1200][clearedLines] * level;
      setScore((prev) => {
        const nextScore = prev + points;
        if (nextScore > highScore) {
          setHighScore(nextScore);
          try {
            localStorage.setItem('xmb_tetris_highscore', String(nextScore));
          } catch {}
        }
        return nextScore;
      });

      setLines((prev) => {
        const nextLines = prev + clearedLines;
        setLevel(Math.floor(nextLines / 10) + 1);
        return nextLines;
      });
    }

    setGrid(filteredGrid);
    setCurrentPiece(null);
    spawnPiece();
  }, [currentPiece, grid, level, highScore, spawnPiece]);

  // Move Current Piece
  const movePiece = useCallback(
    (dx: number, dy: number) => {
      if (!currentPiece || isGameOver || isPaused) return false;
      const nextX = currentPiece.x + dx;
      const nextY = currentPiece.y + dy;

      if (!checkCollision(currentPiece.shape, nextX, nextY)) {
        setCurrentPiece((prev) => (prev ? { ...prev, x: nextX, y: nextY } : null));
        return true;
      }

      // If moving down hit collision -> lock
      if (dy > 0) {
        lockPiece();
      }
      return false;
    },
    [currentPiece, isGameOver, isPaused, checkCollision, lockPiece]
  );

  // Rotate Piece with basic wall kicks
  const handleRotate = useCallback(() => {
    if (!currentPiece || isGameOver || isPaused) return;
    soundFx.playTick();
    const rotated = rotateShape(currentPiece.shape);

    // Try standard rotation
    if (!checkCollision(rotated, currentPiece.x, currentPiece.y)) {
      setCurrentPiece((prev) => (prev ? { ...prev, shape: rotated } : null));
      return;
    }
    // Wall kick left
    if (!checkCollision(rotated, currentPiece.x - 1, currentPiece.y)) {
      setCurrentPiece((prev) => (prev ? { ...prev, shape: rotated, x: prev.x - 1 } : null));
      return;
    }
    // Wall kick right
    if (!checkCollision(rotated, currentPiece.x + 1, currentPiece.y)) {
      setCurrentPiece((prev) => (prev ? { ...prev, shape: rotated, x: prev.x + 1 } : null));
      return;
    }
  }, [currentPiece, isGameOver, isPaused, checkCollision]);

  // Hard Drop
  const handleHardDrop = useCallback(() => {
    if (!currentPiece || isGameOver || isPaused) return;
    soundFx.playSelect();
    let currentY = currentPiece.y;
    while (!checkCollision(currentPiece.shape, currentPiece.x, currentY + 1)) {
      currentY++;
    }

    const dropDistance = currentY - currentPiece.y;
    setScore((prev) => prev + dropDistance * 2);

    const newGrid = grid.map((row) => [...row]);
    const { shape, x, type } = currentPiece;
    const color = TETROMINOES[type].color;

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] && currentY + r >= 0 && currentY + r < ROWS && x + c >= 0 && x + c < COLS) {
          newGrid[currentY + r][x + c] = color;
        }
      }
    }

    // Line Clears
    let clearedLines = 0;
    const filteredGrid: string[][] = [];
    for (let r = 0; r < ROWS; r++) {
      if (newGrid[r].every((cell) => cell !== '')) {
        clearedLines++;
      } else {
        filteredGrid.push(newGrid[r]);
      }
    }
    while (filteredGrid.length < ROWS) {
      filteredGrid.unshift(Array(COLS).fill(''));
    }

    if (clearedLines > 0) {
      soundFx.playSettingChanged();
      const points = [0, 100, 300, 500, 800][clearedLines] * level;
      setScore((prev) => {
        const nextScore = prev + points;
        if (nextScore > highScore) {
          setHighScore(nextScore);
          try {
            localStorage.setItem('xmb_tetris_highscore', String(nextScore));
          } catch {}
        }
        return nextScore;
      });
      setLines((prev) => {
        const nextLines = prev + clearedLines;
        setLevel(Math.floor(nextLines / 10) + 1);
        return nextLines;
      });
    }

    setGrid(filteredGrid);
    setCurrentPiece(null);
    spawnPiece();
  }, [currentPiece, isGameOver, isPaused, checkCollision, grid, level, highScore, spawnPiece]);

  // Hold Piece
  const handleHold = useCallback(() => {
    if (!currentPiece || !canHold || isGameOver || isPaused) return;
    soundFx.playOption();
    const currentType = currentPiece.type;

    if (holdPiece === null) {
      setHoldPiece(currentType);
      spawnPiece();
    } else {
      const prevHold = holdPiece;
      setHoldPiece(currentType);
      spawnPiece(prevHold);
    }
    setCanHold(false);
  }, [currentPiece, canHold, isGameOver, isPaused, holdPiece, spawnPiece]);

  // Game Gravity Tick Interval (Authentic Classic NES / Arcade Speed Ramp)
  useEffect(() => {
    if (!isOpen || isGameOver || isPaused) return;

    const speed = getClassicTetrisSpeed(level);
    dropTimerRef.current = window.setInterval(() => {
      movePiece(0, 1);
    }, speed);

    return () => {
      if (dropTimerRef.current) clearInterval(dropTimerRef.current);
    };
  }, [isOpen, isGameOver, isPaused, level, movePiece]);

  // Keyboard Navigation with Capturing
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.stopPropagation();
      e.stopImmediatePropagation();

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          movePiece(-1, 0);
          break;

        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          movePiece(1, 0);
          break;

        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          setScore((prev) => prev + 1);
          movePiece(0, 1);
          break;

        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          handleRotate();
          break;

        case ' ':
          e.preventDefault();
          handleHardDrop();
          break;

        case 'c':
        case 'C':
        case 'Shift':
          e.preventDefault();
          handleHold();
          break;

        case 'p':
        case 'P':
          e.preventDefault();
          soundFx.playTick();
          setIsPaused((prev) => !prev);
          break;

        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          handleClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, movePiece, handleRotate, handleHardDrop, handleHold, handleClose]);

  // Gamepad Polling Loop
  useEffect(() => {
    if (!isOpen) return;

    let animId: number;

    const pollGamepad = () => {
      const gamepads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[0];

      if (gp && gp.connected) {
        const justPressed = (btnIdx: number) => {
          const pressed = Boolean(gp.buttons[btnIdx]?.pressed);
          const wasPressed = prevGpButtonsRef.current[btnIdx] || false;
          prevGpButtonsRef.current[btnIdx] = pressed;
          return pressed && !wasPressed;
        };

        const currX = gp.axes[0] || 0;
        const currY = gp.axes[1] || 0;
        const prevX = prevGpAxesRef.current.x;
        const prevY = prevGpAxesRef.current.y;
        prevGpAxesRef.current = { x: currX, y: currY };

        const stickLeftJust = currX < -0.55 && prevX >= -0.45;
        const stickRightJust = currX > 0.55 && prevX <= 0.45;
        const stickUpJust = currY < -0.55 && prevY >= -0.45;
        const stickDownJust = currY > 0.55 && prevY <= 0.45;

        // D-Pad Left / Stick Left
        if (justPressed(14) || stickLeftJust) {
          movePiece(-1, 0);
        }
        // D-Pad Right / Stick Right
        else if (justPressed(15) || stickRightJust) {
          movePiece(1, 0);
        }
        // D-Pad Down / Stick Down (Soft drop)
        else if (justPressed(13) || stickDownJust) {
          setScore((prev) => prev + 1);
          movePiece(0, 1);
        }
        // D-Pad Up / Cross (0) / Square (2) -> Rotate
        else if (justPressed(12) || stickUpJust || justPressed(0) || justPressed(2)) {
          handleRotate();
        }
        // R1 (5) / R2 (7) -> Hard Drop
        else if (justPressed(5) || justPressed(7)) {
          handleHardDrop();
        }
        // L1 (4) / Triangle (3) -> Hold Piece
        else if (justPressed(4) || justPressed(3)) {
          handleHold();
        }
        // Start (9) -> Pause
        else if (justPressed(9)) {
          soundFx.playTick();
          setIsPaused((prev) => !prev);
        }
        // Circle (1) -> Exit
        else if (justPressed(1)) {
          handleClose();
        }
      }

      animId = requestAnimationFrame(pollGamepad);
    };

    animId = requestAnimationFrame(pollGamepad);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, movePiece, handleRotate, handleHardDrop, handleHold, handleClose]);

  if (!isOpen) return null;

  // Calculate Ghost Piece Projection
  let ghostY = currentPiece ? currentPiece.y : 0;
  if (currentPiece) {
    while (!checkCollision(currentPiece.shape, currentPiece.x, ghostY + 1)) {
      ghostY++;
    }
  }

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none"
    >
      <div
        className="relative flex flex-col w-full max-w-2xl bg-slate-950 border border-white/20 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden text-slate-200 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.5)]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wider font-sans uppercase flex items-center gap-2">
                <span>TETRIS</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-400/40">
                  PS3 Arcade
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRestart}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border border-white/15"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Game Main Area */}
        <div className="p-6 flex flex-col md:flex-row items-center justify-center gap-6">
          {/* Left Panel: Hold Piece & Stats */}
          <div className="w-full md:w-36 flex flex-row md:flex-col justify-between gap-3">
            {/* Hold Box */}
            <div className="bg-black/60 border border-white/15 rounded-xl p-3 flex-1 flex flex-col items-center">
              <span className="text-[11px] font-mono text-white/50 uppercase tracking-widest mb-2 font-bold">
                HOLD
              </span>
              <div className="w-16 h-16 flex items-center justify-center bg-black/40 border border-white/10 rounded-lg">
                {holdPiece && (
                  <div
                    className="grid gap-0.5"
                    style={{
                      gridTemplateColumns: `repeat(${TETROMINOES[holdPiece].shape[0].length}, 12px)`,
                    }}
                  >
                    {TETROMINOES[holdPiece].shape.map((row, r) =>
                      row.map((cell, c) => (
                        <div
                          key={`${r}-${c}`}
                          className="w-3 h-3 rounded-xs"
                          style={{
                            backgroundColor: cell ? TETROMINOES[holdPiece].color : 'transparent',
                            boxShadow: cell ? `0 0 6px ${TETROMINOES[holdPiece].glow}` : 'none',
                          }}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-white/40 font-mono mt-1.5">L1 / △</span>
            </div>

            {/* Score & Lines */}
            <div className="bg-black/60 border border-white/15 rounded-xl p-3 flex-1 space-y-2">
              <div>
                <div className="text-[10px] font-mono text-white/50 uppercase">Score</div>
                <div className="text-lg font-mono font-bold text-sky-400">{score}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-white/50 uppercase">Lines</div>
                <div className="text-sm font-mono font-bold text-white">{lines}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-white/50 uppercase">Level</div>
                <div className="text-sm font-mono font-bold text-amber-400">{level}</div>
              </div>
            </div>
          </div>

          {/* Center: Tetris Matrix Grid */}
          <div className="relative bg-slate-950/90 border-2 border-white/30 rounded-xl p-1.5 shadow-[0_0_30px_rgba(56,189,248,0.2)]">
            <div
              className="grid gap-px bg-slate-900/60"
              style={{
                gridTemplateColumns: `repeat(${COLS}, 22px)`,
                gridTemplateRows: `repeat(${ROWS}, 22px)`,
              }}
            >
              {grid.map((row, r) =>
                row.map((cellColor, c) => {
                  let isCurrent = false;
                  let currentColor = '';
                  let isGhost = false;

                  if (currentPiece) {
                    const { shape, x, y, type } = currentPiece;
                    if (
                      r >= y &&
                      r < y + shape.length &&
                      c >= x &&
                      c < x + shape[0].length &&
                      shape[r - y][c - x]
                    ) {
                      isCurrent = true;
                      currentColor = TETROMINOES[type].color;
                    } else if (
                      r >= ghostY &&
                      r < ghostY + shape.length &&
                      c >= x &&
                      c < x + shape[0].length &&
                      shape[r - ghostY][c - x]
                    ) {
                      isGhost = true;
                    }
                  }

                  const fillColor = isCurrent ? currentColor : cellColor;

                  return (
                    <div
                      key={`${r}-${c}`}
                      className="w-[22px] h-[22px] rounded-xs relative transition-colors duration-75"
                      style={{
                        backgroundColor: fillColor || (isGhost ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.3)'),
                        border: isGhost && !fillColor ? '1px dashed rgba(255,255,255,0.3)' : fillColor ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.03)',
                        boxShadow: fillColor ? `0 0 8px ${fillColor}` : 'none',
                      }}
                    />
                  );
                })
              )}
            </div>

            {/* Game Over Overlay */}
            {isGameOver && (
              <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center rounded-lg animate-in zoom-in-95">
                <span className="text-xl font-bold text-rose-500 font-sans tracking-widest drop-shadow-[0_0_12px_rgba(244,63,94,0.8)]">
                  GAME OVER
                </span>
                <span className="text-xs text-white/70 font-mono mt-1">Final Score: {score}</span>
                <button
                  type="button"
                  onClick={handleRestart}
                  className="mt-4 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl font-mono uppercase transition-all shadow-[0_0_15px_rgba(56,189,248,0.6)] cursor-pointer"
                >
                  Play Again
                </button>
              </div>
            )}

            {/* Pause Overlay */}
            {isPaused && !isGameOver && (
              <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center rounded-lg">
                <span className="text-lg font-bold text-amber-400 font-sans tracking-widest">
                  PAUSED
                </span>
                <span className="text-xs text-white/50 font-mono mt-1">Press Start or P to Resume</span>
              </div>
            )}
          </div>

          {/* Right Panel: Next Piece & High Score */}
          <div className="w-full md:w-36 flex flex-row md:flex-col justify-between gap-3">
            {/* Next Piece Box */}
            <div className="bg-black/60 border border-white/15 rounded-xl p-3 flex-1 flex flex-col items-center">
              <span className="text-[11px] font-mono text-white/50 uppercase tracking-widest mb-2 font-bold">
                NEXT
              </span>
              <div className="w-16 h-16 flex items-center justify-center bg-black/40 border border-white/10 rounded-lg">
                {nextPiece && (
                  <div
                    className="grid gap-0.5"
                    style={{
                      gridTemplateColumns: `repeat(${TETROMINOES[nextPiece].shape[0].length}, 12px)`,
                    }}
                  >
                    {TETROMINOES[nextPiece].shape.map((row, r) =>
                      row.map((cell, c) => (
                        <div
                          key={`${r}-${c}`}
                          className="w-3 h-3 rounded-xs"
                          style={{
                            backgroundColor: cell ? TETROMINOES[nextPiece].color : 'transparent',
                            boxShadow: cell ? `0 0 6px ${TETROMINOES[nextPiece].glow}` : 'none',
                          }}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* High Score */}
            <div className="bg-black/60 border border-white/15 rounded-xl p-3 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 text-amber-400 mb-1">
                <Trophy className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono uppercase font-bold">High Score</span>
              </div>
              <div className="text-base font-mono font-bold text-white">{highScore}</div>
            </div>
          </div>
        </div>

        {/* Controller / Keyboard Bottom Help Bar */}
        <div className="flex flex-wrap items-center justify-between px-6 py-2.5 bg-black/60 border-t border-white/10 text-[11px] font-mono text-white/60">
          <div className="flex items-center gap-1.5">
            <ControllerButtonBadge type={controllerType === 'ds4_ds5' ? 'cross' : 'a'} />
            <span>Rotate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-white">R1 / Space</span>
            <span>Hard Drop</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ControllerButtonBadge type={controllerType === 'ds4_ds5' ? 'triangle' : 'y'} />
            <span>Hold</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ControllerButtonBadge type={controllerType === 'ds4_ds5' ? 'circle' : 'b'} />
            <span>Exit</span>
          </div>
        </div>
      </div>
    </div>
  );
};
