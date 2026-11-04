
const { Readable } = require("stream");
const { Chess } = require("chess.js");

const {
  createChessCard,
  createEloCard
} = require("../func/chessCard");

const GAMES = new Map();
const INVITES = new Map();

const DEFAULT_STATS = {
  elo: 1000,
  wins: 0,
  losses: 0,
  draws: 0,
  games: 0
};

async function getStats(usersData, userID) {
  const user = await usersData.get(String(userID));

  return {
    ...DEFAULT_STATS,
    ...(user?.data?.chess || {})
  };
}

async function saveStats(usersData, userID, stats) {
  await usersData.set(
    String(userID),
    stats,
    "data.chess"
  );
}

function eloChange(rating, opponentRating, score, k = 24) {
  const expected =
    1 / (1 + Math.pow(10, (opponentRating - rating) / 400));

  return Math.round(rating + k * (score - expected));
}

function pieceValue(piece) {
  if (!piece) return 0;

  return {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 20000
  }[piece.type] || 0;
}

function evaluate(chess, color) {
  let score = 0;
  const board = chess.board();

  for (const row of board) {
    for (const piece of row) {
      if (!piece) continue;

      score += piece.color === color
        ? pieceValue(piece)
        : -pieceValue(piece);
    }
  }

  return score;
}

function minimax(chess, depth, maximizing, botColor) {
  if (depth === 0 || chess.isGameOver()) {
    return evaluate(chess, botColor);
  }

  const moves = chess.moves({ verbose: true });

  if (!moves.length) {
    return evaluate(chess, botColor);
  }

  let best = maximizing ? -Infinity : Infinity;

  for (const move of moves) {
    chess.move(move);

    const score = minimax(
      chess,
      depth - 1,
      !maximizing,
      botColor
    );

    chess.undo();

    best = maximizing
      ? Math.max(best, score)
      : Math.min(best, score);
  }

  return best;
}

function chooseBotMove(chess, difficulty) {
  const moves = chess.moves({ verbose: true });

  if (!moves.length) return null;

  if (difficulty === "facile") {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  let bestMoves = [];
  let bestScore = -Infinity;

  const depth = difficulty === "hard" ? 2 : 1;
  const botColor = chess.turn();

  for (const move of moves) {
    chess.move(move);

    const score = minimax(
      chess,
      depth - 1,
      false,
      botColor
    );

    chess.undo();

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  return bestMoves[
    Math.floor(Math.random() * bestMoves.length)
  ] || moves[0];
}

function parseMove(input) {
  const value = String(input || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");

  const match = value.match(
    /^([a-h][1-8])([a-h][1-8])([qrbn])?$/
  );

  if (!match) return null;

  return {
    from: match[1],
    to: match[2],
    promotion: match[3] || "q"
  };
}

function gameResult(chess) {
  if (!chess.isGameOver()) return null;

  if (chess.isCheckmate()) {
    return chess.turn() === "w" ? "b" : "w";
  }

  return "draw";
}

async function sendBoard(message, game, usersData) {
  const whiteName = await usersData.getName(game.whiteID);

  const blackName = game.bot
    ? `KEN AI (${game.difficulty})`
    : await usersData.getName(game.blackID);

  const image = await createChessCard(game.chess, {
    whiteName,
    blackName,
    subtitle: game.bot
      ? "DUEL CONTRE L'INTELLIGENCE ARTIFICIELLE"
      : "DUEL ENTRE JOUEURS"
  });

  const sent = await message.reply({
    body:
`♛ 𝑬́𝑪𝑯𝑬𝑪𝑺 𝑹𝑶𝒀𝑨𝑳 ♛

${game.chess.turn() === "w"
  ? "♔ Aux blancs de jouer."
  : "♚ Aux noirs de jouer."}

✦ Réponds à cette image pour jouer.
✦ Exemple : e2e4
✦ Promotion : e7e8q
✦ Commande : _echecs stop pour abandonner.`,
    attachment: Readable.from([image])
  });

  if (sent?.messageID) {
    game.lastMessageID = sent.messageID;

    global.GoatBot.onReply.set(sent.messageID, {
      commandName: "echecs",
      action: "move",
      messageID: sent.messageID,
      gameID: game.id
    });
  }
}

async function finishGame(game, usersData, winnerColor) {
  GAMES.delete(game.id);

  if (game.lastMessageID) {
    global.GoatBot.onReply.delete(game.lastMessageID);
  }

  if (game.bot) {
    const stats = await getStats(usersData, game.whiteID);

    stats.games += 1;

    if (winnerColor === "w") {
      stats.wins += 1;
      stats.elo = Math.max(100, stats.elo + 8);
    } else if (winnerColor === "b") {
      stats.losses += 1;
      stats.elo = Math.max(100, stats.elo - 8);
    } else {
      stats.draws += 1;
    }

    await saveStats(usersData, game.whiteID, stats);
    return;
  }

  const white = await getStats(usersData, game.whiteID);
  const black = await getStats(usersData, game.blackID);

  white.games += 1;
  black.games += 1;

  if (winnerColor === "draw") {
    white.draws += 1;
    black.draws += 1;

    const newWhite = eloChange(white.elo, black.elo, 0.5);
    const newBlack = eloChange(black.elo, white.elo, 0.5);

    white.elo = newWhite;
    black.elo = newBlack;
  } else if (winnerColor === "w") {
    white.wins += 1;
    black.losses += 1;

    const newWhite = eloChange(white.elo, black.elo, 1);
    const newBlack = eloChange(black.elo, white.elo, 0);

    white.elo = newWhite;
    black.elo = newBlack;
  } else {
    black.wins += 1;
    white.losses += 1;

    const newWhite = eloChange(white.elo, black.elo, 0);
    const newBlack = eloChange(black.elo, white.elo, 1);

    white.elo = newWhite;
    black.elo = newBlack;
  }

  await saveStats(usersData, game.whiteID, white);
  await saveStats(usersData, game.blackID, black);
}

async function startGame(
  message,
  usersData,
  threadID,
  whiteID,
  blackID,
  bot,
  difficulty
) {
  const game = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    threadID,
    whiteID: String(whiteID),
    blackID: bot ? null : String(blackID),
    bot,
    difficulty: difficulty || "normal",
    chess: new Chess(),
    lastMessageID: null
  };

  GAMES.set(game.id, game);

  await sendBoard(message, game, usersData);
}

module.exports = {
  config: {
    name: "echecs",
    aliases: ["chess", "échecs"],
    version: "1.1.0",
    author: "KEN AI",
    countDown: 5,
    role: 0,
    shortDescription: "Jouer aux échecs",
    longDescription:
      "Échecs contre KEN AI ou un autre joueur avec classement ELO.",
    category: "game",
    guide:
      "{pn} bot [facile|normal|hard] | {pn} @joueur | {pn} elo | {pn} stop"
  },

  onStart: async function ({ message, event, args, usersData }) {
    const userID = String(event.senderID);
    const threadID = String(event.threadID);
    const input = (args || []).map(String);
    const action = (input[0] || "").toLowerCase();

    const currentGame = [...GAMES.values()].find(game =>
      game.whiteID === userID || game.blackID === userID
    );

    if (action === "stop") {
      if (!currentGame) {
        return message.reply("Tu n'as aucune partie en cours.");
      }

      if (currentGame.lastMessageID) {
        global.GoatBot.onReply.delete(currentGame.lastMessageID);
      }

      GAMES.delete(currentGame.id);

      return message.reply(
        "♟️ Partie abandonnée. Cette partie ne comptera pas dans le classement."
      );
    }

    if (action === "elo") {
      const stats = await getStats(usersData, userID);
      const name = await usersData.getName(userID);

      const image = await createEloCard(stats, { name });

      return message.reply({
        body: "♛ 𝐄𝐂𝐇𝐄𝐂𝐒 𝐑𝐎𝐘𝐀𝐋 — 𝐒𝐓𝐀𝐓𝐈𝐒𝐓𝐈𝐐𝐔𝐄𝐒 ♛",
        attachment: Readable.from([image])
      });
    }

    if (currentGame) {
      return message.reply(
        "Tu as déjà une partie en cours. Termine-la ou utilise _echecs stop."
      );
    }

    if (action === "bot") {
      const difficulty = [
        "facile",
        "normal",
        "hard"
      ].includes((input[1] || "").toLowerCase())
        ? (input[1] || "normal").toLowerCase()
        : "normal";

      return startGame(
        message,
        usersData,
        threadID,
        userID,
        null,
        true,
        difficulty
      );
    }

    const mentionedID = Object.keys(event.mentions || {})[0];

    if (mentionedID) {
      const opponentID = String(mentionedID);

      if (opponentID === userID) {
        return message.reply("Tu ne peux pas te défier toi-même.");
      }

      const invite = await message.reply(
`♛ 𝑫𝑬́𝑭𝑰 𝑫'𝑬́𝑪𝑯𝑬𝑪𝑺 ♛

Un duel vient de t'être proposé !

♔ Blancs : ${await usersData.getName(userID)}
♚ Noirs : ${await usersData.getName(opponentID)}

Le joueur défié doit répondre à ce message avec ACCEPTER ou REFUSER.`
      );

      if (!invite?.messageID) return;

      INVITES.set(invite.messageID, {
        fromID: userID,
        toID: opponentID,
        threadID
      });

      global.GoatBot.onReply.set(invite.messageID, {
        commandName: "echecs",
        action: "invite",
        messageID: invite.messageID
      });

      return;
    }

    return message.reply(
`♛ 𝑬́𝑪𝑯𝑬𝑪𝑺 𝑹𝑶𝒀𝑨𝑳 — 𝑲𝑬𝑵 𝑨𝑰 ♛

♟️ Lancer une partie :
• _echecs bot — Solo contre KEN AI
• _echecs bot facile — IA facile
• _echecs bot normal — IA normale
• _echecs bot hard — IA difficile
• _echecs @joueur — Défier un membre

♜ Classement :
• _echecs elo — Voir tes statistiques ELO
• _echecs stop — Abandonner

Notation des coups :
Réponds à l'image de l'échiquier avec e2e4.

Promotion :
e7e8q (q = dame, r = tour, b = fou, n = cavalier).`
    );
  },

  onReply: async function ({ event, Reply, message, usersData }) {
    const senderID = String(event.senderID);
    const body = String(event.body || "").trim();

    if (Reply.action === "invite") {
      const invite = INVITES.get(Reply.messageID);

      if (!invite) {
        return message.reply("Ce défi n'est plus disponible.");
      }

      if (senderID !== invite.toID) {
        return message.reply(
          "Seul le joueur défié peut accepter cette invitation."
        );
      }

      const answer = body.toLowerCase();

      if (answer !== "accepter" && answer !== "refuser") {
        return message.reply("Réponds simplement ACCEPTER ou REFUSER.");
      }

      INVITES.delete(Reply.messageID);
      global.GoatBot.onReply.delete(Reply.messageID);

      if (answer === "refuser") {
        return message.reply("Défi refusé.");
      }

      const alreadyPlaying = [...GAMES.values()].some(game =>
        [game.whiteID, game.blackID].includes(invite.fromID) ||
        [game.whiteID, game.blackID].includes(invite.toID)
      );

      if (alreadyPlaying) {
        return message.reply(
          "Un des joueurs a déjà une partie en cours."
        );
      }

      return startGame(
        message,
        usersData,
        invite.threadID,
        invite.fromID,
        invite.toID,
        false,
        "normal"
      );
    }

    if (Reply.action !== "move") return;

    const game = GAMES.get(Reply.gameID);

    if (!game) {
      return message.reply("Cette partie n'est plus active.");
    }

    const expectedID =
      game.chess.turn() === "w"
        ? game.whiteID
        : game.blackID;

    if (game.bot && game.chess.turn() === "b") {
      return message.reply("C'est au tour de KEN AI de jouer.");
    }

    if (senderID !== expectedID) {
      return message.reply("Ce n'est pas ton tour de jouer.");
    }

    const move = parseMove(body);

    if (!move) {
      return message.reply(
        "Coup invalide. Utilise e2e4, ou e7e8q pour une promotion."
      );
    }

    try {
      const played = game.chess.move(move);

      if (!played) {
        return message.reply(
          "Ce coup n'est pas légal. Essaie un autre déplacement."
        );
      }

      global.GoatBot.onReply.delete(Reply.messageID);
      game.lastMessageID = null;

      if (game.bot && !game.chess.isGameOver()) {
        const botMove = chooseBotMove(
          game.chess,
          game.difficulty
        );

        if (botMove) {
          game.chess.move(botMove);
        }
      }

      const result = gameResult(game.chess);

      if (result) {
        await finishGame(game, usersData, result);

        const ending = result === "draw"
          ? "🤝 Match nul !"
          : `🏆 Victoire des ${result === "w" ? "BLANCS" : "NOIRS"} !`;

        await message.reply(
          `${ending}\n♛ La partie est terminée. Utilise _echecs bot pour rejouer ou _echecs elo pour voir ton classement.`
        );

        return;
      }

      await sendBoard(message, game, usersData);

    } catch (err) {
      console.error("Erreur partie d'échecs :", err);

      return message.reply(
        "Une erreur est survenue pendant le coup. Consulte les logs Render."
      );
    }
  }
};
  
