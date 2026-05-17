export interface Opening {
  id: string;
  name: string;
  moves: string[]; // Standard Algebraic Notation
  description: string;
}

export const OPENINGS: Opening[] = [
  {
    id: 'ruy-lopez',
    name: 'Ruy Lopez (Española)',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
    description: 'Una de las aperturas más antiguas y populares, centrada en la presión sobre el peón de e5.'
  },
  {
    id: 'sicilian',
    name: 'Defensa Siciliana',
    moves: ['e4', 'c5'],
    description: 'La respuesta más popular a e4, creando un juego asimétrico y complejo.'
  },
  {
    id: 'queens-gambit',
    name: 'Gambito de Dama',
    moves: ['d4', 'd5', 'c4'],
    description: 'Una apertura sólida que busca el control central sacrificando (temporalmente) un peón lateral.'
  },
  {
    id: 'french-defense',
    name: 'Defensa Francesa',
    moves: ['e4', 'e6', 'd4', 'd5'],
    description: 'Una defensa sólida que a menudo lleva a cadenas de peones cerradas.'
  },
  {
    id: 'caro-kann',
    name: 'Caro-Kann',
    moves: ['e4', 'c6', 'd4', 'd5'],
    description: 'Similar a la Francesa pero con la intención de liberar el alfil de casillas blancas.'
  },
  {
    id: 'english-opening',
    name: 'Apertura Inglesa',
    moves: ['c4'],
    description: 'Una apertura de flanco que a menudo transpone a sistemas de Peón de Dama o Sicilianas invertidas.'
  },
  {
    id: 'london-system',
    name: 'Sistema Londres',
    moves: ['d4', 'Nf6', 'Bf4'],
    description: 'Un esquema sólido y versátil para las blancas que se puede jugar contra casi cualquier respuesta negra.'
  },
  {
    id: 'italian-game',
    name: 'Juego Italiano',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
    description: 'Una de las aperturas más antiguas, buscando el desarrollo rápido y el control del centro.'
  },
  {
    id: 'scotch-game',
    name: 'Gambito Escocés',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'],
    description: 'Las blancas buscan abrir el centro de inmediato para aprovechar su ventaja de desarrollo.'
  },
  {
    id: 'reti-opening',
    name: 'Apertura Reti',
    moves: ['Nf3', 'd5', 'c4'],
    description: 'Una apertura hipermoderna que presiona el centro desde los flancos.'
  },
  {
    id: 'benoni-defense',
    name: 'Defensa Benoni',
    moves: ['d4', 'Nf6', 'c4', 'c5', 'd5'],
    description: 'Una defensa agresiva que busca crear un juego dinámico y asimétrico.'
  },
  {
    id: 'grunfeld-defense',
    name: 'Defensa Grunfeld',
    moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5'],
    description: 'Las negras permiten un centro blanco fuerte para luego atacarlo con piezas.'
  },
  {
    id: 'pirc-defense',
    name: 'Defensa Pirc',
    moves: ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6'],
    description: 'Una defensa flexible y provocativa que permite al blanco ocupar el centro para luego atacarlo.'
  },
  {
    id: 'scandinavian',
    name: 'Defensa Escandinava',
    moves: ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5'],
    description: 'Una de las formas más directas de desafiar el peón de e4 del blanco inmediatamente.'
  },
  {
    id: 'kings-indian',
    name: 'Defensa India de Rey',
    moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6'],
    description: 'Una apertura hipermoderna donde las negras permiten que el blanco tome el centro para luego contraatacar.'
  }
];
