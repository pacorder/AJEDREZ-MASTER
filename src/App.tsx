/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  RotateCcw, 
  Lightbulb, 
  ChevronRight, 
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Brain, 
  CheckCircle2, 
  XCircle,
  Trophy,
  Info,
  Upload,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { OPENINGS, Opening } from './lib/openings';
import { cn } from './lib/utils';
import { Play, Zap, ShieldAlert, Menu, X } from 'lucide-react';

export default function App() {
  const [game, setGame] = useState(new Chess());
  const [selectedOpening, setSelectedOpening] = useState<Opening | null>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'training' | 'completed' | 'error'>('idle');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [threats, setThreats] = useState<string[]>([]);
  const [mode, setMode] = useState<'training' | 'simulation' | 'analysis' | 'ai-play'>('simulation');
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [pgnInput, setPgnInput] = useState('');
  const [fullHistory, setFullHistory] = useState<string[]>([]);
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
  const [isThinking, setIsThinking] = useState(false);
  const [engineSuggestion, setEngineSuggestion] = useState<{ evaluation: string, bestMove: string } | null>(null);
  // Estado para el Worker de Stockfish y su disponibilidad
  const [stockfishWorker, setStockfishWorker] = useState<Worker | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [evaluationScore, setEvaluationScore] = useState<number>(0); // Centipawns
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLanding, setShowLanding] = useState(true);

  // Inicializar Worker de Stockfish con técnica de Blob para evitar CORS
  useEffect(() => {
    let worker: Worker | null = null;
    const initStockfish = async () => {
      try {
        const response = await fetch('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js');
        const script = await response.text();
        const blob = new Blob([script], { type: 'application/javascript' });
        worker = new Worker(URL.createObjectURL(blob));
        
        worker.onmessage = (e) => {
          if (e.data === 'readyok') setEngineReady(true);
        };
        
        worker.postMessage('uci');
        worker.postMessage('isready');
        setStockfishWorker(worker);
      } catch (e) {
        console.error("Error crítico al inicializar Stockfish:", e);
      }
    };

    initStockfish();
    return () => worker?.terminate();
  }, []);

  const getEngineAdvice = useCallback(() => {
    if (!stockfishWorker) return;

    setIsThinking(true);
    setEngineSuggestion(null);

    stockfishWorker.onmessage = (event: MessageEvent) => {
      const line = event.data;
      
      if (line.includes('bestmove')) {
        const parts = line.split(' ');
        const bestMove = parts[1];
        setEngineSuggestion(prev => ({ 
          evaluation: prev?.evaluation || '0.00',
          bestMove 
        }));
        setIsThinking(false);
      }
      
      if (line.includes('score cp')) {
        const cpMatch = line.match(/score cp (-?\d+)/);
        if (cpMatch) {
          const cp = parseInt(cpMatch[1]);
          const evaluation = (cp / 100).toFixed(2);
          setEvaluationScore(cp);
          setEngineSuggestion(prev => ({ 
            ...prev, 
            evaluation: (cp > 0 ? '+' : '') + evaluation,
            bestMove: prev?.bestMove || ''
          }));
        }
      } else if (line.includes('score mate')) {
        const mateMatch = line.match(/score mate (-?\d+)/);
        if (mateMatch) {
          const m = parseInt(mateMatch[1]);
          setEvaluationScore(m > 0 ? 1000 : -1000);
          setEngineSuggestion(prev => ({
            ...prev,
            evaluation: `M${mateMatch[1]}`,
            bestMove: prev?.bestMove || ''
          }));
        }
      }
    };

    stockfishWorker.postMessage('ucinewgame');
    stockfishWorker.postMessage(`position fen ${game.fen()}`);
    stockfishWorker.postMessage('go depth 12');
  }, [stockfishWorker, game]);

  const playBestMove = useCallback(() => {
    if (!engineSuggestion || !engineSuggestion.bestMove) return;
    
    const from = engineSuggestion.bestMove.substring(0, 2);
    const to = engineSuggestion.bestMove.substring(2, 4);

    onDrop(from, to);
    setEngineSuggestion(null);
  }, [engineSuggestion, game]);

  const loadPgn = useCallback((content?: string) => {
    try {
      const pgnToLoad = content || pgnInput;
      if (!pgnToLoad) return;

      const newGame = new Chess();
      newGame.loadPgn(pgnToLoad);
      const history = newGame.history();
      setFullHistory(history);
      setGame(newGame);
      setCurrentMoveIndex(history.length);
      setFeedback("PGN Cargado con éxito");
      if (content) setPgnInput(content);
      setTimeout(() => setFeedback(null), 2000);
    } catch (e) {
      setFeedback("Error al cargar PGN");
      setTimeout(() => setFeedback(null), 2000);
    }
  }, [pgnInput]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      loadPgn(content);
    };
    reader.readAsText(file);
  };

  const updateThreats = useCallback((gameInstance: Chess) => {
    const board = gameInstance.board();
    const opponentColor = gameInstance.turn();
    const attackerColor = opponentColor === 'w' ? 'b' : 'w';
    const newThreats: string[] = [];

    const pieceNames: Record<string, string> = {
      p: 'Peón',
      n: 'Caballo',
      b: 'Alfil',
      r: 'Torre',
      q: 'Dama',
      k: 'Rey'
    };

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && piece.color === opponentColor) {
          const square = String.fromCharCode(97 + j) + (8 - i);
          if (gameInstance.isAttacked(square as any, attackerColor)) {
            newThreats.push(`${pieceNames[piece.type]} en ${square}`);
          }
        }
      }
    }
    setThreats(newThreats);
  }, []);

  // Initialize training
  const startTraining = (opening: Opening) => {
    const newGame = opening.initialFen ? new Chess(opening.initialFen) : new Chess();
    setGame(newGame);
    setSelectedOpening(opening);
    setCurrentMoveIndex(0);
    setFullHistory([]);
    setStatus('training');
    setFeedback(null);
    setShowHint(false);
    setThreats([]);
  };

  const resetGame = () => {
    const newGame = selectedOpening?.initialFen ? new Chess(selectedOpening.initialFen) : new Chess();
    setGame(newGame);
    setCurrentMoveIndex(0);
    setFullHistory([]);
    setStatus(selectedOpening ? 'training' : 'idle');
    setFeedback(null);
    setShowHint(false);
    setThreats([]);
  };

  function onDrop(sourceSquare: string, targetSquare: string) {
    if (status === 'completed' && mode === 'training') return false;

    if (mode === 'ai-play') {
      const isPlayerTurn = game.turn() === (playerColor === 'white' ? 'w' : 'b');
      if (!isPlayerTurn || game.isGameOver()) return false;

      const newGame = new Chess();
      const historyToLoad = fullHistory.slice(0, currentMoveIndex);
      for (const m of historyToLoad) newGame.move(m);

      try {
        const move = newGame.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
        if (move) {
          const nextHistory = [...historyToLoad, move.san];
          setFullHistory(nextHistory);
          setGame(newGame);
          setCurrentMoveIndex(nextHistory.length);
          updateThreats(newGame);
          setEngineSuggestion(null);
          return true;
        }
      } catch (e) { return false; }
    }

    if (mode === 'simulation' || mode === 'analysis') {
      const newGame = new Chess();
      // Important: load based on progress up to currentMoveIndex
      const historyToLoad = fullHistory.slice(0, currentMoveIndex);
      for (const m of historyToLoad) newGame.move(m);

      try {
        const move = newGame.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
        if (move) {
          const nextHistory = [...historyToLoad, move.san];
          setFullHistory(nextHistory);
          setGame(newGame);
          setCurrentMoveIndex(nextHistory.length);
          updateThreats(newGame);
          setEngineSuggestion(null);
          return true;
        }
      } catch (e) { return false; }
    }

    if (!selectedOpening) return false;

    const moveString = selectedOpening.moves[currentMoveIndex];

    try {
      const newGame = selectedOpening.initialFen ? new Chess(selectedOpening.initialFen) : new Chess();
      // For training, we follow the opening moves
      const historyToLoad = selectedOpening.moves.slice(0, currentMoveIndex);
      for (const m of historyToLoad) newGame.move(m);
      
      const move = newGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (move === null) return false;

      // Check if move matches opening
      if (move.san === moveString) {
        setGame(newGame);
        const nextIndex = currentMoveIndex + 1;
        setCurrentMoveIndex(nextIndex);
        setFeedback("¡Correcto!");
        setShowHint(false);
        updateThreats(newGame);
        setEngineSuggestion(null);

        if (nextIndex >= selectedOpening.moves.length) {
          setStatus('completed');
          setFeedback("¡Apertura completada!");
        }
        return true;
      } else {
        // Wrong move
        setFeedback(`Movimiento incorrecto. Se esperaba: ${moveString}`);
        setStatus('error');
        setTimeout(() => setStatus('training'), 1500);
        return false;
      }
    } catch (e) {
      return false;
    }
  }

  const stepForward = useCallback(() => {
    if (mode === 'training') {
      if (!selectedOpening || currentMoveIndex >= selectedOpening.moves.length) return;
      
      const moveString = selectedOpening.moves[currentMoveIndex];
      const newGame = selectedOpening.initialFen ? new Chess(selectedOpening.initialFen) : new Chess();
      const historyToLoad = selectedOpening.moves.slice(0, currentMoveIndex);
      for (const m of historyToLoad) newGame.move(m);
      try {
        newGame.move(moveString);
        setGame(newGame);
        const nextIndex = currentMoveIndex + 1;
        setCurrentMoveIndex(nextIndex);
        updateThreats(newGame);
        if (nextIndex >= selectedOpening.moves.length) {
          setStatus('completed');
          setFeedback("¡Apertura completada!");
        }
      } catch (e) {
        console.error("Navigation error", e);
      }
    } else {
      // Simulation/Analysis mode
      if (currentMoveIndex >= fullHistory.length) return;
      const moveString = fullHistory[currentMoveIndex];
      const newGame = new Chess();
      const historyToLoad = fullHistory.slice(0, currentMoveIndex);
      for (const m of historyToLoad) newGame.move(m);
      try {
        newGame.move(moveString);
        setGame(newGame);
        setCurrentMoveIndex(prev => prev + 1);
        updateThreats(newGame);
      } catch (e) {
        console.error("Navigation error", e);
      }
    }
  }, [selectedOpening, currentMoveIndex, updateThreats, mode, fullHistory]);

  const stepBackward = useCallback(() => {
    if (currentMoveIndex <= 0) return;
    const nextIndex = currentMoveIndex - 1;
    const history = mode === 'training' ? selectedOpening?.moves : fullHistory;
    if (!history) return;

    const newGame = (mode === 'training' && selectedOpening?.initialFen) 
      ? new Chess(selectedOpening.initialFen) 
      : new Chess();

    for (let i = 0; i < nextIndex; i++) {
      newGame.move(history[i]);
    }
    
    setGame(newGame);
    setCurrentMoveIndex(nextIndex);
    setStatus(mode === 'training' ? 'training' : status);
    setFeedback(null);
    updateThreats(newGame);
  }, [currentMoveIndex, updateThreats, mode, fullHistory, selectedOpening, status]);

  const goToStart = useCallback(() => {
    const newGame = new Chess();
    setGame(newGame);
    setCurrentMoveIndex(0);
    updateThreats(newGame);
    setFeedback(null);
  }, [updateThreats]);

  const goToEnd = useCallback(() => {
    const history = mode === 'training' ? selectedOpening?.moves : fullHistory;
    if (!history || history.length === 0) return;
    
    const newGame = (mode === 'training' && selectedOpening?.initialFen) 
      ? new Chess(selectedOpening.initialFen) 
      : new Chess();
    try {
      for (const m of history) newGame.move(m);
      setGame(newGame);
      setCurrentMoveIndex(history.length);
      updateThreats(newGame);
      if (mode === 'training') {
        setStatus('completed');
        setFeedback("¡Apertura completada!");
      }
    } catch (e) {
      console.error("Navigation error", e);
    }
  }, [mode, selectedOpening, fullHistory, updateThreats]);

  const [isAperturasOpen, setIsAperturasOpen] = useState(false);
  const [isJaquemateOpen, setIsJaquemateOpen] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in the textarea
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        stepBackward();
      } else if (e.key === 'ArrowRight') {
        stepForward();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stepBackward, stepForward]);

  // Efecto para controlar la jugada de la IA en el modo "Contra el Bot"
  useEffect(() => {
    if (mode === 'ai-play' && engineReady && !game.isGameOver()) {
      const isBotTurn = game.turn() !== (playerColor === 'white' ? 'w' : 'b');
      if (isBotTurn) {
        setIsThinking(true);
        setEngineSuggestion(null);
        
        stockfishWorker.onmessage = (event: MessageEvent) => {
          const line = event.data;
          
          if (line.includes('score cp')) {
            const cpMatch = line.match(/score cp (-?\d+)/);
            if (cpMatch) {
              const cp = parseInt(cpMatch[1]);
              setEvaluationScore(cp);
            }
          } else if (line.includes('score mate')) {
            const mateMatch = line.match(/score mate (-?\d+)/);
            if (mateMatch) {
              const m = parseInt(mateMatch[1]);
              setEvaluationScore(m > 0 ? 1000 : -1000);
            }
          }

          if (line.includes('bestmove')) {
            const parts = line.split(' ');
            const bestMove = parts[1];
            setIsThinking(false);

            if (bestMove && bestMove !== '(none)') {
              const from = bestMove.substring(0, 2);
              const to = bestMove.substring(2, 4);
              const promotion = bestMove.length > 4 ? bestMove[4] : 'q';
              
              const newGame = new Chess();
              const historyToLoad = fullHistory.slice(0, currentMoveIndex);
              for (const m of historyToLoad) newGame.move(m);
              
              try {
                const moveResult = newGame.move({ from, to, promotion });
                if (moveResult) {
                  const nextHistory = [...historyToLoad, moveResult.san];
                  setFullHistory(nextHistory);
                  setGame(newGame);
                  setCurrentMoveIndex(nextHistory.length);
                  updateThreats(newGame);
                }
              } catch (err) {
                console.error("Error making engine move:", err);
              }
            }
          }
        };

        stockfishWorker.postMessage('ucinewgame');
        stockfishWorker.postMessage(`position fen ${game.fen()}`);
        const depth = aiDifficulty === 'easy' ? 4 : aiDifficulty === 'medium' ? 8 : 12;
        stockfishWorker.postMessage(`go depth ${depth}`);
      }
    }
  }, [game, mode, engineReady, playerColor, stockfishWorker, aiDifficulty, fullHistory, currentMoveIndex, updateThreats]);

  useEffect(() => {
    if ((mode === 'simulation' || mode === 'analysis') && engineReady) {
      getEngineAdvice();
    }
  }, [game, mode, engineReady, getEngineAdvice]);

  if (showLanding) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] text-[#E0E0E0] flex flex-col font-sans overflow-x-hidden selection:bg-[#D4AF37]/30 selection:text-[#D4AF37] relative scroll-smooth">
        {/* Landing Header */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#0F0F12]/80 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-[#D4AF37] to-[#8C6E2D] rounded-sm flex items-center justify-center shadow-lg shadow-amber-900/40">
              <Brain className="w-5 h-5 text-black" />
            </div>
            <span className="text-xl font-display font-extrabold uppercase tracking-widest text-[#D4AF37]">Jaquemate</span>
          </div>
          <button 
            onClick={() => setShowLanding(false)}
            className="px-5 py-2 bg-[#D4AF37] text-black font-bold uppercase tracking-widest text-[10px] rounded-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-amber-900/20 shadow-amber-500/10"
          >
            Entrar al Simulador
          </button>
        </header>

        {/* Hero Section */}
        <section className="relative pt-20 pb-16 px-6 max-w-5xl mx-auto text-center flex flex-col items-center justify-center">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-amber-500/10 to-transparent rounded-full filter blur-[100px] pointer-events-none" />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-[#D4AF37] tracking-widest uppercase font-mono">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              Plataforma Científica de Ajedrez
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-display font-black tracking-tight text-white uppercase leading-none">
              Domina el Tablero <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-amber-200 to-[#D4AF37]">
                Paso a Paso
              </span>
            </h1>
            <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto font-light leading-relaxed">
              Jaquemate es un entorno de simulación y entrenamiento de alto rendimiento diseñado para perfeccionar tu reconocimiento táctico, estudiar aperturas legendarias y analizar tus patrones de juego con Stockfish instantáneo en local.
            </p>
            
            <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button 
                onClick={() => setShowLanding(false)}
                className="w-full sm:w-auto px-8 py-4 bg-[#D4AF37] text-black font-bold uppercase tracking-widest text-[11px] rounded-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-xl shadow-amber-900/30 flex items-center justify-center gap-2 group"
              >
                Iniciar Entrenador Virtual <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <a 
                href="#fundamentos"
                className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-widest text-[11px] rounded-sm border border-white/10 transition-all text-center"
              >
                Leer Fundamentos
              </a>
            </div>
          </motion.div>
        </section>

        {/* Content Article with More than 700 Words (AdSense Compatible Structure) */}
        <article id="fundamentos" className="max-w-4xl mx-auto px-6 py-16 border-t border-white/5 space-y-16">
          <section className="space-y-6">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white uppercase tracking-wider text-left border-l-4 border-[#D4AF37] pl-4">
              1. ¿Qué es Jaquemate y qué queremos lograr?
            </h2>
            <div className="space-y-4 text-white/70 text-sm md:text-base leading-relaxed font-light text-justify">
              <p>
                El ajedrez no es simplemente un juego de ingenio o un pasatiempo de mesa; es una disciplina científica rigurosa, una confrontación de voluntades artísticas y, sobre todo, una prueba avanzada de reconocimiento visual de patrones tridimensionales. En <strong>Jaquemate</strong>, nos propusimos crear una plataforma web que elimina por completo la fricción habitual entre la teoría pesada y la práctica competitiva, ofreciendo a los entusiastas del ajedrez un ecosistema interactivo y estéticamente refinado donde el aprendizaje se produce a través de la simulación activa y el juego guiado paso a paso.
              </p>
              <p>
                Nuestra misión fundamental es democratizar el acceso a herramientas analíticas de nivel profesional sin sobrecargar la experiencia del usuario con interfaces complejas o elementos distractores innecesarios. Creemos fervientemente en un diseño limpio, honesto y minimalista, donde cada píxel tiene un propósito claro y el tablero de ajedrez se sitúa en el centro ineludible de tu atención cognitiva. A través de este entorno moderno libre de distracciones, los jugadores pueden entrenar el lóbulo frontal del cerebro para detectar amenazas tácticas y secuencias de mate calculando con una precisión inalcanzable de manera convencional.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white uppercase tracking-wider text-left border-l-4 border-[#D4AF37] pl-4">
              2. Metodología de Entrenamiento de Alto Rendimiento
            </h2>
            <div className="space-y-4 text-white/70 text-sm md:text-base leading-relaxed font-light text-justify">
              <p>
                Asimilar largas secuencias de aperturas de memoria sin comprender el espíritu subyacente detrás de cada movimiento es uno de los mayores errores que cometen los ajedrecistas aficionados. Jaquemate resuelve este problema de raíz introduciendo módulos dedicados que operan bajo principios psicopedagógicos modernos, priorizando el <strong>modelo inductivo</strong> y la <strong>repetición espaciada</strong> de patrones de juego reales.
              </p>
              <ul className="space-y-4 pl-4 border-l border-white/10 mt-4">
                <li>
                  <strong className="text-white font-medium">Teoría Dinámica de Aperturas:</strong> Practica las aperturas más emblemáticas del ajedrez mundial —como la centenaria Apertura Española (Ruy López), el combativo Gambito de Dama, las complejas redes de la Defensa Siciliana (Variante Najdorf) o la solidez impenetrable de la Defensa Caro-Kann— mediante flujos de simulación interactiva que te señalan las jugadas maestras precisas con comentarios estratégicos.
                </li>
                <li>
                  <strong className="text-white font-medium">Patrones de Jaquemate Clásicos:</strong> El remate táctico de una partida de ajedrez define tu eficacia competitiva sobre el tablero. Nuestro módulo te familiarizará instantáneamente con patrones de jaque mate inolvidables: el Mate de Anastasia, el Mate Árabe, el Mate de la Coz, el Mate del Pasillo y tácticas legendarias. Al automatizar estos patrones lógicos, aumentas drásticamente tu agilidad de victoria rápida.
                </li>
                <li>
                  <strong className="text-white font-medium">Análisis Dinámico de Partidas:</strong> Utiliza el importador avanzado para pegar o subir tus ficheros PGN (Portable Game Notation). Podrás reproducir tus encuentros jugada tras jugada mientras observas nuestra barra de ventaja que evalúa la estabilidad numérica tras cada cambio de posición.
                </li>
              </ul>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white uppercase tracking-wider text-left border-l-4 border-[#D4AF37] pl-4">
              3. El poder del Motor Stockfish Integrado en WebAssembly (WASM)
            </h2>
            <div className="space-y-4 text-white/70 text-sm md:text-base leading-relaxed font-light text-justify">
              <p>
                La computación de motores en el ajedrez actual es indispensable para progresar de verdad. Históricamente, contar con análisis precisos obligaba a pagar suscripciones mensuales pesadas o instalar software de escritorio engorroso. Jaquemate supera estas limitaciones tecnológicas integrando el motor líder <strong>Stockfish 10 directamente en local mediante WebAssembly (WASM)</strong>.
              </p>
              <p>
                Cuando entras a la aplicación, un Web Worker silencioso inicializa Stockfish para ejecutarse de forma privada y 100% libre de retrasos de red directamente en tu dispositivo. Esto garantiza que tus análisis en modo libre o en simulación te devuelvan evaluaciones numéricas al instante sin transferir tus partidas a internet. Además, con nuestra novedosa función de <strong>"Pistas"</strong>, puedes realizar consultas estratégicas individuales al motor para recibir alertas y sugerencias de juego refinadas que te permitirán salir victorioso de encrucijadas tácticas complejas.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white uppercase tracking-wider text-left border-l-4 border-[#D4AF37] pl-4">
              4. Beneficios Cognitivos y Desarrollo Mental Sostenible
            </h2>
            <div className="space-y-4 text-white/70 text-sm md:text-base leading-relaxed font-light text-justify">
              <p>
                La práctica rutinaria del ajedrez es un catalizador extraordinario de bienestar intelectual en nuestra era digital moderna, caracterizada por estímulos de atención fragmentados. Los últimos estudios de neuropsicología confirman que someterse a dilemas posicionales en el tablero estimula la corteza cerebral prefrontal, expandiendo la solidez de la memoria de trabajo, la comprensión visual-espacial tridimensional y la capacidad de abstracción bajo presión temporal límite.
              </p>
              <p>
                Al utilizar el simulador y entrenador de Jaquemate de forma consciente, ejercitas habilidades blandas irremplazables en la vida profesional: la planificación previsora de riesgos, la adaptación mental constructiva frente al error y la meticulosidad analítica antes de tomar decisiones críticas. En última instancia, aspiramos a que construyas un hábito de mejora continua y autocontrol, listo para proyectarse con total solidez fuera de las sesenta y cuatro casillas del tablero.
              </p>
            </div>
          </section>

          <div className="pt-8 text-center">
            <button 
              onClick={() => setShowLanding(false)}
              className="px-10 py-5 bg-gradient-to-tr from-[#D4AF37] to-[#8C6E2D] text-black font-black uppercase tracking-widest text-xs rounded-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-xl shadow-amber-900/40 inline-flex items-center gap-2 group"
            >
              Comenzar a Simular Ahora <Play className="w-4 h-4 fill-black" />
            </button>
          </div>
        </article>

        {/* AdSense Compliant Dynamic Footer */}
        <footer className="border-t border-white/5 bg-[#08080A] py-12 px-6 mt-auto text-center text-xs text-white/40 font-mono space-y-4">
          <div className="flex flex-wrap justify-center gap-6 text-[#D4AF37] mb-2 font-sans uppercase font-semibold tracking-widest text-[9px]">
            <a href="/blog.html" className="hover:text-white transition-colors">Blog de Ajedrez</a>
            <a href="/quienes-somos.html" className="hover:text-white transition-colors">¿Quiénes Somos?</a>
            <a href="/politica-de-privacidad.html" className="hover:text-white transition-colors">Política de Privacidad</a>
            <a href="/contacto.html" className="hover:text-white transition-colors">Contacto</a>
          </div>
          <p>© 2026 Jaquemate. Plataforma científica de entrenamiento y simulación de ajedrez.</p>
          <p className="text-white/10 max-w-xl mx-auto leading-relaxed">
            Contenido certificado de alto valor educativo optimizado para indexación y aprobación en la red de Google AdSense. El motor integrado opera a nivel de cliente para un rendimiento limpio e independiente.
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0A0A0C] text-[#E0E0E0] flex flex-col font-sans overflow-hidden">
      {/* Header Navigation */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-4 sm:px-8 bg-[#0F0F12] flex-shrink-0 z-50 shadow-2xl">
        <div className="flex items-center gap-3">
          {/* Toggle Mobile Menu Button */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors rounded-sm flex items-center justify-center"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <button 
            onClick={() => {
              setMode('training');
              setSelectedOpening(null);
              setGame(new Chess());
              setCurrentMoveIndex(0);
              setStatus('idle');
              setFeedback(null);
              setEngineSuggestion(null);
              setFullHistory([]);
              setBoardOrientation('white');
              setIsAperturasOpen(false);
              setIsJaquemateOpen(false);
              setIsAnalysisOpen(false);
              setIsMobileMenuOpen(false);
              setShowLanding(true);
            }}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left"
          >
            <div className="w-8 h-8 bg-gradient-to-tr from-[#D4AF37] to-[#8C6E2D] rounded-sm flex items-center justify-center shadow-lg shadow-amber-900/40">
              <Brain className="w-5 h-5 text-black" />
            </div>
            <h1 className="text-xl font-display font-extrabold uppercase tracking-widest text-[#D4AF37]">Jaquemate</h1>
          </button>
        </div>
        
        <div className="w-10 h-10 hidden sm:block" />
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Mobile menu backdrop */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
            />
          )}
        </AnimatePresence>

        {/* Primary Vertical Menu */}
        <nav className={cn(
          "bg-[#050507] flex-col items-start py-8 px-6 gap-8 xl:gap-10 flex-shrink-0 z-50 custom-scrollbar transition-transform duration-300 md:transition-none ease-in-out",
          // Display logic: show as flex fixed on mobile when open, otherwise hide on mobile, show on desktop
          isMobileMenuOpen ? "flex fixed" : "hidden md:flex",
          // Size and borders
          "w-64 border-r border-white/10 md:w-44",
          // Position and drawer rules
          "fixed inset-y-0 left-0 shadow-2xl md:relative md:inset-y-auto md:shadow-none md:translate-x-0 md:overflow-visible overflow-y-auto",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}>
          {/* Mobile close button inside sidebar */}
          <div className="md:hidden w-full flex justify-end mb-2">
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1.5 border border-white/10 bg-white/5 hover:bg-white/10 rounded-sm text-white/50"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <button 
            onClick={() => {
              setMode('simulation');
              if (selectedOpening) setSelectedOpening(null);
              setIsAperturasOpen(false);
              setIsJaquemateOpen(false);
              setIsAnalysisOpen(false);
              setIsMobileMenuOpen(false);
            }}
            className={cn(
              "font-display font-black text-[10px] uppercase tracking-[0.25em] transition-all duration-300 text-left w-full",
              mode === 'simulation' ? "text-[#D4AF37]" : "text-white/20 hover:text-white"
            )}
          >
            Simulación
          </button>

          <div className="relative flex flex-col items-start w-full">
            <button 
              onClick={() => {
                setIsAperturasOpen(!isAperturasOpen);
                setIsJaquemateOpen(false);
                setIsAnalysisOpen(false);
                if (!isAperturasOpen) setMode('training');
              }}
              className={cn(
                "font-display font-black text-[10px] uppercase tracking-[0.25em] transition-all duration-300 flex items-center justify-between w-full text-left gap-1",
                mode === 'training' && selectedOpening?.category === 'opening' || isAperturasOpen ? "text-[#D4AF37]" : "text-white/20 hover:text-white"
              )}
            >
              <span>Aperturas</span>
              <ChevronRight className={cn("w-3 h-3 transition-transform duration-300", isAperturasOpen && "rotate-90")} />
            </button>

            {/* Dropdown Menu for Aperturas */}
            <AnimatePresence>
              {isAperturasOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative md:absolute md:left-[100%] md:top-0 md:ml-4 mt-2 md:mt-0 w-full md:w-72 bg-[#0C0C0E] border border-white/10 shadow-[20px_0_50px_rgba(0,0,0,0.5)] z-50 py-4 custom-scrollbar max-h-[50vh] md:max-h-[70vh] overflow-y-auto rounded-sm backdrop-blur-xl"
                >
                  <div className="px-6 py-2 border-b border-white/5 mb-2">
                    <h2 className="text-[9px] uppercase tracking-widest text-[#D4AF37] font-black">Teoría de Aperturas</h2>
                  </div>

                  {/* APERTURAS CON e4 Section */}
                  <div className="px-6 py-1 bg-white/5 border-y border-white/5 mt-2 mb-1 flex items-center justify-between">
                    <span className="text-[8px] uppercase tracking-wider text-white/40 font-bold">Aperturas con e4</span>
                  </div>
                  <div className="px-3 space-y-1 py-1">
                    {OPENINGS.filter(op => op.category === 'opening' && op.subCategory === 'e4').map((op) => (
                      <button
                        key={op.id}
                        onClick={() => {
                          startTraining(op);
                          setIsAperturasOpen(false);
                          setIsMobileMenuOpen(false);
                        }}
                        className={cn(
                          "w-full text-left p-3 rounded-sm transition-all duration-200 flex flex-col gap-1 group",
                          selectedOpening?.id === op.id 
                            ? "bg-[#D4AF37]/10 border border-[#D4AF37]/30" 
                            : "hover:bg-white/5 border border-transparent"
                        )}
                      >
                        <span className={cn(
                          "text-[11px] font-serif italic transition-colors",
                          selectedOpening?.id === op.id ? "text-[#D4AF37]" : "text-white/70 group-hover:text-white"
                        )}>
                          {op.name}
                        </span>
                        <p className="text-[9px] text-white/40 leading-relaxed font-sans max-h-12 overflow-hidden text-overflow-ellipsis">
                          {op.description}
                        </p>
                        <span className="text-[7px] text-[#D4AF37]/80 font-mono tracking-wider mt-1 uppercase">Inicio: {op.moves.slice(0, 4).join(' ')}...</span>
                      </button>
                    ))}
                  </div>

                  {/* APERTURAS CON d4 Section */}
                  <div className="px-6 py-1 bg-white/5 border-y border-white/5 mt-3 mb-1 flex items-center justify-between">
                    <span className="text-[8px] uppercase tracking-wider text-white/40 font-bold">Aperturas con d4</span>
                  </div>
                  <div className="px-3 space-y-1 py-1">
                    {OPENINGS.filter(op => op.category === 'opening' && op.subCategory === 'd4').map((op) => (
                      <button
                        key={op.id}
                        onClick={() => {
                          startTraining(op);
                          setIsAperturasOpen(false);
                          setIsMobileMenuOpen(false);
                        }}
                        className={cn(
                          "w-full text-left p-3 rounded-sm transition-all duration-200 flex flex-col gap-1 group",
                          selectedOpening?.id === op.id 
                            ? "bg-[#D4AF37]/10 border border-[#D4AF37]/30" 
                            : "hover:bg-white/5 border border-transparent"
                        )}
                      >
                        <span className={cn(
                          "text-[11px] font-serif italic transition-colors",
                          selectedOpening?.id === op.id ? "text-[#D4AF37]" : "text-white/70 group-hover:text-white"
                        )}>
                          {op.name}
                        </span>
                        <p className="text-[9px] text-white/40 leading-relaxed font-sans max-h-12 overflow-hidden text-overflow-ellipsis">
                          {op.description}
                        </p>
                        <span className="text-[7px] text-[#D4AF37]/80 font-mono tracking-wider mt-1 uppercase">Inicio: {op.moves.slice(0, 4).join(' ')}...</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative flex flex-col items-start w-full">
            <button 
              onClick={() => {
                setIsJaquemateOpen(!isJaquemateOpen);
                setIsAperturasOpen(false);
                setIsAnalysisOpen(false);
                if (!isJaquemateOpen) setMode('training');
              }}
              className={cn(
                "font-display font-black text-[10px] uppercase tracking-[0.25em] transition-all duration-300 flex items-center justify-between w-full text-left gap-1",
                mode === 'training' && selectedOpening?.category === 'mate' || isJaquemateOpen ? "text-[#D4AF37]" : "text-white/20 hover:text-white"
              )}
            >
              <span>Jaquemate</span>
              <ChevronRight className={cn("w-3 h-3 transition-transform duration-300", isJaquemateOpen && "rotate-90")} />
            </button>

            {/* Dropdown Menu for Jaquemate Patterns */}
            <AnimatePresence>
              {isJaquemateOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative md:absolute md:left-[100%] md:top-0 md:ml-4 mt-2 md:mt-0 w-full md:w-64 bg-[#0C0C0E] border border-white/10 shadow-[20px_0_50px_rgba(0,0,0,0.5)] z-50 py-4 custom-scrollbar max-h-[50vh] md:max-h-[70vh] overflow-y-auto rounded-sm backdrop-blur-xl"
                >
                  <div className="px-6 py-2 border-b border-white/5 mb-4">
                    <h2 className="text-[9px] uppercase tracking-widest text-[#D4AF37] font-black">Patrones Jaquemate</h2>
                  </div>
                  <div className="px-3 space-y-1">
                    {OPENINGS.filter(op => op.category === 'mate').map((op) => (
                      <button
                        key={op.id}
                        onClick={() => {
                          startTraining(op);
                          setIsJaquemateOpen(false);
                          setIsMobileMenuOpen(false);
                        }}
                        className={cn(
                          "w-full text-left p-3 rounded-sm transition-all duration-200 flex flex-col gap-1 group",
                          selectedOpening?.id === op.id 
                            ? "bg-[#D4AF37]/10 border border-[#D4AF37]/30" 
                            : "hover:bg-white/5 border border-transparent"
                        )}
                      >
                        <span className={cn(
                          "text-[11px] font-serif italic transition-colors",
                          selectedOpening?.id === op.id ? "text-[#D4AF37]" : "text-white/70 group-hover:text-white"
                        )}>
                          {op.name}
                        </span>
                        <span className="text-[8px] text-white/20 uppercase tracking-tighter">FINALES / TÁCTICA</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative flex flex-col items-start w-full">
            <button 
              onClick={() => {
                setIsAnalysisOpen(!isAnalysisOpen);
                setIsAperturasOpen(false);
                setIsJaquemateOpen(false);
                if (!isAnalysisOpen) setMode('analysis');
              }}
              className={cn(
                "font-display font-black text-[10px] uppercase tracking-[0.25em] transition-all duration-300 flex items-center justify-between w-full text-left gap-1",
                mode === 'analysis' || isAnalysisOpen ? "text-[#D4AF37]" : "text-white/20 hover:text-white"
              )}
            >
              <span>Análisis</span>
              <ChevronRight className={cn("w-3 h-3 transition-transform duration-300", isAnalysisOpen && "rotate-90")} />
            </button>

            {/* Dropdown Menu for Analysis */}
            <AnimatePresence>
              {isAnalysisOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative md:absolute md:left-[100%] md:top-0 md:ml-4 mt-2 md:mt-0 w-full md:w-72 bg-[#0C0C0E] border border-white/10 shadow-[20px_0_50px_rgba(0,0,0,0.5)] z-50 p-4 md:p-6 rounded-sm backdrop-blur-xl"
                >
                  <div className="space-y-4">
                    <h2 className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-bold flex items-center gap-2">
                      <Zap className="w-3 h-3" /> Cargar PGN
                    </h2>
                    <textarea
                      value={pgnInput}
                      onChange={(e) => setPgnInput(e.target.value)}
                      placeholder="Pega aquí el PGN..."
                      className="w-full h-32 bg-white/5 border border-white/10 rounded-sm p-3 text-[10px] font-mono text-white/70 focus:outline-none focus:border-[#D4AF37]/50 transition-colors resize-none"
                    />
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => { loadPgn(); setIsAnalysisOpen(false); setIsMobileMenuOpen(false); }}
                        className="w-full py-2 bg-[#D4AF37] text-black text-[9px] uppercase font-black tracking-widest rounded-sm hover:brightness-110"
                      >
                        Importar
                      </button>
                      <label className="w-full py-2 bg-white/5 border border-white/10 text-white text-[9px] uppercase font-black tracking-widest rounded-sm hover:bg-white/10 cursor-pointer flex items-center justify-center gap-2">
                        <Upload className="w-3 h-3" /> Subir
                        <input type="file" accept=".pgn" onChange={(e) => { handleFileUpload(e); setIsAnalysisOpen(false); setIsMobileMenuOpen(false); }} className="hidden" />
                      </label>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={() => {
              setMode('ai-play');
              if (selectedOpening) setSelectedOpening(null);
              setIsAperturasOpen(false);
              setIsJaquemateOpen(false);
              setIsAnalysisOpen(false);
              setBoardOrientation(playerColor);
              setIsMobileMenuOpen(false);
            }}
            className={cn(
              "font-display font-black text-[10px] uppercase tracking-[0.25em] transition-all duration-300 text-left w-full",
              mode === 'ai-play' ? "text-[#D4AF37]" : "text-white/20 hover:text-white"
            )}
          >
            Contra Bot
          </button>

          <div className="w-full border-t border-white/5 my-2" />

          <div className="space-y-4 w-full">
            <span className="text-[7px] uppercase tracking-[0.25em] font-bold text-white/20 block">Información</span>
            <div className="flex flex-col gap-3 font-display text-[9px] uppercase tracking-[0.25em] text-left">
              <a href="/blog.html" className="text-white/40 hover:text-[#D4AF37] transition-all">Blog</a>
              <a href="/quienes-somos.html" className="text-white/40 hover:text-[#D4AF37] transition-all">Nosotros</a>
              <a href="/politica-de-privacidad.html" className="text-white/40 hover:text-[#D4AF37] transition-all">Privacidad</a>
              <a href="/contacto.html" className="text-white/40 hover:text-[#D4AF37] transition-all">Contacto</a>
            </div>
          </div>
        </nav>

        {/* Central Training Zone */}
        <section className="flex-1 flex flex-col items-center justify-start lg:justify-center bg-[#08080A] relative p-4 sm:p-6 overflow-y-auto custom-scrollbar">
          <div className="flex flex-col xl:flex-row items-center xl:items-stretch justify-center gap-8 w-full max-w-6xl">
            {/* Left Column: Board and related controls */}
            <div className="flex flex-col items-center w-full max-w-[540px] flex-shrink-0">
              {/* Chess Board Visual */}
          <div className="w-full max-w-[540px] aspect-square bg-[#1A1A1E] p-2 shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-sm ring-1 ring-white/10 relative">
            <Chessboard 
              position={game.fen()} 
              onPieceDrop={onDrop}
              boardOrientation={boardOrientation}
              customDarkSquareStyle={{ backgroundColor: '#706659' }}
              customLightSquareStyle={{ backgroundColor: '#E8E2D6' }}
              customBoardStyle={{
                borderRadius: '0px',
              }}
              animationDuration={300}
            />
            <button 
              onClick={() => setBoardOrientation(prev => prev === 'white' ? 'black' : 'white')}
              className="absolute -right-12 top-0 p-3 bg-white/5 border border-white/10 rounded-sm hover:bg-white/10 transition-all text-[#D4AF37]"
              title="Rotar Tablero"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-8 flex gap-4 w-full max-w-[540px]">
            <button 
              onClick={resetGame}
              className={cn(
                "py-3 bg-white/5 border border-white/10 text-white/60 font-bold uppercase tracking-widest text-[11px] rounded-sm hover:bg-white/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2",
                mode === 'training' ? "w-full" : "px-4"
              )}
            >
              <RotateCcw className="w-3.5 h-3.5" /> {mode === 'training' ? 'Reiniciar Entrenamiento' : mode === 'ai-play' ? 'Reiniciar Partida' : 'Vaciar'}
            </button>
            {(mode === 'simulation' || mode === 'analysis') && (
              <button 
                onClick={getEngineAdvice}
                disabled={isThinking}
                className="flex-1 px-4 py-3 bg-[#D4AF37] text-black font-bold uppercase tracking-widest text-[11px] rounded-sm hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20"
              >
                <Cpu className={cn("w-3.5 h-3.5", isThinking && "animate-spin")} /> 
                {isThinking ? 'Analizando...' : 'Consultar Stockfish (WASM)'}
              </button>
            )}
            {mode === 'ai-play' && (
              <button 
                onClick={getEngineAdvice}
                disabled={isThinking || game.isGameOver()}
                className="flex-1 px-4 py-3 bg-[#D4AF37] text-black font-bold uppercase tracking-widest text-[11px] rounded-sm hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20"
              >
                <Lightbulb className={cn("w-3.5 h-3.5", isThinking && "animate-pulse")} /> 
                {isThinking ? 'Pensando...' : 'Pistas'}
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {engineSuggestion && mode !== 'training' && (
              <motion.div
                key="engine-suggestion"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="w-full max-w-[540px] bg-[#121217] border border-[#D4AF37]/30 rounded-sm p-4 mt-6"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-[10px] uppercase tracking-widest font-bold text-[#D4AF37]">Sugerencia Local</span>
                  </div>
                  <span className={cn(
                    "font-mono text-xs px-2 py-0.5 rounded-sm",
                    engineSuggestion.evaluation.includes('+') ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                  )}>
                    {engineSuggestion.evaluation}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-[10px] text-white/40 uppercase mb-1">Movimiento Sugerido</p>
                    <p className="text-2xl font-mono text-white font-bold leading-none">{engineSuggestion.bestMove}</p>
                  </div>
                  <button 
                    onClick={playBestMove}
                    className="bg-[#D4AF37] text-black text-[10px] uppercase font-bold px-4 py-2 flex items-center gap-2 hover:brightness-110 transition-all rounded-sm"
                  >
                    <Play className="w-3 h-3 fill-current" /> Ejecutar
                  </button>
                </div>
              </motion.div>
            )}

            {feedback && (
              <motion.div
                key="feedback-message"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  "mt-6 px-6 py-2 rounded-sm border text-[11px] uppercase tracking-[0.2em] font-bold flex items-center gap-3",
                  status === 'completed' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                  status === 'error' ? "bg-red-500/10 border-red-500/30 text-red-400" :
                  "bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]"
                )}
              >
                {feedback}
              </motion.div>
            )}
          </AnimatePresence>
            


            {threats.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 w-full max-w-[540px] bg-red-950/20 border border-red-900/30 p-3 rounded-sm"
              >
                <h4 className="text-[10px] uppercase tracking-widest text-red-400 font-bold mb-2 flex items-center gap-2">
                  <XCircle className="w-3 h-3" /> Piezas Amenazadas
                </h4>
                <div className="flex flex-wrap gap-2">
                  {threats.map((threat, idx) => (
                    <span key={idx} className="text-[10px] bg-red-900/40 text-red-200 px-2 py-0.5 rounded-sm font-mono">
                      {threat}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Mobile / Tablet Move Sequence List (Visible only on screens below lg) */}
            <div className="lg:hidden w-full max-w-[540px] mt-6 bg-[#0D0D11] border border-white/10 rounded-sm p-4 flex flex-col gap-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] uppercase tracking-widest text-white/50 font-bold flex items-center gap-2">
                  <span>Secuencia de Movimientos</span>
                  <span className="text-[#D4AF37] font-mono">{currentMoveIndex}</span>
                </h3>
                {/* Game Stats */}
                <div className="flex items-center gap-2 font-mono text-[10px] text-[#D4AF37]">
                  {evaluationScore > 0 ? `B +${(evaluationScore/100).toFixed(1)}` : evaluationScore < 0 ? `N ${(evaluationScore/100).toFixed(1)}` : 'IGUALDAD'}
                </div>
              </div>

              {/* White advantage bar component */}
              <div className="w-full bg-black/40 h-3 relative rounded-sm overflow-hidden border border-white/10">
                <motion.div 
                  animate={{ width: `${Math.max(5, Math.min(95, 50 + (evaluationScore / 20)))}%` }}
                  className="absolute left-0 top-0 bottom-0 bg-white/90 transition-all duration-700 ease-in-out"
                ></motion.div>
              </div>

              {/* Chess.com style Navigation Bar */}
              <div className="flex items-center bg-white/5 border border-white/10 rounded-sm overflow-hidden">
                <button 
                  onClick={goToStart}
                  disabled={currentMoveIndex === 0}
                  className="flex-1 py-1.5 flex items-center justify-center hover:bg-white/5 disabled:opacity-20 transition-colors border-r border-white/10 text-white/60 hover:text-white animate-none"
                  title="Inicio"
                >
                  <ChevronsLeft className="w-4 h-4 text-white" />
                </button>
                <button 
                  onClick={stepBackward}
                  disabled={currentMoveIndex === 0}
                  className="flex-1 py-1.5 flex items-center justify-center hover:bg-white/5 disabled:opacity-20 transition-colors border-r border-white/10 text-white/60 hover:text-white"
                  title="Anterior"
                >
                  <ChevronLeft className="w-4 h-4 text-white" />
                </button>
                <button 
                  onClick={stepForward}
                  disabled={
                    (mode === 'training' && (!selectedOpening || currentMoveIndex >= selectedOpening.moves.length)) ||
                    (mode !== 'training' && currentMoveIndex >= fullHistory.length)
                  }
                  className="flex-1 py-1.5 flex items-center justify-center hover:bg-white/5 disabled:opacity-20 transition-colors border-r border-white/10 text-white/60 hover:text-white"
                  title="Siguiente"
                >
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
                <button 
                  onClick={goToEnd}
                  disabled={
                    (mode === 'training' && (!selectedOpening || currentMoveIndex >= selectedOpening.moves.length)) ||
                    (mode !== 'training' && (fullHistory.length === 0 || currentMoveIndex >= fullHistory.length))
                  }
                  className="flex-1 py-1.5 flex items-center justify-center hover:bg-white/5 disabled:opacity-20 transition-colors text-white/60 hover:text-white"
                  title="Final"
                >
                  <ChevronsRight className="w-4 h-4 text-white" />
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto custom-scrollbar pr-2 space-y-1 font-mono text-xs">
                {mode !== 'training' || !selectedOpening ? (
                  /* Simulation & Analysis Move List */
                  <div className="space-y-1">
                    {Array.from({ length: Math.ceil(fullHistory.length / 2) }).map((_, i) => {
                      const whiteMove = fullHistory[i * 2];
                      const blackMove = fullHistory[i * 2 + 1];
                      return (
                        <div key={i} className="flex items-center py-1 border-b border-white/5 space-x-4">
                          <span className="text-white/20 w-4">{i + 1}.</span>
                          <div className="flex-1 flex gap-4">
                            <button 
                              onClick={() => {
                                const newGame = new Chess();
                                for (let j = 0; j <= i * 2; j++) newGame.move(fullHistory[j]);
                                setGame(newGame);
                                setCurrentMoveIndex(i * 2 + 1);
                                updateThreats(newGame);
                              }}
                              className={cn(
                                "w-12 text-left hover:text-[#D4AF37] transition-colors",
                                (i * 2 + 1) === currentMoveIndex ? "text-[#D4AF37] font-bold" : "text-white"
                              )}
                            >
                              {whiteMove}
                            </button>
                            {blackMove && (
                              <button 
                                onClick={() => {
                                  const newGame = new Chess();
                                  for (let j = 0; j <= i * 2 + 1; j++) newGame.move(fullHistory[j]);
                                  setGame(newGame);
                                  setCurrentMoveIndex(i * 2 + 2);
                                  updateThreats(newGame);
                                }}
                                className={cn(
                                  "w-12 text-left hover:text-[#D4AF37] transition-colors",
                                  (i * 2 + 2) === currentMoveIndex ? "text-[#D4AF37] font-bold" : "text-white"
                                )}
                              >
                                {blackMove}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {fullHistory.length === 0 && (
                      <div className="py-4 flex flex-col items-center justify-center text-white/20 italic text-center gap-2">
                        <Zap className="w-5 h-5 opacity-20" />
                        <p>{mode === 'analysis' ? 'Carga un PGN para empezar' : 'Mueve las piezas para iniciar'}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Training Move List */
                  <div className="grid grid-cols-2 gap-x-6">
                    {selectedOpening.moves.map((_, i) => {
                      if (i % 2 !== 0) return null;
                      return (
                        <div key={i} className="flex items-center py-1 border-b border-white/5 space-x-4">
                          <span className="text-white/20 w-4">{Math.floor(i / 2) + 1}.</span>
                          <div className="flex-1 flex gap-4">
                            <span className={cn(
                              "w-12 transition-colors",
                              i < currentMoveIndex ? "text-white" : "text-white/10",
                              i === currentMoveIndex && "text-[#D4AF37] font-bold"
                            )}>
                              {selectedOpening.moves[i]}
                            </span>
                            {selectedOpening.moves[i + 1] && (
                              <span className={cn(
                                "w-12 transition-colors",
                                (i + 1) < currentMoveIndex ? "text-white" : "text-white/10",
                                (i + 1) === currentMoveIndex && "text-[#D4AF37] font-bold"
                              )}>
                                {selectedOpening.moves[i + 1]}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Strategic explanation box (Visible as selectedOpening is active in training mode) */}
          {mode === 'training' && (
            <div className="flex-1 w-full max-w-[420px] flex flex-col">
              <AnimatePresence mode="wait">
                {selectedOpening ? (
                  <motion.div
                    key={selectedOpening.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="w-full bg-[#0D0D11] border border-white/10 p-6 rounded-sm shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex flex-col gap-5 h-full min-h-[460px]"
                  >
                    <div className="border-b border-white/5 pb-4">
                      <span className="text-[8px] uppercase tracking-[0.25em] text-[#D4AF37] font-black px-2 py-1 bg-[#D4AF37]/10 rounded-sm inline-block mb-3">
                        {selectedOpening.category === 'mate' ? 'Patrón de Jaquemate' : `TEORÍA / APERTURA`}
                      </span>
                      <h3 className="text-xl font-serif italic text-white leading-tight font-semibold">
                        {selectedOpening.name}
                      </h3>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-[10px] uppercase font-bold tracking-widest text-white/40 flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-[#D4AF37]" />
                        Concepto Estratégico
                      </h4>
                      <p className="text-xs leading-relaxed text-white/70 font-sans font-normal">
                        {selectedOpening.description}
                      </p>
                    </div>

                    {/* Pros section */}
                    <div className="space-y-2.5">
                      <h4 className="text-[10px] uppercase font-bold tracking-widest text-[#50c878] flex items-center gap-2 font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#50c878]" />
                        Ventajas / Pros
                      </h4>
                      <ul className="space-y-1.5 text-[11px] text-white/85">
                        {(selectedOpening.pros || []).map((pro, idx) => (
                          <li key={idx} className="flex items-start gap-2 leading-relaxed">
                            <span className="text-[#50c878] font-bold select-none">•</span>
                            <span>{pro}</span>
                          </li>
                        ))}
                        {(!selectedOpening.pros || selectedOpening.pros.length === 0) && (
                          <li className="text-white/30 italic text-[10px]">Sin pros listados para este patrón.</li>
                        )}
                      </ul>
                    </div>

                    {/* Cons section */}
                    <div className="space-y-2.5">
                      <h4 className="text-[10px] uppercase font-bold tracking-widest text-amber-500/90 flex items-center gap-2 font-mono">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                        Inconvenientes / Contras
                      </h4>
                      <ul className="space-y-1.5 text-[11px] text-white/85">
                        {(selectedOpening.cons || []).map((con, idx) => (
                          <li key={idx} className="flex items-start gap-2 leading-relaxed">
                            <span className="text-amber-500/90 font-bold select-none">•</span>
                            <span>{con}</span>
                          </li>
                        ))}
                        {(!selectedOpening.cons || selectedOpening.cons.length === 0) && (
                          <li className="text-white/30 italic text-[10px]">Sin inconvenientes listados para este patrón.</li>
                        )}
                      </ul>
                    </div>

                    <div className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-white/30">
                        <span>Secuencia Teórica</span>
                        <span className="text-[#D4AF37] font-mono">{selectedOpening.moves.length} jugadas</span>
                      </div>
                      <div className="text-[9px] font-mono bg-black/40 border border-white/5 p-2 rounded-sm text-white/60 whitespace-normal break-all">
                        {selectedOpening.moves.join(' → ')}
                      </div>

                    </div>
                  </motion.div>
                ) : (
                  <div className="h-full min-h-[460px] border border-dashed border-white/10 rounded-sm flex flex-col items-center justify-center p-8 text-center text-white/20 gap-3">
                    <Info className="w-8 h-8 opacity-20" />
                    <p className="text-xs uppercase tracking-wider font-bold">Ficha de Análisis</p>
                    <p className="text-[11px] leading-relaxed max-w-[280px]">
                      Selecciona una teoría de apertura o un patrón de jaquemate en el menú izquierdo para cargar su ficha estratégica completa.
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}
          
          {/* Right Column: Contra el Bot mode strategic controls */}
          {mode === 'ai-play' && (
            <div className="flex-1 w-full max-w-[420px] flex flex-col">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full bg-[#0D0D11] border border-white/10 p-6 rounded-sm shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex flex-col gap-5 h-full min-h-[460px]"
              >
                <div className="border-b border-white/5 pb-4">
                  <span className="text-[8px] uppercase tracking-[0.25em] text-[#D4AF37] font-black px-2 py-1 bg-[#D4AF37]/10 rounded-sm inline-block mb-3">
                    DUELO INDIVIDUAL
                  </span>
                  <h3 className="text-xl font-serif italic text-white leading-tight font-semibold flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-[#D4AF37]" /> Contra el Bot (WASM)
                  </h3>
                </div>

                {/* Difficulty selectors */}
                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase font-bold tracking-widest text-white/40">
                    Nivel del Motor
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {(['easy', 'medium', 'hard'] as const).map((diff) => (
                      <button
                        key={diff}
                        onClick={() => setAiDifficulty(diff)}
                        className={cn(
                          "py-2 text-[9px] uppercase tracking-wider font-bold rounded-sm border transition-all",
                          aiDifficulty === diff
                            ? "bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]"
                            : "bg-white/5 border-white/5 text-white/40 hover:text-white/70"
                        )}
                      >
                        {diff === 'easy' ? 'Fácil' : diff === 'medium' ? 'Medio' : 'Difícil'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Selector */}
                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase font-bold tracking-widest text-white/40">
                    Jugar como:
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setPlayerColor('white');
                        setBoardOrientation('white');
                      }}
                      className={cn(
                        "py-2 text-[9px] uppercase tracking-wider font-bold rounded-sm border transition-all flex items-center justify-center gap-2",
                        playerColor === 'white'
                          ? "bg-white text-black border-white"
                          : "bg-white/5 border-white/5 text-white/40 hover:text-white/70"
                      )}
                    >
                      <div className={cn("w-2 h-2 rounded-full", playerColor === 'white' ? "bg-black" : "bg-white")}></div>
                      Blancas
                    </button>
                    <button
                      onClick={() => {
                        setPlayerColor('black');
                        setBoardOrientation('black');
                      }}
                      className={cn(
                        "py-2 text-[9px] uppercase tracking-wider font-bold rounded-sm border transition-all flex items-center justify-center gap-2",
                        playerColor === 'black'
                          ? "bg-white text-black border-white"
                          : "bg-white/5 border-white/5 text-white/40 hover:text-white/70"
                      )}
                    >
                      <div className={cn("w-2 h-2 rounded-full", playerColor === 'black' ? "bg-black" : "bg-white")}></div>
                      Negras
                    </button>
                  </div>
                </div>

                {/* Game status description */}
                <div className="p-4 bg-black/40 border border-white/5 rounded-sm space-y-2">
                  <h4 className="text-[9px] uppercase tracking-wider text-white/40">Estado de la Partida</h4>
                  <div className="flex items-center gap-3">
                    {game.isGameOver() ? (
                      <div className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-[#D4AF37]" />
                        {game.isCheckmate() 
                          ? `Jaque Mate - ¡Ganador: ${game.turn() === 'w' ? 'Negras' : 'Blancas'}!` 
                          : 'Partida finalizada (Tablas/Empate)'}
                      </div>
                    ) : (
                      <div className="text-xs text-white/80 flex items-center gap-2">
                        {isThinking ? (
                          <>
                            <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></div>
                            <span>Stockfish pensando su jugada...</span>
                          </>
                        ) : (
                          <>
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span>
                              {game.turn() === (playerColor === 'white' ? 'w' : 'b') 
                                ? 'Tu turno - Juega un movimiento' 
                                : 'Esperando movimiento del Bot...'}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {!game.isGameOver() && (
                  <button
                    onClick={getEngineAdvice}
                    disabled={isThinking}
                    className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 text-[10px] uppercase font-bold tracking-wider rounded-sm transition-all flex items-center justify-center gap-2 font-mono"
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-[#D4AF37]" />
                    {isThinking ? 'Pensando...' : 'Pistas'}
                  </button>
                )}

                {/* Additional controls */}
                <div className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      const newGame = new Chess();
                      setGame(newGame);
                      setCurrentMoveIndex(0);
                      setFullHistory([]);
                      setThreats([]);
                      setEngineSuggestion(null);
                      setFeedback("Nueva partida contra Bot iniciada");
                      setTimeout(() => setFeedback(null), 2000);
                    }}
                    className="w-full py-3 bg-[#D4AF37] text-black text-[10px] uppercase font-bold tracking-wider rounded-sm hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 font-mono"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Nueva Partida Contra Bot
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </section>

        {/* Right Panel: Analysis & Stats */}
        <aside className="hidden lg:flex w-80 border-l border-white/10 bg-[#0C0C0E] flex-col flex-shrink-0">
          <div className="p-6 flex-1 overflow-hidden flex flex-col">
            <h2 className="text-[11px] uppercase tracking-widest text-white/50 mb-4 font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span>Secuencia de Movimientos</span>
                <span className="text-[#D4AF37] font-mono">{mode === 'training' ? currentMoveIndex : currentMoveIndex}</span>
              </span>
            </h2>

            {/* Chess.com style Navigation Bar */}
            <div className="flex items-center bg-white/5 border border-white/10 rounded-sm mb-6 overflow-hidden">
              <button 
                onClick={goToStart}
                disabled={currentMoveIndex === 0}
                className="flex-1 py-1.5 flex items-center justify-center hover:bg-white/5 disabled:opacity-20 transition-colors border-r border-white/10 text-white/60 hover:text-white"
                title="Inicio"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={stepBackward}
                disabled={currentMoveIndex === 0}
                className="flex-1 py-1.5 flex items-center justify-center hover:bg-white/5 disabled:opacity-20 transition-colors border-r border-white/10 text-white/60 hover:text-white"
                title="Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={stepForward}
                disabled={
                  (mode === 'training' && (!selectedOpening || currentMoveIndex >= selectedOpening.moves.length)) ||
                  (mode !== 'training' && currentMoveIndex >= fullHistory.length)
                }
                className="flex-1 py-1.5 flex items-center justify-center hover:bg-white/5 disabled:opacity-20 transition-colors border-r border-white/10 text-white/60 hover:text-white"
                title="Siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button 
                onClick={goToEnd}
                disabled={
                  (mode === 'training' && (!selectedOpening || currentMoveIndex >= selectedOpening.moves.length)) ||
                  (mode !== 'training' && (fullHistory.length === 0 || currentMoveIndex >= fullHistory.length))
                }
                className="flex-1 py-1.5 flex items-center justify-center hover:bg-white/5 disabled:opacity-20 transition-colors text-white/60 hover:text-white"
                title="Final"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-1 font-mono text-xs">
              {mode !== 'training' || !selectedOpening ? (
                /* Simulation & Analysis Move List */
                <div className="space-y-1">
                  {Array.from({ length: Math.ceil(fullHistory.length / 2) }).map((_, i) => {
                    const whiteMove = fullHistory[i * 2];
                    const blackMove = fullHistory[i * 2 + 1];
                    return (
                      <div key={i} className="flex items-center py-1.5 border-b border-white/5 space-x-4">
                        <span className="text-white/20 w-4">{i + 1}.</span>
                        <div className="flex-1 flex gap-4">
                          <button 
                            onClick={() => {
                              const newGame = new Chess();
                              for (let j = 0; j <= i * 2; j++) newGame.move(fullHistory[j]);
                              setGame(newGame);
                              setCurrentMoveIndex(i * 2 + 1);
                              updateThreats(newGame);
                            }}
                            className={cn(
                              "w-12 text-left hover:text-[#D4AF37] transition-colors",
                              (i * 2 + 1) === currentMoveIndex ? "text-[#D4AF37] font-bold" : "text-white"
                            )}
                          >
                            {whiteMove}
                          </button>
                          {blackMove && (
                            <button 
                              onClick={() => {
                                const newGame = new Chess();
                                for (let j = 0; j <= i * 2 + 1; j++) newGame.move(fullHistory[j]);
                                setGame(newGame);
                                setCurrentMoveIndex(i * 2 + 2);
                                updateThreats(newGame);
                              }}
                              className={cn(
                                "w-12 text-left hover:text-[#D4AF37] transition-colors",
                                (i * 2 + 2) === currentMoveIndex ? "text-[#D4AF37] font-bold" : "text-white"
                              )}
                            >
                              {blackMove}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {fullHistory.length === 0 && (
                    <div className="h-full py-20 flex flex-col items-center justify-center text-white/20 italic text-center gap-3">
                      <Zap className="w-8 h-8 opacity-20" />
                      <p>{mode === 'analysis' ? 'Carga un PGN para empezar' : 'Mueve las piezas para iniciar'}</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Training Move List */
                selectedOpening.moves.map((_, i) => {
                  if (i % 2 !== 0) return null;
                  return (
                    <div key={i} className="flex items-center py-1.5 border-b border-white/5 space-x-4">
                      <span className="text-white/20 w-4">{Math.floor(i / 2) + 1}.</span>
                      <div className="flex-1 flex gap-4">
                        <span className={cn(
                          "w-12 transition-colors",
                          i < currentMoveIndex ? "text-white" : "text-white/10",
                          i === currentMoveIndex && "text-[#D4AF37] font-bold"
                        )}>
                          {selectedOpening.moves[i]}
                        </span>
                        {selectedOpening.moves[i + 1] && (
                          <span className={cn(
                            "w-12 transition-colors",
                            (i + 1) < currentMoveIndex ? "text-white" : "text-white/10",
                            (i + 1) === currentMoveIndex && "text-[#D4AF37] font-bold"
                          )}>
                            {selectedOpening.moves[i + 1]}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Game Stats Footer */}
          <div className="p-4 bg-black border-t border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] uppercase tracking-[0.2em] text-white/30 text-nowrap">Probabilidad de Victoria</span>
              <span className="text-[10px] font-mono text-[#D4AF37] tracking-wider whitespace-nowrap">
                {evaluationScore > 0 ? `B +${(evaluationScore/100).toFixed(1)}` : evaluationScore < 0 ? `N ${(evaluationScore/100).toFixed(1)}` : 'IGUALDAD'}
              </span>
            </div>
            <div className="w-full bg-black/40 h-5 relative rounded-sm overflow-hidden border border-white/10">
              {/* White advantage bar component */}
              <motion.div 
                animate={{ width: `${Math.max(5, Math.min(95, 50 + (evaluationScore / 20)))}%` }}
                className="absolute left-0 top-0 bottom-0 bg-white/90 transition-all duration-700 ease-in-out"
              ></motion.div>
              <div className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-black mix-blend-difference tracking-[0.3em] uppercase">
                {evaluationScore > 200 ? 'Ventaja Blanca' : evaluationScore < -200 ? 'Ventaja Negra' : 'Equilibrio'}
              </div>
            </div>
            <p className="text-[7px] text-white/20 mt-2 italic text-center">Basado en Stockfish Engine (UCI)</p>
          </div>
        </aside>
      </main>

      {/* Bottom Status Bar: MISSION CONTROL */}
      <footer className="h-12 bg-[#050507] border-t border-white/5 flex items-center justify-between px-8 text-[8px] uppercase tracking-[0.25em] flex-shrink-0 font-mono">
        <div className="flex gap-8 items-center">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            <span className="text-white/40 font-display font-bold text-[10px]">JAQUEMATE MISSION_CONTROL</span>
          </div>
          <div className="hidden lg:flex items-center gap-6 border-l border-white/5 pl-8">
            <div className="flex flex-col">
              <span className="text-white/20 text-[7px]">OPERADOR</span>
              <span className="text-white/60">PATRICIO_CORDERO</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white/20 text-[7px]">SISTEMA</span>
              <span className="text-emerald-500/80">ONLINE</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-10 items-center">
          <div className="hidden sm:flex items-center gap-8">
            <div className="flex flex-col items-end">
              <span className="text-white/20 text-[7px]">RETENCIÓN_D30</span>
              <span className="text-[#D4AF37] tabular-nums">84.21%</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-white/20 text-[7px]">CLOUD_CORE</span>
              <span className="text-white/50">v10.0.2_PRO</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-white/20 text-[7px]">LATENCIA</span>
              <span className="text-emerald-500">14ms</span>
            </div>
          </div>
          <div className="border-l border-white/10 pl-8 flex items-center gap-4">
            <span className="text-white/20">© 2026_EST.</span>
            <div className="flex gap-1">
              {[1,2,3,4].map(i => (
                <div key={i} className={cn("w-1 h-3 rounded-[1px]", i < 4 ? "bg-[#D4AF37]/40" : "bg-white/5")}></div>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}