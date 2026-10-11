/* Puzzles built from suroh90's own chess.com games by
   tools/chesscom-to-puzzles.py. Gitignored: this is personal game
   history, not part of the site. Re-run the tool to rebuild it.

   Each one is posed at the position where a real mistake was played,
   with YOU to move, so solverFirst is true. */

const OWN_SET = [
  {
    key: "own", label: "Own blunders", band: "6 puzzles",
    puzzles: [
      {"id":"own-ce5d025c-45","fen":"5rk1/pp3pp1/7p/7b/3r4/1BPP1P2/PP5P/2K2RR1 b - - 0 23","moves":"d4d3 g1g3 f8e8 f1g1 g7g6","rating":0,"themes":"own defence","label":"vs avishekpoudel · 2026-10-08","explain":"You played <b>Rd7</b> here, costing about 3.5 pawns. <b>Rxd3</b> was the save: Rxd3 Rg3 Re8 Rfg1 g6. <a href=\"https://www.chess.com/game/live/185004384410\" target=\"_blank\" rel=\"noopener\">See the game</a>","solverFirst":true},
      {"id":"own-b24a92a7-22","fen":"rnb1kbnr/pp4pp/2p3q1/5pB1/2P1p2P/3BPNN1/PP3PP1/R2QK2R w KQkq - 0 12","moves":"d3e4 f8b4 e1f1 b4e7 e4c2","rating":0,"themes":"own wins material","label":"vs kiranyalla · 2026-10-09","explain":"You played <b>h5</b> here, costing about 6.0 pawns. <b>Bxe4</b> wins: Bxe4 Bb4+ Kf1 Be7 Bc2. <a href=\"https://www.chess.com/game/live/185058178200\" target=\"_blank\" rel=\"noopener\">See the game</a>","solverFirst":true},
      {"id":"own-d853e005-41","fen":"3r1rk1/pp4pp/4R3/5p2/8/q7/3B1PPP/2Q3K1 b - - 2 21","moves":"a3c1 e6e1 c1d2 e1f1 f8e8","rating":0,"themes":"own wins material","label":"vs bacillo · 2026-10-10","explain":"You played <b>Rxd2</b> here, costing about 11.4 pawns. <b>Qxc1+</b> wins: Qxc1+ Re1 Qxd2 Rf1 Rfe8. <a href=\"https://www.chess.com/game/live/185129428168\" target=\"_blank\" rel=\"noopener\">See the game</a>","solverFirst":true},
      {"id":"own-d853e005-95","fen":"8/8/1k6/8/1p3PPP/1Q3K2/8/4q3 b - - 4 48","moves":"e1h1 f3e2 h1g2 e2d3 g2f3","rating":0,"themes":"own defence","label":"vs bacillo · 2026-10-10","explain":"You played <b>Qc3+</b> here, costing about 5.5 pawns. <b>Qh1+</b> was the save: Qh1+ Ke2 Qg2+ Kd3 Qf3+. <a href=\"https://www.chess.com/game/live/185129428168\" target=\"_blank\" rel=\"noopener\">See the game</a>","solverFirst":true},
      {"id":"own-d66fe0e8-73","fen":"k7/pp5p/8/2K3R1/q7/2P3Q1/3r1PPP/8 b - - 9 37","moves":"b7b6","rating":0,"themes":"own mate","label":"vs JORGECAMAENA_1602 · 2026-10-10","explain":"You played <b>Qc6+</b> here. <b>b6#</b> was mate: b6#. <a href=\"https://www.chess.com/game/live/185130439476\" target=\"_blank\" rel=\"noopener\">See the game</a>","solverFirst":true},
      {"id":"own-835ebe65-30","fen":"r3k1nr/ppp2ppp/8/R7/8/3BB1P1/1P3P1P/3bN1K1 w kq - 0 16","moves":"a5e5 g8e7 e3c5 e8g8 c5e7","rating":0,"themes":"own defence","label":"vs MaitreGuiGui · 2026-10-10","explain":"You played <b>Rd5</b> here, costing about 4.3 pawns. <b>Re5+</b> was the save: Re5+ Ne7 Bc5 O-O Bxe7. <a href=\"https://www.chess.com/game/live/185131088992\" target=\"_blank\" rel=\"noopener\">See the game</a>","solverFirst":true}
    ]
  }
];
