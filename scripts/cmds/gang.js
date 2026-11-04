const Canvas = require("canvas");
const fs = require("fs-extra");
const path = require("path");

const COIN = "₩";
const DATA_DIR = path.join(__dirname, "cache", "darkcity");
const GUILD_FILE = path.join(DATA_DIR, "guilds.json");

fs.ensureDirSync(DATA_DIR);

const RANKS = [
  { name: "Petit voyou", exp: 0 },
  { name: "Délinquant", exp: 100 },
  { name: "Gangster", exp: 300 },
  { name: "Capo", exp: 700 },
  { name: "Parrain", exp: 1500 },
  { name: "Roi de la ville", exp: 3000 },
  { name: "Légende du crime", exp: 5000 },
  { name: "Empereur du crime", exp: 10000 }
];

const SHOP = {
  knife: {
    name: "Couteau",
    price: 500,
    type: "weapon",
    attack: 5,
    emoji: "🔪"
  },
  pistol: {
    name: "Pistolet",
    price: 1500,
    type: "weapon",
    attack: 15,
    emoji: "🔫"
  },
  armor: {
    name: "Gilet pare-balles",
    price: 1000,
    type: "armor",
    defense: 10,
    emoji: "🦺"
  },
  vest: {
    name: "Armure renforcée",
    price: 2500,
    type: "armor",
    defense: 25,
    emoji: "🛡️"
  }
};

const MISSIONS = [
  { name: "Livraison secrète", min: 200, max: 500, exp: 20 },
  { name: "Protection du territoire", min: 300, max: 600, exp: 30 },
  { name: "Transaction clandestine", min: 250, max: 550, exp: 25 },
  { name: "Infiltration", min: 400, max: 700, exp: 35 },
  { name: "Dette récupérée", min: 150, max: 450, exp: 15 }
];

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRank(exp = 0) {
  let rank = RANKS[0];

  for (const item of RANKS) {
    if (exp >= item.exp) rank = item;
  }

  return rank;
}

function getNextRank(exp = 0) {
  return RANKS.find(rank => rank.exp > exp) || null;
}

function formatTime(ms) {
  const seconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours} h ${minutes % 60} min`;
  }

  if (minutes > 0) {
    return `${minutes} min ${seconds % 60} sec`;
  }

  return `${seconds} sec`;
}

function getItemName(id) {
  return SHOP[id]?.name || "Aucun";
}

function getPrefix() {
  const value = global.GoatBot?.config?.prefix;

  if (Array.isArray(value)) {
    return value[0] || "/";
  }

  return value || "/";
}

function getGangData(user) {
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

  return g;
}

function loadGuildData() {
  try {
    if (!fs.existsSync(GUILD_FILE)) {
      fs.writeJsonSync(GUILD_FILE, {
        guilds: {},
        invites: {}
      }, { spaces: 2 });
    }

    const data = fs.readJsonSync(GUILD_FILE);

    return {
      guilds: data.guilds || {},
      invites: data.invites || {}
    };
  } catch (error) {
    return {
      guilds: {},
      invites: {}
    };
  }
}

function saveGuildData(data) {
  fs.writeJsonSync(GUILD_FILE, data, { spaces: 2 });
}

function roundedRect(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(
    x + width,
    y + height,
    x + width - radius,
    y + height
  );
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();

  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }

  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function drawBackground(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#050907");
  gradient.addColorStop(0.5, "#102219");
  gradient.addColorStop(1, "#030504");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#19ff8c";
  ctx.lineWidth = 4;
  ctx.strokeRect(18, 18, width - 36, height - 36);
}

function drawTitle(ctx, title, subtitle, width) {
  ctx.textAlign = "center";
  ctx.fillStyle = "#19ff8c";
  ctx.font = "bold 58px Arial";
  ctx.fillText("DARK CITY", width / 2, 85);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 30px Arial";
  ctx.fillText(title, width / 2, 135);

  if (subtitle) {
    ctx.fillStyle = "#9db9a7";
    ctx.font = "22px Arial";
    ctx.fillText(subtitle, width / 2, 175);
  }
}

async function loadAvatar(url) {
  if (!url) return null;

  try {
    return await Canvas.loadImage(url);
  } catch (error) {
    return null;
  }
}

function drawAvatar(ctx, avatar, x, y, size, name) {
  ctx.save();

  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  ctx.fillStyle = "#17251c";
  ctx.fillRect(x, y, size, size);

  if (avatar) {
    const scale = Math.max(size / avatar.width, size / avatar.height);
    const width = avatar.width * scale;
    const height = avatar.height * scale;

    ctx.drawImage(
      avatar,
      x + (size - width) / 2,
      y + (size - height) / 2,
      width,
      height
    );
  } else {
    ctx.fillStyle = "#19ff8c";
    ctx.font = `bold ${Math.floor(size * 0.48)}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      (name || "?").charAt(0).toUpperCase(),
      x + size / 2,
      y + size / 2
    );
  }

  ctx.restore();

  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.strokeStyle = "#19ff8c";
  ctx.lineWidth = 7;
  ctx.stroke();
}

async function makeGangProfile(g, name, avatarURL) {
  const canvas = Canvas.createCanvas(1100, 1350);
  const ctx = canvas.getContext("2d");

  drawBackground(ctx, 1100, 1350);
  drawTitle(ctx, "GANGSTER PROFILE", "IDENTITÉ OFFICIELLE", 1100);

  const avatar = await loadAvatar(avatarURL);

  drawAvatar(ctx, avatar, 400, 210, 300, name);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 48px Arial";
  ctx.fillText(String(name || "Joueur").slice(0, 25), 550, 570);

  const rank = getRank(g.exp);
  const next = getNextRank(g.exp);

  ctx.fillStyle = "#19ff8c";
  ctx.font = "bold 34px Arial";
  ctx.fillText(rank.name, 550, 630);

  roundedRect(ctx, 100, 680, 900, 32, 15, "#26352d");

  const progress = next
    ? Math.min(1, (g.exp - rank.exp) / (next.exp - rank.exp))
    : 1;

  roundedRect(
    ctx,
    100,
    680,
    Math.max(8, 900 * progress),
    32,
    15,
    "#19ff8c"
  );

  ctx.fillStyle = "#ffffff";
  ctx.font = "23px Arial";
  ctx.fillText(
    next
      ? `${g.exp} EXP / Prochain grade : ${next.exp} EXP`
      : `${g.exp} EXP / GRADE MAXIMUM`,
    550,
    755
  );

  const stats = [
    ["FORTUNE", `${g.cash} ${COIN}`],
    ["RÉPUTATION", `${g.reputation}`],
    ["SANTÉ", `${g.health}/100`],
    ["ÉNERGIE", `${g.energy}/10`],
    ["ARME", getItemName(g.weapon)],
    ["PROTECTION", getItemName(g.armor)]
  ];

  let y = 815;

  for (let i = 0; i < stats.length; i++) {
    const x = i % 2 === 0 ? 75 : 565;

    if (i > 0 && i % 2 === 0) y += 135;

    roundedRect(ctx, x, y, 460, 105, 15, "#101a14", "#19ff8c");

    ctx.textAlign = "left";
    ctx.fillStyle = "#19ff8c";
    ctx.font = "bold 22px Arial";
    ctx.fillText(stats[i][0], x + 22, y + 38);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 27px Arial";
    ctx.fillText(String(stats[i][1]), x + 22, y + 78);
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#19ff8c";
  ctx.font = "bold 28px Arial";
  ctx.fillText("𓆩 DARK CITY GANG 𓆪", 550, 1290);

  return canvas.toBuffer("image/png");
}

async function makeShopImage() {
  const canvas = Canvas.createCanvas(1100, 900);
  const ctx = canvas.getContext("2d");

  drawBackground(ctx, 1100, 900);
  drawTitle(ctx, "BLACK MARKET", "ARMES ET PROTECTIONS", 1100);

  const items = Object.entries(SHOP);

  for (let i = 0; i < items.length; i++) {
    const [id, item] = items[i];
    const x = i % 2 === 0 ? 65 : 565;
    const y = 220 + Math.floor(i / 2) * 290;

    roundedRect(ctx, x, y, 470, 245, 20, "#101a14", "#19ff8c");

    ctx.textAlign = "center";
    ctx.font = "65px Arial";
    ctx.fillText(item.emoji, x + 235, y + 85);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 29px Arial";
    ctx.fillText(item.name, x + 235, y + 130);

    ctx.fillStyle = "#19ff8c";
    ctx.font = "bold 25px Arial";
    ctx.fillText(`${item.price} ${COIN}`, x + 235, y + 175);

    ctx.fillStyle = "#b7d6c2";
    ctx.font = "21px Arial";
    ctx.fillText(
      item.type === "weapon"
        ? `ATTAQUE +${item.attack}`
        : `DÉFENSE +${item.defense}`,
      x + 235,
      y + 215
    );

    ctx.textAlign = "left";
    ctx.fillStyle = "#19ff8c";
    ctx.font = "bold 18px Arial";
    ctx.fillText(`ID : ${id}`, x + 18, y + 30);
  }

  return canvas.toBuffer("image/png");
}

async function makeBattleImage(attacker, defender) {
  const canvas = Canvas.createCanvas(1200, 850);
  const ctx = canvas.getContext("2d");

  drawBackground(ctx, 1200, 850);
  drawTitle(ctx, "GANGSTER BATTLE", "RAPPORT DU COMBAT", 1200);

  const avatar1 = await loadAvatar(attacker.avatar);
  const avatar2 = await loadAvatar(defender.avatar);

  drawAvatar(ctx, avatar1, 170, 230, 260, attacker.name);
  drawAvatar(ctx, avatar2, 770, 230, 260, defender.name);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 34px Arial";
  ctx.fillText(String(attacker.name).slice(0, 20), 300, 545);
  ctx.fillText(String(defender.name).slice(0, 20), 900, 545);

  ctx.fillStyle = "#19ff8c";
  ctx.font = "bold 25px Arial";
  ctx.fillText(attacker.rank, 300, 590);
  ctx.fillText(defender.rank, 900, 590);

  ctx.fillStyle = "#ff5555";
  ctx.font = "bold 48px Arial";
  ctx.fillText(`-${defender.damage} PV`, 600, 300);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 25px Arial";
  ctx.fillText("SANTÉ", 300, 655);
  ctx.fillText("SANTÉ", 900, 655);

  roundedRect(ctx, 100, 675, 400, 30, 12, "#442222");
  roundedRect(
    ctx,
    100,
    675,
    400 * Math.max(0, attacker.health) / 100,
    30,
    12,
    "#19ff8c"
  );

  roundedRect(ctx, 700, 675, 400, 30, 12, "#442222");
  roundedRect(
    ctx,
    700,
    675,
    400 * Math.max(0, defender.health) / 100,
    30,
    12,
    "#ff5555"
  );

  ctx.fillStyle = "#ffffff";
  ctx.font = "23px Arial";
  ctx.fillText(`${attacker.health}/100`, 300, 740);
  ctx.fillText(`${defender.health}/100`, 900, 740);

  ctx.fillStyle = "#19ff8c";
  ctx.font = "bold 24px Arial";
  ctx.fillText("DARK CITY FIGHT", 600, 805);

  return canvas.toBuffer("image/png");
}

async function makeRankingImage(players) {
  const canvas = Canvas.createCanvas(1200, 950);
  const ctx = canvas.getContext("2d");

  drawBackground(ctx, 1200, 950);
  drawTitle(ctx, "GLOBAL RANKING", "TOP GANGSTERS", 1200);

  ctx.textAlign = "left";

  for (let i = 0; i < Math.min(players.length, 10); i++) {
    const player = players[i];
    const y = 220 + i * 68;

    roundedRect(
      ctx,
      65,
      y,
      1070,
      55,
      12,
      i === 0 ? "#19452c" : "#101a14",
      "#19ff8c"
    );

    ctx.fillStyle = "#19ff8c";
    ctx.font = "bold 23px Arial";
    ctx.fillText(`#${i + 1}`, 90, y + 36);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 21px Arial";
    ctx.fillText(String(player.name).slice(0, 22), 190, y + 36);

    ctx.fillStyle = "#b7d6c2";
    ctx.fillText(getRank(player.exp).name, 650, y + 36);

    ctx.fillStyle = "#19ff8c";
    ctx.fillText(`${player.exp} EXP`, 920, y + 36);
  }

  return canvas.toBuffer("image/png");
}module.exports = {
  config: {
    name: "gang",
    aliases: ["gangster", "darkcity"],
    version: "3.0.0",
    author: "DARK SYSTEM",
    countDown: 3,
    role: 0,
    category: "GAME",
    shortDescription: "DARK CITY RPG"
  },

  onStart: async function ({ api, event, args, message, usersData }) {
    const uid = event.senderID;
    const action = (args[0] || "help").toLowerCase();
    const prefix = getPrefix();

    let user = await usersData.get(uid);

    if (!user) {
      user = { money: 0, exp: 0, data: {} };
    }

    const g = getGangData(user);

    const save = async (id = uid, data = user) => {
      await usersData.set(id, {
        money: data.money || 0,
        exp: data.exp || 0,
        data: data.data || {}
      });
    };

    const getName = async id => {
      try {
        const info = await api.getUserInfo(id);
        const profile = info?.[id];

        return profile?.name
          || profile?.firstName
          || "Joueur inconnu";
      } catch (error) {
        return "Joueur inconnu";
      }
    };

    const getAvatar = async id => {
      try {
        const info = await api.getUserInfo(id);
        const profile = info?.[id];

        return profile?.largePictureUrl
          || profile?.profilePictureUrl
          || profile?.avatarUrl
          || profile?.thumbSrc
          || profile?.picture
          || null;
      } catch (error) {
        return null;
      }
    };

    const getTarget = () => {
      if (event.messageReply?.senderID) {
        return event.messageReply.senderID;
      }

      const mentions = event.mentions || {};
      const ids = Object.keys(mentions);

      return ids.length ? ids[0] : null;
    };

    const recoverEnergy = () => {
      const now = Date.now();
      const elapsed = now - g.lastEnergy;
      const recovered = Math.floor(elapsed / 600000);

      if (recovered > 0) {
        g.energy = Math.min(10, g.energy + recovered);
        g.lastEnergy += recovered * 600000;
      }
    };

    const useEnergy = amount => {
      recoverEnergy();

      if (g.energy < amount) return false;

      g.energy -= amount;
      return true;
    };

    const checkCooldown = (key, duration) => {
      const now = Date.now();
      const last = g.lastActions[key] || 0;
      const remaining = duration - (now - last);

      if (remaining > 0) {
        return { success: false, remaining };
      }

      return { success: true };
    };

    const setCooldown = key => {
      g.lastActions[key] = Date.now();
    };

    const sendImage = async (buffer, filename, caption) => {
      const file = path.join(DATA_DIR, filename);
      fs.writeFileSync(file, buffer);

      return message.reply({
        body: caption,
        attachment: fs.createReadStream(file)
      });
    };

    // PROFIL
    if (action === "profile" || action === "profil") {
      recoverEnergy();

      const name = await getName(uid);
      const avatar = await getAvatar(uid);
      const image = await makeGangProfile(g, name, avatar);

      await save();

      return sendImage(
        image,
        `profile_${uid}.png`,
        `𓆩 👤 DARK CITY PROFILE 👤 𓆪\nVoici ton profil de gangster.`
      );
    }

    // TRAVAIL
    if (action === "work" || action === "travail") {
      const cd = checkCooldown("work", 30000);

      if (!cd.success) {
        return message.reply(
          `⏳ Attends ${formatTime(cd.remaining)} avant de retravailler.`
        );
      }

      if (!useEnergy(1)) {
        return message.reply("⚡ Tu n'as pas assez d'énergie.");
      }

      setCooldown("work");

      const reward = random(150, 450);
      const exp = random(10, 25);

      g.cash += reward;
      g.exp += exp;
      g.reputation += random(1, 4);

      await save();

      return message.reply(
        `𓆩 💼 TRAVAIL TERMINÉ 💼 𓆪\n\n` +
        `💰 Gain : +${reward} ${COIN}\n` +
        `⭐ EXP : +${exp}\n` +
        `👑 Grade : ${getRank(g.exp).name}\n` +
        `⚡ Énergie : ${g.energy}/10`
      );
    }

    // DAILY
    if (action === "daily" || action === "quotidien") {
      const remaining = 86400000 - (Date.now() - g.lastDaily);

      if (remaining > 0) {
        return message.reply(
          `⏳ Récompense déjà récupérée.\nReviens dans ${formatTime(remaining)}.`
        );
      }

      const reward = random(500, 1200);
      const exp = random(20, 50);

      g.cash += reward;
      g.exp += exp;
      g.reputation += 10;
      g.lastDaily = Date.now();

      await save();

      return message.reply(
        `𓆩 🎁 DAILY REWARD 🎁 𓆪\n\n` +
        `💰 +${reward} ${COIN}\n` +
        `⭐ +${exp} EXP\n` +
        `🔥 +10 réputation\n` +
        `👑 Grade : ${getRank(g.exp).name}`
      );
    }

    // MISSION
    if (action === "mission" || action === "missions") {
      const cd = checkCooldown("mission", 120000);

      if (!cd.success) {
        return message.reply(
          `⏳ Attends ${formatTime(cd.remaining)} avant ta prochaine mission.`
        );
      }

      if (!useEnergy(2)) {
        return message.reply("⚡ Il te faut 2 points d'énergie.");
      }

      setCooldown("mission");

      const mission = MISSIONS[random(0, MISSIONS.length - 1)];
      const reward = random(mission.min, mission.max);

      g.cash += reward;
      g.exp += mission.exp;
      g.reputation += 3;

      await save();

      return message.reply(
        `𓆩 🎯 MISSION ACCOMPLIE 🎯 𓆪\n\n` +
        `📌 ${mission.name}\n` +
        `💰 +${reward} ${COIN}\n` +
        `⭐ +${mission.exp} EXP\n` +
        `🔥 +3 réputation\n` +
        `👑 Grade : ${getRank(g.exp).name}`
      );
    }

    // SOIN
    if (action === "heal" || action === "soin") {
      if (g.health >= 100) {
        return message.reply("❤️ Ta santé est déjà au maximum.");
      }

      if (g.cash < 300) {
        return message.reply(`❌ Il te faut 300 ${COIN} pour te soigner.`);
      }

      const restored = Math.min(30, 100 - g.health);

      g.cash -= 300;
      g.health += restored;

      await save();

      return message.reply(
        `❤️ SOIN EFFECTUÉ\n\n` +
        `Santé récupérée : +${restored}\n` +
        `Santé actuelle : ${g.health}/100\n` +
        `Prix : 300 ${COIN}`
      );
    }

    // VOL
    if (action === "rob" || action === "vol") {
      const targetID = getTarget();

      if (!targetID) {
        return message.reply(
          `⚠️ Réponds au message d'un joueur ou mentionne-le.\n` +
          `Exemple : ${prefix}gang rob @joueur`
        );
      }

      if (targetID === uid) {
        return message.reply("Tu ne peux pas te voler toi-même.");
      }

      const targetUser = await usersData.get(targetID);

      if (!targetUser) {
        return message.reply("❌ Joueur introuvable.");
      }

      const targetGang = getGangData(targetUser);

      if (targetGang.cash <= 0) {
        return message.reply("Ce joueur n'a pas d'argent à voler.");
      }

      const cd = checkCooldown("rob", 60000);

      if (!cd.success) {
        return message.reply(
          `⏳ Attends ${formatTime(cd.remaining)}.`
        );
      }

      if (!useEnergy(2)) {
        return message.reply("⚡ Il te faut 2 points d'énergie.");
      }

      setCooldown("rob");

      if (Math.random() < 0.65) {
        const stolen = Math.min(random(100, 500), targetGang.cash);

        g.cash += stolen;
        targetGang.cash -= stolen;
        g.exp += 20;
        g.reputation += 5;

        await save(uid, user);
        await save(targetID, targetUser);

        return message.reply(
          `𓆩 🦇 BRAQUAGE RÉUSSI 🦇 𓆪\n\n` +
          `🎯 Victime : ${await getName(targetID)}\n` +
          `💰 Argent volé : ${stolen} ${COIN}\n` +
          `⭐ +20 EXP\n` +
          `🔥 +5 réputation`
        );
      }

      const fine = random(50, 200);

      g.cash = Math.max(0, g.cash - fine);
      g.health = Math.max(0, g.health - 10);

      await save();

      return message.reply(
        `🚨 BRAQUAGE RATÉ !\n\n` +
        `La police t'a arrêté.\n` +
        `💸 Amende : ${fine} ${COIN}\n` +
        `❤️ Santé : ${g.health}/100`
      );
    }

    // COMBAT AVEC CARTE DES DEUX JOUEURS
    if (action === "attack" || action === "attaquer") {
      const targetID = getTarget();

      if (!targetID) {
        return message.reply(
          `⚠️ Réponds au message d'un joueur ou mentionne-le.\n` +
          `Exemple : ${prefix}gang attack @joueur`
        );
      }

      if (targetID === uid) {
        return message.reply("Tu ne peux pas t'attaquer toi-même.");
      }

      if (g.health <= 0) {
        return message.reply("☠️ Tu es K.O. Utilise la commande heal.");
      }

      const targetUser = await usersData.get(targetID);

      if (!targetUser) {
        return message.reply("❌ Joueur introuvable.");
      }

      const targetGang = getGangData(targetUser);

      if (targetGang.health <= 0) {
        return message.reply("☠️ Cet adversaire est déjà K.O.");
      }

      const cd = checkCooldown("attack", 60000);

      if (!cd.success) {
        return message.reply(
          `⏳ Attends ${formatTime(cd.remaining)} avant un autre combat.`
        );
      }

      if (!useEnergy(2)) {
        return message.reply("⚡ Il te faut 2 points d'énergie.");
      }

      setCooldown("attack");

      const weaponAttack = g.weapon
        ? SHOP[g.weapon]?.attack || 0
        : 0;

      const targetDefense = targetGang.armor
        ? SHOP[targetGang.armor]?.defense || 0
        : 0;

      const damage = Math.max(
        1,
        random(15, 30) + weaponAttack - targetDefense
      );

      targetGang.health = Math.max(0, targetGang.health - damage);

      g.exp += 25;
      g.reputation += 5;

      const attackerName = await getName(uid);
      const defenderName = await getName(targetID);

      const attackerAvatar = await getAvatar(uid);
      const defenderAvatar = await getAvatar(targetID);

      const battleImage = await makeBattleImage(
        {
          name: attackerName,
          avatar: attackerAvatar,
          rank: getRank(g.exp).name,
          health: g.health
        },
        {
          name: defenderName,
          avatar: defenderAvatar,
          rank: getRank(targetGang.exp).name,
          health: targetGang.health,
          damage
        }
      );

      await save(uid, user);
      await save(targetID, targetUser);

      return sendImage(
        battleImage,
        `battle_${uid}_${targetID}.png`,
        `𓆩 ⚔️ DARK CITY BATTLE ⚔️ 𓆪\n\n` +
        `🥊 ${attackerName} attaque ${defenderName} !\n` +
        `💥 Dégâts infligés : ${damage} PV\n` +
        `❤️ Santé restante de ${defenderName} : ${targetGang.health}/100\n` +
        (targetGang.health <= 0
          ? `\n☠️ ${defenderName} est K.O. !`
          : "")
      );
        }    // BOUTIQUE AVEC IMAGE
    if (action === "shop" || action === "boutique") {
      const image = await makeShopImage();

      return sendImage(
        image,
        "darkcity_shop.png",
        `𓆩 🛒 DARK CITY BLACK MARKET 🛒 𓆪\n\n` +
        `💰 Ton argent : ${g.cash} ${COIN}\n\n` +
        `Pour acheter un objet :\n` +
        `${prefix}gang buy <ID>\n\n` +
        `Exemple : ${prefix}gang buy pistol`
      );
    }

    // ACHETER
    if (action === "buy" || action === "acheter") {
      const itemID = (args[1] || "").toLowerCase();
      const item = SHOP[itemID];

      if (!item) {
        return message.reply(
          `❌ Objet introuvable.\n` +
          `Consulte la boutique : ${prefix}gang shop`
        );
      }

      if (g.inventory.includes(itemID)) {
        return message.reply("⚠️ Tu possèdes déjà cet objet.");
      }

      if (g.cash < item.price) {
        return message.reply(
          `❌ Pas assez d'argent.\n` +
          `Prix : ${item.price} ${COIN}\n` +
          `Ton argent : ${g.cash} ${COIN}`
        );
      }

      g.cash -= item.price;
      g.inventory.push(itemID);

      let equipped = false;

      if (item.type === "weapon") {
        const current = g.weapon
          ? SHOP[g.weapon]?.attack || 0
          : 0;

        if (item.attack > current) {
          g.weapon = itemID;
          equipped = true;
        }
      }

      if (item.type === "armor") {
        const current = g.armor
          ? SHOP[g.armor]?.defense || 0
          : 0;

        if (item.defense > current) {
          g.armor = itemID;
          equipped = true;
        }
      }

      await save();

      return message.reply(
        `𓆩 🛍️ ACHAT RÉUSSI 🛍️ 𓆪\n\n` +
        `${item.emoji} Objet : ${item.name}\n` +
        `💸 Prix : ${item.price} ${COIN}\n` +
        `💰 Argent restant : ${g.cash} ${COIN}\n` +
        (equipped
          ? "🟢 Objet automatiquement équipé."
          : "📦 Objet ajouté à ton inventaire.")
      );
    }

    // INVENTAIRE
    if (action === "inventory" || action === "inventaire") {
      let text = `𓆩 🎒 DARK CITY INVENTORY 🎒 𓆪\n\n`;

      text += `💰 Argent : ${g.cash} ${COIN}\n`;
      text += `⚔️ Arme : ${getItemName(g.weapon)}\n`;
      text += `🛡️ Protection : ${getItemName(g.armor)}\n\n`;

      if (!g.inventory.length) {
        text += "Ton inventaire est vide.";
      } else {
        for (const id of g.inventory) {
          const item = SHOP[id];

          if (!item) continue;

          const equipped = g.weapon === id || g.armor === id;

          text += `${item.emoji} ${item.name}`;
          if (equipped) text += " 🟢 ÉQUIPÉ";
          text += "\n";
        }
      }

      return message.reply(text);
    }

    // CLASSEMENT DES JOUEURS
    if (
      action === "top" ||
      action === "ranking" ||
      action === "classement"
    ) {
      if (typeof usersData.getAll !== "function") {
        return message.reply(
          "❌ La méthode usersData.getAll() n'est pas disponible."
        );
      }

      try {
        const allUsers = await usersData.getAll();

        const entries = Array.isArray(allUsers)
          ? allUsers.map(u => [u.userID || u.id, u])
          : Object.entries(allUsers || {});

        const players = [];

        for (const [id, data] of entries) {
          if (!id || !data) continue;

          const playerGang = getGangData(data);

          players.push({
            id,
            name: await getName(id),
            exp: playerGang.exp || 0,
            cash: playerGang.cash || 0
          });
        }

        players.sort((a, b) => b.exp - a.exp);

        const image = await makeRankingImage(players);
        const myRank = players.findIndex(p => p.id === uid) + 1;

        return sendImage(
          image,
          "darkcity_ranking.png",
          `𓆩 🏆 DARK CITY RANKING 🏆 𓆪\n\n` +
          `👥 Joueurs classés : ${players.length}\n` +
          `👑 Ton classement : ${myRank ? `#${myRank}` : "Non classé"}`
        );
      } catch (error) {
        console.error("DARK CITY RANKING:", error);

        return message.reply(
          "❌ Impossible de générer le classement."
        );
      }
    }

    // SYSTÈME DE GUILDES
    if (action === "guild" || action === "guilde") {
      const sub = (args[1] || "help").toLowerCase();
      const guildData = loadGuildData();

      const findMyGuild = () => {
        return Object.values(guildData.guilds).find(guild =>
          guild.members.some(member => member.id === uid)
        );
      };

      const getMember = (guild, id) => {
        return guild.members.find(member => member.id === id);
      };

      const getGuildByName = name => {
        const wanted = name.toLowerCase();

        return Object.values(guildData.guilds).find(
          guild => guild.name.toLowerCase() === wanted
        );
      };

      // CRÉER UNE GUILDE
      if (sub === "create" || sub === "creer" || sub === "créer") {
        const guildName = args.slice(2).join(" ").trim();

        if (!guildName) {
          return message.reply(
            `Utilisation : ${prefix}gang guild create <nom>`
          );
        }

        if (guildName.length < 3 || guildName.length > 25) {
          return message.reply(
            "❌ Le nom doit contenir entre 3 et 25 caractères."
          );
        }

        if (findMyGuild()) {
          return message.reply(
            "❌ Tu appartiens déjà à une guilde."
          );
        }

        if (getGuildByName(guildName)) {
          return message.reply(
            "❌ Ce nom de guilde est déjà utilisé."
          );
        }

        if (g.cash < 2000) {
          return message.reply(
            `❌ Créer une guilde coûte 2000 ${COIN}.\n` +
            `Ton argent : ${g.cash} ${COIN}`
          );
        }

        const id = `DC${Date.now()}${random(100, 999)}`;

        guildData.guilds[id] = {
          id,
          name: guildName,
          leader: uid,
          deputy: null,
          members: [
            {
              id: uid,
              role: "leader",
              joinedAt: Date.now()
            }
          ],
          level: 1,
          exp: 0,
          reputation: 0,
          createdAt: Date.now()
        };

        g.cash -= 2000;

        saveGuildData(guildData);
        await save();

        return message.reply(
          `𓆩 🔱 GUILDE CRÉÉE 🔱 𓆪\n\n` +
          `🏴 Nom : ${guildName}\n` +
          `👑 Chef : ${await getName(uid)}\n` +
          `👥 Membres : 1\n` +
          `⭐ Niveau : 1\n` +
          `💸 Coût : 2000 ${COIN}\n\n` +
          `Ta guilde est maintenant créée !`
        );
      }

      // REJOINDRE UNE GUILDE
      if (sub === "join" || sub === "rejoindre") {
        const guildName = args.slice(2).join(" ").trim();

        if (!guildName) {
          return message.reply(
            `Utilisation : ${prefix}gang guild join <nom>`
          );
        }

        if (findMyGuild()) {
          return message.reply(
            "❌ Tu appartiens déjà à une guilde. Quitte-la avant d'en rejoindre une autre."
          );
        }

        const guild = getGuildByName(guildName);

        if (!guild) {
          return message.reply("❌ Cette guilde n'existe pas.");
        }

        if (guild.members.length >= 30) {
          return message.reply("❌ Cette guilde est complète.");
        }

        if (!guildData.invites[uid]?.includes(guild.id)) {
          return message.reply(
            "❌ Tu n'as pas reçu d'invitation de cette guilde."
          );
        }

        guild.members.push({
          id: uid,
          role: "member",
          joinedAt: Date.now()
        });

        guildData.invites[uid] =
          guildData.invites[uid].filter(id => id !== guild.id);

        saveGuildData(guildData);

        return message.reply(
          `𓆩 🏴 BIENVENUE DANS LA GUILDE 🏴 𓆪\n\n` +
          `Tu as rejoint : ${guild.name}\n` +
          `👥 Membres : ${guild.members.length}/30`
        );
      }

      // QUITTER UNE GUILDE
      if (sub === "leave" || sub === "quitter") {
        const guild = findMyGuild();

        if (!guild) {
          return message.reply("❌ Tu ne fais partie d'aucune guilde.");
        }

        if (guild.leader === uid) {
          return message.reply(
            "❌ Le chef ne peut pas quitter sa guilde. Transfère d'abord le leadership ou dissous la guilde."
          );
        }

        guild.members = guild.members.filter(member => member.id !== uid);

        if (guild.deputy === uid) {
          guild.deputy = null;
        }

        saveGuildData(guildData);

        return message.reply(
          `Tu as quitté la guilde ${guild.name}.`
        );
      }

      // INFORMATIONS DE LA GUILDE
      if (sub === "info" || sub === "infos") {
        const guild = findMyGuild();

        if (!guild) {
          return message.reply("❌ Tu ne fais partie d'aucune guilde.");
        }

        return message.reply(
          `𓆩 🏴 ${guild.name.toUpperCase()} 🏴 𓆪\n\n` +
          `👑 Chef : ${await getName(guild.leader)}\n` +
          `🔱 Sous-chef : ${
            guild.deputy
              ? await getName(guild.deputy)
              : "Aucun"
          }\n` +
          `👥 Membres : ${guild.members.length}/30\n` +
          `⭐ Niveau : ${guild.level}\n` +
          `🔥 EXP de guilde : ${guild.exp}\n` +
          `🏆 Réputation : ${guild.reputation}\n\n` +
          `📅 Création : ${new Date(guild.createdAt).toLocaleDateString("fr-FR")}`
        );
      }

      // LISTE DES MEMBRES
      if (sub === "members" || sub === "membres") {
        const guild = findMyGuild();

        if (!guild) {
          return message.reply("❌ Tu ne fais partie d'aucune guilde.");
        }

        let text = `𓆩 👥 MEMBRES DE ${guild.name.toUpperCase()} 👥 𓆪\n\n`;

        for (let i = 0; i < guild.members.length; i++) {
          const member = guild.members[i];

          let role = "Membre";

          if (member.id === guild.leader) role = "👑 Chef";
          else if (member.id === guild.deputy) role = "🔱 Sous-chef";

          text += `${i + 1}. ${await getName(member.id)}\n`;
          text += `   ${role}\n\n`;
        }

        return message.reply(text);
      }

      // INVITER UN JOUEUR
      if (sub === "invite" || sub === "inviter") {
        const guild = findMyGuild();
        const targetID = getTarget();

        if (!guild) {
          return message.reply("❌ Tu ne fais partie d'aucune guilde.");
        }

        const member = getMember(guild, uid);

        if (
          guild.leader !== uid &&
          guild.deputy !== uid
        ) {
          return message.reply(
            "❌ Seuls le chef et le sous-chef peuvent inviter."
          );
        }

        if (!targetID) {
          return message.reply(
            `Réponds au message du joueur ou mentionne-le.\n` +
            `Exemple : ${prefix}gang guild invite @joueur`
          );
        }

        if (getMember(guild, targetID)) {
          return message.reply("Ce joueur est déjà dans ta guilde.");
        }

        if (guild.members.length >= 30) {
          return message.reply("❌ Ta guilde est complète.");
        }

        const targetUser = await usersData.get(targetID);

        if (!targetUser) {
          return message.reply("❌ Joueur introuvable.");
        }

        const targetGang = getGangData(targetUser);

        const targetGuild = Object.values(guildData.guilds).find(item =>
          item.members.some(m => m.id === targetID)
        );

        if (targetGuild) {
          return message.reply("Ce joueur appartient déjà à une guilde.");
        }

        guildData.invites[targetID] ||= [];

        if (!guildData.invites[targetID].includes(guild.id)) {
          guildData.invites[targetID].push(guild.id);
        }

        saveGuildData(guildData);

        return message.reply(
          `✉️ Invitation envoyée à ${await getName(targetID)}.\n\n` +
          `Il doit utiliser :\n` +
          `${prefix}gang guild join ${guild.name}`
        );
      }

      // EXPULSER UN MEMBRE
      if (sub === "kick" || sub === "expulser") {
        const guild = findMyGuild();
        const targetID = getTarget();

        if (!guild) {
          return message.reply("❌ Tu ne fais partie d'aucune guilde.");
        }

        if (guild.leader !== uid && guild.deputy !== uid) {
          return message.reply(
            "❌ Seuls le chef et le sous-chef peuvent expulser."
          );
        }

        if (!targetID) {
          return message.reply(
            `Réponds au joueur à expulser ou mentionne-le.`
          );
        }

        if (targetID === guild.leader) {
          return message.reply("❌ Impossible d'expulser le chef.");
        }

        if (guild.deputy === uid && targetID === guild.deputy) {
          return message.reply("❌ Action impossible.");
        }

        const targetMember = getMember(guild, targetID);

        if (!targetMember) {
          return message.reply("Ce joueur ne fait pas partie de ta guilde.");
        }

        guild.members = guild.members.filter(m => m.id !== targetID);

        if (guild.deputy === targetID) {
          guild.deputy = null;
        }

        saveGuildData(guildData);

        return message.reply(
          `🚪 ${await getName(targetID)} a été expulsé de ${guild.name}.`
        );
      }

      // NOMMER UN SOUS-CHEF
      if (sub === "promote" || sub === "promouvoir") {
        const guild = findMyGuild();
        const targetID = getTarget();

        if (!guild) {
          return message.reply("❌ Tu ne fais partie d'aucune guilde.");
        }

        if (guild.leader !== uid) {
          return message.reply(
            "❌ Seul le chef peut nommer un sous-chef."
          );
        }

        if (!targetID) {
          return message.reply(
            "Réponds au joueur ou mentionne-le."
          );
        }

        if (targetID === uid) {
          return message.reply("Tu es déjà le chef.");
        }

        if (!getMember(guild, targetID)) {
          return message.reply(
            "Ce joueur ne fait pas partie de ta guilde."
          );
        }

        guild.deputy = targetID;
        saveGuildData(guildData);

        return message.reply(
          `🔱 ${await getName(targetID)} est maintenant le sous-chef de ${guild.name} !`
        );
      }

      // TRANSFÉRER LE LEADERSHIP
      if (sub === "transfer" || sub === "transfert") {
        const guild = findMyGuild();
        const targetID = getTarget();

        if (!guild) {
          return message.reply("❌ Tu ne fais partie d'aucune guilde.");
        }

        if (guild.leader !== uid) {
          return message.reply(
            "❌ Seul le chef actuel peut transférer le leadership."
          );
        }

        if (!targetID) {
          return message.reply(
            "Réponds au joueur qui doit devenir chef ou mentionne-le."
          );
        }

        if (!getMember(guild, targetID)) {
          return message.reply(
            "Ce joueur ne fait pas partie de ta guilde."
          );
        }

        guild.leader = targetID;
        guild.deputy = uid;

        for (const member of guild.members) {
          if (member.id === targetID) member.role = "leader";
          else if (member.id === uid) member.role = "deputy";
          else member.role = "member";
        }

        saveGuildData(guildData);

        return message.reply(
          `👑 ${await getName(targetID)} est le nouveau chef de ${guild.name} !\n` +
          `🔱 Tu deviens son sous-chef.`
        );
      }

      // DISSoudre LA GUILDE
      if (sub === "delete" || sub === "dissoudre") {
        const guild = findMyGuild();

        if (!guild) {
          return message.reply("❌ Tu ne fais partie d'aucune guilde.");
        }

        if (guild.leader !== uid) {
          return message.reply("❌ Seul le chef peut dissoudre la guilde.");
        }

        delete guildData.guilds[guild.id];

        for (const [memberID, invitations] of Object.entries(guildData.invites)) {
          guildData.invites[memberID] = invitations.filter(id => id !== guild.id);
        }

        saveGuildData(guildData);

        return message.reply(
          `💀 La guilde ${guild.name} a été dissoute par son chef.`
        );
      }

      // CLASSEMENT DES GUILDES
      if (sub === "top" || sub === "ranking") {
        const guilds = Object.values(guildData.guilds)
          .sort((a, b) => b.reputation - a.reputation)
          .slice(0, 10);

        if (!guilds.length) {
          return message.reply("Aucune guilde n'a encore été créée.");
        }

        let text = "𓆩 🏆 TOP GUILDES DARK CITY 🏆 𓆪\n\n";

        for (let i = 0; i < guilds.length; i++) {
          const guild = guilds[i];

          text +=
            `${i + 1}. 🏴 ${guild.name}\n` +
            `   👑 Chef : ${await getName(guild.leader)}\n` +
            `   👥 Membres : ${guild.members.length}\n` +
            `   🔥 Réputation : ${guild.reputation}\n\n`;
        }

        return message.reply(text);
      }

      // AIDE GUILDE
      return message.reply(
        `𓆩 🏴 DARK CITY GUILDS 🏴 𓆪\n\n` +
        `Création :\n` +
        `${prefix}gang guild create <nom>\n\n` +
        `Rejoindre :\n` +
        `${prefix}gang guild join <nom>\n\n` +
        `Quitter :\n` +
        `${prefix}gang guild leave\n\n` +
        `Informations :\n` +
        `${prefix}gang guild info\n\n` +
        `Membres :\n` +
        `${prefix}gang guild members\n\n` +
        `Inviter :\n` +
        `${prefix}gang guild invite @joueur\n\n` +
        `Expulser :\n` +
        `${prefix}gang guild kick @joueur\n\n` +
        `Nommer un sous-chef :\n` +
        `${prefix}gang guild promote @joueur\n\n` +
        `Transférer le leadership :\n` +
        `${prefix}gang guild transfer @joueur\n\n` +
        `Dissoudre :\n` +
        `${prefix}gang guild delete\n\n` +
        `Classement :\n` +
        `${prefix}gang guild top`
      );
    }

    // MENU PRINCIPAL
    return message.reply(
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `𓆩 🦇 𝐃𝐀𝐑𝐊 𝐂𝐈𝐓𝐘 𝟑.𝟎 🦇 𓆪\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +

      `👤 PROFIL\n` +
      `┊ ${prefix}gang profile\n\n` +

      `💰 ARGENT\n` +
      `┊ ${prefix}gang work\n` +
      `┊ ${prefix}gang daily\n` +
      `┊ ${prefix}gang rob @joueur\n\n` +

      `⚔️ COMBAT\n` +
      `┊ ${prefix}gang attack @joueur\n` +
      `┊ ${prefix}gang heal\n\n` +

      `🎯 MISSIONS\n` +
      `┊ ${prefix}gang mission\n\n` +

      `🛒 BOUTIQUE\n` +
      `┊ ${prefix}gang shop\n` +
      `┊ ${prefix}gang buy <ID>\n` +
      `┊ ${prefix}gang inventory\n\n` +

      `🏴 GUILDES\n` +
      `┊ ${prefix}gang guild\n` +
      `┊ ${prefix}gang guild create <nom>\n` +
      `┊ ${prefix}gang guild info\n` +
      `┊ ${prefix}gang guild members\n` +
      `┊ ${prefix}gang guild top\n\n` +

      `🏆 CLASSEMENT\n` +
      `┊ ${prefix}gang top\n\n` +

      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 Argent : ${g.cash} ${COIN}\n` +
      `⭐ EXP : ${g.exp}\n` +
      `👑 Grade : ${getRank(g.exp).name}\n` +
      `❤️ Santé : ${g.health}/100\n` +
      `⚡ Énergie : ${g.energy}/10\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `𓆩 DARK CITY GANG 𓆪`
    );
  }
};
