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
  RefreshCw
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
  const [view, setView] = useState<'game' | 'blog' | 'about'>('game');
  const [pgnInput, setPgnInput] = useState('');
  const [fullHistory, setFullHistory] = useState<string[]>([]);
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');

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
          <div className="w-8 h-8 bg-gradient-to-tr from-[#D4AF37] to-[#8C6E2D] rounded-sm flex items-center justify-center shadow-lg shadow-amber-900/40 cursor-pointer" onClick={() => setView('game')}>
            <Brain className="w-5 h-5 text-black" />
          </div>
          <h1 className="text-xl font-serif italic tracking-wide text-white cursor-pointer" onClick={() => setView('game')}>Ajedrez Master</h1>
        </div>
        <nav className="hidden md:flex gap-8 text-[10px] uppercase tracking-[0.2em] font-medium text-white/60">
          <button 
            onClick={() => { setView('game'); setMode('training'); }}
            className={cn("transition-colors", view === 'game' && mode === 'training' ? "text-[#D4AF37] border-b border-[#D4AF37] pb-1" : "hover:text-[#D4AF37]")}
          >
            APERTURAS
          </button>
          <button 
             onClick={() => {
               setView('game');
               setMode('simulation');
               if (selectedOpening) setSelectedOpening(null);
             }}
             className={cn("transition-colors", view === 'game' && mode === 'simulation' ? "text-[#D4AF37] border-b border-[#D4AF37] pb-1" : "hover:text-[#D4AF37]")}
          >
            Simulación
          </button>
          <button 
            onClick={() => {
              setView('game');
              setMode('analysis');
              if (selectedOpening) setSelectedOpening(null);
            }}
            className={cn("transition-colors", view === 'game' && mode === 'analysis' ? "text-[#D4AF37] border-b border-[#D4AF37] pb-1" : "hover:text-[#D4AF37]")}
          >
            Análisis
          </button>
          <button 
            onClick={() => setView('blog')}
            className={cn("transition-colors", view === 'blog' ? "text-[#D4AF37] border-b border-[#D4AF37] pb-1" : "hover:text-[#D4AF37]")}
          >
            Blog
          </button>
          <button 
            onClick={() => setView('about')}
            className={cn("transition-colors", view === 'about' ? "text-[#D4AF37] border-b border-[#D4AF37] pb-1" : "hover:text-[#D4AF37]")}
          >
            Quienes Somos
          </button>
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
        {view === 'game' ? (
          <>
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
              className="w-full px-4 py-3 bg-[#D4AF37] text-black font-bold uppercase tracking-widest text-[11px] rounded-sm hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Vaciar Tablero
            </button>
          </div>

          <AnimatePresence>
            {feedback && (
              <motion.div
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
          </AnimatePresence>
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
                  <button 
                    onClick={() => setView('about')}
                    className="text-[10px] text-[#D4AF37] uppercase tracking-widest hover:underline"
                  >
                    Saber más sobre nosotros
                  </button>
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
      </>
    ) : view === 'blog' ? (
      <section className="flex-1 overflow-y-auto bg-[#08080A] p-12 custom-scrollbar">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-serif italic text-[#D4AF37] mb-8">Blog de Ajedrez Master</h2>
          <div className="space-y-12">
            <article className="border-b border-white/10 pb-12">
              <h3 className="text-2xl font-serif text-white mb-4">La Evolución del Ajedrez en la Era Digital</h3>
              <p className="text-white/60 leading-relaxed mb-6">
                Desde la legendaria victoria de Deep Blue sobre Garry Kasparov en 1997, el mundo del ajedrez ha experimentado una transformación sin precedentes impulsada por la tecnología. Hoy en día, contamos con herramientas que nos permiten entender el juego con una precisión sobrehumana. En Ajedrez Master, integramos estas herramientas para potenciar el pensamiento crítico de nuestros usuarios.
              </p>
              <p className="text-white/60 leading-relaxed mb-6">
                El análisis moderno ya no se limita a ver quién tiene una ventaja material de +1.5. Los motores actuales, como el que utilizamos basado en la arquitectura de Stockfish, nos permiten explorar sutilezas posicionales que antes pasaban desapercibidas. Por ejemplo, la comprensión del espacio en el tablero y la coordinación de las piezas a largo plazo son aspectos que las versiones anteriores de los motores solían subestimar. Hoy en día, un jugador puede recibir una sugerencia que parece contraintuitiva —como sacrificar un peón por una compensación posicional abstracta— y ver cómo esa decisión se justifica a lo largo de 20 movimientos perfectos.
              </p>
              <p className="text-white/60 leading-relaxed mb-6">
                Sin embargo, el mayor desafío para el jugador aficionado sigue siendo la traducción de estos datos numéricos en conocimiento práctico. Aquí es donde Ajedrez Master marca la diferencia. Nuestro sistema no solo te da el movimiento óptimo, sino que intenta explicar el "porqué" detrás de la jugada. Aprender a interpretar la evaluación del motor es una habilidad en sí misma. ¿Es un +0.8 porque tenemos un ataque ganador o simplemente porque nuestro oponente tiene un peón aislado que tardaremos 50 movimientos en capturar? Distinguir estas situaciones es vital para la progresión real de cualquier ajedrecista.
              </p>
              <p className="text-white/60 leading-relaxed mb-6">
                Además, el uso de la IA ha democratizado el acceso a la élite del entrenamiento. Antiguamente, solo los grandes maestros con acceso a equipos potentes y segundos talentosos podían prepararse al más alto nivel. Hoy, cualquier usuario con una conexión a internet y nuestra plataforma puede disfrutar de un sparring virtual que no se cansa, no comete errores por fatiga y está siempre disponible para discutir las líneas más complejas de la Ruy López o la Siciliana Najdorf.
              </p>
              <p className="text-white/60 leading-relaxed mb-6">
                En conclusión, estamos viviendo la era dorada del estudio del ajedrez. La integración de la inteligencia artificial en nuestra rutina de entrenamiento nos permite identificar nuestras debilidades más profundas y explorar la belleza del juego desde ángulos que antes solo estaban reservados para los campeones del mundo. En Ajedrez Master, nuestra misión es seguir refinando estas herramientas para que cada jugador, sea cual sea su nivel, pueda alcanzar su máximo potencial y disfrutar de la profundidad infinita de este noble juego.
              </p>
            </article>

            <article className="pb-12 border-b border-white/10">
              <h3 className="text-2xl font-serif text-white mb-4">Estrategias Críticas para el Dominio de las Aperturas</h3>
              <p className="text-white/60 leading-relaxed mb-6">
                Memorizar movimientos de apertura es una de las tareas más arduas y, a menudo, frustrantes para los jugadores en ascenso. Muchos cometen el error de intentar aprender líneas interminables de memoria sin comprender los conceptos estratégicos subyacentes. En este artículo, exploraremos por qué el enfoque de Ajedrez Master se centra en la memorización activa y la comprensión táctica, lo que garantiza que no te quedes "fuera de libro" sin saber qué hacer en el movimiento 10.
              </p>
              <p className="text-white/60 leading-relaxed mb-6">
                La primera regla de oro para estudiar aperturas es entender los planes típicos del medio juego que resultan de ellas. Si estás jugando una Apertura Italiana, debes estar familiarizado con las maniobras del caballo a f5 o d5, y con las rupturas centrales d3-d4. Si simplemente memorizas que d3 es mejor que d4 en cierta posición, pero no sabes por qué, perderás el hilo en cuanto tu oponente se desvíe de la teoría principal. Nuestra plataforma te guía a través de estas secuencias, reforzando la trayectoria correcta a través de la repetición y el feedback instantáneo.
              </p>
              <p className="text-white/60 leading-relaxed mb-6">
                Otro aspecto fundamental es el manejo de la tensión central. En muchas aperturas modernas, como las defensas indias o la Grünfeld, el centro no se ocupa inmediatamente con peones, sino que se controla a distancia con piezas. Entender cuándo es el momento preciso para golpear el centro es la diferencia entre una victoria brillante y un colapso posicional. A través de nuestro módulo de simulación, puedes probar diferentes expansiones centrales y ver cómo reacciona el motor de Stockfish, aprendiendo por ensayo y error en un entorno seguro antes de llevar esas ideas al tablero de competición real.
              </p>
              <p className="text-white/60 leading-relaxed mb-6">
                La psicología también juega un papel crucial en la selección de tu repertorio. ¿Eres un jugador que prefiere posiciones sólidas y tranquilas, o te sientes más cómodo en el caos táctico? Un buen repertorio debe estar alineado con tu estilo personal. En Ajedrez Master, ofrecemos una variedad de aperturas que van desde lo ultra-sólido hasta lo agresivo. Al practicar con nuestro entrenador, no solo memorizas jugadas, sino que desarrollas una "intuición" para el tipo de posiciones que prefieres jugar, lo que aumenta tu confianza durante la partida.
              </p>
              <p className="text-white/60 leading-relaxed mb-6">
                Finalmente, es esencial mantenerse actualizado. La teoría del ajedrez nunca se detiene; lo que era una línea ganadora hace dos años puede haber sido refutado por un nuevo descubrimiento de la IA hoy. Por eso, el análisis constante de tus propias partidas es vital. Al cargar tus PGN en nuestro módulo de análisis, puedes comparar tus decisiones con las sugerencias teóricas actuales, ajustando tu repertorio de manera dinámica. Este ciclo de práctica, análisis y ajuste es la única vía garantizada hacia la maestría en el ajedrez.
              </p>
            </article>

            <article className="pb-12">
                <h3 className="text-2xl font-serif text-white mb-4">El Ajedrez como Herramienta de Crecimiento Cognitivo</h3>
                <p className="text-white/60 leading-relaxed mb-6">
                    El ajedrez no es solo un juego; es una disciplina que moldea la mente. Diversos estudios han demostrado que la práctica regular del ajedrez mejora la memoria, la concentración y la capacidad de resolución de problemas. En Ajedrez Master, entendemos que cada partida es una oportunidad para entrenar el cerebro. La toma de decisiones bajo presión, el pensamiento estratégico a largo plazo y la capacidad de prever las intenciones del oponente son habilidades transferibles a la vida cotidiana y profesional.
                </p>
                <p className="text-white/60 leading-relaxed mb-6">
                    Al enfrentarnos a un tablero de ajedrez, nos vemos obligados a gestionar recursos limitados y a evaluar riesgos constantemente. Esta "gestión del caos" es fundamental en el mundo moderno. Los jugadores que utilizan nuestra plataforma reportan una mayor agilidad mental en sus tareas diarias. El ajedrez nos enseña a ser pacientes, a esperar el momento oportuno y a no dejarnos llevar por impulsos que puedan comprometer nuestra posición global.
                </p>
                <p className="text-white/60 leading-relaxed mb-6">
                    Además, el ajedrez fomenta la resiliencia. Aprender a perder, a analizar los errores sin juicios destructivos y a levantarse para la siguiente partida es una de las lecciones más valiosas que este juego puede ofrecer. En Ajedrez Master, promovemos esta mentalidad de crecimiento. Cada error detectado por Stockfish es una pepita de oro que nos indica exactamente dónde debemos mejorar. No hay fracaso en el ajedrez, solo aprendizaje acumulado.
                </p>
                <p className="text-white/60 leading-relaxed mb-6">
                    A medida que profundizamos en el estudio de las estructuras de peones y las sutilezas de los finales, nuestra capacidad de abstracción se expande. Empezamos a ver patrones donde antes solo había piezas dispersas. Esta visión sistémica es lo que diferencia a un aficionado de un maestro. En Ajedrez Master, te ayudamos a desarrollar este "tercer ojo" ajedrecístico, proporcionándote las herramientas necesarias para que tu mente trabaje de manera más eficiente y creativa.
                </p>
            </article>
          </div>
        </div>
      </section>
    ) : (
      <section className="flex-1 overflow-y-auto bg-[#08080A] p-12 custom-scrollbar">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-serif italic text-[#D4AF37] mb-8">Quienes Somos: Ajedrez Master</h2>
          <div className="space-y-8 text-white/70 leading-[1.8] text-lg font-serif">
            <p>
              Bienvenidos a Ajedrez Master, la plataforma definitiva diseñada por y para apasionados del ajedrez que buscan llevar su juego al siguiente nivel mediante la tecnología de vanguardia. Nuestra misión es simple pero ambiciosa: transformar la manera en que los jugadores de todos los niveles estudian, practican y comprenden los secretos del tablero. En un mundo donde la información es abundante pero el tiempo es escaso, hemos creado una herramienta que destila la complejidad del ajedrez en un sistema de aprendizaje intuitivo, potente y estéticamente refinado.
            </p>
            <p>
              Fundada por un equipo multidisciplinar de maestros de ajedrez, ingenieros de software y expertos en inteligencia artificial, Ajedrez Master nació de la necesidad de cerrar la brecha entre el estudio teórico abstracto y la práctica competitiva real. Observamos que muchos jugadores invertirían horas en libros de aperturas sin ver resultados tangibles debido a la falta de un entorno de entrenamiento interactivo. Así, decidimos construir una plataforma que no solo ofrece información, sino que obliga al usuario a participar activamente en el proceso de toma de decisiones, reforzando la memoria muscular y la visión táctica en cada clic.
            </p>
            <p>
              Nuestra filosofía se basa en tres pilares fundamentales: Innovación, Accesibilidad y Excelencia. Creemos que la inteligencia artificial no debe ser solo un oráculo que dicta sentencias, sino un mentor que ilumina el camino. Por ello, hemos integrado motores de análisis de clase mundial como Stockfish para proporcionar evaluaciones instantáneas y precisas, pero siempre acompañadas de explicaciones que ayudan a construir una comprensión estratégica profunda. Queremos que entiendas el juego, no que lo imites.
            </p>
            <p>
              En nuestra sección de "Aperturas", hemos seleccionado cuidadosamente los sistemas más efectivos del ajedrez moderno, permitiendo a nuestros usuarios construir un repertorio sólido y flexible. Nuestro módulo de "Simulación" permite experimentar libremente con ideas nuevas contra un oponente virtual implacable, mientras que el módulo de "Análisis" ofrece la capacidad técnica de diseccionar partidas propias paso a paso para identificar errores y oportunidades perdidas. Todo esto se presenta en una interfaz oscura y minimalista, diseñada para minimizar las distracciones y permitir que el usuario se sumerja completamente en el flujo del juego.
            </p>
            <p>
              Con sede en Santiago de Chile y con una comunidad que crece día a día en toda Hispanoamérica, Ajedrez Master no es solo una aplicación, es un ecosistema para el crecimiento intelectual. Nos enorgullece ver cómo nuestros usuarios pasan de la duda a la determinación, ganando confianza partida tras partida. Nos esforzamos constantemente por actualizar nuestros algoritmos y expandir nuestra biblioteca de contenidos para asegurar que nuestra comunidad siempre tenga acceso a las mejores herramientas disponibles en el mercado global.
            </p>
            <p>
              Gracias por confiar en nosotros para ser parte de tu viaje ajedrecístico. Ya seas un principiante dando sus primeros pasos o un jugador de club buscando tu próximo título, estamos aquí para asegurarnos de que cada movimiento que hagas sea un movimiento maestro. Te invitamos a explorar todas nuestras funciones, leer nuestro blog para estar al tanto de las últimas tendencias y, sobre todo, a disfrutar de la inmensa satisfacción que produce ver cómo tu comprensión del ajedrez se expande hasta límites que nunca imaginaste. ¡Que empiece la partida!
            </p>
            <p>
                Además de nuestras herramientas técnicas, en Ajedrez Master valoramos la historia y la cultura del ajedrez. Creemos que conocer las partidas clásicas de los grandes campeones del pasado, desde Morphy hasta Carlsen, es esencial para forjar un carácter ajedrecístico sólido. Por eso, integramos constantes referencias históricas en nuestro blog y análisis. No solo queremos que seas un mejor jugador táctico, sino un conocedor profundo de la belleza artística que reside en cada combinación brillante.
            </p>
            <p>
                Nuestro compromiso con la transparencia y la mejora continua nos lleva a escuchar activamente a nuestra comunidad. Cada sugerencia de nuestros usuarios es evaluada para futuras actualizaciones. En Ajedrez Master, el camino hacia la perfección no tiene fin, al igual que las posibilidades infinitas del ajedrez. Estamos emocionados de tenerte con nosotros en esta aventura intelectual y deportiva.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-3 gap-8 pb-12">
            <div className="bg-white/5 p-6 border border-white/10 rounded-sm text-center">
              <Trophy className="w-8 h-8 text-[#D4AF37] mx-auto mb-4" />
              <h4 className="text-white font-bold mb-2 text-sm uppercase tracking-wider">Excelencia</h4>
              <p className="text-[10px] text-white/40 uppercase leading-relaxed">Comprometidos con los más altos estándares tácticos.</p>
            </div>
            <div className="bg-white/5 p-6 border border-white/10 rounded-sm text-center">
              <Brain className="w-8 h-8 text-[#D4AF37] mx-auto mb-4" />
              <h4 className="text-white font-bold mb-2 text-sm uppercase tracking-wider">Entrenamiento</h4>
              <p className="text-[10px] text-white/40 uppercase leading-relaxed">Metodologías avanzadas de estudio a tu servicio.</p>
            </div>
            <div className="bg-white/5 p-6 border border-white/10 rounded-sm text-center">
              <CheckCircle2 className="w-8 h-8 text-[#D4AF37] mx-auto mb-4" />
              <h4 className="text-white font-bold mb-2 text-sm uppercase tracking-wider">Comunidad</h4>
              <p className="text-[10px] text-white/40 uppercase leading-relaxed">Miles de jugadores mejorando juntos cada día.</p>
            </div>
          </div>
        </div>
      </section>
    )}
  </main>

      {/* Bottom Status Bar */}
      <footer className="h-8 bg-[#0F0F12] border-t border-white/10 flex items-center justify-between px-8 text-[9px] uppercase tracking-[0.2em] flex-shrink-0">
        <div className="text-white/30 flex items-center gap-2">
          Sessión: <span className="text-white/60 font-mono">12:45:00</span>
        </div>
        <div className="flex gap-8 items-center">
          <div className="flex items-center gap-2">
            <span className="text-white/30">Métrica de Retención:</span>
            <span className="text-[#D4AF37] font-mono">84%</span>
          </div>
          <div className="flex items-center gap-2 text-[#D4AF37]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse"></span>
            <span>Cloud Engine Master</span>
          </div>
        </div>
      </footer>
    </div>
  );
}