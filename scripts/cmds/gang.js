const Canvas = require("canvas");
const fs = require("fs-extra");
const path = require("path");

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
    name: "Couteau",
    price: 500,
    type: "weapon",
    attack: 5
  },
  pistol: {
    name: "Pistolet",
    price: 1500,
    type: "weapon",
    attack: 15
  },
  armor: {
    name: "Gilet pare-balles",
    price: 1000,
    type: "armor",
    defense: 10
  },
  vest: {
    name: "Armure renforcée",
    price: 2500,
    type: "armor",
    defense: 25
  }
};

const MISSIONS = [
  { name: "Livraison secrète", min: 200, max: 500, exp: 20 },
  { name: "Protection du territoire", min: 300, max: 600, exp: 30 },
  { name: "Transaction clandestine", min: 250, max: 550, exp: 25 },
  { name: "Infiltration", min: 400, max: 700, exp: 35 },
  { name: "Dette récupérée", min: 150, max: 450, exp: 15 }
];

const DATA_DIR = path.join(__dirname, "cache", "darkcity");
fs.ensureDirSync(DATA_DIR);

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRank(exp) {
  let rank = RANKS[0];

  for (const item of RANKS) {
    if (exp >= item.exp) rank = item;
  }

  return rank;
}

function formatTime(ms) {
  const seconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;

  if (minutes > 0) return `${minutes} min ${remaining} sec`;
  return `${remaining} sec`;
}

function getItemName(id) {
  return SHOP[id]?.name || id;
}

function getPrefix() {
  const configuredPrefix = global.GoatBot?.config?.prefix;

  if (Array.isArray(configuredPrefix)) {
    return configuredPrefix[0] || "/";
  }

  return configuredPrefix || "/";
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
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

async function makeGangProfile(user, name, avatarURL) {
  const canvas = Canvas.createCanvas(1200, 1450);
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 1200, 1450);
  gradient.addColorStop(0, "#080d0b");
  gradient.addColorStop(0.5, "#102019");
  gradient.addColorStop(1, "#050807");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 1450);

  ctx.strokeStyle = "#19ff8c";
  ctx.lineWidth = 5;
  ctx.strokeRect(25, 25, 1150, 1400);

  ctx.textAlign = "center";
  ctx.fillStyle = "#19ff8c";
  ctx.font = "bold 65px Arial";
  ctx.fillText("DARK CITY", 600, 110);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 34px Arial";
  ctx.fillText("GANGSTER PROFILE", 600, 165);

  roundedRect(ctx, 390, 210, 420, 420, 30, "#111c16", "#19ff8c");

  if (avatarURL) {
    try {
      const avatar = await Canvas.loadImage(avatarURL);
      ctx.save();
      ctx.beginPath();
      ctx.arc(600, 420, 170, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, 430, 250, 340, 340);
      ctx.restore();
    } catch (error) {
      ctx.fillStyle = "#19ff8c";
      ctx.font = "bold 150px Arial";
      ctx.fillText((name || "?").charAt(0).toUpperCase(), 600, 475);
    }
  } else {
    ctx.fillStyle = "#19ff8c";
    ctx.font = "bold 150px Arial";
    ctx.fillText((name || "?").charAt(0).toUpperCase(), 600, 475);
  }

  const rank = getRank(user.exp || 0);
  const nextRank = RANKS.find(r => r.exp > (user.exp || 0));
  const currentExp = user.exp || 0;

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 48px Arial";
  ctx.fillText(name || "Joueur inconnu", 600, 710);

  ctx.fillStyle = "#19ff8c";
  ctx.font = "bold 36px Arial";
  ctx.fillText(rank.name, 600, 770);

  roundedRect(ctx, 100, 820, 1000, 35, 15, "#26352d");

  const progress = nextRank
    ? Math.min(1, currentExp / nextRank.exp)
    : 1;

  roundedRect(
    ctx,
    100,
    820,
    Math.max(10, 1000 * progress),
    35,
    15,
    "#19ff8c"
  );

  ctx.fillStyle = "#ffffff";
  ctx.font = "26px Arial";
  ctx.fillText(
    nextRank
      ? `${currentExp} / ${nextRank.exp} EXP`
      : `${currentExp} EXP - RANG MAXIMUM`,
    600,
    900
  );

  const stats = [
    ["FORTUNE", `${user.cash || 0} ${COIN}`],
    ["RÉPUTATION", `${user.reputation || 0}`],
    ["SANTÉ", `${user.health || 0} / 100`],
    ["ÉNERGIE", `${user.energy || 0} / 10`],
    ["ARME", user.weapon ? getItemName(user.weapon) : "Aucune"],
    ["PROTECTION", user.armor ? getItemName(user.armor) : "Aucune"]
  ];

  let y = 980;

  for (let i = 0; i < stats.length; i++) {
    const x = i % 2 === 0 ? 100 : 620;
    if (i % 2 === 0 && i !== 0) y += 125;

    roundedRect(ctx, x, y, 480, 95, 15, "#101a14", "#19ff8c");

    ctx.textAlign = "left";
    ctx.fillStyle = "#19ff8c";
    ctx.font = "bold 23px Arial";
    ctx.fillText(stats[i][0], x + 25, y + 35);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 27px Arial";
    ctx.fillText(stats[i][1], x + 25, y + 72);
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#19ff8c";
  ctx.font = "bold 28px Arial";
  ctx.fillText("𓆩 DARK CITY GANG 𓆪", 600, 1390);

  return canvas.toBuffer("image/png");
}

async function makeGangRanking(players, currentPlayer) {
  const canvas = Canvas.createCanvas(1536, 900);
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 1536, 900);
  gradient.addColorStop(0, "#070d09");
  gradient.addColorStop(1, "#14251a");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1536, 900);

  ctx.strokeStyle = "#19ff8c";
  ctx.lineWidth = 5;
  ctx.strokeRect(25, 25, 1486, 850);

  ctx.textAlign = "center";
  ctx.fillStyle = "#19ff8c";
  ctx.font = "bold 65px Arial";
  ctx.fillText("DARK CITY", 768, 100);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 35px Arial";
  ctx.fillText("GLOBAL GANGSTER RANKING", 768, 155);

  ctx.textAlign = "left";
  ctx.font = "bold 24px Arial";
  ctx.fillStyle = "#19ff8c";

  ctx.fillText("RANG", 90, 235);
  ctx.fillText("JOUEUR", 250, 235);
  ctx.fillText("NIVEAU", 750, 235);
  ctx.fillText("EXP", 980, 235);
  ctx.fillText("FORTUNE", 1190, 235);

  let y = 285;

  for (let i = 0; i < Math.min(players.length, 10); i++) {
    const player = players[i];
    const rank = getRank(player.exp || 0);

    roundedRect(
      ctx,
      65,
      y - 35,
      1400,
      65,
      12,
      i === 0 ? "#173c27" : "#101a14",
      i === 0 ? "#19ff8c" : "#294333"
    );

    ctx.fillStyle = "#19ff8c";
    ctx.font = "bold 27px Arial";
    ctx.fillText(`#${i + 1}`, 100, y + 5);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px Arial";
    ctx.fillText(String(player.name || "Joueur").slice(0, 25), 250, y + 5);

    ctx.fillStyle = "#b8ffd5";
    ctx.fillText(rank.name, 750, y + 5);

    ctx.fillStyle = "#ffffff";
    ctx.fillText(String(player.exp || 0), 980, y + 5);
    ctx.fillText(`${player.cash || 0} ${COIN}`, 1190, y + 5);

    y += 72;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#19ff8c";
  ctx.font = "bold 25px Arial";
  ctx.fillText(
    `JOUEURS CLASSÉS : ${players.length}`,
    768,
    825
  );

  return canvas.toBuffer("image/png");
    }module.exports = {
  config: {
    name: "gang",
    aliases: ["gangster", "darkcity"],
    version: "2.1.0",
    author: "DARK SYSTEM",
    countDown: 3,
    role: 0,
    description: {
      fr: "Système RPG gangster DARK CITY",
      en: "DARK CITY gangster RPG system"
    },
    category: "GAME"
  },

  onStart: async function ({ api, event, args, message, usersData }) {
    const uid = event.senderID;
    const threadID = event.threadID;
    const action = (args[0] || "help").toLowerCase();

    const configuredPrefix = global.GoatBot?.config?.prefix;
    const prefix = Array.isArray(configuredPrefix)
      ? configuredPrefix[0] || "/"
      : configuredPrefix || "/";

    let user = await usersData.get(uid);

    if (!user) {
      user = {
        money: 0,
        exp: 0,
        data: {}
      };
    }

    const getGang = data => {
      if (!data.data) data.data = {};

      if (!data.data.darkCity) {
        data.data.darkCity = {
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

      const g = data.data.darkCity;

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
    };

    const g = getGang(user);

    const save = async (id = uid, data = user) => {
      await usersData.set(id, {
        money: data.money || 0,
        exp: data.exp || 0,
        data: data.data || {}
      });
    };

    const getTarget = () => {
      if (event.messageReply) {
        return event.messageReply.senderID;
      }

      if (event.mentions && Object.keys(event.mentions).length > 0) {
        return Object.keys(event.mentions)[0];
      }

      return null;
    };

    const getName = async id => {
      try {
        const info = await api.getUserInfo(id);
        return info[id]?.name || info[id]?.firstName || "Joueur";
      } catch (error) {
        return "Joueur";
      }
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

    const cooldown = (key, duration) => {
      const now = Date.now();
      const last = g.lastActions[key] || 0;
      const remaining = duration - (now - last);

      if (remaining > 0) {
        return {
          success: false,
          remaining
        };
      }

      g.lastActions[key] = now;

      return {
        success: true
      };
    };

    const getAvatar = async id => {
      try {
        const info = await api.getUserInfo(id);
        return info[id]?.largePictureUrl
          || info[id]?.profilePictureUrl
          || info[id]?.avatarUrl
          || info[id]?.thumbSrc
          || info[id]?.picture
          || null;
      } catch (error) {
        return null;
      }
    };

    // PROFILE
    if (action === "profile" || action === "profil") {
      const name = await getName(uid);
      const avatar = await getAvatar(uid);

      const image = await makeGangProfile(g, name, avatar);
      const filePath = path.join(DATA_DIR, `profile_${uid}.png`);

      fs.writeFileSync(filePath, image);

      return message.reply({
        body: `𓆩 🦇 DARK CITY PROFILE 🦇 𓆪\n\nVoici ton profil de gangster.`,
        attachment: fs.createReadStream(filePath)
      });
    }

    // WORK
    if (action === "work" || action === "travail") {
      const cd = cooldown("work", 30000);

      if (!cd.success) {
        return message.reply(
          `⏳ Tu dois attendre ${formatTime(cd.remaining)} avant de retravailler.`
        );
      }

      if (!useEnergy(1)) {
        return message.reply("⚡ Tu n'as pas assez d'énergie. Attends sa récupération.");
      }

      const reward = random(150, 450);
      const exp = random(10, 25);
      const reputation = random(1, 4);

      g.cash += reward;
      g.exp += exp;
      g.reputation += reputation;

      await save();

      return message.reply(
        `𓆩 🦇 DARK CITY WORK 🦇 𓆪\n\n` +
        `✅ Travail terminé !\n\n` +
        `💰 Gain : +${reward} ${COIN}\n` +
        `⭐ EXP : +${exp}\n` +
        `🔥 Réputation : +${reputation}\n` +
        `⚡ Énergie : ${g.energy}/10`
      );
    }

    // ROB
    if (action === "rob" || action === "vol") {
      const targetID = getTarget();

      if (!targetID) {
        return message.reply(
          `⚠️ Réponds au message d'un joueur ou mentionne-le.\n\nExemple : ${prefix}gang rob @joueur`
        );
      }

      if (targetID === uid) {
        return message.reply("Tu ne peux pas te voler toi-même.");
      }

      const targetUser = await usersData.get(targetID);

      if (!targetUser) {
        return message.reply("❌ Impossible de trouver ce joueur.");
      }

      const targetGang = getGang(targetUser);

      if (targetGang.cash <= 0) {
        return message.reply("Ce joueur n'a pas d'argent à voler.");
      }

      const cd = cooldown("rob", 60000);

      if (!cd.success) {
        return message.reply(
          `⏳ Attends ${formatTime(cd.remaining)} avant de voler à nouveau.`
        );
      }

      if (!useEnergy(2)) {
        return message.reply("⚡ Tu n'as pas assez d'énergie.");
      }

      const targetName = await getName(targetID);

      if (Math.random() < 0.65) {
        const stolen = Math.min(
          random(100, 500),
          targetGang.cash
        );

        g.cash += stolen;
        targetGang.cash -= stolen;
        g.exp += 20;
        g.reputation += 5;

        await save(uid, user);
        await save(targetID, targetUser);

        return message.reply(
          `𓆩 🦇 BRAQUAGE RÉUSSI 🦇 𓆪\n\n` +
          `🎯 Victime : ${targetName}\n` +
          `💰 Argent volé : ${stolen} ${COIN}\n` +
          `⭐ EXP : +20\n` +
          `🔥 Réputation : +5`
        );
      }

      const fine = random(50, 200);
      g.cash = Math.max(0, g.cash - fine);
      g.health = Math.max(0, g.health - 10);

      await save();

      return message.reply(
        `𓆩 🚨 BRAQUAGE RATÉ 🚨 𓆪\n\n` +
        `La police t'a repéré !\n` +
        `💸 Amende : -${fine} ${COIN}\n` +
        `❤️ Santé : -10`
      );
    }

    // ATTACK
    if (action === "attack" || action === "attaquer") {
      const targetID = getTarget();

      if (!targetID) {
        return message.reply(
          `⚠️ Réponds au message d'un joueur ou mentionne-le.\n\nExemple : ${prefix}gang attack @joueur`
        );
      }

      if (targetID === uid) {
        return message.reply("Tu ne peux pas t'attaquer toi-même.");
      }

      const targetUser = await usersData.get(targetID);

      if (!targetUser) {
        return message.reply("❌ Joueur introuvable.");
      }

      const targetGang = getGang(targetUser);

      if (targetGang.health <= 0) {
        return message.reply("Ce joueur est déjà K.O.");
      }

      if (g.health <= 0) {
        return message.reply("Tu es K.O. ! Utilise la commande heal.");
      }

      const cd = cooldown("attack", 60000);

      if (!cd.success) {
        return message.reply(
          `⏳ Attends ${formatTime(cd.remaining)} avant de combattre à nouveau.`
        );
      }

      if (!useEnergy(2)) {
        return message.reply("⚡ Tu n'as pas assez d'énergie.");
      }

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

      targetGang.health = Math.max(
        0,
        targetGang.health - damage
      );

      g.exp += 25;
      g.reputation += 5;

      await save(uid, user);
      await save(targetID, targetUser);

      const targetName = await getName(targetID);

      return message.reply(
        `𓆩 ⚔️ DARK CITY FIGHT ⚔️ 𓆪\n\n` +
        `🥊 Adversaire : ${targetName}\n` +
        `💥 Dégâts infligés : ${damage}\n` +
        `❤️ Santé restante de l'adversaire : ${targetGang.health}/100\n` +
        `⭐ EXP : +25\n` +
        `🔥 Réputation : +5\n\n` +
        (targetGang.health <= 0
          ? "☠️ Ton adversaire est K.O. !"
          : "⚔️ Le combat continue...")
      );
    }

    // HEAL
    if (action === "heal" || action === "soin") {
      if (g.health >= 100) {
        return message.reply("❤️ Ta santé est déjà au maximum.");
      }

      const price = 300;

      if (g.cash < price) {
        return message.reply(
          `❌ Il te faut ${price} ${COIN} pour acheter un soin.`
        );
      }

      const restored = Math.min(30, 100 - g.health);

      g.cash -= price;
      g.health += restored;

      await save();

      return message.reply(
        `𓆩 ❤️ SOINS DARK CITY ❤️ 𓆪\n\n` +
        `✅ Tu as récupéré ${restored} points de santé.\n` +
        `❤️ Santé : ${g.health}/100\n` +
        `💸 Prix : ${price} ${COIN}`
      );
    }

    // MISSION
    if (action === "mission" || action === "missions") {
      const cd = cooldown("mission", 120000);

      if (!cd.success) {
        return message.reply(
          `⏳ Attends ${formatTime(cd.remaining)} avant ta prochaine mission.`
        );
      }

      if (!useEnergy(2)) {
        return message.reply("⚡ Tu n'as pas assez d'énergie.");
      }

      const mission = MISSIONS[random(0, MISSIONS.length - 1)];
      const reward = random(mission.min, mission.max);

      g.cash += reward;
      g.exp += mission.exp;
      g.reputation += 3;

      await save();

      return message.reply(
        `𓆩 🎯 MISSION ACCOMPLIE 🎯 𓆪\n\n` +
        `📌 Mission : ${mission.name}\n` +
        `💰 Récompense : +${reward} ${COIN}\n` +
        `⭐ EXP : +${mission.exp}\n` +
        `🔥 Réputation : +3\n` +
        `⚡ Énergie : ${g.energy}/10`
      );
    }

    // DAILY
    if (action === "daily" || action === "quotidien") {
      const now = Date.now();
      const remaining = 86400000 - (now - g.lastDaily);

      if (remaining > 0) {
        return message.reply(
          `⏳ Tu as déjà récupéré ta récompense quotidienne.\nReviens dans ${formatTime(remaining)}.`
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
        `𓆩 🎁 DAILY REWARD 🎁 𓆪\n\n` +
        `💰 Récompense : +${reward} ${COIN}\n` +
        `⭐ EXP : +${exp}\n` +
        `🔥 Réputation : +10\n\n` +
        `Reviens demain pour ta prochaine récompense !`
      );
  }    // SHOP
    if (action === "shop" || action === "boutique") {
      let text = `𓆩 🛒 DARK CITY SHOP 🛒 𓆪\n\n`;
      text += `💰 Ton argent : ${g.cash} ${COIN}\n\n`;

      for (const [id, item] of Object.entries(SHOP)) {
        text +=
          `━━━━━━━━━━━━━━━━━━\n` +
          `📦 ${item.name}\n` +
          `🆔 ID : ${id}\n` +
          `💵 Prix : ${item.price} ${COIN}\n`;

        if (item.type === "weapon") {
          text += `⚔️ Attaque : +${item.attack}\n`;
        } else {
          text += `🛡️ Défense : +${item.defense}\n`;
        }

        text += "\n";
      }

      text +=
        `━━━━━━━━━━━━━━━━━━\n` +
        `🛍️ Pour acheter : ${prefix}gang buy <ID>\n` +
        `Exemple : ${prefix}gang buy pistol`;

      return message.reply(text);
    }

    // BUY
    if (action === "buy" || action === "acheter") {
      const itemID = (args[1] || "").toLowerCase();
      const item = SHOP[itemID];

      if (!item) {
        return message.reply(
          `❌ Objet introuvable !\n\n` +
          `Consulte la boutique avec : ${prefix}gang shop`
        );
      }

      if (g.inventory.includes(itemID)) {
        return message.reply("⚠️ Tu possèdes déjà cet objet.");
      }

      if (g.cash < item.price) {
        return message.reply(
          `❌ Tu n'as pas assez d'argent.\n` +
          `💰 Prix : ${item.price} ${COIN}\n` +
          `💵 Ton argent : ${g.cash} ${COIN}`
        );
      }

      g.cash -= item.price;
      g.inventory.push(itemID);

      let equipped = false;

      if (item.type === "weapon") {
        const currentAttack = g.weapon
          ? SHOP[g.weapon]?.attack || 0
          : 0;

        if (item.attack > currentAttack) {
          g.weapon = itemID;
          equipped = true;
        }
      }

      if (item.type === "armor") {
        const currentDefense = g.armor
          ? SHOP[g.armor]?.defense || 0
          : 0;

        if (item.defense > currentDefense) {
          g.armor = itemID;
          equipped = true;
        }
      }

      await save();

      return message.reply(
        `𓆩 🛍️ ACHAT RÉUSSI 🛍️ 𓆪\n\n` +
        `✅ Objet acheté : ${item.name}\n` +
        `💸 Prix : ${item.price} ${COIN}\n` +
        `💰 Argent restant : ${g.cash} ${COIN}\n\n` +
        (equipped
          ? "🟢 L'objet a été automatiquement équipé."
          : "📦 L'objet a été ajouté à ton inventaire.")
      );
    }

    // INVENTORY
    if (action === "inventory" || action === "inventaire") {
      let text = `𓆩 🎒 DARK CITY INVENTORY 🎒 𓆪\n\n`;

      text += `💰 Argent : ${g.cash} ${COIN}\n`;
      text += `⚔️ Arme équipée : ${
        g.weapon ? getItemName(g.weapon) : "Aucune"
      }\n`;

      text += `🛡️ Protection équipée : ${
        g.armor ? getItemName(g.armor) : "Aucune"
      }\n\n`;

      text += `📦 OBJETS POSSÉDÉS\n\n`;

      if (g.inventory.length === 0) {
        text += "Ton inventaire est vide.\n";
      } else {
        for (const itemID of g.inventory) {
          const item = SHOP[itemID];

          if (!item) continue;

          const equipped =
            g.weapon === itemID || g.armor === itemID;

          text +=
            `• ${item.name}` +
            (equipped ? " 🟢 ÉQUIPÉ" : "") +
            "\n";
        }
      }

      text += `\n🛒 Boutique : ${prefix}gang shop`;

      return message.reply(text);
    }

    // TOP / RANKING
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

          const gang = getGang(data);

          players.push({
            id,
            name: await getName(id),
            cash: gang.cash || 0,
            exp: gang.exp || 0,
            reputation: gang.reputation || 0
          });
        }

        players.sort((a, b) => b.exp - a.exp);

        const image = await makeGangRanking(players, uid);
        const filePath = path.join(DATA_DIR, "ranking.png");

        fs.writeFileSync(filePath, image);

        const myRank = players.findIndex(p => p.id === uid) + 1;

        return message.reply({
          body:
            `𓆩 🏆 DARK CITY RANKING 🏆 𓆪\n\n` +
            `👥 Joueurs classés : ${players.length}\n` +
            `👑 Ton classement : ${
              myRank > 0 ? `#${myRank}` : "Non classé"
            }\n\n` +
            `Voici le TOP 10 des gangsters les plus puissants.`,
          attachment: fs.createReadStream(filePath)
        });
      } catch (error) {
        console.error("DARK CITY RANKING ERROR:", error);

        return message.reply(
          "❌ Une erreur est survenue pendant la création du classement."
        );
      }
    }

    // HELP / MENU
    const help =
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `𓆩 🦇 𝐃𝐀𝐑𝐊 𝐂𝐈𝐓𝐘 🦇 𓆪\n` +
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

      `🏆 CLASSEMENT\n` +
      `┊ ${prefix}gang top\n\n` +

      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 Mon argent : ${g.cash} ${COIN}\n` +
      `⭐ Mon EXP : ${g.exp}\n` +
      `👑 Mon rang : ${getRank(g.exp).name}\n` +
      `❤️ Ma santé : ${g.health}/100\n` +
      `⚡ Mon énergie : ${g.energy}/10\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `𓆩 DARK CITY GANG 𓆪`;

    return message.reply(help);
  }
};
