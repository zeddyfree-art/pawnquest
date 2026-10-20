// Opening books: the lines a character aims for, written by hand per opening (no database dump).
// Each line runs from the starting position and includes the moves of both sides; the bot follows the lines
// that match the game so far, weighting their next moves by what Maia predicts at its rating, and leaves the
// book when the opponent plays something else or the character's book depth is reached.
// Opening names follow lichess-org/chess-openings (CC0).

export interface Opening {
  name: string;
  /** SAN moves separated by spaces, from the starting position. */
  lines: string[];
}

const ITALIAN = 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5';
const RUY_CLOSED = 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3';
const QGD = 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4';
const NAJDORF = 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6';

export const OPENINGS = {
  // ---------- White ----------
  halloween: { name: 'Halloween Gambit', lines: ['e4 e5 Nf3 Nc6 Nc3 Nf6 Nxe5 Nxe5 d4 Nc6 d5 Ne5 f4 Ng6 e5 Ng8', 'e4 e5 Nf3 Nc6 Nc3 Bc5 Nxe5 Nxe5 d4'] },
  kingsGambit: {
    name: "King's Gambit",
    lines: ['e4 e5 f4 exf4 Nf3 g5 h4 g4 Ne5', 'e4 e5 f4 exf4 Nf3 d6 d4 g5 h4 g4 Ng1', 'e4 e5 f4 d5 exd5 exf4 Nf3 Nf6', 'e4 e5 f4 Bc5 Nf3 d6 c3 Nf6'],
  },
  danish: { name: 'Danish Gambit', lines: ['e4 e5 d4 exd4 c3 dxc3 Bc4 cxb2 Bxb2 d5 Bxd5 Nf6', 'e4 e5 d4 exd4 c3 d5 exd5 Qxd5 cxd4'] },
  evans: { name: 'Evans Gambit', lines: ['e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O', 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bb6 a4 a6 Nc3'] },
  friedLiver: {
    name: 'Fried Liver Attack / Scotch Gambit',
    lines: ['e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7 Kxf7 Qf3+ Ke6 Nc3', 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6', 'e4 e5 Nf3 Nc6 Bc4 Bc5 d4 exd4 O-O Nf6 e5'],
  },
  smithMorra: { name: 'Smith-Morra Gambit', lines: ['e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 d6 Bc4 e6 O-O Nf6 Qe2', 'e4 e5 Nf3 Nc6 d4 exd4 Bc4 Bc5 c3'] },
  viennaGambit: { name: 'Vienna Gambit', lines: ['e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7', 'e4 e5 Nc3 Nc6 f4 exf4 Nf3 g5 h4'] },
  italian: { name: 'Italian Game (Giuoco Piano)', lines: [ITALIAN, 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O Re1 d6 c3'] },
  fourKnights: { name: 'Four Knights Game', lines: ['e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Bb4 O-O O-O d3 d6', 'e4 e5 Nf3 Nc6 Nc3 Nf6 d4 exd4 Nxd4 Bb4 Nxc6 bxc6 Bd3'] },
  scotch: { name: 'Scotch Game', lines: ['e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7 Qe2 Nd5 c4', 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3 Qf6 c3 Nge7 Bc4'] },
  ruyLopez: { name: 'Ruy Lopez', lines: [RUY_CLOSED + ' Bb7 d4 Re8', 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8', 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4 d4 b5 Bb3 d5 dxe5 Be6'] },
  ruyClosed: { name: 'Ruy Lopez (Closed)', lines: [RUY_CLOSED + ' Nb8 d4 Nbd7 Nbd2 Bb7 Bc2 Re8', RUY_CLOSED + ' Na5 Bc2 c5 d4 Qc7'] },
  vienna: { name: 'Vienna Game', lines: ['e4 e5 Nc3 Nf6 Bc4 Nc6 d3 Bb4 Nf3 d6', 'e4 e5 Nc3 Nc6 Bc4 Bc5 Qg4 Qf6 Nd5'] },
  queensGambit: { name: "Queen's Gambit", lines: [QGD + ' b6 cxd5 Nxd5', 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4', 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6', 'd4 Nf6 c4 e6 Nf3 d5 Nc3 Be7 Bf4 O-O e3'] },
  qgExchange: { name: "Queen's Gambit, Exchange (minority attack)", lines: ['d4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 c6 e3 Be7 Bd3 Nbd7 Qc2 O-O Nge2 Re8 O-O Nf8 Rab1', 'd4 d5 c4 c6 Nf3 Nf6 cxd5 cxd5 Nc3 Nc6 Bf4'] },
  london: { name: 'London System', lines: ['d4 d5 Bf4 Nf6 e3 e6 Nf3 c5 c3 Nc6 Nbd2 Bd6 Bg3 O-O Bd3', 'd4 Nf6 Bf4 g6 e3 Bg7 Nf3 O-O Be2 d6 h3', 'd4 d5 Bf4 c5 e3 Nc6 c3 Nf6 Nd2 e6 Ngf3'] },
  colle: { name: 'Colle-Zukertort', lines: ['d4 d5 Nf3 Nf6 e3 e6 Bd3 c5 b3 Nc6 O-O Bd6 Bb2 O-O Nbd2 b6 Ne5', 'd4 Nf6 Nf3 g6 e3 Bg7 Bd3 O-O O-O d6 b3'] },
  english: { name: 'English Opening (1.c4)', lines: ['c4 e5 Nc3 Nf6 g3 d5 cxd5 Nxd5 Bg2 Nb6 Nf3 Nc6 O-O Be7', 'c4 Nf6 Nc3 e6 Nf3 d5 d4 Be7', 'c4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 Nf3 e6 O-O Nge7'] },
  reti: { name: 'Réti Opening (1.Nf3)', lines: ['Nf3 d5 g3 Nf6 Bg2 e6 O-O Be7 d3 O-O Nbd2 c5 e4', 'Nf3 Nf6 g3 g6 Bg2 Bg7 O-O O-O d3 d6 e4'] },
  catalan: { name: 'Catalan Opening', lines: ['d4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O dxc4 Qc2 a6 Qxc4 b5 Qc2 Bb7', 'd4 Nf6 c4 e6 g3 d5 Nf3 Bb4+ Bd2 Be7 Bg2 O-O O-O c6 Qc2', 'd4 d5 c4 e6 g3 Nf6 Bg2 dxc4 Nf3 c5 O-O Nc6'] },

  // ---------- Black against 1.e4 ----------
  latvian: { name: 'Latvian Gambit', lines: ['e4 e5 Nf3 f5 Nxe5 Qf6 d4 d6 Nc4 fxe4 Nc3 Qg6', 'e4 e5 Nf3 f5 exf5 e4 Ne5 Nf6', 'e4 e5 Nf3 f5 Bc4 fxe4 Nxe5 Qg5 d4 Qxg2'] },
  elephant: { name: 'Elephant Gambit', lines: ['e4 e5 Nf3 d5 exd5 e4 Qe2 Nf6 d3 Be7 dxe4 O-O', 'e4 e5 Nf3 d5 Nxe5 Bd6 d4 dxe4 Bc4'] },
  stafford: { name: 'Stafford Gambit', lines: ['e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5 Be2 h5 c3 Ng4', 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 Nc3 Bc5 Bc4 Ng4'] },
  icelandic: { name: 'Icelandic Gambit (Scandinavian)', lines: ['e4 d5 exd5 Nf6 c4 e6 dxe6 Bxe6 Nf3 Nc6 Be2 Bc5', 'e4 d5 exd5 Nf6 d4 Nxd5 c4 Nb6 Nf3 g6'] },
  traxler: { name: 'Traxler Counterattack (Two Knights)', lines: ['e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 Bc5 Nxf7 Bxf2+ Kxf2 Nxe4+ Kg1 Qh4', 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 Bc5 Bxf7+ Ke7 Bb3 Rf8', 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Bc5 O-O d6'] },
  schliemann: { name: 'Schliemann Defence (vs the Ruy Lopez)', lines: ['e4 e5 Nf3 Nc6 Bb5 f5 Nc3 fxe4 Nxe4 d5 Nxe5 dxe4 Nxc6 Qg5', 'e4 e5 Nf3 Nc6 Bb5 f5 d3 fxe4 dxe4 Nf6 O-O d6', 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7'] },
  dragon: { name: 'Sicilian Dragon', lines: ['e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 Bc4 Bd7', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be2 Bg7 O-O O-O'] },
  najdorfPoison: { name: 'Sicilian Najdorf, Poisoned Pawn', lines: [NAJDORF + ' Bg5 e6 f4 Qb6 Qd2 Qxb2 Rb1 Qa3', NAJDORF + ' Be3 e5 Nb3 Be6 f3 Be7', NAJDORF + ' Be2 e5 Nb3 Be7 O-O O-O'] },
  najdorfSveshnikov: { name: 'Sicilian Najdorf & Sveshnikov', lines: [NAJDORF + ' Be3 e5 Nb3 Be6 f3 Be7 Qd2 O-O', NAJDORF + ' Bg5 e6 f4 Qb6', 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5'] },
  marshall: { name: 'Marshall Attack', lines: ['e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5 exd5 Nxd5 Nxe5 Nxe5 Rxe5 c6 d4 Bd6 Re1 Qh4'] },
  e5: { name: '1…e5', lines: ['e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6', 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7', 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nc3 Bb4', 'e4 e5 Nc3 Nf6 Bc4 Nc6'] },
  twoKnights: { name: 'Two Knights Defence', lines: ['e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2 h6', 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O', 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7'] },
  petroff: { name: 'Petroff Defence', lines: ['e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Nc6 O-O Be7', 'e4 e5 Nf3 Nf6 d4 Nxe4 Bd3 d5 Nxe5 Nd7'] },
  openSpanish: { name: '1…e5, Open Spanish', lines: ['e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4 d4 b5 Bb3 d5 dxe5 Be6 c3 Bc5', 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7'] },
  breyer: { name: '1…e5, Closed Spanish (Breyer)', lines: [RUY_CLOSED + ' Nb8 d4 Nbd7 Nbd2 Bb7 Bc2 Re8 Nf1 Bf8', 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O'] },
  chigorin: { name: '1…e5, Closed Spanish (Chigorin)', lines: [RUY_CLOSED + ' Na5 Bc2 c5 d4 Qc7 Nbd2 cxd4 cxd4', 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O'] },
  berlin: { name: '1…e5, Berlin Defence', lines: ['e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8 Nc3 Ke8', 'e4 e5 Nf3 Nc6 Bb5 Nf6 d3 Bc5 c3 O-O O-O d6'] },
  caroKann: { name: 'Caro-Kann', lines: ['e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7', 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5', 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4'] },
  french: { name: 'French Defence', lines: ['e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7 Bxe7 Qxe7', 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6', 'e4 e6 d4 d5 exd5 exd5 Nf3 Nf6 Bd3 Bd6', 'e4 e6 d4 d5 Nd2 c5 exd5 Qxd5'] },
  pirc: { name: 'Pirc Defence', lines: ['e4 d6 d4 Nf6 Nc3 g6 Be3 Bg7 Qd2 c6 f3 b5', 'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O c6'] },
  alekhine: { name: "Alekhine's Defence", lines: ['e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7 c4 Nb6', 'e4 Nf6 Nc3 d5 exd5 Nxd5 Bc4 Nb6'] },
  philidor: { name: 'Philidor Defence', lines: ['e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7 Bc4 Be7 O-O O-O Re1 c6', 'e4 d6 d4 Nf6 Nc3 e5 Nf3 Nbd7'] },
  kan: { name: 'Sicilian Kan / Hedgehog', lines: ['e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 Bd3 Nf6 O-O Qc7 Qe2 d6 c4 g6', 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 Nc3 Qc7 Bd3 Nc6 Nxc6 bxc6'] },

  // ---------- Black against 1.d4 (and the rest) ----------
  englund: { name: 'Englund Gambit', lines: ['d4 e5 dxe5 Nc6 Nf3 Qe7 Bf4 Qb4+ Bd2 Qxb2 Bc3 Bb4', 'd4 e5 dxe5 Nc6 Nf3 d6 exd6 Bxd6'] },
  budapest: { name: 'Budapest Gambit', lines: ['d4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nbd2 Qe7 e3 Ngxe5', 'd4 Nf6 c4 e5 dxe5 Ng4 Nf3 Bc5 e3 Nc6 Be2 Ngxe5'] },
  albin: { name: 'Albin Countergambit', lines: ['d4 d5 c4 e5 dxe5 d4 Nf3 Nc6 g3 Be6 Nbd2 Qd7', 'd4 d5 c4 e5 dxe5 d4 e3 Bb4+ Bd2 dxe3'] },
  dutchLeningrad: { name: 'Dutch Defence (Leningrad)', lines: ['d4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6 Nc3 Qe8', 'd4 f5 c4 Nf6 Nc3 g6 Nf3 Bg7 g3 O-O Bg2 d6'] },
  benko: { name: 'Benko Gambit', lines: ['d4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 g6 Nc3 Bxa6 e4 Bxf1 Kxf1 d6', 'd4 Nf6 c4 c5 d5 b5 Nf3 g6 cxb5 a6'] },
  blumenfeld: { name: 'Blumenfeld Gambit', lines: ['d4 Nf6 c4 e6 Nf3 c5 d5 b5 dxe6 fxe6 cxb5 d5', 'd4 Nf6 c4 e6 Nf3 c5 d5 b5 Bg5 exd5 cxd5 h6'] },
  modernBenoni: { name: 'Modern Benoni', lines: ['d4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 Nf3 Bg7 Be2 O-O O-O Re8'] },
  d5symmetric: { name: '1…d5 (symmetrical)', lines: ['d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7', 'd4 d5 Nf3 Nf6 Bf4 Bf5 e3 e6', 'd4 d5 Bf4 Bf5 e3 e6 Nf3 Nf6'] },
  qgd: { name: "Queen's Gambit Declined", lines: [QGD + ' b6 cxd5 Nxd5 Bxe7 Qxe7', 'd4 d5 c4 e6 Nf3 Nf6 Nc3 Be7 Bf4 O-O e3 c5', 'd4 d5 Nf3 Nf6 c4 e6 Nc3 Be7'] },
  qgdOrthodox: { name: "Queen's Gambit Declined (Orthodox)", lines: [QGD.replace(' h6 Bh4', ' Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5'), 'd4 d5 c4 e6 Nf3 Nf6 Nc3 Be7 Bf4 O-O e3 Nbd7'] },
  qgdTartakower: { name: "Queen's Gambit Declined (Tartakower)", lines: [QGD + ' b6 Be2 Bb7 Bxf6 Bxf6 cxd5 exd5', 'd4 d5 c4 e6 Nf3 Nf6 Nc3 Be7 Bf4 O-O e3 c5'] },
  qgdRagozin: { name: "Queen's Gambit Declined (Ragozin)", lines: ['d4 d5 c4 e6 Nc3 Nf6 Nf3 Bb4 cxd5 exd5 Bg5 h6 Bh4 c5', 'd4 Nf6 c4 e6 Nf3 d5 Nc3 Bb4 Qa4+ Nc6 e3 O-O'] },
  qga: { name: "Queen's Gambit Accepted", lines: ['d4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 dxc5 Qxd1 Rxd1 Bxc5', 'd4 d5 c4 dxc4 e4 e5 Nf3 exd4 Bxc4 Bb4+'] },
  nimzo: { name: 'Nimzo-Indian Defence', lines: ['d4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5 O-O Nc6', 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3 b6', 'd4 Nf6 c4 e6 Nf3 b6 g3 Ba6 b3 Bb4+'] },
  nimzoQid: { name: 'Nimzo-Indian / Queen’s Indian', lines: ['d4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5', 'd4 Nf6 c4 e6 Nf3 b6 g3 Ba6 b3 Bb4+ Bd2 Be7 Bg2 c6'] },
  slav: { name: 'Slav Defence', lines: ['d4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O O-O', 'd4 d5 c4 c6 Nc3 Nf6 e3 Bf5 Nf3 e6', 'd4 d5 Nf3 Nf6 Bf4 c6 e3 Bf5'] },
  kid: { name: "King's Indian Defence", lines: ['d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7', 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O Nbd7', 'd4 Nf6 Bf4 g6 e3 Bg7'] },
  qid: { name: "Queen's Indian Defence", lines: ['d4 Nf6 c4 e6 Nf3 b6 g3 Ba6 b3 Bb4+ Bd2 Be7 Bg2 c6 Bc3 d5', 'd4 Nf6 c4 e6 Nf3 b6 Nc3 Bb7 a3 d5', 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O'] },
  oldIndian: { name: 'Old Indian Defence', lines: ['d4 Nf6 c4 d6 Nc3 e5 Nf3 Nbd7 e4 Be7 Be2 O-O O-O c6', 'd4 d6 Nf3 Nf6 c4 Nbd7 Nc3 e5'] },
  grunfeld: { name: 'Grünfeld Defence', lines: ['d4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5 Be3 Qa5', 'd4 Nf6 c4 g6 Nf3 Bg7 g3 d5 cxd5 Nxd5 Bg2 O-O'] },
  stonewall: { name: 'Dutch Stonewall', lines: ['d4 f5 g3 Nf6 Bg2 e6 Nf3 d5 O-O Bd6 c4 c6 b3 Qe7', 'd4 e6 c4 f5 Nc3 Nf6 Nf3 d5 e3 c6'] },
} satisfies Record<string, Opening>;

export type OpeningId = keyof typeof OPENINGS;
