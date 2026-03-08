import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { type Language, getTranslations } from "@/lib/translations";
import {
  Clock,
  Lightbulb,
  Loader2,
  RotateCcw,
  Undo,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AIDifficulty, GameMode } from "../App";

interface ChessBoardProps {
  gameMode: GameMode;
  roomCode: string | null;
  playerName: string;
  aiDifficulty: AIDifficulty;
  language: Language;
  onGameEnd?: () => void;
  onMatchEnd?: (
    result: "win" | "loss" | "draw",
    xpGained: number,
    jetonsGained: number,
    duration: number,
  ) => void;
}

type PieceType = "k" | "q" | "r" | "b" | "n" | "p" | null;
type PieceColor = "w" | "b";
type Piece = { type: PieceType; color: PieceColor } | null;
type Board = Piece[][];
type Position = { row: number; col: number };
type Move = {
  from: Position;
  to: Position;
  piece: Piece;
  captured: Piece;
  enPassantTarget?: Position | null;
  castlingRights?: CastlingRights;
  wasEnPassant?: boolean;
  wasCastling?: boolean;
  promotedFrom?: PieceType;
};

interface CastlingRights {
  whiteKingSide: boolean;
  whiteQueenSide: boolean;
  blackKingSide: boolean;
  blackQueenSide: boolean;
}

const initialBoard: Board = [
  [
    { type: "r", color: "b" },
    { type: "n", color: "b" },
    { type: "b", color: "b" },
    { type: "q", color: "b" },
    { type: "k", color: "b" },
    { type: "b", color: "b" },
    { type: "n", color: "b" },
    { type: "r", color: "b" },
  ],
  [
    { type: "p", color: "b" },
    { type: "p", color: "b" },
    { type: "p", color: "b" },
    { type: "p", color: "b" },
    { type: "p", color: "b" },
    { type: "p", color: "b" },
    { type: "p", color: "b" },
    { type: "p", color: "b" },
  ],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [
    { type: "p", color: "w" },
    { type: "p", color: "w" },
    { type: "p", color: "w" },
    { type: "p", color: "w" },
    { type: "p", color: "w" },
    { type: "p", color: "w" },
    { type: "p", color: "w" },
    { type: "p", color: "w" },
  ],
  [
    { type: "r", color: "w" },
    { type: "n", color: "w" },
    { type: "b", color: "w" },
    { type: "q", color: "w" },
    { type: "k", color: "w" },
    { type: "b", color: "w" },
    { type: "n", color: "w" },
    { type: "r", color: "w" },
  ],
];

const pieceSymbols: Record<string, string> = {
  wk: "♔",
  wq: "♕",
  wr: "♖",
  wb: "♗",
  wn: "♘",
  wp: "♙",
  bk: "♚",
  bq: "♛",
  br: "♜",
  bb: "♝",
  bn: "♞",
  bp: "♟",
};

// Professional piece values
const pieceValues: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-square tables for positional evaluation
const pawnTable = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const knightTable = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

const bishopTable = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 10, 10, 5, 0, -10],
  [-10, 5, 5, 10, 10, 5, 5, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];

const rookTable = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [5, 10, 10, 10, 10, 10, 10, 5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [0, 0, 0, 5, 5, 0, 0, 0],
];

const queenTable = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-5, 0, 5, 5, 5, 5, 0, -5],
  [0, 0, 5, 5, 5, 5, 0, -5],
  [-10, 5, 5, 5, 5, 5, 0, -10],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];

const kingMiddleGameTable = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
];

const kingEndGameTable = [
  [-50, -40, -30, -20, -20, -30, -40, -50],
  [-30, -20, -10, 0, 0, -10, -20, -30],
  [-30, -10, 20, 30, 30, 20, -10, -30],
  [-30, -10, 30, 40, 40, 30, -10, -30],
  [-30, -10, 30, 40, 40, 30, -10, -30],
  [-30, -10, 20, 30, 30, 20, -10, -30],
  [-30, -30, 0, 0, 0, 0, -30, -30],
  [-50, -30, -30, -30, -30, -30, -30, -50],
];

// Time control settings (in seconds)
const TIME_CONTROLS = {
  easy: { white: 600, black: 600 }, // 10 minutes each
  medium: { white: 600, black: 600 }, // 10 minutes each
  hard: { white: 600, black: 600 }, // 10 minutes each
  expert: { white: 600, black: 600 }, // 10 minutes each
};

export default function ChessBoard({
  gameMode,
  roomCode,
  playerName,
  aiDifficulty,
  language,
  onGameEnd,
  onMatchEnd,
}: ChessBoardProps) {
  const t = getTranslations(language);
  const {
    playMove,
    playCapture,
    playCheck,
    playWin,
    playLose,
    soundEnabled,
    toggleSound,
  } = useSoundEffects();
  const gameStartTimeRef = useRef<number>(Date.now());
  const matchEndFired = useRef(false);

  const [board, setBoard] = useState<Board>(
    JSON.parse(JSON.stringify(initialBoard)),
  );
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [currentTurn, setCurrentTurn] = useState<PieceColor>("w");
  const [gameStatus, setGameStatus] = useState<
    "playing" | "checkmate" | "stalemate" | "draw" | "timeout"
  >("playing");
  const [winner, setWinner] = useState<PieceColor | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{
    from: Position;
    to: Position;
  } | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [capturedPiece, setCapturedPiece] = useState<Position | null>(null);
  const [animatingPiece, setAnimatingPiece] = useState<Position | null>(null);
  // Feature 6: Animated piece movement
  const [movingPiece, setMovingPiece] = useState<{
    from: Position;
    to: Position;
    piece: Piece;
    isAI: boolean;
    style: React.CSSProperties;
  } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [moveStack, setMoveStack] = useState<Move[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [hintMove, setHintMove] = useState<{
    from: Position;
    to: Position;
  } | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [enPassantTarget, setEnPassantTarget] = useState<Position | null>(null);
  const [castlingRights, setCastlingRights] = useState<CastlingRights>({
    whiteKingSide: true,
    whiteQueenSide: true,
    blackKingSide: true,
    blackQueenSide: true,
  });
  const [isInCheck, setIsInCheck] = useState(false);
  const [positionHistory, setPositionHistory] = useState<string[]>([]);
  const [halfMoveClock, setHalfMoveClock] = useState(0);

  // Timer states
  const [whiteTime, setWhiteTime] = useState(TIME_CONTROLS[aiDifficulty].white);
  const [blackTime, setBlackTime] = useState(TIME_CONTROLS[aiDifficulty].black);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // AI thinking state
  const [isAIThinking, setIsAIThinking] = useState(false);

  const difficultySettings = {
    easy: {
      depth: 2,
      allowBlunders: true,
      hintsAvailable: true,
      undoLimit: Number.POSITIVE_INFINITY,
    },
    medium: {
      depth: 4,
      allowBlunders: false,
      hintsAvailable: true,
      undoLimit: 3,
    },
    hard: {
      depth: 6,
      allowBlunders: false,
      hintsAvailable: false,
      undoLimit: 0,
    },
    expert: {
      depth: 8,
      allowBlunders: false,
      hintsAvailable: false,
      undoLimit: 0,
    },
  };

  const settings = difficultySettings[aiDifficulty];

  // Timer effect with smooth synchronization
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional - only re-run on turn/status/timer changes
  useEffect(() => {
    if (gameStatus !== "playing" || !isTimerRunning) return;

    const interval = setInterval(() => {
      if (currentTurn === "w") {
        setWhiteTime((prev) => {
          if (prev <= 1) {
            setGameStatus("timeout");
            setWinner("b");
            setIsTimerRunning(false);
            if (onGameEnd) onGameEnd();
            playLose();
            fireMatchEnd("loss");
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            setGameStatus("timeout");
            setWinner("w");
            setIsTimerRunning(false);
            if (onGameEnd) onGameEnd();
            playWin();
            fireMatchEnd("win");
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentTurn, gameStatus, isTimerRunning, onGameEnd]);

  // Start timer on first move
  useEffect(() => {
    if (moveStack.length > 0 && !isTimerRunning && gameStatus === "playing") {
      setIsTimerRunning(true);
    }
  }, [moveStack.length, isTimerRunning, gameStatus]);

  // Trigger onGameEnd when game ends
  useEffect(() => {
    if (gameStatus !== "playing" && onGameEnd) {
      onGameEnd();
    }
  }, [gameStatus, onGameEnd]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimeColor = (seconds: number, isActive: boolean): string => {
    if (!isActive) return "text-foreground/60";
    if (seconds < 30) return "text-red-500 animate-pulse";
    if (seconds < 60) return "text-orange-500";
    return "text-foreground";
  };

  const resetGame = () => {
    setBoard(JSON.parse(JSON.stringify(initialBoard)));
    setSelectedSquare(null);
    setCurrentTurn("w");
    setGameStatus("playing");
    setWinner(null);
    setMoveHistory([]);
    setLastMove(null);
    setValidMoves([]);
    setCapturedPiece(null);
    setAnimatingPiece(null);
    setMoveStack([]);
    setShowHint(false);
    setHintMove(null);
    setHintsUsed(0);
    setEnPassantTarget(null);
    setCastlingRights({
      whiteKingSide: true,
      whiteQueenSide: true,
      blackKingSide: true,
      blackQueenSide: true,
    });
    setIsInCheck(false);
    setPositionHistory([]);
    setHalfMoveClock(0);
    setWhiteTime(TIME_CONTROLS[aiDifficulty].white);
    setBlackTime(TIME_CONTROLS[aiDifficulty].black);
    setIsTimerRunning(false);
    setIsAIThinking(false);
  };

  // Find king position
  const findKing = (
    color: PieceColor,
    testBoard: Board = board,
  ): Position | null => {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = testBoard[row][col];
        if (piece && piece.type === "k" && piece.color === color) {
          return { row, col };
        }
      }
    }
    return null;
  };

  // Check if a square is under attack
  const isSquareUnderAttack = (
    pos: Position,
    byColor: PieceColor,
    testBoard: Board = board,
  ): boolean => {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = testBoard[row][col];
        if (piece && piece.color === byColor) {
          if (canPieceAttackSquare({ row, col }, pos, testBoard)) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // Check if a piece can attack a square (without considering check)
  const canPieceAttackSquare = (
    from: Position,
    to: Position,
    testBoard: Board = board,
  ): boolean => {
    const piece = testBoard[from.row][from.col];
    if (!piece) return false;

    const rowDiff = Math.abs(to.row - from.row);
    const colDiff = Math.abs(to.col - from.col);

    switch (piece.type) {
      case "p": {
        const direction = piece.color === "w" ? -1 : 1;
        return colDiff === 1 && to.row === from.row + direction;
      }

      case "r":
        return (
          (rowDiff === 0 || colDiff === 0) && isPathClear(from, to, testBoard)
        );

      case "n":
        return (
          (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2)
        );

      case "b":
        return rowDiff === colDiff && isPathClear(from, to, testBoard);

      case "q":
        return (
          (rowDiff === colDiff || rowDiff === 0 || colDiff === 0) &&
          isPathClear(from, to, testBoard)
        );

      case "k":
        return rowDiff <= 1 && colDiff <= 1;

      default:
        return false;
    }
  };

  // Check if king is in check
  const isKingInCheck = (
    color: PieceColor,
    testBoard: Board = board,
  ): boolean => {
    const kingPos = findKing(color, testBoard);
    if (!kingPos) return false;
    return isSquareUnderAttack(kingPos, color === "w" ? "b" : "w", testBoard);
  };

  const isPathClear = (
    from: Position,
    to: Position,
    testBoard: Board = board,
  ): boolean => {
    const rowStep = to.row > from.row ? 1 : to.row < from.row ? -1 : 0;
    const colStep = to.col > from.col ? 1 : to.col < from.col ? -1 : 0;
    let row = from.row + rowStep;
    let col = from.col + colStep;

    while (row !== to.row || col !== to.col) {
      if (testBoard[row][col]) return false;
      row += rowStep;
      col += colStep;
    }
    return true;
  };

  // Check if a move is pseudo-legal (doesn't check for check)
  const isPseudoLegalMove = (
    from: Position,
    to: Position,
    testBoard: Board = board,
    testEnPassant: Position | null = enPassantTarget,
    testCastling: CastlingRights = castlingRights,
  ): boolean => {
    const piece = testBoard[from.row][from.col];
    if (!piece) return false;

    const targetPiece = testBoard[to.row][to.col];
    if (targetPiece && targetPiece.color === piece.color) return false;

    const rowDiff = Math.abs(to.row - from.row);
    const colDiff = Math.abs(to.col - from.col);

    switch (piece.type) {
      case "p": {
        const direction = piece.color === "w" ? -1 : 1;
        const startRow = piece.color === "w" ? 6 : 1;

        if (colDiff === 0 && !targetPiece) {
          if (to.row === from.row + direction) return true;
          if (
            from.row === startRow &&
            to.row === from.row + 2 * direction &&
            !testBoard[from.row + direction][from.col]
          )
            return true;
        }

        if (colDiff === 1 && to.row === from.row + direction) {
          if (targetPiece) return true;
          if (
            testEnPassant &&
            to.row === testEnPassant.row &&
            to.col === testEnPassant.col
          ) {
            return true;
          }
        }
        return false;
      }

      case "r":
        return (
          (rowDiff === 0 || colDiff === 0) && isPathClear(from, to, testBoard)
        );

      case "n":
        return (
          (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2)
        );

      case "b":
        return rowDiff === colDiff && isPathClear(from, to, testBoard);

      case "q":
        return (
          (rowDiff === colDiff || rowDiff === 0 || colDiff === 0) &&
          isPathClear(from, to, testBoard)
        );

      case "k":
        if (rowDiff <= 1 && colDiff <= 1) return true;

        if (rowDiff === 0 && colDiff === 2) {
          const row = from.row;
          const isKingSide = to.col > from.col;

          if (piece.color === "w") {
            if (isKingSide && !testCastling.whiteKingSide) return false;
            if (!isKingSide && !testCastling.whiteQueenSide) return false;
          } else {
            if (isKingSide && !testCastling.blackKingSide) return false;
            if (!isKingSide && !testCastling.blackQueenSide) return false;
          }

          if (isKingInCheck(piece.color, testBoard)) return false;

          const rookCol = isKingSide ? 7 : 0;
          const step = isKingSide ? 1 : -1;

          for (let col = from.col + step; col !== rookCol; col += step) {
            if (testBoard[row][col]) return false;
          }

          for (let col = from.col; col !== to.col + step; col += step) {
            if (
              isSquareUnderAttack(
                { row, col },
                piece.color === "w" ? "b" : "w",
                testBoard,
              )
            ) {
              return false;
            }
          }

          return true;
        }
        return false;

      default:
        return false;
    }
  };

  // Check if a move is legal (includes check validation)
  const isLegalMove = (
    from: Position,
    to: Position,
    testBoard: Board = board,
    testEnPassant: Position | null = enPassantTarget,
    testCastling: CastlingRights = castlingRights,
  ): boolean => {
    if (!isPseudoLegalMove(from, to, testBoard, testEnPassant, testCastling)) {
      return false;
    }

    const newBoard = testBoard.map((row) => [...row]);
    const piece = newBoard[from.row][from.col];

    if (
      piece &&
      piece.type === "p" &&
      testEnPassant &&
      to.row === testEnPassant.row &&
      to.col === testEnPassant.col
    ) {
      const captureRow = piece.color === "w" ? to.row + 1 : to.row - 1;
      newBoard[captureRow][to.col] = null;
    }

    if (piece && piece.type === "k" && Math.abs(to.col - from.col) === 2) {
      const isKingSide = to.col > from.col;
      const rookFromCol = isKingSide ? 7 : 0;
      const rookToCol = isKingSide ? to.col - 1 : to.col + 1;
      newBoard[from.row][rookToCol] = newBoard[from.row][rookFromCol];
      newBoard[from.row][rookFromCol] = null;
    }

    newBoard[to.row][to.col] = piece;
    newBoard[from.row][from.col] = null;

    return !isKingInCheck(piece!.color, newBoard);
  };

  // Get all legal moves for a piece
  const getAllLegalMoves = (
    from: Position,
    testBoard: Board = board,
  ): Position[] => {
    const moves: Position[] = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (isLegalMove(from, { row, col }, testBoard)) {
          moves.push({ row, col });
        }
      }
    }
    return moves;
  };

  // Check if player has any legal moves
  const hasLegalMoves = (
    color: PieceColor,
    testBoard: Board = board,
  ): boolean => {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = testBoard[row][col];
        if (piece && piece.color === color) {
          const moves = getAllLegalMoves({ row, col }, testBoard);
          if (moves.length > 0) return true;
        }
      }
    }
    return false;
  };

  // Check for insufficient material
  const hasInsufficientMaterial = (testBoard: Board = board): boolean => {
    const pieces: Piece[] = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = testBoard[row][col];
        if (piece && piece.type !== "k") {
          pieces.push(piece);
        }
      }
    }

    if (pieces.length === 0) return true;

    if (pieces.length === 1) {
      const piece = pieces[0];
      if (piece?.type) {
        return piece.type === "b" || piece.type === "n";
      }
    }

    if (pieces.length === 2) {
      const [p1, p2] = pieces;
      if (p1 && p2 && p1.type === "b" && p2.type === "b") {
        return true;
      }
    }

    return false;
  };

  // Get board position as string for repetition detection
  const getBoardString = (testBoard: Board = board): string => {
    let str = "";
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = testBoard[row][col];
        if (piece) {
          str += piece.color + piece.type;
        } else {
          str += "-";
        }
      }
    }
    return str + currentTurn;
  };

  // Check for threefold repetition
  const isThreefoldRepetition = (): boolean => {
    const currentPos = getBoardString();
    let count = 0;
    for (const pos of positionHistory) {
      if (pos === currentPos) count++;
    }
    return count >= 3;
  };

  // Fire match end callback (once)
  const fireMatchEnd = (result: "win" | "loss" | "draw") => {
    if (matchEndFired.current || gameMode !== "ai") return;
    matchEndFired.current = true;
    const duration = Math.floor((Date.now() - gameStartTimeRef.current) / 1000);
    let xpGained = 0;
    let jetonsGained = 0;
    if (result === "win") {
      xpGained = 50;
      jetonsGained = 100;
    } else if (result === "loss") {
      xpGained = -20;
      jetonsGained = -50;
    } else {
      xpGained = 10;
      jetonsGained = 0;
    }
    onMatchEnd?.(result, xpGained, jetonsGained, duration);
  };

  // Check game status
  const checkGameStatus = (color: PieceColor, testBoard: Board = board) => {
    const inCheck = isKingInCheck(color, testBoard);
    const hasLegal = hasLegalMoves(color, testBoard);

    if (!hasLegal) {
      if (inCheck) {
        setGameStatus("checkmate");
        const winnerColor = color === "w" ? "b" : "w";
        setWinner(winnerColor);
        setIsTimerRunning(false);
        // Sound
        if (gameMode === "ai") {
          if (winnerColor === "w") {
            playWin();
            fireMatchEnd("win");
          } else {
            playLose();
            fireMatchEnd("loss");
          }
        }
      } else {
        setGameStatus("stalemate");
        setIsTimerRunning(false);
        fireMatchEnd("draw");
      }
      return;
    }

    if (hasInsufficientMaterial(testBoard)) {
      setGameStatus("draw");
      setIsTimerRunning(false);
      fireMatchEnd("draw");
      return;
    }

    if (isThreefoldRepetition()) {
      setGameStatus("draw");
      setIsTimerRunning(false);
      fireMatchEnd("draw");
      return;
    }

    if (halfMoveClock >= 100) {
      setGameStatus("draw");
      setIsTimerRunning(false);
      fireMatchEnd("draw");
      return;
    }

    if (inCheck) {
      playCheck();
    }
    setIsInCheck(inCheck);
  };

  // Professional evaluation function
  const evaluateBoard = (testBoard: Board, depth: number): number => {
    let score = 0;
    let whitePieces = 0;
    let blackPieces = 0;

    // Count material for endgame detection
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = testBoard[row][col];
        if (piece?.type && piece.type !== "k") {
          if (piece.color === "w") whitePieces++;
          else blackPieces++;
        }
      }
    }

    const isEndgame = whitePieces + blackPieces <= 6;

    // Material and positional evaluation
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = testBoard[row][col];
        if (piece?.type) {
          const value = pieceValues[piece.type];
          let positionalBonus = 0;

          // Get piece-square table value
          const tableRow = piece.color === "w" ? row : 7 - row;

          switch (piece.type) {
            case "p":
              positionalBonus = pawnTable[tableRow][col];
              break;
            case "n":
              positionalBonus = knightTable[tableRow][col];
              break;
            case "b":
              positionalBonus = bishopTable[tableRow][col];
              break;
            case "r":
              positionalBonus = rookTable[tableRow][col];
              break;
            case "q":
              positionalBonus = queenTable[tableRow][col];
              break;
            case "k":
              positionalBonus = isEndgame
                ? kingEndGameTable[tableRow][col]
                : kingMiddleGameTable[tableRow][col];
              break;
          }

          const totalValue = value + positionalBonus;
          score += piece.color === "b" ? totalValue : -totalValue;
        }
      }
    }

    // Center control evaluation
    const centerSquares = [
      { row: 3, col: 3 },
      { row: 3, col: 4 },
      { row: 4, col: 3 },
      { row: 4, col: 4 },
    ];

    for (const square of centerSquares) {
      const piece = testBoard[square.row][square.col];
      if (piece) {
        const bonus = 30;
        score += piece.color === "b" ? bonus : -bonus;
      }

      // Control bonus
      if (isSquareUnderAttack(square, "b", testBoard)) score += 10;
      if (isSquareUnderAttack(square, "w", testBoard)) score -= 10;
    }

    // Piece mobility (activity)
    let whiteMobility = 0;
    let blackMobility = 0;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = testBoard[row][col];
        if (piece && piece.type !== "k") {
          const moves = getAllLegalMoves({ row, col }, testBoard);
          if (piece.color === "w") {
            whiteMobility += moves.length;
          } else {
            blackMobility += moves.length;
          }
        }
      }
    }

    score += (blackMobility - whiteMobility) * 5;

    // King safety evaluation
    const whiteKingPos = findKing("w", testBoard);
    const blackKingPos = findKing("b", testBoard);

    if (whiteKingPos && !isEndgame) {
      // Penalize exposed king
      let attackers = 0;
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = testBoard[row][col];
          if (
            piece &&
            piece.color === "b" &&
            canPieceAttackSquare({ row, col }, whiteKingPos, testBoard)
          ) {
            attackers++;
          }
        }
      }
      score += attackers * 50;

      // Pawn shield bonus
      const shieldPositions = [
        { row: whiteKingPos.row - 1, col: whiteKingPos.col - 1 },
        { row: whiteKingPos.row - 1, col: whiteKingPos.col },
        { row: whiteKingPos.row - 1, col: whiteKingPos.col + 1 },
      ];

      for (const pos of shieldPositions) {
        if (pos.row >= 0 && pos.row < 8 && pos.col >= 0 && pos.col < 8) {
          const piece = testBoard[pos.row][pos.col];
          if (piece && piece.type === "p" && piece.color === "w") {
            score -= 20;
          }
        }
      }
    }

    if (blackKingPos && !isEndgame) {
      let attackers = 0;
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = testBoard[row][col];
          if (
            piece &&
            piece.color === "w" &&
            canPieceAttackSquare({ row, col }, blackKingPos, testBoard)
          ) {
            attackers++;
          }
        }
      }
      score -= attackers * 50;

      const shieldPositions = [
        { row: blackKingPos.row + 1, col: blackKingPos.col - 1 },
        { row: blackKingPos.row + 1, col: blackKingPos.col },
        { row: blackKingPos.row + 1, col: blackKingPos.col + 1 },
      ];

      for (const pos of shieldPositions) {
        if (pos.row >= 0 && pos.row < 8 && pos.col >= 0 && pos.col < 8) {
          const piece = testBoard[pos.row][pos.col];
          if (piece && piece.type === "p" && piece.color === "b") {
            score += 20;
          }
        }
      }
    }

    // Bonus for depth (prefer faster mates)
    if (score > 15000) score += depth * 10;
    if (score < -15000) score -= depth * 10;

    return score;
  };

  // Minimax with alpha-beta pruning
  const minimax = (
    testBoard: Board,
    depth: number,
    isMaximizing: boolean,
    alpha: number,
    beta: number,
  ): number => {
    if (depth === 0) {
      return evaluateBoard(testBoard, depth);
    }

    const color: PieceColor = isMaximizing ? "b" : "w";

    if (!hasLegalMoves(color, testBoard)) {
      if (isKingInCheck(color, testBoard)) {
        return isMaximizing
          ? -30000 + (settings.depth - depth)
          : 30000 - (settings.depth - depth);
      }
      return 0;
    }

    let bestScore = isMaximizing
      ? Number.NEGATIVE_INFINITY
      : Number.POSITIVE_INFINITY;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = testBoard[row][col];
        if (piece && piece.color === color) {
          const validMoves = getAllLegalMoves({ row, col }, testBoard);
          for (const move of validMoves) {
            const newBoard = testBoard.map((r) => [...r]);
            newBoard[move.row][move.col] = newBoard[row][col];
            newBoard[row][col] = null;

            const score = minimax(
              newBoard,
              depth - 1,
              !isMaximizing,
              alpha,
              beta,
            );

            if (isMaximizing) {
              bestScore = Math.max(bestScore, score);
              // biome-ignore lint/style/noParameterAssign: alpha-beta pruning
              alpha = Math.max(alpha, score);
            } else {
              bestScore = Math.min(bestScore, score);
              // biome-ignore lint/style/noParameterAssign: alpha-beta pruning
              beta = Math.min(beta, score);
            }

            if (beta <= alpha) break;
          }
          if (beta <= alpha) break;
        }
      }
      if (beta <= alpha) break;
    }

    return bestScore;
  };

  // Find best move for AI (black pieces)
  const findBestMove = (
    testBoard: Board,
    depth: number,
  ): { from: Position; to: Position } | null => {
    let bestMove: { from: Position; to: Position } | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;
    const allMoves: { from: Position; to: Position; score: number }[] = [];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = testBoard[row][col];
        if (piece && piece.color === "b") {
          const validMoves = getAllLegalMoves({ row, col }, testBoard);
          for (const move of validMoves) {
            const newBoard = testBoard.map((r) => [...r]);
            const capturedPiece = newBoard[move.row][move.col];
            newBoard[move.row][move.col] = newBoard[row][col];
            newBoard[row][col] = null;

            let score = minimax(
              newBoard,
              depth - 1,
              false,
              Number.NEGATIVE_INFINITY,
              Number.POSITIVE_INFINITY,
            );

            // Prioritize captures to avoid unnecessary piece losses
            if (capturedPiece?.type) {
              score += pieceValues[capturedPiece.type] * 0.1;
            }

            // Add slight randomness for easy difficulty
            if (settings.allowBlunders && Math.random() < 0.25) {
              score += (Math.random() - 0.5) * 200;
            }

            allMoves.push({ from: { row, col }, to: move, score });

            if (score > bestScore) {
              bestScore = score;
              bestMove = { from: { row, col }, to: move };
            }
          }
        }
      }
    }

    // Occasionally make blunders on easy difficulty
    if (settings.allowBlunders && Math.random() < 0.15 && allMoves.length > 0) {
      const randomMove = allMoves[Math.floor(Math.random() * allMoves.length)];
      return { from: randomMove.from, to: randomMove.to };
    }

    return bestMove;
  };

  // Find best move for player (white pieces) - used for hints only
  const findBestMoveForPlayer = (
    testBoard: Board,
    depth: number,
  ): { from: Position; to: Position } | null => {
    let bestMove: { from: Position; to: Position } | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;

    // Only analyze WHITE pieces for player hints
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = testBoard[row][col];
        if (piece && piece.color === "w") {
          const validMoves = getAllLegalMoves({ row, col }, testBoard);
          for (const move of validMoves) {
            const newBoard = testBoard.map((r) => [...r]);
            const capturedPiece = newBoard[move.row][move.col];
            newBoard[move.row][move.col] = newBoard[row][col];
            newBoard[row][col] = null;

            // Evaluate from white's perspective (negative of AI evaluation)
            let score = -minimax(
              newBoard,
              depth - 1,
              true,
              Number.NEGATIVE_INFINITY,
              Number.POSITIVE_INFINITY,
            );

            // Prioritize captures
            if (capturedPiece?.type) {
              score += pieceValues[capturedPiece.type] * 0.1;
            }

            if (score > bestScore) {
              bestScore = score;
              bestMove = { from: { row, col }, to: move };
            }
          }
        }
      }
    }

    return bestMove;
  };

  // AI move with thinking animation and delay
  const makeAIMove = () => {
    // Show AI thinking indicator
    setIsAIThinking(true);

    // Thinking delay: 1-2 seconds based on difficulty
    const thinkingDelay =
      aiDifficulty === "easy"
        ? 1000
        : aiDifficulty === "medium"
          ? 1200
          : aiDifficulty === "hard"
            ? 1500
            : 1800;

    setTimeout(() => {
      const bestMove = findBestMove(board, settings.depth);

      if (bestMove) {
        executeMove(bestMove.from, bestMove.to, true);
      }

      // Hide AI thinking indicator after move is executed
      setTimeout(() => {
        setIsAIThinking(false);
      }, 300);
    }, thinkingDelay);
  };

  const executeMove = (from: Position, to: Position, isAI = false) => {
    const newBoard = board.map((row) => [...row]);
    const movedPiece = newBoard[from.row][from.col];
    const capturedPieceAtDest = newBoard[to.row][to.col];

    if (!movedPiece) return;

    const moveData: Move = {
      from,
      to,
      piece: movedPiece,
      captured: capturedPieceAtDest,
      enPassantTarget,
      castlingRights: { ...castlingRights },
    };

    let wasEnPassant = false;
    if (
      movedPiece.type === "p" &&
      enPassantTarget &&
      to.row === enPassantTarget.row &&
      to.col === enPassantTarget.col
    ) {
      const captureRow = movedPiece.color === "w" ? to.row + 1 : to.row - 1;
      newBoard[captureRow][to.col] = null;
      wasEnPassant = true;
      moveData.wasEnPassant = true;
    }

    if (movedPiece.type === "k" && Math.abs(to.col - from.col) === 2) {
      const isKingSide = to.col > from.col;
      const rookFromCol = isKingSide ? 7 : 0;
      const rookToCol = isKingSide ? to.col - 1 : to.col + 1;
      newBoard[from.row][rookToCol] = newBoard[from.row][rookFromCol];
      newBoard[from.row][rookFromCol] = null;
      moveData.wasCastling = true;
    }

    const newCastlingRights = { ...castlingRights };
    if (movedPiece.type === "k") {
      if (movedPiece.color === "w") {
        newCastlingRights.whiteKingSide = false;
        newCastlingRights.whiteQueenSide = false;
      } else {
        newCastlingRights.blackKingSide = false;
        newCastlingRights.blackQueenSide = false;
      }
    }
    if (movedPiece.type === "r") {
      if (movedPiece.color === "w") {
        if (from.col === 0) newCastlingRights.whiteQueenSide = false;
        if (from.col === 7) newCastlingRights.whiteKingSide = false;
      } else {
        if (from.col === 0) newCastlingRights.blackQueenSide = false;
        if (from.col === 7) newCastlingRights.blackKingSide = false;
      }
    }

    let newEnPassantTarget: Position | null = null;
    if (movedPiece.type === "p" && Math.abs(to.row - from.row) === 2) {
      newEnPassantTarget = {
        row: movedPiece.color === "w" ? from.row - 1 : from.row + 1,
        col: from.col,
      };
    }

    const newHalfMoveClock =
      movedPiece.type === "p" || capturedPieceAtDest || wasEnPassant
        ? 0
        : halfMoveClock + 1;

    if (capturedPieceAtDest || wasEnPassant) {
      setCapturedPiece(to);
      playCapture();
      setTimeout(() => setCapturedPiece(null), 600);
    } else {
      playMove();
    }

    // Feature 6: Animated piece movement
    const animDuration = isAI ? 300 : 150;

    // Calculate pixel offset for animation using CSS transform
    const squareSizePct = 12.5; // 100/8 = 12.5% per square
    const deltaCol = to.col - from.col;
    const deltaRow = to.row - from.row;

    setMovingPiece({
      from,
      to,
      piece: movedPiece,
      isAI,
      style: {
        position: "absolute",
        zIndex: 20,
        pointerEvents: "none",
        width: `${squareSizePct}%`,
        height: `${squareSizePct}%`,
        left: `${from.col * squareSizePct}%`,
        top: `${from.row * squareSizePct}%`,
        transition: `transform ${animDuration}ms ${isAI ? "ease-in-out" : "ease-out"}`,
        transform: `translate(${deltaCol * 100}%, ${deltaRow * 100}%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "3rem",
      },
    });

    setAnimatingPiece(from);
    setTimeout(() => {
      setMovingPiece(null);
      if (movedPiece.type === "p" && (to.row === 0 || to.row === 7)) {
        newBoard[to.row][to.col] = { type: "q", color: movedPiece.color };
        moveData.promotedFrom = "p";
      } else {
        newBoard[to.row][to.col] = movedPiece;
      }
      newBoard[from.row][from.col] = null;

      setBoard(newBoard);
      setLastMove({ from, to });
      setMoveStack((prev) => [...prev, moveData]);
      setCastlingRights(newCastlingRights);
      setEnPassantTarget(newEnPassantTarget);
      setHalfMoveClock(newHalfMoveClock);

      const posStr = getBoardString(newBoard);
      setPositionHistory((prev) => [...prev, posStr]);

      const nextTurn = currentTurn === "w" ? "b" : "w";
      setCurrentTurn(nextTurn);
      setAnimatingPiece(null);
      setShowHint(false);
      setHintMove(null);

      checkGameStatus(nextTurn, newBoard);

      const moveNotation = `${getPieceSymbol(movedPiece)} ${String.fromCharCode(97 + from.col)}${8 - from.row} → ${String.fromCharCode(97 + to.col)}${8 - to.row}`;
      setMoveHistory((prev) => [
        ...prev,
        `${isAI ? t.ai : playerName}: ${moveNotation}`,
      ]);
    }, animDuration + 50);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional - makeAIMove is stable
  useEffect(() => {
    if (gameMode === "ai" && currentTurn === "b" && gameStatus === "playing") {
      makeAIMove();
    }
  }, [currentTurn, gameMode, gameStatus]);

  const handleSquareClick = (row: number, col: number) => {
    if (gameStatus !== "playing") return;
    if (gameMode === "ai" && currentTurn === "b") return;
    if (isAIThinking) return; // Prevent interaction during AI thinking

    if (selectedSquare) {
      const from = selectedSquare;
      const to = { row, col };

      if (isLegalMove(from, to)) {
        executeMove(from, to, false);
      }
      setSelectedSquare(null);
      setValidMoves([]);
    } else {
      const piece = board[row][col];
      if (piece && piece.color === currentTurn) {
        setSelectedSquare({ row, col });
        setValidMoves(getAllLegalMoves({ row, col }));
      }
    }
  };

  const handleUndo = () => {
    if (moveStack.length === 0) return;
    if (gameMode === "ai" && moveStack.length < 2) return;
    if (isAIThinking) return; // Prevent undo during AI thinking

    const movesToUndo = gameMode === "ai" ? 2 : 1;
    const newMoveStack = moveStack.slice(0, -movesToUndo);
    const newMoveHistory = moveHistory.slice(0, -movesToUndo);
    const newPositionHistory = positionHistory.slice(0, -movesToUndo);

    const newBoard = JSON.parse(JSON.stringify(initialBoard));
    let newCastlingRights: CastlingRights = {
      whiteKingSide: true,
      whiteQueenSide: true,
      blackKingSide: true,
      blackQueenSide: true,
    };
    let newEnPassantTarget: Position | null = null;
    let newHalfMoveClock = 0;

    for (const move of newMoveStack) {
      newBoard[move.to.row][move.to.col] = move.piece;
      newBoard[move.from.row][move.from.col] = null;

      if (move.wasEnPassant) {
        const captureRow =
          move.piece!.color === "w" ? move.to.row + 1 : move.to.row - 1;
        newBoard[captureRow][move.to.col] = null;
      }

      if (move.wasCastling) {
        const isKingSide = move.to.col > move.from.col;
        const rookFromCol = isKingSide ? 7 : 0;
        const rookToCol = isKingSide ? move.to.col - 1 : move.to.col + 1;
        newBoard[move.from.row][rookToCol] =
          newBoard[move.from.row][rookFromCol];
        newBoard[move.from.row][rookFromCol] = null;
      }

      if (move.promotedFrom) {
        newBoard[move.to.row][move.to.col] = {
          type: "q",
          color: move.piece!.color,
        };
      }

      if (move.piece?.type === "k") {
        if (move.piece.color === "w") {
          newCastlingRights.whiteKingSide = false;
          newCastlingRights.whiteQueenSide = false;
        } else {
          newCastlingRights.blackKingSide = false;
          newCastlingRights.blackQueenSide = false;
        }
      }
      if (move.piece?.type === "r") {
        if (move.piece.color === "w") {
          if (move.from.col === 0) newCastlingRights.whiteQueenSide = false;
          if (move.from.col === 7) newCastlingRights.whiteKingSide = false;
        } else {
          if (move.from.col === 0) newCastlingRights.blackQueenSide = false;
          if (move.from.col === 7) newCastlingRights.blackKingSide = false;
        }
      }

      if (
        move.piece?.type === "p" &&
        Math.abs(move.to.row - move.from.row) === 2
      ) {
        newEnPassantTarget = {
          row: move.piece.color === "w" ? move.from.row - 1 : move.from.row + 1,
          col: move.from.col,
        };
      } else {
        newEnPassantTarget = null;
      }

      newHalfMoveClock =
        move.piece?.type === "p" || move.captured || move.wasEnPassant
          ? 0
          : newHalfMoveClock + 1;
    }

    setBoard(newBoard);
    setMoveStack(newMoveStack);
    setMoveHistory(newMoveHistory);
    setPositionHistory(newPositionHistory);
    setCastlingRights(newCastlingRights);
    setEnPassantTarget(newEnPassantTarget);
    setHalfMoveClock(newHalfMoveClock);
    setCurrentTurn("w");
    setLastMove(null);
    setShowHint(false);
    setHintMove(null);
    setGameStatus("playing");
    setWinner(null);
    setIsInCheck(isKingInCheck("w", newBoard));
  };

  const handleShowHint = () => {
    // FIXED: Strict validation - only show hints for human player (white) during their turn
    if (!settings.hintsAvailable) return;
    if (gameMode !== "ai") return;
    if (currentTurn !== "w") return; // Must be white's turn
    if (isAIThinking) return; // Prevent hint during AI thinking
    if (gameStatus !== "playing") return;

    const maxHints = aiDifficulty === "easy" ? Number.POSITIVE_INFINITY : 3;
    if (hintsUsed >= maxHints) return;

    // Find best move for WHITE player only
    const bestMove = findBestMoveForPlayer(board, settings.depth);
    if (bestMove) {
      setHintMove(bestMove);
      setShowHint(true);
      setHintsUsed((prev) => prev + 1);

      setTimeout(() => {
        setShowHint(false);
        setHintMove(null);
      }, 3000);
    }
  };

  const getPieceSymbol = (piece: Piece): string => {
    if (!piece || !piece.type) return "";
    const key = `${piece.color}${piece.type}`;
    return pieceSymbols[key] || "";
  };

  const isLastMoveSquare = (row: number, col: number): boolean => {
    if (!lastMove) return false;
    return (
      (lastMove.from.row === row && lastMove.from.col === col) ||
      (lastMove.to.row === row && lastMove.to.col === col)
    );
  };

  const isValidMoveSquare = (row: number, col: number): boolean => {
    return validMoves.some((move) => move.row === row && move.col === col);
  };

  const isCapturedSquare = (row: number, col: number): boolean => {
    return capturedPiece?.row === row && capturedPiece?.col === col;
  };

  const isHintSquare = (row: number, col: number): boolean => {
    // FIXED: Only show hint overlay when it's player's turn (white) AND hint is active
    if (!showHint || !hintMove) return false;
    if (currentTurn !== "w") return false; // Must be white's turn
    if (gameMode !== "ai") return false; // Only in AI mode

    return (
      (hintMove.from.row === row && hintMove.from.col === col) ||
      (hintMove.to.row === row && hintMove.to.col === col)
    );
  };

  const getDifficultyBadge = () => {
    const colors = {
      easy: "bg-green-500/30 text-green-900 dark:text-green-300 border-green-500/70",
      medium:
        "bg-blue-500/30 text-blue-900 dark:text-blue-300 border-blue-500/70",
      hard: "bg-orange-500/30 text-orange-900 dark:text-orange-300 border-orange-500/70",
      expert: "bg-red-500/30 text-red-900 dark:text-red-300 border-red-500/70",
    };
    const labels = {
      easy: `🟢 ${t.difficultyEasy}`,
      medium: `🔵 ${t.difficultyMedium}`,
      hard: `🟠 ${t.difficultyHard}`,
      expert: `🔴 ${t.difficultyExpert}`,
    };
    return (
      <Badge
        variant="outline"
        className={`text-base border-4 font-bold ${colors[aiDifficulty]}`}
      >
        {labels[aiDifficulty]}
      </Badge>
    );
  };

  const canUndo =
    moveStack.length >= (gameMode === "ai" ? 2 : 1) &&
    (settings.undoLimit === Number.POSITIVE_INFINITY ||
      moveStack.length / 2 <= settings.undoLimit);
  // FIXED: Only show hint button during player's turn (white) in AI mode
  const canShowHint =
    settings.hintsAvailable &&
    currentTurn === "w" &&
    gameStatus === "playing" &&
    gameMode === "ai" &&
    !isAIThinking &&
    (aiDifficulty === "easy" || hintsUsed < 3);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card className="border-4 glow-border-animated shadow-2xl solid-overlay hover-glow">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge
                    variant={currentTurn === "w" ? "default" : "secondary"}
                    className="text-lg px-5 py-3 font-bold border-2"
                  >
                    {currentTurn === "w" ? t.whiteTurn : t.blackTurn}
                  </Badge>
                  {isInCheck && gameStatus === "playing" && (
                    <Badge
                      variant="destructive"
                      className="text-lg px-5 py-3 font-bold border-2 animate-pulse"
                    >
                      {t.check}
                    </Badge>
                  )}
                  {gameMode === "ai" && (
                    <>
                      <Badge
                        variant="outline"
                        className="text-base font-bold border-2"
                      >
                        {currentTurn === "w" ? t.you : t.ai}
                      </Badge>
                      {getDifficultyBadge()}
                    </>
                  )}
                  {roomCode && (
                    <Badge
                      variant="outline"
                      className="text-base font-mono font-bold border-2"
                    >
                      {t.room}: {roomCode}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {canShowHint && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShowHint}
                      className="gap-2 border-4 border-yellow-500/70 hover:bg-yellow-500/20 font-bold text-base"
                      disabled={showHint}
                    >
                      <Lightbulb className="w-5 h-5" />
                      {t.hint}{" "}
                      {aiDifficulty === "medium" && `(${3 - hintsUsed})`}
                    </Button>
                  )}
                  {gameMode === "ai" && canUndo && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUndo}
                      className="gap-2 font-bold text-base border-2"
                      disabled={isAIThinking}
                    >
                      <Undo className="w-5 h-5" />
                      {t.undo}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetGame}
                    className="gap-2 font-bold text-base border-2"
                  >
                    <RotateCcw className="w-5 h-5" />
                    {t.restart}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSound}
                    data-ocid="sound.toggle"
                    className={`gap-2 font-bold text-base border-2 ${soundEnabled ? "border-green-500/50 text-green-400" : "border-red-500/50 text-red-400"}`}
                    title={
                      soundEnabled
                        ? t.soundOn || "Sound On"
                        : t.soundOff || "Sound Off"
                    }
                  >
                    {soundEnabled ? (
                      <Volume2 className="w-5 h-5" />
                    ) : (
                      <VolumeX className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>

              {/* AI Thinking Indicator */}
              {isAIThinking && gameMode === "ai" && (
                <div className="flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg border-2 border-purple-500/40 animate-pulse">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-600 dark:text-purple-400" />
                  <span className="text-lg font-bold text-purple-900 dark:text-purple-300">
                    {t.aiThinking || "Yapay zeka düşünüyor..."}
                  </span>
                </div>
              )}

              {/* Timer Display */}
              <div className="flex justify-between items-center gap-4 p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border-2 border-primary/20">
                <div
                  className={`flex items-center gap-3 ${currentTurn === "b" ? "opacity-100" : "opacity-60"}`}
                >
                  <Clock className="w-6 h-6" />
                  <div>
                    <div className="text-sm font-semibold text-foreground/80">
                      {t.black} ({t.ai})
                    </div>
                    <div
                      className={`text-3xl font-bold font-mono ${getTimeColor(blackTime, currentTurn === "b")}`}
                    >
                      {formatTime(blackTime)}
                    </div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-foreground/40">
                  {t.vs}
                </div>
                <div
                  className={`flex items-center gap-3 ${currentTurn === "w" ? "opacity-100" : "opacity-60"}`}
                >
                  <div className="text-right">
                    <div className="text-sm font-semibold text-foreground/80">
                      {t.white} ({t.you})
                    </div>
                    <div
                      className={`text-3xl font-bold font-mono ${getTimeColor(whiteTime, currentTurn === "w")}`}
                    >
                      {formatTime(whiteTime)}
                    </div>
                  </div>
                  <Clock className="w-6 h-6" />
                </div>
              </div>

              <div className="aspect-square max-w-2xl mx-auto p-4 rounded-xl relative">
                <div
                  className="absolute inset-0 rounded-xl opacity-20 dark:opacity-15"
                  style={{
                    backgroundImage:
                      "url(/assets/generated/wooden-chessboard-texture.dim_800x800.png)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />

                <div
                  ref={boardRef}
                  className="relative grid grid-cols-8 gap-0 w-full h-full border-4 border-amber-900/70 dark:border-amber-700/80 rounded-lg overflow-hidden shadow-2xl"
                >
                  {board.map((row, rowIndex) =>
                    row.map((piece, colIndex) => {
                      const isLight = (rowIndex + colIndex) % 2 === 0;
                      const isSelected =
                        selectedSquare?.row === rowIndex &&
                        selectedSquare?.col === colIndex;
                      const isLastMove = isLastMoveSquare(rowIndex, colIndex);
                      const isValidMove = isValidMoveSquare(rowIndex, colIndex);
                      const isCaptured = isCapturedSquare(rowIndex, colIndex);
                      const isHint = isHintSquare(rowIndex, colIndex);

                      return (
                        <button
                          type="button"
                          // biome-ignore lint/suspicious/noArrayIndexKey: board squares stable by position
                          key={`${rowIndex}-${colIndex}`}
                          onClick={() => handleSquareClick(rowIndex, colIndex)}
                          disabled={gameStatus !== "playing" || isAIThinking}
                          className={`
                            aspect-square flex items-center justify-center text-4xl sm:text-5xl md:text-6xl font-bold transition-all duration-300 relative
                            ${
                              isLight
                                ? "bg-amber-100 dark:bg-amber-200/90"
                                : "bg-amber-700 dark:bg-amber-800"
                            }
                            ${isSelected ? "ring-4 ring-primary shadow-lg scale-95 z-10" : ""}
                            ${isLastMove ? "bg-yellow-300/70 dark:bg-yellow-600/60" : ""}
                            ${isValidMove ? "ring-2 ring-green-500/80" : ""}
                            ${isHint ? "ring-4 ring-yellow-400 animate-pulse" : ""}
                            ${piece && piece.color === currentTurn && !isSelected && gameStatus === "playing" && !isAIThinking ? "hover:ring-2 hover:ring-accent cursor-pointer" : ""}
                            ${isCaptured ? "animate-pulse bg-red-500/40" : ""}
                            ${gameStatus !== "playing" || isAIThinking ? "cursor-not-allowed" : ""}
                          `}
                          style={{
                            boxShadow: isLight
                              ? "inset 0 2px 4px rgba(0,0,0,0.1)"
                              : "inset 0 2px 4px rgba(0,0,0,0.3)",
                          }}
                        >
                          {/* Move highlight overlay */}
                          {isLastMove && (
                            <div
                              className="absolute inset-0 opacity-60 pointer-events-none z-0"
                              style={{
                                backgroundImage:
                                  "url(/assets/generated/move-highlight-overlay.dim_64x64.png)",
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }}
                            />
                          )}

                          {/* Capture effect overlay */}
                          {isCaptured && (
                            <div
                              className="absolute inset-0 opacity-80 pointer-events-none z-0 animate-ping"
                              style={{
                                backgroundImage:
                                  "url(/assets/generated/capture-effect.dim_128x128.png)",
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }}
                            />
                          )}

                          {isValidMove && !piece && (
                            <div className="absolute inset-0 flex items-center justify-center z-5">
                              <div className="w-4 h-4 rounded-full bg-green-500/80 animate-pulse" />
                            </div>
                          )}

                          {isValidMove && piece && (
                            <div className="absolute inset-0 border-4 border-red-500/80 rounded-sm animate-pulse z-5" />
                          )}

                          {isHint && (
                            <div className="absolute inset-0 bg-yellow-400/40 animate-pulse z-5" />
                          )}

                          {piece && (
                            <span
                              className={`
                                relative z-10 transition-all duration-300
                                ${
                                  piece.color === "w"
                                    ? "text-white drop-shadow-[0_3px_3px_rgba(0,0,0,0.9)] filter brightness-110"
                                    : "text-gray-900 drop-shadow-[0_2px_2px_rgba(255,255,255,0.4)]"
                                }
                                ${animatingPiece?.row === rowIndex && animatingPiece?.col === colIndex ? "scale-110 opacity-70" : "scale-100 opacity-100"}
                                ${isSelected ? "scale-110" : ""}
                                hover:scale-110
                              `}
                              style={{
                                textShadow:
                                  piece.color === "w"
                                    ? "0 0 8px rgba(255,255,255,0.5), 0 4px 6px rgba(0,0,0,0.9)"
                                    : "0 0 6px rgba(0,0,0,0.3), 0 2px 4px rgba(255,255,255,0.4)",
                              }}
                            >
                              {getPieceSymbol(piece)}
                            </span>
                          )}
                        </button>
                      );
                    }),
                  )}
                </div>

                {/* Feature 6: Moving piece animation overlay - inside the outer relative wrapper */}
                {movingPiece && (
                  <div
                    style={{
                      position: "absolute",
                      zIndex: 30,
                      pointerEvents: "none",
                      width: `${100 / 8}%`,
                      height: `${100 / 8}%`,
                      left: `${movingPiece.from.col * (100 / 8)}%`,
                      top: `${movingPiece.from.row * (100 / 8)}%`,
                      transition: `transform ${movingPiece.isAI ? 300 : 150}ms ${movingPiece.isAI ? "ease-in-out" : "ease-out"}`,
                      transform: `translate(${(movingPiece.to.col - movingPiece.from.col) * 100}%, ${(movingPiece.to.row - movingPiece.from.row) * 100}%)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span
                      className="text-4xl sm:text-5xl md:text-6xl font-bold"
                      style={{
                        color:
                          movingPiece.piece?.color === "w" ? "white" : "#111",
                        textShadow:
                          movingPiece.piece?.color === "w"
                            ? "0 0 8px rgba(255,255,255,0.5), 0 4px 6px rgba(0,0,0,0.9)"
                            : "0 0 6px rgba(0,0,0,0.3), 0 2px 4px rgba(255,255,255,0.4)",
                      }}
                    >
                      {getPieceSymbol(movingPiece.piece)}
                    </span>
                  </div>
                )}

                <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-around pl-1 text-xs text-foreground font-bold">
                  {[8, 7, 6, 5, 4, 3, 2, 1].map((num) => (
                    <div key={num} className="h-[12.5%] flex items-center">
                      {num}
                    </div>
                  ))}
                </div>
                <div className="absolute bottom-0 left-0 right-0 flex justify-around pb-1 text-xs text-foreground font-bold">
                  {["a", "b", "c", "d", "e", "f", "g", "h"].map((letter) => (
                    <div key={letter} className="w-[12.5%] flex justify-center">
                      {letter}
                    </div>
                  ))}
                </div>
              </div>

              {gameStatus !== "playing" && (
                <div className="text-center p-6 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-xl border-4 border-primary/40">
                  <p className="text-3xl font-bold gradient-text-vibrant mb-2">
                    {gameStatus === "checkmate" &&
                      winner &&
                      `${t.checkmate} ${winner === "w" ? t.whiteWins : t.blackWins}`}
                    {gameStatus === "stalemate" && t.stalemate}
                    {gameStatus === "draw" && t.draw}
                    {gameStatus === "timeout" &&
                      winner &&
                      `${t.timeout} ${winner === "w" ? t.white : t.black} ${t.timeoutWin}`}
                  </p>
                  {gameStatus === "checkmate" && gameMode === "ai" && (
                    <p className="text-xl font-semibold text-foreground">
                      {winner === "w" ? t.congratsAIDefeated : t.aiWonTryAgain}
                    </p>
                  )}
                  {gameStatus === "timeout" && gameMode === "ai" && (
                    <p className="text-xl font-semibold text-foreground">
                      {winner === "w"
                        ? t.congratsAITimeout
                        : t.yourTimeoutTryAgain}
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card className="border-4 glow-border-animated shadow-2xl solid-overlay h-full hover-glow">
          <CardContent className="p-6">
            <h3 className="text-2xl font-bold mb-4 gradient-text-primary">
              {t.moveHistory}
            </h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {moveHistory.length === 0 ? (
                <p className="text-base text-foreground text-center py-8 font-semibold">
                  {t.noMovesYet}
                </p>
              ) : (
                moveHistory.map((move, index) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: move history is append-only
                    key={index}
                    className={`
                      text-base p-4 rounded-lg transition-all duration-300
                      ${
                        index === moveHistory.length - 1
                          ? "bg-gradient-to-r from-primary/30 to-secondary/30 border-4 border-primary/50 shadow-lg"
                          : "bg-gradient-to-r from-primary/10 to-secondary/10 border-2 border-primary/20"
                      }
                    `}
                  >
                    <span className="font-mono text-foreground mr-2 font-bold">
                      {index + 1}.
                    </span>
                    <span
                      className={`${index === moveHistory.length - 1 ? "font-bold" : "font-semibold"} text-foreground`}
                    >
                      {move}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
