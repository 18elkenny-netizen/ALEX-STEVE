const { Chess } = require("chess.js");
const { createCanvas } = require("canvas");
const stockfish = require("stockfish");
const { Readable } = require("stream");
const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "echecs-data.json");

const games = global.echecsGames || (global.echecsGames = new Map());
const invitations = global.echecsInvitations || (global.echecsInvitations = new Map());

const PIECES = {
	w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
	b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" }
};

// ==========================================
// SAUVEGARDE DES STATISTIQUES
// ==========================================

function loadData() {
	try {
		return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
	}
	catch {
		return {};
	}
}

function saveData(data) {
	fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getStats(id) {
	const data = loadData();

	return data[id] || {
		wins: 0,
		losses: 0,
		draws: 0,
		elo: 1000
	};
}

function updateStats(winner, loser, draw = false) {
	const data = loadData();

	if (draw) {
		for (const id of [winner, loser]) {
			data[id] ??= {
				wins: 0,
				losses: 0,
				draws: 0,
				elo: 1000
			};

			data[id].draws++;
		}
	}
	else {
		data[winner] ??= {
			wins: 0,
			losses: 0,
			draws: 0,
			elo: 1000
		};

		data[loser] ??= {
			wins: 0,
			losses: 0,
			draws: 0,
			elo: 1000
		};

		data[winner].wins++;
		data[loser].losses++;

		const expected = 1 / (
			1 + Math.pow(10, (data[loser].elo - data[winner].elo) / 400)
		);

		const change = Math.round(32 * (1 - expected));

		data[winner].elo += change;
		data[loser].elo -= change;
	}

	saveData(data);
}

// ==========================================
// GESTION DES PARTIES
// ==========================================

function getGame(id) {
	for (const game of games.values()) {
		if (game.white === id || game.black === id) {
			return game;
		}
	}

	return null;
}

function createGame(id1, id2, mode, difficulty = 5) {
	const game = {
		chess: new Chess(),
		white: id1,
		black: id2,
		mode,
		difficulty,
		history: [],
		createdAt: Date.now()
	};

	games.set(id1, game);
	games.set(id2, game);

	return game;
}

function removeGame(game) {
	games.delete(game.white);
	games.delete(game.black);
}

function getResult(game) {
	const chess = game.chess;

	if (chess.isCheckmate()) {
		return {
			over: true,
			winner: chess.turn() === "w" ? game.black : game.white,
			text: "ÉCHEC ET MAT"
		};
	}

	if (chess.isDraw()) {
		return {
			over: true,
			draw: true,
			text: "MATCH NUL"
		};
	}

	if (chess.isStalemate()) {
		return {
			over: true,
			draw: true,
			text: "PAT"
		};
	}

	if (chess.isThreefoldRepetition()) {
		return {
			over: true,
			draw: true,
			text: "RÉPÉTITION"
		};
	}

	if (chess.isInsufficientMaterial()) {
		return {
			over: true,
			draw: true,
			text: "MATÉRIEL INSUFFISANT"
		};
	}

	return {
		over: false
	};
}

// ==========================================
// CREATION DE L'ECHIQUIER GRAPHIQUE
// ==========================================

function drawBoard(game, names = {}) {
	const width = 1000;
	const height = 760;

	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext("2d");

	const boardSize = 640;
	const square = 80;

	const startX = 35;
	const startY = 65;

	ctx.fillStyle = "#080d12";
	ctx.fillRect(0, 0, width, height);

	// TITRE

	ctx.fillStyle = "#00ff99";
	ctx.font = "bold 30px Arial";

	ctx.fillText("♛ ECHECS ROYAL", 35, 40);

	// PANNEAU LATERAL

	ctx.fillStyle = "#121c25";
	ctx.fillRect(700, 55, 270, 650);

	const whiteName = names[game.white] || "Joueur Blanc";
	const blackName = names[game.black] || "Joueur Noir";

	ctx.fillStyle = "#00ff99";
	ctx.font = "bold 20px Arial";

	ctx.fillText("JOUEURS", 725, 95);

	ctx.fillStyle = "#ffffff";
	ctx.font = "17px Arial";

	ctx.fillText("♔ " + whiteName.slice(0, 22), 725, 135);
	ctx.fillText("♚ " + blackName.slice(0, 22), 725, 175);

	// TOUR ACTUEL

	ctx.fillStyle = "#00ff99";
	ctx.font = "bold 18px Arial";

	ctx.fillText("TOUR ACTUEL", 725, 235);

	ctx.fillStyle = "#ffffff";
	ctx.font = "17px Arial";

	ctx.fillText(
		game.chess.turn() === "w" ? "Blancs" : "Noirs",
		725,
		270
	);

	// HISTORIQUE

	ctx.fillStyle = "#00ff99";
	ctx.font = "bold 18px Arial";

	ctx.fillText("HISTORIQUE", 725, 330);

	ctx.fillStyle = "#ffffff";
	ctx.font = "15px Arial";

	const history = game.chess.history();
	const lastMoves = history.slice(-16);

	lastMoves.forEach((move, i) => {
		ctx.fillText(
			`${history.length - lastMoves.length + i + 1}. ${move}`,
			725,
			365 + i * 22
		);
	});

	// ECHIQUIER

	const board = game.chess.board();

	for (let row = 0; row < 8; row++) {
		for (let col = 0; col < 8; col++) {
			const x = startX + col * square;
			const y = startY + row * square;

			ctx.fillStyle = (row + col) % 2 === 0
				? "#e7d6b1"
				: "#648b78";

			ctx.fillRect(x, y, square, square);

			const piece = board[row][col];

			if (piece) {
				ctx.font = "58px DejaVu Sans";
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";

				ctx.fillStyle = piece.color === "w"
					? "#ffffff"
					: "#111111";

				ctx.fillText(
					PIECES[piece.color][piece.type],
					x + square / 2,
					y + square / 2 + 3
				);
			}
		}
	}

	// COORDONNEES

	ctx.textAlign = "left";
	ctx.textBaseline = "alphabetic";

	ctx.fillStyle = "#ffffff";
	ctx.font = "14px Arial";

	for (let i = 0; i < 8; i++) {
		ctx.fillText(
			String(8 - i),
			15,
			startY + i * square + 45
		);

		ctx.fillText(
			String.fromCharCode(97 + i),
			startX + i * square + 35,
			725
		);
	}

	// ECHEC

	if (game.chess.isCheck()) {
		ctx.fillStyle = "#ff4444";
		ctx.font = "bold 22px Arial";

		ctx.fillText("⚠ ECHEC !", 725, 660);
	}

	// SIGNATURE

	ctx.fillStyle = "#00ff99";
	ctx.font = "14px Arial";

	ctx.fillText("ECHECS ROYAL • GOATBOT", 725, 690);

	return canvas.toBuffer("image/png");
}

// ==========================================
// ENVOI DE L'ECHIQUIER
// ==========================================

async function sendBoard(message, game, names = {}) {
	const buffer = drawBoard(game, names);

	await message.reply({
		body:
			"♟️ 𝗘𝗖𝗛𝗘𝗖𝗦 𝗥𝗢𝗬𝗔𝗟\n\n" +
			`♔ Blancs : ${names[game.white] || "Joueur Blanc"}\n` +
			`♚ Noirs : ${names[game.black] || "Joueur Noir"}\n\n` +
			`🎯 Tour : ${game.chess.turn() === "w" ? "Blancs" : "Noirs"}\n` +
			"━━━━━━━━━━━━━━━━━━\n" +
			"Pour jouer : echecs jouer e2e4",

		attachment: Readable.from([buffer])
	});
}

// ==========================================
// MOTEUR STOCKFISH
// ==========================================

function getBestMove(fen, depth) {
	return new Promise((resolve, reject) => {
		let engine;
		let finished = false;
		let ready = false;

		const timeout = setTimeout(() => {
			if (finished) return;

			finished = true;

			try {
				engine?.terminate();
			}
			catch {}

			reject(new Error("Stockfish n'a pas répondu à temps."));
		}, 30000);

		const finish = (move) => {
			if (finished) return;

			finished = true;
			clearTimeout(timeout);

			try {
				engine.terminate();
			}
			catch {}

			resolve(move);
		};

		try {
			engine = stockfish("lite-single", (line) => {
				line = String(line).trim();

				if (line === "uciok") {
					engine.processCommand("isready");
				}

				if (line === "readyok" && !ready) {
					ready = true;

					engine.processCommand("position fen " + fen);
					engine.processCommand("go depth " + depth);
				}

				const match = line.match(/^bestmove\s+(\S+)/);

				if (match) {
					finish(match[1]);
				}
			});

			engine.processCommand("uci");
		}
		catch (error) {
			clearTimeout(timeout);
			reject(error);
		}
	});
}

// ==========================================
// IA STOCKFISH
// ==========================================

async function playAI(game) {
	const depth = game.difficulty;

	const bestMove = await getBestMove(
		game.chess.fen(),
		depth
	);

	if (!bestMove || bestMove === "(none)") {
		return;
	}

	const from = bestMove.slice(0, 2);
	const to = bestMove.slice(2, 4);
	const promotion = bestMove[4] || "q";

	game.chess.move({
		from,
		to,
		promotion
	});
}

module.exports = {
	config: {
		name: "echecs",
		version: "2.0.0",
		author: "Kenny",
		countDown: 3,
		role: 0,

		description: {
			fr: "Jouer aux échecs contre une IA ou un autre joueur",
			en: "Play chess against AI or another player"
		},

		category: "JEUX",

		guide: {
			fr:
				"{pn} bot [facile/normal/difficile]\n" +
				"{pn} duel @joueur\n" +
				"{pn} accepter\n" +
				"{pn} jouer e2e4\n" +
				"{pn} abandon\n" +
				"{pn} profil\n" +
				"{pn} top"
		}
	},

	onStart: async function ({ event, message, args, usersData }) {
		const id = event.senderID;
		const action = (args[0] || "").toLowerCase();

		const getName = async (uid) => {
			try {
				return await usersData.getName(uid);
			}
			catch {
				return "Joueur";
			}
		};

		const sendText = (text) => message.reply(text);

		// MENU PRINCIPAL

		if (!action) {
			return sendText(
				"♛ 𝗘𝗖𝗛𝗘𝗖𝗦 𝗥𝗢𝗬𝗔𝗟 ♛\n\n" +
				"♟️ bot facile : jouer contre l'IA\n" +
				"♟️ bot normal : difficulté moyenne\n" +
				"♟️ bot difficile : IA puissante\n" +
				"♟️ duel @joueur : défier un joueur\n" +
				"♟️ accepter : accepter un défi\n" +
				"♟️ jouer e2e4 : jouer un coup\n" +
				"♟️ abandon : abandonner\n" +
				"♟️ profil : tes statistiques\n" +
				"♟️ top : classement TOP 10\n\n" +
				"━━━━━━━━━━━━━━━━━━\n" +
				"Exemple : echecs bot difficile"
			);
		}

		// JOUER CONTRE STOCKFISH

		if (action === "bot") {
			if (getGame(id)) {
				return sendText("⚠️ Tu as déjà une partie en cours.");
			}

			const level = (args[1] || "normal").toLowerCase();

			const levels = {
				facile: 3,
				normal: 7,
				difficile: 12
			};

			if (!levels[level]) {
				return sendText(
					"Choisis une difficulté : facile, normal ou difficile."
				);
			}

			const game = createGame(
				id,
				"STOCKFISH",
				"bot",
				levels[level]
			);

			game.black = "STOCKFISH";

			const names = {
				[id]: await getName(id),
				STOCKFISH: "Stockfish 19"
			};

			return sendBoard(message, game, names);
		}

		// DEFIER UN JOUEUR

		if (action === "duel") {
			const target = Object.keys(event.mentions || {})[0];

			if (!target) {
				return sendText(
					"Mentionne le joueur que tu veux défier."
				);
			}

			if (target === id) {
				return sendText(
					"Tu ne peux pas jouer contre toi-même."
				);
			}

			if (getGame(id) || getGame(target)) {
				return sendText(
					"⚠️ L'un des joueurs est déjà dans une partie."
				);
			}

			invitations.set(target, {
				from: id,
				to: target,
				time: Date.now()
			});

			return sendText(
				`♟️ ${await getName(id)} défie ${await getName(target)} !\n\n` +
				"Le joueur doit taper : echecs accepter"
			);
		}

		// ACCEPTER UN DEFI

		if (action === "accepter") {
			const invite = invitations.get(id);

			if (!invite) {
				return sendText(
					"Tu n'as aucune invitation en attente."
				);
			}

			if (Date.now() - invite.time > 120000) {
				invitations.delete(id);

				return sendText(
					"Cette invitation a expiré."
				);
			}

			if (getGame(id) || getGame(invite.from)) {
				invitations.delete(id);

				return sendText(
					"Un joueur est déjà dans une partie."
				);
			}

			invitations.delete(id);

			const game = createGame(
				invite.from,
				id,
				"pvp"
			);

			const names = {
				[invite.from]: await getName(invite.from),
				[id]: await getName(id)
			};

			return sendBoard(message, game, names);
		}

		// PROFIL

		if (action === "profil") {
			const stats = getStats(id);

			return sendText(
				"♛ 𝗣𝗥𝗢𝗙𝗜𝗟 𝗘𝗖𝗛𝗘𝗖𝗦\n\n" +
				`👤 ${await getName(id)}\n` +
				`🏆 Victoires : ${stats.wins}\n` +
				`💀 Défaites : ${stats.losses}\n` +
				`🤝 Matchs nuls : ${stats.draws}\n` +
				`⭐ ELO : ${stats.elo}\n` +
				"━━━━━━━━━━━━━━━━━━"
			);
		}

		// CLASSEMENT TOP 10

		if (action === "top") {
			const data = loadData();

			const ranking = Object.entries(data)
				.sort((a, b) => b[1].elo - a[1].elo)
				.slice(0, 10);

			if (!ranking.length) {
				return sendText(
					"Aucun classement disponible pour le moment."
				);
			}

			let text = "♛ 𝗧𝗢𝗣 𝟭𝟬 𝗘𝗖𝗛𝗘𝗖𝗦 ♛\n\n";

			for (let i = 0; i < ranking.length; i++) {
				const [uid, stats] = ranking[i];

				text += `${i + 1}. ${await getName(uid)}\n`;
				text += `   ⭐ ${stats.elo} ELO | 🏆 ${stats.wins} victoires\n\n`;
			}

			return sendText(text);
		}

		const game = getGame(id);

		// ABANDONNER

		if (action === "abandon") {
			if (!game) {
				return sendText(
					"Tu n'as aucune partie en cours."
				);
			}

			const opponent = game.white === id
				? game.black
				: game.white;

			if (opponent !== "STOCKFISH") {
				updateStats(opponent, id);
			}

			removeGame(game);

			return sendText(
				"🏳️ Tu as abandonné la partie.\n" +
				"Le match est terminé."
			);
		}

		// JOUER UN COUP

		if (action === "jouer") {
			if (!game) {
				return sendText(
					"Tu n'as aucune partie en cours. Tape echecs bot."
				);
			}

			const moveText = (args[1] || "")
				.trim()
				.toLowerCase();

			if (!moveText) {
				return sendText(
					"Exemple : echecs jouer e2e4"
				);
			}

			const isWhite = game.white === id;
			const isBlack = game.black === id;

			if (!isWhite && !isBlack) {
				return sendText(
					"Tu ne participes pas à cette partie."
				);
			}

			if (
				(game.chess.turn() === "w" && !isWhite) ||
				(game.chess.turn() === "b" && !isBlack)
			) {
				return sendText(
					"⏳ Ce n'est pas ton tour."
				);
			}

			let move;

			try {
				const uci = moveText.match(
					/^([a-h][1-8])([a-h][1-8])([qrbn])?$/
				);

				if (uci) {
					move = game.chess.move({
						from: uci[1],
						to: uci[2],
						promotion: uci[3] || "q"
					});
				}
				else {
					move = game.chess.move(moveText);
				}
			}
			catch {}

			if (!move) {
				return sendText(
					"❌ Coup invalide.\n\n" +
					"Exemples :\n" +
					"echecs jouer e2e4\n" +
					"echecs jouer g1f3"
				);
			}

			game.history.push(move.san);

			let result = getResult(game);

			// FIN DE PARTIE

			if (result.over) {
				if (result.draw) {
					if (game.mode === "pvp") {
						updateStats(
							game.white,
							game.black,
							true
						);
					}
				}
				else if (game.mode === "pvp") {
					updateStats(
						result.winner,
						result.winner === game.white
							? game.black
							: game.white
					);
				}

				await sendBoard(message, game, {
					[game.white]: await getName(game.white),
					[game.black]: game.black === "STOCKFISH"
						? "Stockfish 19"
						: await getName(game.black)
				});

				removeGame(game);

				return sendText(
					`🏁 ${result.text}\n\n` +
					(
						result.draw
							? "🤝 Match nul !"
							: `🏆 Vainqueur : ${await getName(result.winner)}`
					)
				);
			}

			// TOUR DE STOCKFISH

			if (game.mode === "bot") {
				try {
					await playAI(game);
				}
				catch (error) {
					return sendText(
						"⚠️ Erreur Stockfish : " + error.message
					);
				}

				result = getResult(game);

				await sendBoard(message, game, {
					[game.white]: await getName(game.white),
					STOCKFISH: "Stockfish 19"
				});

				if (result.over) {
					if (!result.draw && result.winner === id) {
						updateStats(id, "STOCKFISH");
					}

					removeGame(game);

					return sendText(
						`🏁 ${result.text}\n` +
						(
							result.draw
								? "🤝 Match nul !"
								: result.winner === id
									? "🏆 Tu as gagné !"
									: "💀 Stockfish a gagné !"
						)
					);
				}

				return;
			}

			// TOUR DU SECOND JOUEUR

			return sendBoard(message, game, {
				[game.white]: await getName(game.white),
				[game.black]: await getName(game.black)
			});
		}

		return sendText(
			"Commande inconnue. Tape echecs pour voir le menu."
		);
	}
};
