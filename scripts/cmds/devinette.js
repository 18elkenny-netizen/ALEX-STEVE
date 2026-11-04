const Canvas = require("canvas");

const MAX_ATTEMPTS = 7;
const MAX_NUMBER = 100;

const RANKS = [
  { name: "Débutant", points: 0 },
  { name: "Chercheur", points: 100 },
  { name: "Détective", points: 300 },
  { name: "Génie", points: 700 },
  { name: "Maître", points: 1500 },
  { name: "Légende", points: 3000 },
  { name: "DARK GOD", points: 5000 }
];

// =====================================
// DONNÉES DU JOUEUR
// =====================================

function getData(user) {
  if (!user.data) user.data = {};

  if (!user.data.darkRiddle) {
    user.data.darkRiddle = {
      points: 0,
      wins: 0,
      losses: 0,
      games: 0,
      streak: 0,
      bestStreak: 0,
      activeGame: null
    };
  }

  const d = user.data.darkRiddle;

  d.points ??= 0;
  d.wins ??= 0;
  d.losses ??= 0;
  d.games ??= 0;
  d.streak ??= 0;
  d.bestStreak ??= 0;
  d.activeGame ??= null;

  return d;
}

function getRank(points) {
  let rank = RANKS[0];

  for (const r of RANKS) {
    if (points >= r.points) rank = r;
  }

  return rank.name;
}

function getNextRank(points) {
  return RANKS.find(r => r.points > points) || null;
}

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatNumber(n) {
  return Number(n || 0).toLocaleString("fr-FR");
}

// =====================================
// FONCTIONS GRAPHIQUES
// =====================================

function roundedRect(ctx, x, y, w, h, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawBackground(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);

  gradient.addColorStop(0, "#001507");
  gradient.addColorStop(0.5, "#000900");
  gradient.addColorStop(1, "#001b0a");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Décoration lumineuse
  for (let i = 0; i < 45; i++) {
    ctx.fillStyle = "rgba(0,255,80,0.035)";
    ctx.fillRect(
      random(0, width),
      random(0, height),
      random(2, 5),
      random(2, 5)
    );
  }

  ctx.save();
  ctx.shadowColor = "#00ff55";
  ctx.shadowBlur = 18;
  ctx.strokeStyle = "#39ff70";
  ctx.lineWidth = 3;
  ctx.strokeRect(18, 18, width - 36, height - 36);
  ctx.restore();
}

function drawPanel(ctx, x, y, w, h, title, value) {
  roundedRect(ctx, x, y, w, h, 14);

  ctx.fillStyle = "#03170a";
  ctx.fill();

  ctx.strokeStyle = "#155c2c";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#75c98c";
  ctx.font = "17px Arial";
  ctx.fillText(title, x + 20, y + 32);

  ctx.save();
  ctx.shadowColor = "#00ff55";
  ctx.shadowBlur = 10;
  ctx.fillStyle = "#39ff70";
  ctx.font = "bold 29px Arial";
  ctx.fillText(String(value), x + 20, y + 75);
  ctx.restore();
}

// =====================================
// CARTE PERSONNELLE
// =====================================

async function makeProfileCard(player) {
  const width = 1100;
  const height = 700;

  const canvas = Canvas.createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  drawBackground(ctx, width, height);

  // TITRE
  ctx.fillStyle = "#00ff55";
  ctx.font = "bold 42px Arial";
  ctx.fillText("DARK RIDDLE", 55, 85);

  ctx.fillStyle = "#a3ffb8";
  ctx.font = "bold 20px Arial";
  ctx.fillText("PLAYER FINANCIAL & GAME PASSPORT", 58, 125);

  ctx.strokeStyle = "#155d2b";
  ctx.beginPath();
  ctx.moveTo(55, 155);
  ctx.lineTo(1045, 155);
  ctx.stroke();

  // NOM
  ctx.fillStyle = "#d5ffe0";
  ctx.font = "bold 32px Arial";
  ctx.fillText(player.name.substring(0, 25), 60, 215);

  // RANG
  ctx.fillStyle = "#00ff55";
  ctx.font = "bold 22px Arial";
  ctx.fillText(`♛ ${getRank(player.points)}`, 60, 260);

  // POSITION
  ctx.save();
  ctx.shadowColor = "#00ff55";
  ctx.shadowBlur = 20;

  ctx.fillStyle = "#00ff55";
  ctx.font = "bold 85px Arial";
  ctx.fillText(`#${player.globalRank}`, 730, 270);

  ctx.restore();

  ctx.fillStyle = "#8affaa";
  ctx.font = "17px Arial";
  ctx.fillText("GLOBAL RANKING", 740, 300);

  // BARRE DE PROGRESSION
  const nextRank = getNextRank(player.points);
  const previousRank = [...RANKS]
    .reverse()
    .find(r => player.points >= r.points);

  const currentBase = previousRank?.points || 0;
  const nextLimit = nextRank?.points || player.points;

  const progress = nextRank
    ? Math.min(
        1,
        (player.points - currentBase) /
        (nextLimit - currentBase)
      )
    : 1;

  ctx.fillStyle = "#163c22";
  roundedRect(ctx, 60, 330, 980, 22, 11);
  ctx.fill();

  const gradient = ctx.createLinearGradient(60, 0, 1040, 0);
  gradient.addColorStop(0, "#00a832");
  gradient.addColorStop(1, "#83ff9d");

  ctx.save();
  ctx.shadowColor = "#00ff55";
  ctx.shadowBlur = 15;

  ctx.fillStyle = gradient;
  roundedRect(
    ctx,
    60,
    330,
    Math.max(22, 980 * progress),
    22,
    11
  );
  ctx.fill();

  ctx.restore();

  ctx.fillStyle = "#9cffb1";
  ctx.font = "15px Arial";

  ctx.fillText(
    nextRank
      ? `NEXT RANK: ${nextRank.name} (${nextRank.points} POINTS)`
      : "MAXIMUM RANK REACHED",
    60,
    390
  );

  // STATISTIQUES
  drawPanel(ctx, 60, 425, 300, 105, "TOTAL POINTS", formatNumber(player.points));
  drawPanel(ctx, 400, 425, 300, 105, "VICTORIES", player.wins);
  drawPanel(ctx, 740, 425, 300, 105, "DEFEATS", player.losses);

  drawPanel(ctx, 60, 555, 300, 105, "TOTAL GAMES", player.games);
  drawPanel(ctx, 400, 555, 300, 105, "WIN STREAK", player.streak);
  drawPanel(ctx, 740, 555, 300, 105, "BEST STREAK", player.bestStreak);

  // FOOTER
  ctx.fillStyle = "#3e9c59";
  ctx.font = "14px Arial";
  ctx.textAlign = "center";
  ctx.fillText("DARK SYSTEM © DARK RIDDLE", width / 2, 680);

  return canvas.toBuffer("image/png");
}

// =====================================
// CARTE TOP 10
// =====================================

async function makeTopCard(players, totalPlayers) {
  const width = 1200;
  const height = 900;

  const canvas = Canvas.createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  drawBackground(ctx, width, height);

  // TITRE
  ctx.save();
  ctx.shadowColor = "#00ff55";
  ctx.shadowBlur = 15;

  ctx.fillStyle = "#00ff55";
  ctx.font = "bold 45px Arial";
  ctx.fillText("DARK RIDDLE", 55, 85);

  ctx.restore();

  ctx.fillStyle = "#a3ffb8";
  ctx.font = "bold 21px Arial";
  ctx.fillText("GLOBAL PLAYER RANKING", 58, 125);

  ctx.fillStyle = "#58bb76";
  ctx.font = "16px Arial";
  ctx.fillText(
    `TOTAL REGISTERED PLAYERS: ${totalPlayers}`,
    60,
    165
  );

  ctx.strokeStyle = "#155d2b";
  ctx.beginPath();
  ctx.moveTo(55, 190);
  ctx.lineTo(1145, 190);
  ctx.stroke();

  // COLONNES
  ctx.fillStyle = "#55ce78";
  ctx.font = "bold 16px Arial";

  ctx.fillText("RANK", 75, 235);
  ctx.fillText("PLAYER", 230, 235);
  ctx.fillText("LEVEL", 610, 235);
  ctx.fillText("POINTS", 790, 235);
  ctx.fillText("WINS", 1010, 235);

  // JOUEURS
  const medals = ["🥇", "🥈", "🥉"];

  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const y = 255 + i * 56;

    roundedRect(ctx, 55, y, 1090, 46, 10);

    ctx.fillStyle =
      i === 0 ? "#073b1b" :
      i === 1 ? "#062b17" :
      i === 2 ? "#052414" :
      "#031509";

    ctx.fill();

    ctx.strokeStyle =
      i === 0 ? "#00ff55" : "#15552b";

    ctx.lineWidth = 1.5;
    ctx.stroke();

    // POSITION
    ctx.fillStyle = "#00ff55";
    ctx.font = "bold 21px Arial";

    ctx.fillText(
      medals[i] || `#${i + 1}`,
      85,
      y + 29
    );

    // NOM
    ctx.fillStyle = "#d5ffe0";
    ctx.font = "bold 19px Arial";

    ctx.fillText(
      p.name.substring(0, 23),
      230,
      y + 29
    );

    // RANG
    ctx.fillStyle = "#80ff9d";
    ctx.font = "16px Arial";

    ctx.fillText(
      getRank(p.points),
      610,
      y + 29
    );

    // POINTS
    ctx.fillStyle = "#00ff55";
    ctx.font = "bold 19px Arial";

    ctx.fillText(
      formatNumber(p.points),
      790,
      y + 29
    );

    // VICTOIRES
    ctx.fillText(
      String(p.wins),
      1010,
      y + 29
    );
  }

  // FOOTER
  ctx.strokeStyle = "#155d2b";
  ctx.beginPath();
  ctx.moveTo(55, 840);
  ctx.lineTo(1145, 840);
  ctx.stroke();

  ctx.fillStyle = "#49a765";
  ctx.font = "15px Arial";
  ctx.textAlign = "center";

  ctx.fillText(
    "DARK SYSTEM © DARK RIDDLE",
    width / 2,
    875
  );

  return canvas.toBuffer("image/png");
}

// =====================================
// RÉCUPÉRATION DES JOUEURS
// =====================================

async function getPlayers(usersData) {
  if (typeof usersData.getAll !== "function") {
    throw new Error("usersData.getAll() indisponible");
  }

  const allUsers = await usersData.getAll();

  const entries = Array.isArray(allUsers)
    ? allUsers.map(u => [u.userID || u.id, u])
    : Object.entries(allUsers || {});

  const players = [];

  for (const [id, user] of entries) {
    if (!id || !user?.data?.darkRiddle) continue;

    const d = user.data.darkRiddle;

    let name = id;

    try {
      name = await usersData.getName(id) || id;
    } catch {}

    players.push({
      id: String(id),
      name: String(name),
      points: Number(d.points) || 0,
      wins: Number(d.wins) || 0,
      losses: Number(d.losses) || 0,
      games: Number(d.games) || 0,
      streak: Number(d.streak) || 0,
      bestStreak: Number(d.bestStreak) || 0
    });
  }

  players.sort((a, b) => b.points - a.points);

  players.forEach((p, index) => {
    p.globalRank = index + 1;
  });

  return players;
}

// =====================================
// MODULE GOATBOT
// =====================================

module.exports = {
  config: {
    name: "devinette",
    aliases: ["riddle", "guess", "darkriddle"],
    version: "1.0.0",
    author: "DARK SYSTEM",
    countDown: 2,
    role: 0,
    shortDescription: "Jeu de devinettes multijoueur",
    longDescription: "Devine le nombre secret et deviens une légende.",
    category: "GAME",
    guide: {
      en: "{pn} | guess <nombre> | profile | top"
    }
  },

  onStart: async function ({
    event,
    args,
    message,
    usersData
  }) {

    const uid = String(event.senderID);

    const user = await usersData.get(uid);
    const d = getData(user);

    const action = (args[0] || "start").toLowerCase();

    const save = async () => {
      await usersData.set(uid, {
        money: user.money,
        exp: user.exp,
        data: user.data
      });
    };

    // =====================================
    // COMMENCER UNE PARTIE
    // =====================================

    if (
      action === "start" ||
      action === "play" ||
      action === "jouer"
    ) {

      if (d.activeGame) {
        return message.reply(
`🎯 TU AS DÉJÀ UNE PARTIE EN COURS !

Il te reste ${d.activeGame.attempts} tentative(s).

Utilise :
¥devinette guess <nombre>

Pour continuer ta partie.`
        );
      }

      d.activeGame = {
        number: random(1, MAX_NUMBER),
        attempts: MAX_ATTEMPTS,
        startedAt: Date.now()
      };

      await save();

      return message.reply(
`╔═══━━〔 🎯 DARK RIDDLE 〕━━═══╗

       🧩 NOUVELLE DEVINETTE

Un nombre secret a été choisi !

🔢 Nombre compris entre 1 et ${MAX_NUMBER}.

❤️ Tentatives : ${MAX_ATTEMPTS}

━━━━━━━━━━━━━━━━━━━━

🎮 Pour répondre :

¥devinette guess 50

⬆️ Je te dirai si le nombre est plus grand.
⬇️ Je te dirai s'il est plus petit.

🏆 Récompense : jusqu'à 110 points !

🖤 DARK SYSTEM`
      );
    }

    // =====================================
    // DEVINER UN NOMBRE
    // =====================================

    if (
      action === "guess" ||
      action === "deviner"
    ) {

      if (!d.activeGame) {
        return message.reply(
          "❌ Tu n'as aucune partie en cours.\nUtilise ¥devinette pour commencer."
        );
      }

      const guess = Number(args[1]);

      if (
        !Number.isInteger(guess) ||
        guess < 1 ||
        guess > MAX_NUMBER
      ) {
        return message.reply(
          `❌ Entre un nombre entier entre 1 et ${MAX_NUMBER}.\nExemple : ¥devinette guess 50`
        );
      }

      const game = d.activeGame;

      // BONNE RÉPONSE
      if (guess === game.number) {

        const points = 50 + game.attempts * 10;

        d.points += points;
        d.wins++;
        d.games++;
        d.streak++;

        d.bestStreak = Math.max(
          d.bestStreak,
          d.streak
        );

        d.activeGame = null;

        await save();

        return message.reply(
`╔═══━━〔 🏆 VICTOIRE 〕━━═══╗

       🎯 NOMBRE TROUVÉ !

💎 Le nombre secret était : ${guess}

━━━━━━━━━━━━━━━━━━━━

🏆 Récompense : +${points} points
⭐ Points totaux : ${d.points}

🔥 Victoires : ${d.wins}
⚡ Série actuelle : ${d.streak}

👑 Rang : ${getRank(d.points)}

🖤 DARK SYSTEM`
        );
      }

      // MAUVAISE RÉPONSE
      game.attempts--;

      if (game.attempts <= 0) {

        d.losses++;
        d.games++;
        d.streak = 0;
        d.activeGame = null;

        await save();

        return message.reply(
`╔═══━━〔 💀 DÉFAITE 〕━━═══╗

Tu as épuisé toutes tes tentatives !

🎯 Le nombre secret était : ${game.number}

━━━━━━━━━━━━━━━━━━━━

🏆 Victoires : ${d.wins}
💀 Défaites : ${d.losses}
💎 Points : ${d.points}

Une nouvelle partie t'attend.

¥devinette

🖤 DARK SYSTEM`
        );
      }

      await save();

      const hint = guess < game.number
        ? "⬆️ Le nombre secret est PLUS GRAND."
        : "⬇️ Le nombre secret est PLUS PETIT.";

      return message.reply(
`╔═══━━〔 🎯 DARK RIDDLE 〕━━═══╗

❌ Mauvaise réponse !

${hint}

━━━━━━━━━━━━━━━━━━━━

🔢 Ton nombre : ${guess}
❤️ Tentatives restantes : ${game.attempts}

🎮 Continue :

¥devinette guess <nombre>

🖤 DARK SYSTEM`
      );
    }

    // =====================================
    // ABANDONNER UNE PARTIE
    // =====================================

    if (
      action === "quit" ||
      action === "abandon"
    ) {

      if (!d.activeGame) {
        return message.reply(
          "❌ Tu n'as aucune partie en cours."
        );
      }

      const secret = d.activeGame.number;

      d.activeGame = null;
      d.losses++;
      d.games++;
      d.streak = 0;

      await save();

      return message.reply(
`💀 PARTIE ABANDONNÉE

🎯 Le nombre secret était : ${secret}

Une nouvelle partie est disponible avec :

¥devinette`
      );
    }

    // =====================================
    // PROFIL GRAPHIQUE
    // =====================================

    if (
      action === "profile" ||
      action === "profil" ||
      action === "me"
    ) {

      try {

        const players = await getPlayers(usersData);

        let player = players.find(
          p => p.id === uid
        );

        // Ajouter le joueur s'il n'est pas encore enregistré
        if (!player) {

          let name = uid;

          try {
            name = await usersData.getName(uid) || uid;
          } catch {}

          player = {
            id: uid,
            name: String(name),
            points: d.points,
            wins: d.wins,
            losses: d.losses,
            games: d.games,
            streak: d.streak,
            bestStreak: d.bestStreak,
            globalRank: players.length + 1
          };
        }

        const image = await makeProfileCard(player);

        return message.reply({
          body:
`🖤 DARK RIDDLE PLAYER CARD

👤 ${player.name}
🏆 Classement mondial : #${player.globalRank}

⭐ ${player.points} points
👑 ${getRank(player.points)}`,
          attachment: image
        });

      } catch (err) {

        console.error("[RIDDLE PROFILE]", err);

        return message.reply(
          "❌ Impossible de générer ta carte personnelle."
        );
      }
    }

    // =====================================
    // CLASSEMENT TOP 10 GRAPHIQUE
    // =====================================

    if (
      action === "top" ||
      action === "classement" ||
      action === "ranking"
    ) {

      try {

        const players = await getPlayers(usersData);

        const image = await makeTopCard(
          players.slice(0, 10),
          players.length
        );

        const current = players.find(
          p => p.id === uid
        );

        return message.reply({
          body:
`╔═══━━〔 🏆 DARK RIDDLE TOP 10 〕━━═══╗

👑 Les meilleurs devineurs de DARK RIDDLE !

👤 Ton rang : ${current ? `#${current.globalRank}` : "Non classé"}

⭐ Ton score : ${d.points} points

🖤 DARK SYSTEM`,
          attachment: image
        });

      } catch (err) {

        console.error("[RIDDLE TOP]", err);

        return message.reply(
          "❌ Impossible de générer le classement."
        );
      }
    }

    // =====================================
    // AIDE
    // =====================================

    if (
      action === "help" ||
      action === "aide"
    ) {

      return message.reply(
`╔═══━━〔 🎯 DARK RIDDLE 〕━━═══╗

          🧩 COMMANDES

🎮 ¥devinette
Commencer une partie.

🔢 ¥devinette guess 50
Proposer un nombre.

💀 ¥devinette quit
Abandonner une partie.

👤 ¥devinette profile
Afficher ta carte personnelle.

🏆 ¥devinette top
Afficher le classement TOP 10.

━━━━━━━━━━━━━━━━━━━━

         🏆 SYSTÈME DE RANGS

🥉 Débutant : 0 points
🔍 Chercheur : 100 points
🕵️ Détective : 300 points
🧠 Génie : 700 points
👑 Maître : 1500 points
🔥 Légende : 3000 points
💀 DARK GOD : 5000 points

━━━━━━━━━━━━━━━━━━━━

🎯 Trouve le nombre secret.
🏆 Accumule des points.
👑 Domine le classement.

🖤 DARK SYSTEM`
      );
    }

    return message.reply(
      "❌ Commande inconnue.\nUtilise ¥devinette aide."
    );
  }
};
