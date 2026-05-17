import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzePosition(openingName: string, moveHistory: string[]) {
  const prompt = `Actúa como un Gran Maestro de ajedrez y entrenador de élite. 
Analiza la apertura: "${openingName}". 
Historial de movimientos: ${moveHistory.length > 0 ? moveHistory.join(", ") : "Inicio de la partida"}.

Tu análisis debe ser:
1. ESTRATEGIA: Explica el plan a largo plazo para ambos bandos.
2. TÁCTICA: Menciona temas tácticos comunes o trampas en esta línea.
3. POR QUÉ: Explica la lógica detrás de los movimientos realizados.
4. CONTINUACIÓN: Recomienda los mejores planes para el medio juego.

Usa un tono inspirador y técnico. Mantén la respuesta concisa pero profunda. Usa Markdown con negritas para enfatizar conceptos clave.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "No se pudo obtener el análisis en este momento. Por favor, intenta de nuevo más tarde.";
  }
}

export async function getBestMoveSuggestion(fen: string, history: string[]) {
  const prompt = `Actúa como un motor de ajedrez de alto nivel (Stockfish 16.1). 
Analiza la siguiente posición en formato FEN: "${fen}".
Historial de movimientos: ${history.join(", ")}.

Proporciona:
1. EVALUACIÓN: Un valor numérico (ej: +0.4 o -1.2).
2. MEJOR JUGADA: El movimiento óptimo en notación SAN.
3. EXPLICACIÓN: Una breve frase sobre por qué es el mejor movimiento.

Responde ÚNICAMENTE con un objeto JSON válido con las claves: "evaluation", "bestMove", "explanation".`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    const text = response.text;
    // Extract JSON if model wraps it in markdown blocks
    const jsonMatch = text.match(/\{.*\}/s);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (error) {
    console.error("Engine Error:", error);
    return null;
  }
}
