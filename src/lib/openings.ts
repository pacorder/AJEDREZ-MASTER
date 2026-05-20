export interface Opening {
  id: string;
  name: string;
  moves: string[]; // Standard Algebraic Notation
  description: string;
  initialFen?: string;
  category?: 'opening' | 'mate';
  subCategory?: 'e4' | 'd4';
  pros: string[];
  cons: string[];
}

export const OPENINGS: Opening[] = [
  // --- APERTURAS CLÁSICAS CON e4 ---
  {
    id: 'ruy-lopez',
    name: 'Ruy Lopez (Española)',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
    description: 'Una de las aperturas más antiguas y populares, centrada en la presión sobre el peón de e5.',
    category: 'opening',
    subCategory: 'e4',
    pros: [
      'Garantiza un fuerte control del centro con opciones de ataque sostenido',
      'Crea presión duradera en el flanco de rey mediante la actividad de piezas',
      'Excelente base teórica para comprender el juego estratégico y posicional'
    ],
    cons: [
      'Líneas teóricas sumamente extensas, complejas y de memorización obligatoria',
      'El alfil de casillas negras propio a veces puede quedar inactivo',
      'La Defensa Berlinesa en manos negras puede neutralizar la agresividad blanca'
    ]
  },
  {
    id: 'sicilian',
    name: 'Defensa Siciliana',
    moves: ['e4', 'c5'],
    description: 'La respuesta más popular a e4, creando un juego asimétrico y sumamente complejo.',
    category: 'opening',
    subCategory: 'e4',
    pros: [
      'Combate asimétrico directo por liderar e inclinar la iniciativa desde la jugada 1',
      'Magníficas opciones de contraataque dinámico en el flanco de dama',
      'Evita las posiciones simétricas o simplificaciones tempranas pasivas'
    ],
    cons: [
      'Altamente táctica; una imprecisión menor suele costar la partida de inmediato',
      'Las blancas a menudo logran un temible y veloz asalto en el flanco de rey',
      'Requiere comprender una enorme cantidad de sub-variantes agudas (Najdorf, Dragón...)'
    ]
  },
  {
    id: 'french-defense',
    name: 'Defensa Francesa',
    moves: ['e4', 'e6', 'd4', 'd5'],
    description: 'Una defensa sólida que a menudo lleva a cadenas de peones cerradas y batallas estratégicas.',
    category: 'opening',
    subCategory: 'e4',
    pros: [
      'Estructura de peones sumamente compacta, resistente y defensiva',
      'Contraataques muy fluidos y naturales en el flanco de dama (frecuente empuje con c5)',
      'Excelente para jugadores que disfrutan de las maniobras posicionales y juegos cerrados'
    ],
    cons: [
      'El alfil de casillas blancas en c8 suele quedar bloqueado y pasivo tras la cadena de peones',
      'Las blancas disfrutan de mayor espacio inicial e iniciativa en el flanco de rey',
      'Las posiciones pasivas o asfixiantes pueden exigir una precisión exhaustiva'
    ]
  },
  {
    id: 'caro-kann',
    name: 'Caro-Kann',
    moves: ['e4', 'c6', 'd4', 'd5'],
    description: 'Similar a la Francesa pero con la crucial intención de liberar el alfil de casillas blancas antes de consolidar.',
    category: 'opening',
    subCategory: 'e4',
    pros: [
      'Consigue liberar el alfil de casillas blancas (a f5 o g6) sin encerrarlo tras la cadena de peones',
      'Estructura de peones extremadamente robusta, sana y carente de debilidades tempranas',
      'Considerada una de las respuestas más difíciles de batir por parte de las blancas'
    ],
    cons: [
      'El desarrollo de las piezas negras es un poco más pausado y cauto',
      'Falta de espacio y menor control inicial del centro del tablero',
      'Con frecuencia desemboca en finales sutilmente pasivos donde las blancas presionan sin riesgo'
    ]
  },
  {
    id: 'italian-game',
    name: 'Juego Italiano',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
    description: 'Buscando el desarrollo rápido y el control del centro atacando el punto f7, el más vulnerable de las negras.',
    category: 'opening',
    subCategory: 'e4',
    pros: [
      'Desarrollo muy fluido, lógico y seguro para todas las piezas menores blancas',
      'Presión inmediata y directa sobre f7, la casilla más vulnerable en la apertura',
      'Estructura didáctica y sumamente clara para jugadores de todos los niveles'
    ],
    cons: [
      'Las negras igualan con facilidad si conocen las réplicas principales (como Bc5 o Nf6)',
      'Muchas variantes conducen a posiciones excesivamente simétricas o pacíficas',
      'Es la apertura más estudiada e intuitiva, por lo que carece de factor sorpresa'
    ]
  },
  {
    id: 'scotch-opening',
    name: 'Apertura Escocesa',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'],
    description: 'Las blancas desafían el centro de inmediato con d4, abriendo líneas para sus alfiles de manera muy activa.',
    category: 'opening',
    subCategory: 'e4',
    pros: [
      'Evita los exhaustivos y áridos senderos teóricos de la Ruy López o el Italiano',
      'Habilita líneas y diagonales abiertas para ataques tácticos enérgicos',
      'Suele pillar desprevenidos a rivales acostumbrados a defensas tradicionales'
    ],
    cons: [
      'Aliviar la tensión en el centro tan pronto puede atenuar la presión a largo plazo',
      'Brinda oportunidades a las negras de recuperar dinamismo con maniobras activas',
      'Lleva frecuentemente a intercambios rápidos que simplifican la posición hacia tablas'
    ]
  },
  {
    id: 'vienna-gambit',
    name: 'Gambito Vienés',
    moves: ['e4', 'e5', 'Nc3'],
    description: 'Las blancas desarrollan el caballo de dama temprano buscando un control flexible antes de contraatacar con f4.',
    category: 'opening',
    subCategory: 'e4',
    pros: [
      'Opción muy agresiva y sorprendente con baja frecuencia de juego en niveles aficionados',
      'Genera ataques muy punzantes en el flanco de rey tras el empuje del gambito f4',
      'Mantiene una intensa iniciativa dinámica combinando solidez en el centro'
    ],
    cons: [
      'Si las negras responden con precisión (empujando d5), el ataque es neutralizado temprano',
      'Aventurar f4 de forma prematura puede exponer la diagonal del propio rey blanco',
      'El desarrollo de las piezas del flanco de rey queda demorado las primeras jugadas'
    ]
  },
  
  // --- APERTURAS CLÁSICAS CON d4 ---
  {
    id: 'queens-gambit',
    name: 'Gambito de Dama',
    moves: ['d4', 'd5', 'c4'],
    description: 'Una apertura sólida que busca el control central sacrificando (temporalmente) un peón lateral para adueñarse de la iniciativa.',
    category: 'opening',
    subCategory: 'd4',
    pros: [
      'Concede un dominio territorial rotundo del centro y excelente seguridad de rey',
      'El peón entregado temporalmente en c4 suele recuperarse con creces y mejor posición',
      'Asfixiante presión posicional sobre las filas del rival si este acepta el gambito'
    ],
    cons: [
      'Conduce a partidas cerradas que demandan alta paciencia y comprensión estratégica',
      'Puede otorgar alternativas tácticas agudas a las negras si optan por defensas hipermodernas',
      'Menor cantidad de pirotecnia táctica de cara o mate en las primeras 10 jugadas'
    ]
  },
  
  // --- PATRONES DE JAQUEMATE (NUEVO) ---
  {
    id: 'mate-pastor',
    name: 'Mate Pastor',
    moves: ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#'],
    description: 'El jaquemate más famoso entre principiantes, aprovechando la debilidad del peón en f7 coordinando alfil y dama.',
    category: 'mate',
    pros: [
      'Puede otorgar una victoria fulminante en apenas 4 movimientos en caso de descuido del rival',
      'Patrón muy intuitivo y fácil de asimilar para principiantes'
    ],
    cons: [
      'Si es evitado con un simple g6 u Qe7, la dama blanca queda mal situada y desprotegida',
      'Las blancas regalan tiempos de desarrollo y la iniciativa pasa directamente al oponente'
    ]
  },
  {
    id: 'mate-escalera',
    name: 'Mate de Escalera',
    initialFen: 'k7/8/8/8/8/8/2R5/1R2K3 w - - 0 1',
    moves: ['Rc8#'],
    description: 'Técnica básica usando dos piezas pesadas (torres o dama) para empujar al rey al borde del tablero alternadamente.',
    category: 'mate',
    pros: [
      'Técnica elemental e infalible aplicable en cualquier final de torres o damas',
      'No exige cálculos profundos: consta de un algoritmo simple paso a paso'
    ],
    cons: [
      'Si el rey rival se encuentra lo bastante cerca, puede entorpecer el proceso capturando las torres desatendidas'
    ]
  },
  {
    id: 'mate-boden',
    name: 'Mate de Boden',
    initialFen: '2kr4/pb1p4/1p1P4/1B6/8/8/8/2B1K3 w - - 0 1',
    moves: ['Ba6#'],
    description: 'Un hermoso jaque mate donde dos alfiles cruzados enérgicos cortan todas las vías de escape del rey enemigo enrocado.',
    category: 'mate',
    pros: [
      'Evidencia el demoledor potencial de una pareja de alfiles activos sobre diagonales adyacentes',
      'Estéticamente impactante y sumamente difícil de prever si no se conoce de antemano el patrón'
    ],
    cons: [
      'Exige que las piezas propias del rey negro actúen como muro bloqueando sus únicos escapes'
    ]
  },
  {
    id: 'mate-smothered',
    name: 'Mate de la Coz (Smothered)',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nd4', 'Nxe5', 'Qg5', 'Nxf7', 'Qxg2', 'Rf1', 'Qxe4+', 'Be2', 'Nf3#'],
    description: 'El rey queda "ahogado" herméticamente por sus propias piezas defensoras y el caballo propicia un golpe final ignorando bloqueos.',
    category: 'mate',
    pros: [
      'Espectacular recurso táctico donde se explota que la agilidad del caballo puede saltar sobre otras piezas',
      'Extremadamente letal en partidas rápidas o relámpago'
    ],
    cons: [
      'Requiere una posición muy específica y que el rival mantenga su rey arrinconado con nula ventilación'
    ]
  },
  {
    id: 'mate-rey-dama',
    name: 'Mate de Rey y Dama',
    initialFen: 'k7/8/1Q6/8/8/8/8/4K3 w - - 0 1',
    moves: ['Qb7#'],
    description: 'Técnica fundamental del final de partida. La dama arrincona al rey rival coordinada con el soporte de su propio rey.',
    category: 'mate',
    pros: [
      'El final elemental más habitual en el ajedrez competitivo',
      'De aprendizaje obligado para poder sellar partidas ganadas tras la coronación de un peón'
    ],
    cons: [
      'Alto riesgo de "rey ahogado" (provocando tablas de forma accidental) si se acorrala en banda sin dejar casillas hábiles de movimiento'
    ]
  },
  {
    id: 'mate-legal',
    name: 'Mate de Légal',
    moves: ['e4', 'e5', 'Bc4', 'd6', 'Nf3', 'Bg4', 'Nc3', 'g6', 'Nxe5', 'Bxd1', 'Bxf7+', 'Ke7', 'Nd5#'],
    description: 'Una elegante celada de apertura que involucra un sacrificio de dama para sentenciar un mate brillante con tres piezas menores activas.',
    category: 'mate',
    pros: [
      'Castiga de un modo inmediato la avaricia material extrema del adversario',
      'Refuerza la premisa fundamental de que la actividad y coordinación de piezas priman sobre el valor numérico'
    ],
    cons: [
      'Si el oponente responde con solidez táctica sin codiciar la dama, el blanco simplemente pierde peones clave'
    ]
  },
  {
    id: 'mate-smothered-classic',
    name: 'Mate de la Coz (Clásico)',
    initialFen: '5rkr/5p1p/4q1nN/7Q/8/8/8/4K3 w - - 0 1',
    moves: ['Kh1', 'Kg8', 'Nf7+', 'Kh8', 'Nh6+', 'Kg8', 'Qg8+', 'Rxg8', 'Nf7#'],
    description: 'La secuencia definitiva de ahogo: jaque doble, seguido de un soberbio sacrificio impidiendo la defensa para el asalto fatal del caballo.',
    category: 'mate',
    pros: [
      'Reconocido unánimemente como una de las maniobras tácticas más elegantes y artísticas del ajedrez',
      'Su conocimiento previene derrotas trágicas en la esquina y premia con victorias memorables'
    ],
    cons: [
      'Consta de una secuencia forzada muy larga (9 jugadas en total) que requiere cálculo milimétrico'
    ]
  }
];
