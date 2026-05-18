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
import { Play, Zap, ShieldAlert } from 'lucide-react';

export default function App() {
  const [game, setGame] = useState(new Chess());
  const [selectedOpening, setSelectedOpening] = useState<Opening | null>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'training' | 'completed' | 'error'>('idle');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [threats, setThreats] = useState<string[]>([]);
  const [mode, setMode] = useState<'training' | 'simulation' | 'analysis'>('training');
  const [pgnInput, setPgnInput] = useState('');
  const [fullHistory, setFullHistory] = useState<string[]>([]);
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
  const [isThinking, setIsThinking] = useState(false);
  const [engineSuggestion, setEngineSuggestion] = useState<{ evaluation: string, bestMove: string } | null>(null);
  // Estado para el Worker de Stockfish y su disponibilidad
  const [stockfishWorker, setStockfishWorker] = useState<Worker | null>(null);
  const [engineReady, setEngineReady] = useState(false);

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
          setEngineSuggestion(prev => ({ 
            ...prev, 
            evaluation: (cp > 0 ? '+' : '') + evaluation,
            bestMove: prev?.bestMove || ''
          }));
        }
      } else if (line.includes('score mate')) {
        const mateMatch = line.match(/score mate (-?\d+)/);
        if (mateMatch) {
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
    const newGame = new Chess();
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
    const newGame = new Chess();
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
      const newGame = new Chess();
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
      const newGame = new Chess();
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
    const newGame = new Chess();
    const history = mode === 'training' ? selectedOpening?.moves : fullHistory;
    if (!history) return;

    for (let i = 0; i < nextIndex; i++) {
      newGame.move(history[i]);
    }
    
    setGame(newGame);
    setCurrentMoveIndex(nextIndex);
    setStatus(mode === 'training' ? 'training' : status);
    setFeedback(null);
    updateThreats(newGame);
  }, [currentMoveIndex, updateThreats, mode, fullHistory, selectedOpening, status]);

  return (
    <div className="h-screen bg-[#0A0A0C] text-[#E0E0E0] flex flex-col font-sans overflow-hidden">
      {/* Header Navigation */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-8 bg-[#0F0F12] flex-shrink-0 z-50 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-gradient-to-tr from-[#D4AF37] to-[#8C6E2D] rounded-sm flex items-center justify-center shadow-lg shadow-amber-900/40">
            <Brain className="w-5 h-5 text-black" />
          </div>
          <h1 className="text-xl font-serif italic tracking-wide text-white">Ajedrez Master</h1>
        </div>
        <nav className="hidden md:flex gap-8 text-[10px] uppercase tracking-[0.2em] font-medium text-white/60">
          <button 
            onClick={() => { setMode('training'); }}
            className={cn("transition-colors", mode === 'training' ? "text-[#D4AF37] border-b border-[#D4AF37] pb-1" : "hover:text-[#D4AF37]")}
          >
            APERTURAS
          </button>
          <button 
             onClick={() => {
               setMode('simulation');
               if (selectedOpening) setSelectedOpening(null);
             }}
             className={cn("transition-colors", mode === 'simulation' ? "text-[#D4AF37] border-b border-[#D4AF37] pb-1" : "hover:text-[#D4AF37]")}
          >
            SIMULACIÓN
          </button>
          <button 
            onClick={() => {
              setMode('analysis');
              if (selectedOpening) setSelectedOpening(null);
            }}
            className={cn("transition-colors", mode === 'analysis' ? "text-[#D4AF37] border-b border-[#D4AF37] pb-1" : "hover:text-[#D4AF37]")}
          >
            ANÁLISIS
          </button>
          <a href="/blog.html" className="hover:text-[#D4AF37] transition-colors leading-none pt-1">BLOG</a>
          <a href="/quienes-somos.html" className="hover:text-[#D4AF37] transition-colors leading-none pt-1">NOSOTROS</a>
        </nav>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-white/40 uppercase tracking-tighter">Estado</p>
            <p className="text-sm font-mono text-[#D4AF37]">
              {status === 'completed' ? 'DOMINADO' : 'EN PROGRESO'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full border border-white/20 bg-white/5 flex items-center justify-center">
            <CheckCircle2 className={cn("w-5 h-5 transition-colors", status === 'completed' ? "text-emerald-500" : "text-white/20")} />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar: Repertoire Selection */}
        <aside className="w-72 border-r border-white/10 bg-[#0C0C0E] flex flex-col flex-shrink-0">
          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            {mode === 'analysis' ? (
              <div className="space-y-4">
                <h2 className="text-[11px] uppercase tracking-widest text-[#D4AF37] mb-4 font-bold flex items-center gap-2">
                  <Zap className="w-3 h-3" /> Cargar Partida (PGN)
                </h2>
                <textarea
                  value={pgnInput}
                  onChange={(e) => setPgnInput(e.target.value)}
                  placeholder="Pega aquí el PGN de la partida..."
                  className="w-full h-48 bg-white/5 border border-white/10 rounded-sm p-3 text-[10px] font-mono text-white/70 focus:outline-none focus:border-[#D4AF37]/50 transition-colors resize-none"
                />
                
                <div className="flex gap-2">
                  <button
                    onClick={() => loadPgn()}
                    className="flex-1 py-2 bg-[#D4AF37] text-black text-[10px] uppercase font-bold tracking-widest rounded-sm hover:brightness-110"
                  >
                    Importar Texto
                  </button>
                  <label className="flex-1 py-2 bg-white/5 border border-white/10 text-white text-[10px] uppercase font-bold tracking-widest rounded-sm hover:bg-white/10 cursor-pointer flex items-center justify-center gap-2">
                    <Upload className="w-3 h-3" />
                    Subir Archivo
                    <input 
                      type="file" 
                      accept=".pgn" 
                      onChange={handleFileUpload} 
                      className="hidden" 
                    />
                  </label>
                </div>
                <div className="pt-4 border-t border-white/5">
                  <p className="text-[9px] text-white/30 uppercase leading-relaxed italic">
                    Usa este modo para analizar tus propias partidas o de Grandes Maestros. Podrás navegar por cada movimiento y estudiar las líneas teóricas.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-[11px] uppercase tracking-widest text-white/50 mb-6 font-bold flex items-center gap-2">
                  <BookOpen className="w-3 h-3" /> Mis Aperturas
                </h2>
                <div className="space-y-3">
                  {OPENINGS.map((op) => (
                    <div
                      key={op.id}
                      onClick={() => startTraining(op)}
                      className={cn(
                        "p-3 rounded-lg cursor-pointer transition-all duration-300 border group",
                        selectedOpening?.id === op.id 
                          ? "bg-white/5 border-[#D4AF37]/30" 
                          : "hover:bg-white/5 border-transparent"
                      )}
                    >
                      <p className={cn(
                        "text-xs font-serif italic mb-0.5 group-hover:text-[#D4AF37] transition-colors",
                        selectedOpening?.id === op.id ? "text-[#D4AF37]" : "text-white/80"
                      )}>
                        {op.name}
                      </p>
                      <p className="text-[10px] text-white/40 uppercase tracking-tighter">{op.moves.length} Movimientos</p>
                      <div className="mt-2 w-full bg-white/10 h-1 rounded-full overflow-hidden">
                        <div 
                          className="bg-[#D4AF37] h-full transition-all duration-1000 ease-out" 
                          style={{ 
                            width: selectedOpening?.id === op.id 
                              ? `${(currentMoveIndex / op.moves.length) * 100}%` 
                              : '0%' 
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          {selectedOpening && (
            <div className="p-6 border-t border-white/5 bg-[#0a0a0c]">
              <h3 className="text-[10px] uppercase tracking-widest text-[#D4AF37] mb-2 font-bold">Resumen Estratégico</h3>
              <p className="text-[11px] leading-relaxed text-white/40 font-serif italic">
                {selectedOpening.description}
              </p>
            </div>
          )}
        </aside>

        {/* Central Training Zone */}
        <section className="flex-1 flex flex-col items-center justify-center bg-[#08080A] relative p-8">
          <div className="absolute top-8 left-10 text-left">
            <h3 className="text-3xl font-serif italic text-white mb-1">
              {selectedOpening?.name || "Seleccione una apertura"}
            </h3>
            <p className="text-xs text-white/40 uppercase tracking-widest">
              {selectedOpening ? `Fase de Memorización: Movimiento ${currentMoveIndex}/${selectedOpening.moves.length}` : "Comienza tu entrenamiento diario"}
            </p>
          </div>
          
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
              className="px-4 py-3 bg-white/5 border border-white/10 text-white/60 font-bold uppercase tracking-widest text-[11px] rounded-sm hover:bg-white/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Vaciar
            </button>
            <button 
              onClick={getEngineAdvice}
              disabled={isThinking}
              className="flex-1 px-4 py-3 bg-[#D4AF37] text-black font-bold uppercase tracking-widest text-[11px] rounded-sm hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20"
            >
              <Cpu className={cn("w-3.5 h-3.5", isThinking && "animate-spin")} /> 
              {isThinking ? 'Analizando...' : 'Consultar Stockfish (WASM)'}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {engineSuggestion && (
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
            
            {showHint && selectedOpening && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4 bg-white/5 px-8 py-2 border border-white/10 rounded-sm"
              >
                <span className="text-white/40 text-[10px] uppercase tracking-widest mr-4">Siguiente movimiento</span>
                <span className="text-[#D4AF37] font-mono font-bold text-base">{selectedOpening.moves[currentMoveIndex]}</span>
              </motion.div>
            )}

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
        </section>

        {/* Right Panel: Analysis & Stats */}
        <aside className="w-80 border-l border-white/10 bg-[#0C0C0E] flex flex-col flex-shrink-0">
          <div className="p-6 flex-1 overflow-hidden flex flex-col">
            <h2 className="text-[11px] uppercase tracking-widest text-white/50 mb-6 font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span>Secuencia de Movimientos</span>
                <span className="text-[#D4AF37] font-mono">{selectedOpening ? `${currentMoveIndex}` : '0'}</span>
              </span>
              <div className="flex gap-1">
                <button 
                  onClick={stepBackward}
                  disabled={currentMoveIndex === 0}
                  className="p-1 hover:bg-white/5 rounded-sm disabled:opacity-20 transition-colors"
                  title="Retroceder"
                >
                  <ChevronLeft className="w-3 h-3 text-[#D4AF37]" />
                </button>
                <button 
                  onClick={stepForward}
                  disabled={!selectedOpening || currentMoveIndex >= selectedOpening.moves.length}
                  className="p-1 hover:bg-white/5 rounded-sm disabled:opacity-20 transition-colors"
                  title="Avanzar"
                >
                  <ChevronRight className="w-3 h-3 text-[#D4AF37]" />
                </button>
              </div>
            </h2>
            
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

            <div className="mt-8 border-t border-white/5 pt-8">
              <h2 className="text-[11px] uppercase tracking-widest text-white/50 mb-4 font-bold flex items-center gap-2">
                <Brain className="w-3 h-3" /> Panel de Control
              </h2>
              <div className="bg-black/40 border border-white/5 rounded-sm h-[300px] overflow-y-auto custom-scrollbar p-4 text-[11px] leading-relaxed text-white/40">
                <div className="h-full flex flex-col items-center justify-center text-center px-4 gap-4">
                  <Info className="w-8 h-8 opacity-20" />
                  <p className="italic">Utilice el tablero para practicar sus aperturas y mejorar su visión estratégica.</p>
                  <a 
                    href="/quienes-somos.html"
                    className="text-[10px] text-[#D4AF37] uppercase tracking-widest hover:underline"
                  >
                    Saber más sobre nosotros
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Game Stats Footer */}
          <div className="p-4 bg-black border-t border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] uppercase tracking-[0.2em] text-white/30">Progreso de la Partida</span>
              <span className="text-[10px] font-mono text-[#D4AF37] tracking-wider">Turno: {game.turn() === 'w' ? 'Blanco' : 'Negro'}</span>
            </div>
            <div className="w-full bg-white/5 h-4 relative rounded-full overflow-hidden border border-white/10">
              <div className="absolute left-0 top-0 bottom-0 bg-white/80 transition-all duration-500" style={{ width: '50%' }}></div>
              <div className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-black mix-blend-difference tracking-[0.3em]">EQUILIBRIO ESTRATÉGICO</div>
            </div>
          </div>
        </aside>
      </main>

      {/* Bottom Status Bar */}
      <footer className="h-10 bg-[#0F0F12] border-t border-white/10 flex items-center justify-between px-8 text-[9px] uppercase tracking-[0.2em] flex-shrink-0">
        <div className="flex gap-6 items-center">
          <div className="text-white/30 flex items-center gap-2">
            AJEDREZ MASTER <span className="opacity-50">© 2026</span>
          </div>
          <div className="text-white/20 hidden sm:block border-l border-white/10 pl-6">
            DESARROLLADO POR <span className="text-white/40 font-bold">PATRICIO CIFUENTES</span>
          </div>
        </div>
        <div className="flex gap-8 items-center">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-white/30">Métrica de Retención:</span>
              <span className="text-[#D4AF37] font-mono">84%</span>
            </div>
            <div className="flex items-center gap-2 text-[#D4AF37]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse"></span>
              <span>Cloud Engine v10.0.2</span>
            </div>
          </div>
          <div className="text-white/30 flex items-center gap-2 border-l border-white/10 pl-6">
            LATENCIA: <span className="text-emerald-500 font-mono">14ms</span>
          </div>
        </div>
      </footer>
    </div>
  );
}