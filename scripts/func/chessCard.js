const { createCanvas } = require("canvas");

const PIECES = {
  w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
  b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" }
};

async function createChessCard(chess, data = {}) {
  const width = 1100;
  const height = 850;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#090711");
  bg.addColorStop(0.55, "#171027");
  bg.addColorStop(1, "#080b13");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#9c6cff";
  ctx.lineWidth = 3;
  ctx.strokeRect(18, 18, width - 36, height - 36);

  ctx.fillStyle = "#eadcff";
  ctx.font = "bold 34px Arial";
  ctx.fillText("♛  ÉCHECS ROYAL  ♛", 55, 67);

  ctx.fillStyle = "#bda4ef";
  ctx.font = "18px Arial";
  ctx.fillText(
    data.subtitle || "KEN AI • ROYAUME DES ÉCHECS",
    58,
    99
  );

  const boardX = 60;
  const boardY = 135;
  const cell = 88;
  const light = "#e8d6b7";
  const dark = "#79543f";
  const board = chess.board();

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const x = boardX + col * cell;
      const y = boardY + row * cell;

      ctx.fillStyle = (row + col) % 2 === 0 ? light : dark;
      ctx.fillRect(x, y, cell, cell);

      const piece = board[row][col];

      if (piece) {
        const glyph = PIECES[piece.color][piece.type];

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "66px Arial";
        ctx.lineWidth = 2;

        ctx.strokeStyle =
          piece.color === "w" ? "#2b1b16" : "#f2dfc5";

        ctx.fillStyle =
          piece.color === "w" ? "#fff7e9" : "#171219";

        ctx.strokeText(
          glyph,
          x + cell / 2,
          y + cell / 2 + 3
        );

        ctx.fillText(
          glyph,
          x + cell / 2,
          y + cell / 2 + 3
        );
      }
    }
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#d9c6ff";
  ctx.font = "bold 17px Arial";

  for (let i = 0; i < 8; i++) {
    ctx.fillText(
      String(8 - i),
      37,
      boardY + i * cell + 51
    );

    ctx.fillText(
      "abcdefgh"[i],
      boardX + i * cell + 37,
      boardY + 8 * cell + 27
    );
  }

  const panelX = 800;

  ctx.fillStyle = "#151321";
  ctx.fillRect(panelX, 135, 245, 704);

  ctx.strokeStyle = "#7047b8";
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX, 135, 245, 704);

  ctx.fillStyle = "#f0e5ff";
  ctx.font = "bold 23px Arial";
  ctx.fillText("JOUEURS", panelX + 22, 180);

  ctx.fillStyle = "#c9b3ef";
  ctx.font = "19px Arial";
  ctx.fillText("♔ Blancs", panelX + 22, 230);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px Arial";
  ctx.fillText(
    String(data.whiteName || "Joueur 1").slice(0, 18),
    panelX + 22,
    263
  );

  ctx.fillStyle = "#c9b3ef";
  ctx.font = "19px Arial";
  ctx.fillText("♚ Noirs", panelX + 22, 320);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px Arial";
  ctx.fillText(
    String(data.blackName || "Joueur 2").slice(0, 18),
    panelX + 22,
    353
  );

  ctx.strokeStyle = "#47345f";
  ctx.beginPath();
  ctx.moveTo(panelX + 20, 390);
  ctx.lineTo(panelX + 225, 390);
  ctx.stroke();

  ctx.fillStyle = "#d7c4fa";
  ctx.font = "bold 20px Arial";
  ctx.fillText("TOUR ACTUEL", panelX + 22, 435);

  ctx.fillStyle = "#ffffff";
  ctx.font = "18px Arial";
  ctx.fillText(
    chess.turn() === "w" ? "Aux blancs" : "Aux noirs",
    panelX + 22,
    470
  );

  ctx.fillStyle = "#d7c4fa";
  ctx.font = "bold 20px Arial";
  ctx.fillText("DERNIER COUP", panelX + 22, 535);

  ctx.fillStyle = "#ffffff";
  ctx.font = "18px Arial";

  const history = chess.history();

  ctx.fillText(
    history.length ? history[history.length - 1] : "Aucun",
    panelX + 22,
    570
  );

  ctx.fillStyle = "#bda4ef";
  ctx.font = "16px Arial";
  ctx.fillText(
    "KEN AI • ROYAL EDITION",
    panelX + 22,
    790
  );

  return canvas.toBuffer("image/png");
}

module.exports = { createChessCard };
