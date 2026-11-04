const Canvas = require("canvas");

const COIN = "₩";

const RANKS = [
  { name: "Petit voyou", exp: 0 },
  { name: "Délinquant", exp: 100 },
  { name: "Gangster", exp: 300 },
  { name: "Capo", exp: 700 },
  { name: "Parrain", exp: 1500 },
  { name: "Roi de la ville", exp: 3000 }
];

const SHOP = {
  knife: {
    name: "🔪 Couteau",
    price: 500,
    attack: 5
  },
  pistol: {
    name: "🔫 Pistolet",
    price: 1500,
    attack: 15
  },
  armor: {
    name: "🦺 Gilet pare-balles",
    price: 1000,
    defense: 10
  },
  vest: {
    name: "🛡️ Armure renforcée",
    price: 2500,
    defense: 25
  }
};

const MISSIONS = [
  {
    name: "Livraison secrète",
    description: "Tu as livré un colis mystérieux à un contact.",
    min: 200,
    max: 500,
    exp: 20
  },
  {
    name: "Protection du territoire",
    description: "Tu as protégé ton quartier contre un gang rival.",
    min: 300,
    max: 600,
    exp: 30
  },
  {
    name: "Transaction clandestine",
    description: "Tu as réalisé une transaction lucrative.",
    min: 250,
    max: 550,
    exp: 25
  },
  {
    name: "Infiltration",
    description: "Tu as infiltré un territoire ennemi.",
    min: 400,
    max: 700,
    exp: 35
  },
  {
    name: "Dette récupérée",
    description: "Tu as récupéré une dette auprès d'un ancien contact.",
    min: 150,
    max: 450,
    exp: 15
  }
];

// =====================================
// DONNÉES DU JOUEUR
// =====================================

function getGang(user) {
  if (!user.data) user.data = {};

  if (!user.data.darkCity) {
    user.data.darkCity = {
      cash: 1000,
      exp: 0,
      reputation: 0,
      health: 100,
      energy: 10,
      inventory: [],
      weapon: null,
      armor: null,
      lastActions: {},
      lastDaily: 0,
      lastEnergy: Date.now()
    };
  }

  const g = user.data.darkCity;

  g.cash ??= 1000;
  g.exp ??= 0;
  g.reputation ??= 0;
  g.health ??= 100;
  g.energy ??= 10;
  g.inventory ??= [];
  g.weapon ??= null;
  g.armor ??= null;
  g.lastActions ??= {};
  g.lastDaily ??= 0;
  g.lastEnergy ??= Date.now();

  // Récupération automatique d'énergie
  const now = Date.now();
  const recovered = Math.floor(
    (now - g.lastEnergy) / 600000
  );

  if (recovered > 0) {
    g.energy = Math.min(10, g.energy + recovered);
    g.lastEnergy += recovered * 600000;
  }

  return g;
}

// =====================================
// FONCTIONS UTILITAIRES
// =====================================

function getRank(exp) {
  let rank = RANKS[0];

  for (const r of RANKS) {
    if (exp >= r.exp) rank = r;
  }

  return rank.name;
}

function random(min, max) {
  return Math.floor(
    Math.random() * (max - min + 1)
  ) + min;
}

function formatTime(ms) {
  const minutes = Math.ceil(ms / 60000);

  if (minutes >= 60) {
    return `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
  }

  return `${minutes}min`;
}

function getItemName(key) {
  return SHOP[key]?.name || "Aucun";
}

// =====================================
// GÉNÉRATION DE LA CARTE DE CLASSEMENT
// =====================================

async function makeGangRanking(players, currentPlayer) {

  const width = 1536;
  const height = 900;

  const canvas = Canvas.createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // FOND PRINCIPAL
  const bg = ctx.createLinearGradient(
    0, 0, width, height
  );

  bg.addColorStop(0, "#001006");
  bg.addColorStop(0.5, "#000900");
  bg.addColorStop(1, "#001408");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // EFFET DE FOND
  for (let i = 0; i < 35; i++) {
    ctx.fillStyle = "rgba(0,255,80,0.025)";

    ctx.fillRect(
      random(0, width),
      random(0, height),
      random(2, 5),
      random(2, 5)
    );
  }

  // BORDURE NÉON
  ctx.save();

  ctx.shadowColor = "#39ff70";
  ctx.shadowBlur = 20;

  ctx.strokeStyle = "#39ff70";
  ctx.lineWidth = 3;

  ctx.strokeRect(
    18,
    18,
    width - 36,
    height - 36
  );

  ctx.restore();

  // COINS DÉCORATIFS
  ctx.strokeStyle = "#8affaa";
  ctx.lineWidth = 4;

  const corners = [
    [18, 18, 45, 0, 0, 45],
    [width - 18, 18, -45, 0, 0, 45],
    [18, height - 18, 45, 0, 0, -45],
    [width - 18, height - 18, -45, 0, 0, -45]
  ];

  for (const [x, y, dx, , , dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x + dx, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy);
    ctx.stroke();
  }

  // TITRE
  ctx.shadowColor = "#00ff55";
  ctx.shadowBlur = 18;

  ctx.fillStyle = "#00ff55";
  ctx.font = "bold 48px Arial";

  ctx.fillText("DARK CITY", 65, 85);

  ctx.shadowBlur = 0;

  ctx.fillStyle = "#b5ffc8";
  ctx.font = "bold 22px Arial";

  ctx.fillText(
    "GLOBAL GANGSTER RANKING",
    65,
    125
  );

  ctx.fillStyle = "#55ff88";
  ctx.font = "16px Arial";

  ctx.fillText(
    "THE MOST POWERFUL PLAYERS IN DARK CITY",
    65,
    165
  );

  // DATE
  ctx.textAlign = "right";
  ctx.fillStyle = "#65d985";
  ctx.font = "16px Arial";

  ctx.fillText(
    new Date().toLocaleString("fr-FR"),
    1460,
    85
  );

  ctx.textAlign = "left";

  // SÉPARATION
  ctx.strokeStyle = "#155d2b";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(65, 195);
  ctx.lineTo(1465, 195);
  ctx.stroke();

  // TITRE DU CLASSEMENT
  ctx.fillStyle = "#00ff55";
  ctx.font = "bold 28px Arial";

  ctx.fillText(
    "♛ TOP 10 GANGSTERS",
    65,
    245
  );

  ctx.textAlign = "right";
  ctx.fillStyle = "#8affaa";
  ctx.font = "18px Arial";

  ctx.fillText(
    `TOTAL PLAYERS: ${players.length}`,
    1460,
    245
  );

  ctx.textAlign = "left";

  // FONCTION CARTE ARRONDIE
  function roundedRect(x, y, w, h, radius) {

    ctx.beginPath();

    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);

    ctx.quadraticCurveTo(
      x + w, y,
      x + w, y + radius
    );

    ctx.lineTo(x + w, y + h - radius);

    ctx.quadraticCurveTo(
      x + w, y + h,
      x + w - radius, y + h
    );

    ctx.lineTo(x + radius, y + h);

    ctx.quadraticCurveTo(
      x, y + h,
      x, y + h - radius
    );

    ctx.lineTo(x, y + radius);

    ctx.quadraticCurveTo(
      x, y,
      x + radius, y
    );

    ctx.closePath();
  }

  // EN-TÊTE DES COLONNES
  ctx.fillStyle = "#51c975";
  ctx.font = "bold 14px Arial";

  ctx.fillText("PLAYER", 175, 275);
  ctx.fillText("RANK", 600, 275);
  ctx.fillText("EXPERIENCE", 850, 275);
  ctx.fillText("FORTUNE", 1050, 275);
  ctx.fillText("REPUTATION", 1270, 275);

  // AFFICHAGE DES JOUEURS
  const startY = 290;
  const rowHeight = 54;

  const medals = ["🥇", "🥈", "🥉"];

  for (let i = 0; i < players.length; i++) {

    const p = players[i];
    const y = startY + i * rowHeight;

    roundedRect(65, y, 1400, 45, 10);

    ctx.fillStyle =
      i === 0
        ? "#06351a"
        : p.id === currentPlayer?.id
          ? "#073020"
          : "#031509";

    ctx.fill();

    ctx.strokeStyle =
      i === 0
        ? "#00ff55"
        : "#124d27";

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
    ctx.fillStyle =
      i === 0 ? "#39ff70" : "#d5ffe0";

    ctx.font = "bold 18px Arial";

    let name = p.name || p.id;

    if (name.length > 23) {
      name = name.substring(0, 20) + "...";
    }

    ctx.fillText(name, 175, y + 29);

    // RANG
    ctx.fillStyle = "#7dff9d";
    ctx.font = "16px Arial";

    ctx.fillText(
      getRank(p.exp),
      600,
      y + 28
    );

    // EXP
    ctx.fillStyle = "#00ff55";
    ctx.font = "bold 17px Arial";

    ctx.fillText(
      `${p.exp.toLocaleString("fr-FR")} EXP`,
      850,
      y + 28
    );

    // ARGENT
    ctx.fillText(
      `${p.cash.toLocaleString("fr-FR")} ${COIN}`,
      1050,
      y + 28
    );

    // RÉPUTATION
    ctx.fillText(
      `${p.reputation} REP`,
      1270,
      y + 28
    );

    // JOUEUR ACTUEL
    if (p.id === currentPlayer?.id) {

      ctx.fillStyle = "#39ff70";
      ctx.font = "bold 13px Arial";

      ctx.fillText(
        "YOU",
        1400,
        y + 28
      );
    }
  }

  // CARTE PERSONNELLE
  ctx.strokeStyle = "#1b8b40";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(65, 850);
  ctx.lineTo(1465, 850);
  ctx.stroke();

  ctx.fillStyle = "#00ff55";
  ctx.font = "bold 20px Arial";

  if (currentPlayer) {

    ctx.fillText(
      `YOUR GLOBAL RANK: #${currentPlayer.globalRank}`,
      70,
      885
    );

    ctx.textAlign = "right";

    ctx.fillText(
      `YOUR EXP: ${currentPlayer.exp} | ${getRank(currentPlayer.exp)}`,
      1450,
      885
    );

    ctx.textAlign = "left";

  } else {

    ctx.fillText(
      "YOU ARE NOT REGISTERED",
      70,
      885
    );
  }

  return canvas.toBuffer("image/png");
}

// =====================================
// COMMANDE PRINCIPALE
// =====================================

module.exports = {

  config: {
    name: "gang",
    aliases: ["gangster", "darkcity"],
    version: "2.0.0",
    author: "DARK SYSTEM",
    countDown: 3,
    role: 0,
    shortDescription: "Jeu de gangster multijoueur",
    longDescription: "Deviens le gangster le plus puissant de DARK CITY.",
    category: "GAME",

    guide: {
      en: "{pn} | profile | work | rob | attack | mission | daily | shop | buy | inventory | top"
    }
  },

  onStart: async function ({
    api,
    event,
    args,
    message,
    usersData
  }) {

    const uid = event.senderID;

    const user = await usersData.get(uid);
    const g = getGang(user);

    const action = (args[0] || "profile").toLowerCase();

    // SAUVEGARDE
    const save = async (id = uid, data = user) => {

      await usersData.set(id, {
        money: data.money,
        exp: data.exp,
        data: data.data
      });
    };

    // RÉCUPÉRER UNE CIBLE
    const getTarget = () => {

      if (event.messageReply) {
        return event.messageReply.senderID;
      }

      if (
        event.mentions &&
        Object.keys(event.mentions).length
      ) {
        return Object.keys(event.mentions)[0];
      }

      return null;
    };

    // UTILISER DE L'ÉNERGIE
    const useEnergy = async (cost = 1) => {

      if (g.energy < cost) {

        message.reply(
`⚡ TU ES ÉPUISÉ !

Énergie nécessaire : ${cost}
Énergie actuelle : ${g.energy}/10

⏳ 1 énergie récupérée toutes les 10 minutes.`
        );

        return false;
      }

      g.energy -= cost;

      return true;
    };

    // COOLDOWN
    const cooldown = (name, duration) => {

      const now = Date.now();
      const last = g.lastActions[name] || 0;

      if (now - last < duration) {

        message.reply(
          `⏳ Attends encore ${formatTime(duration - (now - last))} avant de recommencer.`
        );

        return false;
      }

      g.lastActions[name] = now;

      return true;
    };

    // =====================================
    // PROFIL
    // =====================================

    if (
      action === "profile" ||
      action === "profil"
    ) {

      const name = await usersData.getName(uid);

      const nextRank = RANKS.find(
        r => r.exp > g.exp
      );

      return message.reply(
`╔═══━━━〔 🩸 DARK CITY 〕━━━═══╗
          👑 PROFIL GANGSTER
╚══════════════════════════════╝

👤 Nom : ${name || uid}

💀 Rang : ${getRank(g.exp)}
⭐ EXP : ${g.exp}${nextRank ? ` / ${nextRank.exp}` : " (MAX)"}

💰 Argent : ${g.cash.toLocaleString("fr-FR")} ${COIN}
🔥 Réputation : ${g.reputation}

❤️ Santé : ${g.health}/100
⚡ Énergie : ${g.energy}/10

🔫 Arme : ${getItemName(g.weapon)}
🛡️ Protection : ${getItemName(g.armor)}

━━━━━━━━━━━━━━━━━━━━
        🖤 DARK SYSTEM 🖤`
      );
    }

    // =====================================
    // TRAVAIL
    // =====================================

    if (
      action === "work" ||
      action === "travail"
    ) {

      if (!cooldown("work", 30000)) return;
      if (!await useEnergy(1)) return;

      const jobs = [
        "Tu as livré un colis mystérieux.",
        "Tu as travaillé pour un commerçant du quartier.",
        "Tu as effectué une mission de livraison.",
        "Tu as aidé un contact à organiser son business.",
        "Tu as récupéré une dette dans le jeu."
      ];

      const gain = random(150, 450);
      const exp = random(10, 25);
      const reputation = random(1, 4);

      g.cash += gain;
      g.exp += exp;
      g.reputation += reputation;

      await save();

      return message.reply(
`💼 ━━━ TRAVAIL TERMINÉ ━━━

${jobs[random(0, jobs.length - 1)]}

💰 Gain : +${gain} ${COIN}
⭐ EXP : +${exp}
🔥 Réputation : +${reputation}
⚡ Énergie : ${g.energy}/10`
      );
      }

      // =====================================
    // VOLER UN JOUEUR
    // =====================================

    if (
      action === "rob" ||
      action === "vol"
    ) {

      const targetID = getTarget();

      if (!targetID) {
        return message.reply(
          "❌ Mentionne un joueur ou réponds à son message.\nExemple : ¥gang rob @joueur"
        );
      }

      if (targetID === uid) {
        return message.reply(
          "❌ Tu ne peux pas te voler toi-même."
        );
      }

      if (g.energy < 2) {
        return message.reply(
          "⚡ Tu n'as pas assez d'énergie."
        );
      }

      if (!cooldown("rob", 60000)) return;
      if (!await useEnergy(2)) return;

      const target = await usersData.get(targetID);
      const tg = getGang(target);

      if (tg.cash <= 0) {
        return message.reply(
          "💸 Ce joueur ne possède pas d'argent à voler."
        );
      }

      const success = Math.random() < 0.65;

      if (success) {

        const amount = Math.min(
          tg.cash,
          random(100, 500)
        );

        tg.cash -= amount;
        g.cash += amount;

        g.exp += 20;
        g.reputation += 5;

        await save();
        await save(targetID, target);

        return message.reply(
`🩸 ━━━ VOL RÉUSSI ━━━

💀 Tu as réussi à voler ton adversaire !

💰 Argent récupéré : +${amount} ${COIN}
⭐ EXP : +20
🔥 Réputation : +5

⚡ Énergie : ${g.energy}/10

🖤 DARK CITY`
        );

      } else {

        const penalty = Math.min(
          g.cash,
          random(50, 200)
        );

        g.cash -= penalty;
        g.health = Math.max(
          1,
          g.health - 10
        );

        await save();

        return message.reply(
`🚨 ━━━ VOL ÉCHOUÉ ━━━

Tu as été repéré pendant ton opération !

💸 Amende : -${penalty} ${COIN}
❤️ Santé : -10

💀 Tu dois être plus discret la prochaine fois.`
        );
      }
    }

    // =====================================
    // ATTAQUER UN JOUEUR
    // =====================================

    if (
      action === "attack" ||
      action === "attaquer"
    ) {

      const targetID = getTarget();

      if (!targetID) {
        return message.reply(
          "❌ Mentionne un joueur pour l'attaquer."
        );
      }

      if (targetID === uid) {
        return message.reply(
          "❌ Tu ne peux pas te battre contre toi-même."
        );
      }

      if (g.health <= 0) {
        return message.reply(
          "☠️ Tu es K.O. ! Utilise ¥gang heal pour récupérer ta santé."
        );
      }

      if (g.energy < 2) {
        return message.reply(
          "⚡ Tu n'as pas assez d'énergie."
        );
      }

      if (!cooldown("attack", 60000)) return;
      if (!await useEnergy(2)) return;

      const target = await usersData.get(targetID);
      const tg = getGang(target);

      if (tg.health <= 0) {
        return message.reply(
          "💀 Ce joueur est déjà K.O."
        );
      }

      const weapon = SHOP[g.weapon];
      const armor = SHOP[tg.armor];

      const attackPower =
        random(10, 20) +
        (weapon?.attack || 0);

      const defense = armor?.defense || 0;

      const damage = Math.max(
        1,
        attackPower - Math.floor(defense / 3)
      );

      tg.health = Math.max(
        0,
        tg.health - damage
      );

      g.exp += 25;
      g.reputation += 5;

      await save();
      await save(targetID, target);

      return message.reply(
`⚔️ ━━━ COMBAT DARK CITY ━━━

💀 Tu as attaqué ton adversaire !

🔫 Arme : ${getItemName(g.weapon)}
🛡️ Défense adverse : ${defense}

❤️ Dégâts infligés : ${damage}

❤️ Santé restante de l'adversaire :
${tg.health}/100

⭐ EXP : +25
🔥 Réputation : +5

${tg.health <= 0
  ? "☠️ TON ADVERSAIRE EST K.O. !"
  : "🩸 Le combat continue..."}

🖤 DARK SYSTEM`
      );
    }

    // =====================================
    // SOINS
    // =====================================

    if (
      action === "heal" ||
      action === "soin"
    ) {

      if (g.health >= 100) {
        return message.reply(
          "❤️ Ta santé est déjà au maximum."
        );
      }

      const price = 300;

      if (g.cash < price) {
        return message.reply(
`💸 Tu n'as pas assez d'argent !

Prix des soins : ${price} ${COIN}
Ton argent : ${g.cash} ${COIN}`
        );
      }

      const recovered = Math.min(
        30,
        100 - g.health
      );

      g.cash -= price;
      g.health += recovered;

      await save();

      return message.reply(
`🏥 ━━━ SOINS TERMINÉS ━━━

❤️ Santé récupérée : +${recovered}
❤️ Santé actuelle : ${g.health}/100

💰 Coût : ${price} ${COIN}
💵 Argent restant : ${g.cash} ${COIN}

🖤 DARK CITY`
      );
    }

    // =====================================
    // MISSIONS
    // =====================================

    if (
      action === "mission" ||
      action === "missions"
    ) {

      if (!cooldown("mission", 120000)) return;
      if (!await useEnergy(2)) return;

      const mission = MISSIONS[
        random(0, MISSIONS.length - 1)
      ];

      const reward = random(
        mission.min,
        mission.max
      );

      const reputation = random(3, 8);

      g.cash += reward;
      g.exp += mission.exp;
      g.reputation += reputation;

      await save();

      return message.reply(
`🎯 ━━━ MISSION TERMINÉE ━━━

📌 Mission : ${mission.name}

${mission.description}

━━━━━━━━━━━━━━━━━━━━

💰 Récompense : +${reward} ${COIN}
⭐ EXP : +${mission.exp}
🔥 Réputation : +${reputation}

⚡ Énergie : ${g.energy}/10

🖤 DARK CITY`
      );
    }

    // =====================================
    // RÉCOMPENSE QUOTIDIENNE
    // =====================================

    if (
      action === "daily" ||
      action === "quotidien"
    ) {

      const now = Date.now();
      const cooldownTime = 86400000;

      if (
        now - g.lastDaily < cooldownTime
      ) {

        return message.reply(
`⏳ TU AS DÉJÀ RÉCUPÉRÉ TA RÉCOMPENSE !

Reviens dans :

${formatTime(
  cooldownTime - (now - g.lastDaily)
)}

🎁 Prochaine récompense disponible bientôt.`
        );
      }

      const reward = random(500, 1200);
      const exp = random(20, 50);

      g.cash += reward;
      g.exp += exp;
      g.reputation += 10;
      g.lastDaily = now;

      await save();

      return message.reply(
`🎁 ━━━ DAILY REWARD ━━━

💰 Argent : +${reward} ${COIN}
⭐ EXP : +${exp}
🔥 Réputation : +10

━━━━━━━━━━━━━━━━━━━━

Reviens demain pour une nouvelle récompense !

🖤 DARK SYSTEM`
      );
    }

    // =====================================
    // BOUTIQUE
    // =====================================

    if (
      action === "shop" ||
      action === "boutique"
    ) {

      let text = `╔═══━━〔 🛒 DARK SHOP 〕━━═══╗

💰 Ton argent : ${g.cash.toLocaleString("fr-FR")} ${COIN}

━━━━━━━━━━━━━━━━━━━━

`;

      for (const [key, item] of Object.entries(SHOP)) {

        text +=
`${item.name}

🆔 ID : ${key}
💰 Prix : ${item.price} ${COIN}
${item.attack ? `⚔️ Attaque : +${item.attack}` : ""}
${item.defense ? `🛡️ Défense : +${item.defense}` : ""}

━━━━━━━━━━━━━━━━━━━━

`;
      }

      text +=
`Pour acheter :
¥gang buy knife

🖤 DARK SYSTEM`;

      return message.reply(text);
    }

    // =====================================
    // ACHETER UN OBJET
    // =====================================

    if (
      action === "buy" ||
      action === "acheter"
    ) {

      const itemID = args[1]?.toLowerCase();

      if (!itemID || !SHOP[itemID]) {
        return message.reply(
          "❌ Objet invalide.\nUtilise ¥gang shop pour voir les objets disponibles."
        );
      }

      const item = SHOP[itemID];

      if (g.cash < item.price) {
        return message.reply(
`💸 ARGENT INSUFFISANT !

Objet : ${item.name}
Prix : ${item.price} ${COIN}
Ton argent : ${g.cash} ${COIN}`
        );
      }

      if (g.inventory.includes(itemID)) {
        return message.reply(
          "❌ Tu possèdes déjà cet objet."
        );
      }

      g.cash -= item.price;
      g.inventory.push(itemID);

      // ÉQUIPEMENT AUTOMATIQUE
      if (item.attack) {

        const current = SHOP[g.weapon];

        if (
          !current ||
          item.attack > (current.attack || 0)
        ) {
          g.weapon = itemID;
        }
      }

      if (item.defense) {

        const current = SHOP[g.armor];

        if (
          !current ||
          item.defense > (current.defense || 0)
        ) {
          g.armor = itemID;
        }
      }

      await save();

      return message.reply(
`🛒 ━━━ ACHAT RÉUSSI ━━━

📦 Objet : ${item.name}
💰 Prix : -${item.price} ${COIN}

${item.attack ? `⚔️ Attaque : +${item.attack}` : ""}
${item.defense ? `🛡️ Défense : +${item.defense}` : ""}

━━━━━━━━━━━━━━━━━━━━

💰 Argent restant : ${g.cash} ${COIN}

🖤 DARK SYSTEM`
      );
    }

    // =====================================
    // INVENTAIRE
    // =====================================

    if (
      action === "inventory" ||
      action === "inventaire" ||
      action === "inv"
    ) {

      let items = "";

      if (g.inventory.length === 0) {

        items = "Ton inventaire est vide.";

      } else {

        for (const id of g.inventory) {

          const item = SHOP[id];

          if (item) {

            const equipped =
              g.weapon === id ||
              g.armor === id;

            items +=
              `${item.name} ${equipped ? "✅ ÉQUIPÉ" : ""}\n`;
          }
        }
      }

      return message.reply(
`╔═══━━〔 🎒 INVENTAIRE 〕━━═══╗

${items}

━━━━━━━━━━━━━━━━━━━━

🔫 Arme : ${getItemName(g.weapon)}
🛡️ Protection : ${getItemName(g.armor)}

💰 Argent : ${g.cash} ${COIN}

🖤 DARK SYSTEM`
      );
    }

    // =====================================
    // CLASSEMENT GRAPHIQUE
    // =====================================

    if (
      action === "top" ||
      action === "classement"
    ) {

      if (typeof usersData.getAll !== "function") {
        return message.reply(
          "❌ La méthode usersData.getAll() n'est pas disponible."
        );
      }

      try {

        // Récupérer tous les joueurs
        const allUsers = await usersData.getAll();

        const entries = Array.isArray(allUsers)
          ? allUsers.map(u => [u.userID || u.id, u])
          : Object.entries(allUsers || {});

        const players = [];

        for (const [id, u] of entries) {

          if (!id || !u?.data?.darkCity) continue;

          const data = u.data.darkCity;

          players.push({
            id: String(id),
            name: await usersData.getName(id),
            cash: Number(data.cash) || 0,
            exp: Number(data.exp) || 0,
            reputation: Number(data.reputation) || 0
          });
        }

        // Ajouter le joueur actuel s'il n'est pas encore enregistré
        if (!players.some(p => p.id === String(uid))) {

          players.push({
            id: String(uid),
            name: await usersData.getName(uid),
            cash: g.cash,
            exp: g.exp,
            reputation: g.reputation
          });
        }

        // Classement global par EXP
        players.sort((a, b) => {
          return b.exp - a.exp;
        });

        // Attribuer les véritables rangs
        players.forEach((p, index) => {
          p.globalRank = index + 1;
        });

        // Trouver le joueur actuel
        const currentPlayer = players.find(
          p => p.id === String(uid)
        );

        // Afficher uniquement les 10 premiers
        const top = players.slice(0, 10);

        // Générer la carte PNG
        const image = await makeGangRanking(
          top,
          currentPlayer
        );

        return message.reply({
          body:
`╔═══━━〔 🩸 DARK CITY RANKING 〕━━═══╗

🏆 Voici les 10 gangsters les plus puissants de la ville.

👑 Ton classement global : #${currentPlayer.globalRank}

⭐ Ton EXP : ${currentPlayer.exp}

🖤 DARK SYSTEM`,
          attachment: image
        });

      } catch (err) {

        console.error(
          "[DARK CITY RANKING ERROR]",
          err
        );

        return message.reply(
          "❌ Une erreur est survenue pendant la génération du classement."
        );
      }
    }

    // =====================================
    // COMMANDES D'AIDE
    // =====================================

    return message.reply(
`╔═══━━〔 🩸 DARK CITY 〕━━═══╗
             COMMANDES
╚══════════════════════════════╝

👑 PROFIL
¥gang profile

💼 TRAVAIL
¥gang work

💀 VOLER UN JOUEUR
¥gang rob @joueur

⚔️ ATTAQUER UN JOUEUR
¥gang attack @joueur

🏥 RÉCUPÉRER SA SANTÉ
¥gang heal

🎯 MISSION
¥gang mission

🎁 RÉCOMPENSE QUOTIDIENNE
¥gang daily

🛒 BOUTIQUE
¥gang shop

📦 ACHETER UN OBJET
¥gang buy knife

🎒 INVENTAIRE
¥gang inventory

🏆 CLASSEMENT GRAPHIQUE
¥gang top

━━━━━━━━━━━━━━━━━━━━

⚡ RÉCUPÉRATION D'ÉNERGIE
1 énergie toutes les 10 minutes.

🖤 BIENVENUE DANS DARK CITY.
`
    );
  }
};
