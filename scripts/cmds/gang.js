const Canvas = require("canvas");
const fs = require("fs-extra");
const path = require("path");

const COIN = "₩";
const DATA_DIR = path.join(__dirname, "cache", "darkcity");
const GUILD_FILE = path.join(DATA_DIR, "guilds.json");

fs.ensureDirSync(DATA_DIR);

if (!fs.existsSync(GUILD_FILE)) {
  fs.writeJsonSync(GUILD_FILE, {}, { spaces: 2 });
}

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
    attack: 5,
    defense: 0,
    type: "weapon",
    emoji: "🔪"
  },
  pistol: {
    name: "Pistolet",
    price: 1500,
    attack: 15,
    defense: 0,
    type: "weapon",
    emoji: "🔫"
  },
  rifle: {
    name: "Fusil",
    price: 5000,
    attack: 35,
    defense: 0,
    type: "weapon",
    emoji: "🔫"
  },
  shotgun: {
    name: "Fusil à pompe",
    price: 8500,
    attack: 55,
    defense: 0,
    type: "weapon",
    emoji: "💥"
  },
  armor: {
    name: "Gilet pare-balles",
    price: 1000,
    attack: 0,
    defense: 10,
    type: "armor",
    emoji: "🦺"
  },
  vest: {
    name: "Armure renforcée",
    price: 2500,
    attack: 0,
    defense: 25,
    type: "armor",
    emoji: "🛡️"
  },
  military: {
    name: "Armure militaire",
    price: 6000,
    attack: 0,
    defense: 50,
    type: "armor",
    emoji: "🪖"
  }
};

const CONFIG = {
  startingCash: "1000",
  startingHealth: 100,
  startingEnergy: 100,
  workMin: 100,
  workMax: 500,
  dailyReward: 1500,
  attackCooldown: 60 * 60 * 1000,
  workCooldown: 30 * 60 * 1000,
  robCooldown: 60 * 60 * 1000,
  dailyCooldown: 24 * 60 * 60 * 1000,
  guildCost: 2000,
  guildMaxMembers: 30
};

// ==========================================
// OUTILS GÉNÉRAUX
// ==========================================

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min ${s}s`;
  return `${s}s`;
}

function formatMoney(value) {
  try {
    return BigInt(String(value || 0)).toLocaleString("fr-FR");
  } catch {
    return "0";
  }
}

function toBigInt(value) {
  try {
    return BigInt(String(value || 0).replace(/[^\d-]/g, "")) || 0n;
  } catch {
    return 0n;
  }
}

function addMoney(g, amount) {
  g.cash = (toBigInt(g.cash) + toBigInt(amount)).toString();
}

function removeMoney(g, amount) {
  const current = toBigInt(g.cash);
  const cost = toBigInt(amount);

  if (current < cost) return false;

  g.cash = (current - cost).toString();
  return true;
}

function hasMoney(g, amount) {
  return toBigInt(g.cash) >= toBigInt(amount);
}

function getRank(exp) {
  let rank = RANKS[0];

  for (const r of RANKS) {
    if (Number(exp || 0) >= r.exp) rank = r;
  }

  return rank;
}

function getNextRank(exp) {
  return RANKS.find(r => Number(exp || 0) < r.exp) || null;
}

function getGang(user) {
  if (!user || typeof user !== "object") user = {};

  const g = {
    cash: String(user.cash ?? CONFIG.startingCash),
    exp: Number(user.exp ?? 0),
    level: Number(user.level ?? 1),
    health: Number(user.health ?? CONFIG.startingHealth),
    energy: Number(user.energy ?? CONFIG.startingEnergy),
    reputation: Number(user.reputation ?? 0),
    weapon: user.weapon ?? null,
    armor: user.armor ?? null,
    inventory: Array.isArray(user.inventory) ? user.inventory : [],
    lastWork: Number(user.lastWork ?? 0),
    lastRob: Number(user.lastRob ?? 0),
    lastAttack: Number(user.lastAttack ?? 0),
    lastDaily: Number(user.lastDaily ?? 0),
    lastMission: Number(user.lastMission ?? 0),
    lastHeal: Number(user.lastHeal ?? 0),
    guild: user.guild ?? null
  };

  // Récupération progressive de l'énergie.
  const now = Date.now();
  const lastEnergy = Number(user.lastEnergy ?? now);
  const recovered = Math.floor((now - lastEnergy) / 60000);

  if (recovered > 0) {
    g.energy = Math.min(100, g.energy + recovered);
  }

  g.lastEnergy = now;

  // La santé ne doit jamais dépasser 100.
  g.health = Math.max(0, Math.min(100, g.health));
  g.energy = Math.max(0, Math.min(100, g.energy));

  return g;
}

async function getPlayerData(usersData, uid) {
  let data = await usersData.get(uid);

  if (!data || typeof data !== "object") {
    data = {
      money: 0,
      exp: 0,
      data: {}
    };
  }

  if (!data.data || typeof data.data !== "object") {
    data.data = {};
  }

  return data;
}

async function saveGang(usersData, uid, g) {
  const userData = await getPlayerData(usersData, uid);

  userData.data.darkcity = {
    ...g,
    cash: String(g.cash),
    lastEnergy: Date.now()
  };

  await usersData.set(uid, userData);
}

async function loadGang(usersData, uid) {
  const userData = await getPlayerData(usersData, uid);
  return getGang(userData.data.darkcity || {});
}

async function getName(api, uid) {
  try {
    const info = await api.getUserInfo(uid);
    const user = info?.[uid] || info;

    return (
      user?.name ||
      user?.firstName ||
      user?.fullName ||
      "Joueur"
    );
  } catch {
    return "Joueur";
  }
}

async function getAvatar(api, uid) {
  try {
    const info = await api.getUserInfo(uid);
    const user = info?.[uid] || info;

    return (
      user?.largePictureUrl ||
      user?.profilePictureUrl ||
      user?.avatarUrl ||
      user?.thumbSrc ||
      user?.picture ||
      null
    );
  } catch {
    return null;
  }
}

async function getMentionedUser(api, event) {
  const mentions = event.mentions || {};
  const ids = Object.keys(mentions);

  if (ids.length > 0) return ids[0];

  const reply = event.messageReply;

  if (reply?.senderID) return reply.senderID;

  return null;
}

// ==========================================
// OUTILS GRAPHIQUES
// ==========================================

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
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawBackground(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#050807");
  gradient.addColorStop(0.5, "#101a15");
  gradient.addColorStop(1, "#020403");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Lignes décoratives.
  ctx.strokeStyle = "rgba(0,255,120,0.08)";
  ctx.lineWidth = 1;

  for (let i = 0; i < width; i += 35) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, height);
    ctx.stroke();
  }

  for (let i = 0; i < height; i += 35) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(width, i);
    ctx.stroke();
  }
}

function drawTitle(ctx, title, width, y = 55) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.shadowColor = "#00ff80";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#aaffcc";
  ctx.font = "bold  thirtypx Arial".replace("thirty", "30");
  ctx.fillText(title, width / 2, y);
  ctx.restore();
}

function drawText(ctx, text, x, y, size = 20, color = "#ffffff", align = "left") {
  ctx.save();
  ctx.font = `bold ${size}px Arial`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(String(text), x, y);
  ctx.restore();
}

async function loadAvatarImage(api, uid) {
  try {
    const url = await getAvatar(api, uid);
    if (!url) return null;

    return await Canvas.loadImage(url);
  } catch {
    return null;
  }
}

function drawAvatar(ctx, avatar, x, y, size) {
  ctx.save();

  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2 + 5, 0, Math.PI * 2);
  ctx.fillStyle = "#00ff80";
  ctx.shadowColor = "#00ff80";
  ctx.shadowBlur = 18;
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();

  if (avatar) {
    ctx.drawImage(avatar, x, y, size, size);
  } else {
    ctx.fillStyle = "#17251d";
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = "#aaffcc";
    ctx.font = `bold ${Math.floor(size * 0.45)}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("?", x + size / 2, y + size * 0.65);
  }

  ctx.restore();
}

function drawPanel(ctx, x, y, width, height) {
  roundedRect(
    ctx,
    x,
    y,
    width,
    height,
    18,
    "rgba(5,15,10,0.92)",
    "#00a85a"
  );
}

function drawFooter(ctx, width, height) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 15px Arial";
  ctx.fillStyle = "#4b946d";
  ctx.fillText("DARK CITY  •  UNDERWORLD SYSTEM", width / 2, height - 20);
  ctx.restore();
    }
// ==========================================
// CARTE DU PROFIL
// ==========================================

async function makeGangProfile(g, name, uid, api) {
  const width = 850;
  const height = 570;
  const canvas = Canvas.createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  drawBackground(ctx, width, height);
  drawTitle(ctx, "𓆩 DARK CITY 𓆪", width, 55);

  const avatar = await loadAvatarImage(api, uid);
  drawAvatar(ctx, avatar, 55, 105, 190);

  const rank = getRank(g.exp);
  const nextRank = getNextRank(g.exp);

  drawText(ctx, name, 285, 145, 34, "#aaffcc");
  drawText(ctx, rank.name, 285, 185, 23, "#00ff80");
  drawText(ctx, `Niveau ${g.level}`, 285, 220, 18, "#ffffff");

  drawPanel(ctx, 40, 325, 770, 185);

  const items = [
    [`💰 Argent`, `${formatMoney(g.cash)} ${COIN}`],
    [`⭐ Expérience`, `${g.exp} EXP`],
    [`❤️ Santé`, `${g.health}/100`],
    [`⚡ Énergie`, `${g.energy}/100`],
    [`🔥 Réputation`, `${g.reputation}`],
    [`🔫 Arme`, g.weapon ? SHOP[g.weapon]?.name || g.weapon : "Aucune"],
    [`🛡️ Armure`, g.armor ? SHOP[g.armor]?.name || g.armor : "Aucune"]
  ];

  items.forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);

    drawText(
      ctx,
      `${item[0]} : ${item[1]}`,
      70 + col * 380,
      365 + row * 42,
      19,
      "#ffffff"
    );
  });

  if (nextRank) {
    drawText(
      ctx,
      `Prochain grade : ${nextRank.name} (${nextRank.exp} EXP)`,
      width / 2,
      535,
      16,
      "#7cffb2",
      "center"
    );
  } else {
    drawText(
      ctx,
      "GRADE MAXIMUM ATTEINT",
      width / 2,
      535,
      17,
      "#7cffb2",
      "center"
    );
  }

  drawFooter(ctx, width, height);
  return canvas.toBuffer("image/png");
}

// ==========================================
// ILLUSTRATIONS DE LA BOUTIQUE
// ==========================================

function drawWeaponIllustration(ctx, item, x, y, size) {
  ctx.save();

  ctx.shadowColor = "#00ff80";
  ctx.shadowBlur = 15;
  ctx.strokeStyle = "#9dffc4";
  ctx.fillStyle = "#243d2d";
  ctx.lineWidth = 5;

  if (item.type === "weapon") {
    if (item.name.toLowerCase().includes("couteau")) {
      // Lame.
      ctx.beginPath();
      ctx.moveTo(x + size * 0.15, y + size * 0.75);
      ctx.lineTo(x + size * 0.75, y + size * 0.15);
      ctx.lineTo(x + size * 0.65, y + size * 0.65);
      ctx.lineTo(x + size * 0.15, y + size * 0.75);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x + size * 0.12, y + size * 0.78);
      ctx.lineTo(x + size * 0.32, y + size * 0.98);
      ctx.stroke();
    } else {
      // Arme stylisée.
      ctx.fillRect(
        x + size * 0.15,
        y + size * 0.38,
        size * 0.65,
        size * 0.18
      );

      ctx.strokeRect(
        x + size * 0.15,
        y + size * 0.38,
        size * 0.65,
        size * 0.18
      );

      ctx.fillRect(
        x + size * 0.42,
        y + size * 0.54,
        size * 0.18,
        size * 0.28
      );

      ctx.strokeRect(
        x + size * 0.42,
        y + size * 0.54,
        size * 0.18,
        size * 0.28
      );

      ctx.fillRect(
        x + size * 0.76,
        y + size * 0.42,
        size * 0.17,
        size * 0.10
      );
    }
  } else {
    // Armure stylisée.
    ctx.beginPath();
    ctx.moveTo(x + size * 0.25, y + size * 0.18);
    ctx.lineTo(x + size * 0.50, y + size * 0.08);
    ctx.lineTo(x + size * 0.75, y + size * 0.18);
    ctx.lineTo(x + size * 0.88, y + size * 0.45);
    ctx.lineTo(x + size * 0.70, y + size * 0.85);
    ctx.lineTo(x + size * 0.50, y + size * 0.98);
    ctx.lineTo(x + size * 0.30, y + size * 0.85);
    ctx.lineTo(x + size * 0.12, y + size * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + size * 0.50, y + size * 0.15);
    ctx.lineTo(x + size * 0.50, y + size * 0.88);
    ctx.stroke();
  }

  ctx.restore();
}

async function makeShopCard() {
  const width = 1000;
  const cardHeight = 290;
  const columns = 3;
  const rows = Math.ceil(Object.keys(SHOP).length / columns);
  const height = 150 + rows * cardHeight + 50;

  const canvas = Canvas.createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  drawBackground(ctx, width, height);
  drawTitle(ctx, "𓆩 DARK CITY SHOP 𓆪", width, 65);

  const products = Object.entries(SHOP);

  products.forEach(([id, item], index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);

    const x = 35 + col * 315;
    const y = 110 + row * cardHeight;

    drawPanel(ctx, x, y, 290, 260);

    // Illustration au-dessus du nom.
    drawWeaponIllustration(ctx, item, x + 95, y + 12, 100);

    drawText(
      ctx,
      item.name,
      x + 145,
      y + 145,
      21,
      "#aaffcc",
      "center"
    );

    drawText(
      ctx,
      `${formatMoney(item.price)} ${COIN}`,
      x + 145,
      y + 185,
      19,
      "#ffffff",
      "center"
    );

    if (item.type === "weapon") {
      drawText(
        ctx,
        `⚔️ Attaque : +${item.attack}`,
        x + 145,
        y + 220,
        17,
        "#7cffb2",
        "center"
      );
    } else {
      drawText(
        ctx,
        `🛡️ Défense : +${item.defense}`,
        x + 145,
        y + 220,
        17,
        "#7cffb2",
        "center"
      );
    }

    drawText(
      ctx,
      `ID : ${id}`,
      x + 145,
      y + 245,
      14,
      "#6caa85",
      "center"
    );
  });

  drawFooter(ctx, width, height);
  return canvas.toBuffer("image/png");
}

// ==========================================
// CARTE DE COMBAT
// ==========================================

async function makeBattleCard(data) {
  const width = 950;
  const height = 520;
  const canvas = Canvas.createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  drawBackground(ctx, width, height);
  drawTitle(ctx, "𓆩 DARK CITY BATTLE 𓆪", width, 60);

  const attackerAvatar = await loadAvatarImage(
    data.api,
    data.attackerID
  );

  const defenderAvatar = await loadAvatarImage(
    data.api,
    data.defenderID
  );

  drawPanel(ctx, 35, 105, 420, 315);
  drawPanel(ctx, 495, 105, 420, 315);

  drawAvatar(ctx, attackerAvatar, 165, 135, 150);
  drawAvatar(ctx, defenderAvatar, 625, 135, 150);

  drawText(
    ctx,
    data.attackerName,
    245,
    320,
    23,
    "#aaffcc",
    "center"
  );

  drawText(
    ctx,
    data.defenderName,
    705,
    320,
    23,
    "#aaffcc",
    "center"
  );

  drawText(
    ctx,
    "ATTAQUANT",
    245,
    355,
    16,
    "#7cffb2",
    "center"
  );

  drawText(
    ctx,
    "DÉFENSEUR",
    705,
    355,
    16,
    "#7cffb2",
    "center"
  );

  drawText(
    ctx,
    `-${data.damage} HP`,
    705,
    395,
    25,
    "#ff6262",
    "center"
  );

  drawText(
    ctx,
    "VS",
    width / 2,
    270,
    38,
    "#00ff80",
    "center"
  );

  drawPanel(ctx, 150, 440, 650, 45);

  drawText(
    ctx,
    data.result,
    width / 2,
    470,
    19,
    "#aaffcc",
    "center"
  );

  drawFooter(ctx, width, height);
  return canvas.toBuffer("image/png");
}

// ==========================================
// CARTE DE GUILDE
// ==========================================

async function makeGuildCard(guild, creatorName, title = "GUILDE CRÉÉE") {
  const width = 850;
  const height = 520;
  const canvas = Canvas.createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  drawBackground(ctx, width, height);
  drawTitle(ctx, `𓆩 🔱 ${title} 🔱 𓆪`, width, 65);

  drawPanel(ctx, 55, 105, 740, 330);

  drawText(
    ctx,
    guild.name,
    width / 2,
    175,
    34,
    "#aaffcc",
    "center"
  );

  drawText(
    ctx,
    `👑 Chef : ${creatorName}`,
    110,
    240,
    23,
    "#ffffff"
  );

  drawText(
    ctx,
    `👥 Membres : ${(guild.members || []).length}/${CONFIG.guildMaxMembers}`,
    110,
    290,
    23,
    "#ffffff"
  );

  drawText(
    ctx,
    `⭐ Niveau : ${guild.level || 1}`,
    110,
    340,
    23,
    "#ffffff"
  );

  drawText(
    ctx,
    `💰 Trésorerie : ${formatMoney(guild.bank || 0)} ${COIN}`,
    110,
    390,
    21,
    "#ffffff"
  );

  drawText(
    ctx,
    "DARK CITY UNDERWORLD",
    width / 2,
    470,
    18,
    "#00ff80",
    "center"
  );

  drawFooter(ctx, width, height);
  return canvas.toBuffer("image/png");
}

// ==========================================
// CARTE DE CLASSEMENT
// ==========================================

async function makeGangRanking(players, currentID) {
  const width = 900;
  const displayed = players.slice(0, 10);
  const height = 180 + displayed.length * 55 + 60;

  const canvas = Canvas.createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  drawBackground(ctx, width, height);
  drawTitle(ctx, "𓆩 DARK CITY TOP 10 𓆪", width, 65);

  displayed.forEach((player, index) => {
    const y = 110 + index * 55;
    const isCurrent = String(player.id) === String(currentID);

    roundedRect(
      ctx,
      45,
      y,
      810,
      45,
      12,
      isCurrent ? "rgba(0,255,128,0.20)" : "rgba(5,20,12,0.90)",
      isCurrent ? "#00ff80" : "#246b45"
    );

    const medals = ["🥇", "🥈", "🥉"];
    const position = medals[index] || `#${index + 1}`;

    drawText(ctx, position, 70, y + 29, 19, "#aaffcc");
    drawText(ctx, player.name, 160, y + 29, 19, "#ffffff");

    drawText(
      ctx,
      `${player.exp} EXP`,
      810,
      y + 29,
      18,
      "#7cffb2",
      "right"
    );
  });

  drawFooter(ctx, width, height);
  return canvas.toBuffer("image/png");
}

// ==========================================
// OUTIL D'ENVOI D'IMAGE
// ==========================================

async function sendImage(api, event, buffer, filename, body = "") {
  const filePath = path.join(DATA_DIR, filename);

  await fs.writeFile(filePath, buffer);

  return api.sendMessage(
    {
      body,
      attachment: fs.createReadStream(filePath)
    },
    event.threadID,
    () => {
      fs.remove(filePath).catch(() => {});
    },
    event.messageID
  );
        }// ==========================================
// GESTION DES GUILDES
// ==========================================

function loadGuilds() {
  try {
    return fs.readJsonSync(GUILD_FILE);
  } catch {
    return {};
  }
}

function saveGuilds(guilds) {
  fs.writeJsonSync(GUILD_FILE, guilds, { spaces: 2 });
}

function getGuildByMember(guilds, uid) {
  return Object.values(guilds).find(g =>
    (g.members || []).some(member => String(member) === String(uid))
  );
}

function makeGuildID(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20);
}

function isGuildLeader(guild, uid) {
  return String(guild.leader) === String(uid);
}

function isBotAdmin(uid) {
  const config = global.GoatBot?.config || {};
  const admins = [
    ...(Array.isArray(config.adminBot) ? config.adminBot : []),
    ...(Array.isArray(config.admin) ? config.admin : []),
    ...(Array.isArray(config.admins) ? config.admins : [])
  ];

  return admins.some(id => String(id) === String(uid));
}

function getPrefix() {
  const prefix = global.GoatBot?.config?.prefix;

  if (Array.isArray(prefix)) return prefix[0] || "/";
  return prefix || "/";
}

function getItemName(id) {
  return SHOP[id]?.name || "Aucun";
}

function addExp(g, amount) {
  const oldRank = getRank(g.exp);
  g.exp += Number(amount || 0);

  const newRank = getRank(g.exp);

  if (oldRank.name !== newRank.name) {
    return `\n🎖️ Nouveau grade : ${newRank.name} !`;
  }

  return "";
}

function cooldownMessage(lastTime, cooldown, label) {
  const remaining = cooldown - (Date.now() - lastTime);

  if (remaining > 0) {
    return `⏳ Tu dois attendre ${formatTime(remaining)} avant de ${label} à nouveau.`;
  }

  return null;
}

// ==========================================
// COMMANDE PRINCIPALE
// ==========================================

module.exports = {
  config: {
    name: "gang",
    aliases: ["gangster", "darkcity"],
    version: "4.2.0",
    author: "KENNY BLACKWOOD",
    countDown: 3,
    role: 0,
    shortDescription: "Système RPG DARK CITY",
    longDescription: "Jeu de gangster avec argent, combats, guildes et classement.",
    category: "game",
    guide: "{pn} profile | shop | work | daily | rob | attack | heal | mission | buy | inventory | top | guild | adminmoney"
  },

  onStart: async function ({ api, event, args, usersData, message }) {
    try {
      const uid = String(event.senderID);
      const command = String(args[0] || "profile").toLowerCase();
      const sub = String(args[1] || "").toLowerCase();
      const amountArg = args[1];

      let g = await loadGang(usersData, uid);
      const name = await getName(api, uid);

      // ======================================
      // PROFIL
      // ======================================

      if (["profile", "profil", "me", "stats"].includes(command)) {
        const image = await makeGangProfile(g, name, uid, api);

        return sendImage(
          api,
          event,
          image,
          `profile_${uid}.png`,
          `𓆩 🦇 DARK CITY PROFILE 🦇 𓆪\n👤 ${name}\n🎖️ ${getRank(g.exp).name}`
        );
      }

      // ======================================
      // BOUTIQUE
      // ======================================

      if (["shop", "boutique"].includes(command)) {
        const image = await makeShopCard();

        return sendImage(
          api,
          event,
          image,
          `shop_${uid}.png`,
          `𓆩 🛒 DARK CITY SHOP 𓆪\n\nPour acheter : ${getPrefix()}gang buy ID\nExemple : ${getPrefix()}gang buy pistol`
        );
      }

      // ======================================
      // TRAVAIL
      // ======================================

      if (["work", "travail"].includes(command)) {
        const cooldown = cooldownMessage(
          g.lastWork,
          CONFIG.workCooldown,
          "travailler"
        );

        if (cooldown) return message.reply(cooldown);

        if (g.energy < 10) {
          return message.reply("⚡ Tu n'as pas assez d'énergie. Attends un peu.");
        }

        const earned = random(CONFIG.workMin, CONFIG.workMax);

        addMoney(g, earned);
        g.energy -= 10;
        g.lastWork = Date.now();

        const bonus = addExp(g, 15);

        await saveGang(usersData, uid, g);

        return message.reply(
          `𓆩 💼 TRAVAIL TERMINÉ 𓆪\n\n` +
          `💰 Gain : +${formatMoney(earned)} ${COIN}\n` +
          `⭐ EXP : +15\n` +
          `⚡ Énergie : ${g.energy}/100\n` +
          `💵 Solde : ${formatMoney(g.cash)} ${COIN}` +
          bonus
        );
      }

      // ======================================
      // RÉCOMPENSE QUOTIDIENNE
      // ======================================

      if (["daily", "quotidien"].includes(command)) {
        const cooldown = cooldownMessage(
          g.lastDaily,
          CONFIG.dailyCooldown,
          "récupérer ta récompense"
        );

        if (cooldown) return message.reply(cooldown);

        addMoney(g, CONFIG.dailyReward);
        g.lastDaily = Date.now();

        const bonus = addExp(g, 25);

        await saveGang(usersData, uid, g);

        return message.reply(
          `𓆩 🎁 RÉCOMPENSE QUOTIDIENNE 𓆪\n\n` +
          `💰 Récompense : +${formatMoney(CONFIG.dailyReward)} ${COIN}\n` +
          `⭐ EXP : +25\n` +
          `💵 Solde : ${formatMoney(g.cash)} ${COIN}` +
          bonus
        );
      }

      // ======================================
      // SOINS
      // ======================================

      if (["heal", "soin", "soigner"].includes(command)) {
        if (g.health >= 100) {
          return message.reply("❤️ Ta santé est déjà au maximum.");
        }

        if (!removeMoney(g, 500)) {
          return message.reply("❌ Il te faut 500 ₩ pour te soigner.");
        }

        g.health = Math.min(100, g.health + 50);
        g.lastHeal = Date.now();

        await saveGang(usersData, uid, g);

        return message.reply(
          `𓆩 ❤️ SOINS TERMINÉS 𓆪\n\n` +
          `❤️ Santé : ${g.health}/100\n` +
          `💰 Coût : 500 ${COIN}\n` +
          `💵 Solde : ${formatMoney(g.cash)} ${COIN}`
        );
      }

      // ======================================
      // MISSION
      // ======================================

      if (["mission", "missions"].includes(command)) {
        const cooldown = cooldownMessage(
          g.lastMission,
          30 * 60 * 1000,
          "faire une mission"
        );

        if (cooldown) return message.reply(cooldown);

        if (g.energy < 20) {
          return message.reply("⚡ Il te faut au moins 20 points d'énergie.");
        }

        const missions = [
          {
            name: "Livraison clandestine",
            reward: 700,
            exp: 35
          },
          {
            name: "Récupération de dette",
            reward: 1000,
            exp: 45
          },
          {
            name: "Braquage discret",
            reward: 1500,
            exp: 60
          },
          {
            name: "Transport illégal",
            reward: 1200,
            exp: 50
          }
        ];

        const mission = missions[random(0, missions.length - 1)];

        addMoney(g, mission.reward);
        g.energy -= 20;
        g.lastMission = Date.now();

        const bonus = addExp(g, mission.exp);

        await saveGang(usersData, uid, g);

        return message.reply(
          `𓆩 🎯 MISSION TERMINÉE 🎯 𓆪\n\n` +
          `📌 Mission : ${mission.name}\n` +
          `💰 Gain : +${formatMoney(mission.reward)} ${COIN}\n` +
          `⭐ EXP : +${mission.exp}\n` +
          `⚡ Énergie : ${g.energy}/100\n` +
          `💵 Solde : ${formatMoney(g.cash)} ${COIN}` +
          bonus
        );
      }

      // ======================================
      // VOLER UN JOUEUR
      // ======================================

      if (["rob", "vol"].includes(command)) {
        const targetID = await getMentionedUser(api, event);

        if (!targetID) {
          return message.reply(
            `Mentionne un joueur.\nExemple : ${getPrefix()}gang rob @joueur`
          );
        }

        if (String(targetID) === uid) {
          return message.reply("❌ Tu ne peux pas te voler toi-même.");
        }

        const cooldown = cooldownMessage(
          g.lastRob,
          CONFIG.robCooldown,
          "voler"
        );

        if (cooldown) return message.reply(cooldown);

        const target = await loadGang(usersData, targetID);

        if (toBigInt(target.cash) < 100n) {
          return message.reply("❌ Ce joueur n'a presque plus d'argent.");
        }

        const stolen = random(50, 300);
        const actual = toBigInt(target.cash) < BigInt(stolen)
          ? toBigInt(target.cash)
          : BigInt(stolen);

        removeMoney(target, actual);
        addMoney(g, actual);

        g.lastRob = Date.now();

        await saveGang(usersData, uid, g);
        await saveGang(usersData, targetID, target);

        return message.reply(
          `𓆩 🥷 VOL RÉUSSI 𓆪\n\n` +
          `💰 Argent volé : ${formatMoney(actual)} ${COIN}\n` +
          `💵 Ton solde : ${formatMoney(g.cash)} ${COIN}`
        );
  }      // ======================================
      // ATTAQUER UN JOUEUR
      // ======================================

      if (["attack", "attaquer", "combat"].includes(command)) {
        const targetID = await getMentionedUser(api, event);

        if (!targetID) {
          return message.reply(
            `Mentionne un joueur.\nExemple : ${getPrefix()}gang attack @joueur`
          );
        }

        if (String(targetID) === uid) {
          return message.reply("❌ Tu ne peux pas t'attaquer toi-même.");
        }

        const cooldown = cooldownMessage(
          g.lastAttack,
          CONFIG.attackCooldown,
          "attaquer"
        );

        if (cooldown) return message.reply(cooldown);

        if (g.energy < 15) {
          return message.reply("⚡ Il te faut au moins 15 points d'énergie.");
        }

        const target = await loadGang(usersData, targetID);

        if (target.health <= 0) {
          return message.reply("❌ Ce joueur est déjà K.O.");
        }

        const attackerName = await getName(api, uid);
        const defenderName = await getName(api, targetID);

        const weapon = g.weapon ? SHOP[g.weapon] : null;
        const armor = target.armor ? SHOP[target.armor] : null;

        const attackPower = 10 + (weapon?.attack || 0);
        const defensePower = armor?.defense || 0;

        const rawDamage = random(
          Math.max(5, attackPower - 5),
          attackPower + 10
        );

        const damage = Math.max(
          1,
          rawDamage - Math.floor(defensePower / 2)
        );

        target.health = Math.max(0, target.health - damage);
        g.energy -= 15;
        g.lastAttack = Date.now();

        const bonus = addExp(g, 20);

        if (target.health <= 0) {
          const reward = random(100, 500);

          addMoney(g, reward);
          g.reputation += 10;
          target.reputation = Math.max(0, target.reputation - 5);

          await saveGang(usersData, targetID, target);
          await saveGang(usersData, uid, g);

          const image = await makeBattleCard({
            api,
            attackerID: uid,
            defenderID: targetID,
            attackerName,
            defenderName,
            damage,
            result: `${defenderName} est K.O. ! Récompense : ${reward} ${COIN}`
          });

          return sendImage(
            api,
            event,
            image,
            `battle_${uid}.png`,
            `𓆩 ⚔️ VICTOIRE DARK CITY ⚔️ 𓆪\n\n` +
            `💥 Dégâts : ${damage} HP\n` +
            `💰 Récompense : ${reward} ${COIN}\n` +
            `⭐ EXP : +20\n` +
            `🔥 Réputation : +10${bonus}`
          );
        }

        await saveGang(usersData, targetID, target);
        await saveGang(usersData, uid, g);

        const image = await makeBattleCard({
          api,
          attackerID: uid,
          defenderID: targetID,
          attackerName,
          defenderName,
          damage,
          result: `${defenderName} possède encore ${target.health} HP`
        });

        return sendImage(
          api,
          event,
          image,
          `battle_${uid}.png`,
          `𓆩 ⚔️ COMBAT DARK CITY ⚔️ 𓆪\n\n` +
          `💥 Dégâts infligés : ${damage} HP\n` +
          `❤️ Santé adverse : ${target.health}/100\n` +
          `⚡ Ton énergie : ${g.energy}/100\n` +
          `⭐ EXP : +20${bonus}`
        );
      }

      // ======================================
      // ACHETER UN OBJET
      // ======================================

      if (["buy", "acheter"].includes(command)) {
        const itemID = String(args[1] || "").toLowerCase();
        const item = SHOP[itemID];

        if (!item) {
          return message.reply(
            `❌ Objet introuvable.\nUtilise ${getPrefix()}gang shop`
          );
        }

        if (!hasMoney(g, item.price)) {
          return message.reply(
            `❌ Argent insuffisant.\n` +
            `💰 Prix : ${formatMoney(item.price)} ${COIN}\n` +
            `💵 Ton solde : ${formatMoney(g.cash)} ${COIN}`
          );
        }

        if (g.inventory.includes(itemID)) {
          return message.reply("❌ Tu possèdes déjà cet objet.");
        }

        removeMoney(g, item.price);
        g.inventory.push(itemID);

        let equipMessage = "";

        if (item.type === "weapon") {
          g.weapon = itemID;
          equipMessage = "\n🔫 Cette arme est maintenant équipée.";
        } else if (item.type === "armor") {
          g.armor = itemID;
          equipMessage = "\n🛡️ Cette armure est maintenant équipée.";
        }

        await saveGang(usersData, uid, g);

        return message.reply(
          `𓆩 🛒 ACHAT RÉUSSI 𓆪\n\n` +
          `📦 Objet : ${item.name}\n` +
          `💰 Prix : ${formatMoney(item.price)} ${COIN}\n` +
          `💵 Solde : ${formatMoney(g.cash)} ${COIN}` +
          equipMessage
        );
      }

      // ======================================
      // INVENTAIRE
      // ======================================

      if (["inventory", "inventaire", "inv"].includes(command)) {
        if (g.inventory.length === 0) {
          return message.reply("🎒 Ton inventaire est vide. Visite la boutique.");
        }

        const list = g.inventory.map((id, index) => {
          const item = SHOP[id];

          if (!item) return `${index + 1}. ${id}`;

          const equipped =
            g.weapon === id || g.armor === id
              ? " ✅ ÉQUIPÉ"
              : "";

          return `${index + 1}. ${item.emoji} ${item.name}${equipped}`;
        });

        return message.reply(
          `𓆩 🎒 INVENTAIRE DARK CITY 𓆪\n\n` +
          list.join("\n") +
          `\n\n🔫 Arme : ${getItemName(g.weapon)}\n` +
          `🛡️ Armure : ${getItemName(g.armor)}`
        );
      }

      // ======================================
      // ÉQUIPER UN OBJET
      // ======================================

      if (["equip", "equiper"].includes(command)) {
        const itemID = String(args[1] || "").toLowerCase();
        const item = SHOP[itemID];

        if (!item || !g.inventory.includes(itemID)) {
          return message.reply("❌ Tu ne possèdes pas cet objet.");
        }

        if (item.type === "weapon") {
          g.weapon = itemID;
        } else {
          g.armor = itemID;
        }

        await saveGang(usersData, uid, g);

        return message.reply(
          `✅ ${item.name} est maintenant équipé.`
        );
      }

      // ======================================
      // CLASSEMENT
      // ======================================

      if (["top", "ranking", "classement"].includes(command)) {
        if (typeof usersData.getAll !== "function") {
          return message.reply(
            "❌ Cette version de usersData ne permet pas de récupérer tous les joueurs."
          );
        }

        const allUsers = await usersData.getAll();

        const entries = Array.isArray(allUsers)
          ? allUsers.map((user, index) => [
              user.userID || user.id || String(index),
              user
            ])
          : Object.entries(allUsers || {});

        const players = [];

        for (const [id, user] of entries) {
          const dark = user?.data?.darkcity;

          if (!dark) continue;

          players.push({
            id: String(id),
            name: user.name || user.firstName || "Joueur",
            exp: Number(dark.exp || 0)
          });
        }

        players.sort((a, b) => b.exp - a.exp);

        if (players.length === 0) {
          return message.reply("📊 Aucun joueur DARK CITY pour le moment.");
        }

        const image = await makeGangRanking(players, uid);

        const position = players.findIndex(p => p.id === uid) + 1;

        return sendImage(
          api,
          event,
          image,
          `ranking_${uid}.png`,
          `𓆩 🏆 CLASSEMENT DARK CITY 𓆪\n\n` +
          `👥 Joueurs : ${players.length}\n` +
          `📍 Ta position : ${position > 0 ? `#${position}` : "Non classé"}`
        );
      }

      // ======================================
      // GESTION DES GUILDES
      // ======================================

      if (["guild", "guilde"].includes(command)) {
        const action = String(args[1] || "info").toLowerCase();
        const guilds = loadGuilds();
        let guild = getGuildByMember(guilds, uid);

        // CRÉER UNE GUILDE
        if (["create", "creer", "créer"].includes(action)) {
          if (guild) {
            return message.reply("❌ Tu appartiens déjà à une guilde.");
          }

          const guildName = args.slice(2).join(" ").trim();

          if (guildName.length < 3 || guildName.length > 25) {
            return message.reply(
              `❌ Le nom doit contenir entre 3 et 25 caractères.\n` +
              `Exemple : ${getPrefix()}gang guild create CÏD KÄGËNØ`
            );
          }

          if (!hasMoney(g, CONFIG.guildCost)) {
            return message.reply(
              `❌ Il te faut ${CONFIG.guildCost} ${COIN} pour créer une guilde.`
            );
          }

          const guildID = makeGuildID(guildName);

          if (!guildID) {
            return message.reply("❌ Nom de guilde invalide.");
          }

          if (guilds[guildID]) {
            return message.reply("❌ Ce nom de guilde est déjà utilisé.");
          }

          removeMoney(g, CONFIG.guildCost);

          guild = {
            id: guildID,
            name: guildName,
            leader: uid,
            members: [uid],
            invites: [],
            level: 1,
            exp: 0,
            bank: 0,
            createdAt: Date.now()
          };

          guilds[guildID] = guild;
          g.guild = guildID;

          await saveGang(usersData, uid, g);
          saveGuilds(guilds);

          const image = await makeGuildCard(guild, name, "GUILDE CRÉÉE");

          return sendImage(
            api,
            event,
            image,
            `guild_${guildID}.png`,
            `𓆩 🔱 GUILDE CRÉÉE 🔱 𓆪\n\n` +
            `🏴 Nom : ${guild.name}\n` +
            `👑 Chef : ${name}\n` +
            `👥 Membres : 1\n` +
            `⭐ Niveau : 1\n` +
            `💸 Coût : ${CONFIG.guildCost} ${COIN}\n\n` +
            `Ta guilde est maintenant créée !`
          );
        }

        // REJOINDRE UNE GUILDE
        if (["join", "rejoindre"].includes(action)) {
          if (guild) {
            return message.reply("❌ Tu es déjà dans une guilde.");
          }

          const guildID = String(args[2] || "").toLowerCase();
          const targetGuild = guilds[guildID];

          if (!targetGuild) {
            return message.reply("❌ Guilde introuvable.");
          }

          if (!(targetGuild.invites || []).includes(uid)) {
            return message.reply("❌ Tu n'as pas reçu d'invitation pour cette guilde.");
          }

          if (targetGuild.members.length >= CONFIG.guildMaxMembers) {
            return message.reply("❌ Cette guilde est complète.");
          }

          targetGuild.members.push(uid);
          targetGuild.invites = targetGuild.invites.filter(id => id !== uid);
          g.guild = guildID;

          await saveGang(usersData, uid, g);
          saveGuilds(guilds);

          return message.reply(
            `𓆩 🔱 GUILDE REJOINTE 🔱 𓆪\n\n` +
            `🏴 Guilde : ${targetGuild.name}\n` +
            `👥 Membres : ${targetGuild.members.length}`
          );
        }

        // INFORMATIONS DE LA GUILDE
        if (["info", "infos", "information"].includes(action)) {
          if (!guild) {
            return message.reply(
              `❌ Tu n'es dans aucune guilde.\n` +
              `Utilise ${getPrefix()}gang guild create nom`
            );
          }

          const leaderName = await getName(api, guild.leader);
          const image = await makeGuildCard(guild, leaderName, "GUILDE");

          return sendImage(
            api,
            event,
            image,
            `guild_info_${guild.id}.png`,
            `𓆩 🔱 ${guild.name} 🔱 𓆪\n\n` +
            `👑 Chef : ${leaderName}\n` +
            `👥 Membres : ${guild.members.length}/${CONFIG.guildMaxMembers}\n` +
            `⭐ Niveau : ${guild.level}\n` +
            `💰 Banque : ${formatMoney(guild.bank)} ${COIN}\n` +
            `🆔 ID : ${guild.id}`
          );
        }

        // LISTE DES MEMBRES
        if (["members", "membres"].includes(action)) {
          if (!guild) return message.reply("❌ Tu n'es dans aucune guilde.");

          const members = [];

          for (const memberID of guild.members) {
            const memberName = await getName(api, memberID);
            const role = isGuildLeader(guild, memberID) ? "👑 Chef" : "👤 Membre";

            members.push(`${role} : ${memberName}`);
          }

          return message.reply(
            `𓆩 👥 MEMBRES DE ${guild.name} 𓆪\n\n` +
            members.join("\n")
          );
        }

        // INVITER UN JOUEUR
        if (["invite", "inviter"].includes(action)) {
          if (!guild) return message.reply("❌ Tu n'es dans aucune guilde.");

          if (!isGuildLeader(guild, uid)) {
            return message.reply("❌ Seul le chef peut inviter des joueurs.");
          }

          const targetID = await getMentionedUser(api, event);

          if (!targetID) {
            return message.reply("Mentionne le joueur à inviter.");
          }

          if (getGuildByMember(guilds, targetID)) {
            return message.reply("❌ Ce joueur appartient déjà à une guilde.");
          }

          if (guild.members.length >= CONFIG.guildMaxMembers) {
            return message.reply("❌ Ta guilde est complète.");
          }

          if (!guild.invites.includes(String(targetID))) {
            guild.invites.push(String(targetID));
          }

          saveGuilds(guilds);

          return message.reply(
            `✉️ Invitation envoyée à ${await getName(api, targetID)}.\n\n` +
            `Pour rejoindre : ${getPrefix()}gang guild join ${guild.id}`
          );
        }

        // QUITTER UNE GUILDE
        if (["leave", "quitter"].includes(action)) {
          if (!guild) return message.reply("❌ Tu n'es dans aucune guilde.");

          if (isGuildLeader(guild, uid)) {
            return message.reply(
              "❌ Tu es le chef. Transfère d'abord la direction ou supprime la guilde."
            );
          }

          guild.members = guild.members.filter(id => String(id) !== uid);
          g.guild = null;

          await saveGang(usersData, uid, g);
          saveGuilds(guilds);

          return message.reply(`🚪 Tu as quitté ${guild.name}.`);
        }

        // EXCLURE UN MEMBRE
        if (["kick", "expulser"].includes(action)) {
          if (!guild) return message.reply("❌ Tu n'es dans aucune guilde.");

          if (!isGuildLeader(guild, uid)) {
            return message.reply("❌ Seul le chef peut expulser un membre.");
          }

          const targetID = await getMentionedUser(api, event);

          if (!targetID || !guild.members.includes(String(targetID))) {
            return message.reply("❌ Ce joueur n'est pas dans ta guilde.");
          }

          if (String(targetID) === uid) {
            return message.reply("❌ Tu ne peux pas t'expulser toi-même.");
          }

          guild.members = guild.members.filter(id => String(id) !== String(targetID));

          const target = await loadGang(usersData, targetID);
          target.guild = null;

          await saveGang(usersData, targetID, target);
          saveGuilds(guilds);

          return message.reply(
            `🚫 ${await getName(api, targetID)} a été expulsé de la guilde.`
          );
        }

        // TRANSFÉRER LA DIRECTION
        if (["transfer", "transférer", "transferer"].includes(action)) {
          if (!guild) return message.reply("❌ Tu n'es dans aucune guilde.");

          if (!isGuildLeader(guild, uid)) {
            return message.reply("❌ Seul le chef peut transférer la direction.");
          }

          const targetID = await getMentionedUser(api, event);

          if (!targetID || !guild.members.includes(String(targetID))) {
            return message.reply("❌ Ce joueur n'est pas dans ta guilde.");
          }

          if (String(targetID) === uid) {
            return message.reply("❌ Tu es déjà le chef.");
          }

          guild.leader = String(targetID);
          saveGuilds(guilds);

          return message.reply(
            `👑 La direction de ${guild.name} a été transférée à ${await getName(api, targetID)}.`
          );
        }

        // SUPPRIMER LA GUILDE
        if (["delete", "supprimer"].includes(action)) {
          if (!guild) return message.reply("❌ Tu n'es dans aucune guilde.");

          if (!isGuildLeader(guild, uid)) {
            return message.reply("❌ Seul le chef peut supprimer la guilde.");
          }

          for (const memberID of guild.members) {
            const member = await loadGang(usersData, memberID);
            member.guild = null;
            await saveGang(usersData, memberID, member);
          }

          delete guilds[guild.id];
          saveGuilds(guilds);

          return message.reply(
            `🗑️ La guilde ${guild.name} a été supprimée.`
          );
        }

        return message.reply(
          `𓆩 🔱 COMMANDES GUILDE 🔱 𓆪\n\n` +
          `${getPrefix()}gang guild create nom\n` +
          `${getPrefix()}gang guild info\n` +
          `${getPrefix()}gang guild members\n` +
          `${getPrefix()}gang guild invite @joueur\n` +
          `${getPrefix()}gang guild join ID\n` +
          `${getPrefix()}gang guild leave\n` +
          `${getPrefix()}gang guild kick @joueur\n` +
          `${getPrefix()}gang guild transfer @joueur\n` +
          `${getPrefix()}gang guild delete`
        );
      }

      // ======================================
      // COMMANDE ADMIN : AJOUTER DE L'ARGENT
      // ======================================

      if (["adminmoney", "addmoney"].includes(command)) {
        if (!isBotAdmin(uid)) {
          return message.reply("⛔ Cette commande est réservée aux administrateurs du bot.");
        }

        const targetID = await getMentionedUser(api, event);
        const rawAmount = String(args[1] || "").replace(/[,_\s]/g, "");

        if (!/^\d+$/.test(rawAmount) || rawAmount.length > 100) {
          return message.reply(
            `❌ Montant invalide.\nExemple : ${getPrefix()}gang adminmoney 100000000000000000000`
          );
        }

        const amount = BigInt(rawAmount);

        if (amount <= 0n) {
          return message.reply("❌ Le montant doit être supérieur à zéro.");
        }

        const receiverID = targetID || uid;
        const receiver = await loadGang(usersData, receiverID);

        addMoney(receiver, amount);

        await saveGang(usersData, receiverID, receiver);

        return message.reply(
          `𓆩 👑 ADMIN MONEY 👑 𓆪\n\n` +
          `👤 Joueur : ${await getName(api, receiverID)}\n` +
          `💰 Montant ajouté : +${formatMoney(amount)} ${COIN}\n` +
          `💵 Nouveau solde : ${formatMoney(receiver.cash)} ${COIN}`
        );
      }

      // ======================================
      // MENU D'AIDE
      // ======================================

      if (["help", "aide"].includes(command)) {
        const prefix = getPrefix();

        return message.reply(
          `𓆩 🦇 DARK CITY RPG 🦇 𓆪\n\n` +

          `👤 PROFIL\n` +
          `${prefix}gang profile\n\n` +

          `💰 ARGENT\n` +
          `${prefix}gang work\n` +
          `${prefix}gang daily\n` +
          `${prefix}gang rob @joueur\n` +
          `${prefix}gang mission\n\n` +

          `⚔️ COMBAT\n` +
          `${prefix}gang attack @joueur\n` +
          `${prefix}gang heal\n\n` +

          `🛒 BOUTIQUE\n` +
          `${prefix}gang shop\n` +
          `${prefix}gang buy ID\n` +
          `${prefix}gang inventory\n` +
          `${prefix}gang equip ID\n\n` +

          `🔱 GUILDE\n` +
          `${prefix}gang guild create nom\n` +
          `${prefix}gang guild info\n` +
          `${prefix}gang guild members\n` +
          `${prefix}gang guild invite @joueur\n` +
          `${prefix}gang guild join ID\n` +
          `${prefix}gang guild leave\n\n` +

          `🏆 CLASSEMENT\n` +
          `${prefix}gang top\n\n` +

          `👑 ADMINISTRATION\n` +
          `${prefix}gang adminmoney montant\n\n` +

          `𓆩 DARK CITY UNDERWORLD 𓆪`
        );
      }

      return message.reply(
        `❌ Commande inconnue.\nUtilise ${getPrefix()}gang help`
      );

    } catch (error) {
      console.error("[DARK CITY ERROR]", error);

      return message.reply(
        "❌ Une erreur est survenue dans DARK CITY. Consulte la console du bot pour connaître le détail."
      );
    }
  }
};

