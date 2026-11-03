
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const { createCanvas, loadImage } = require("canvas");
const { isOwner } = require("../../utils/owner");

const WIDTH = 1200;
const HEIGHT = 540;

function parseAmount(input) {
  if (!input) return NaN;

  const match = String(input).toLowerCase().replace(/,/g, "").match(/^(\d+(?:\.\d+)?)([kmbtq]?)$/);

  if (!match) return NaN;

  const multipliers = {
    "": 1,
    k: 1e3,
    m: 1e6,
    b: 1e9,
    t: 1e12,
    q: 1e15
  };

  const amount = Number(match[1]) * multipliers[match[2]];

  return Number.isSafeInteger(amount) && amount > 0 ? amount : NaN;
}

function fmt(number) {
  return "$" + Number(number || 0).toLocaleString("en-US");
}

async function getAvatar(uid, name) {
  try {
    if (process.env.FB_TOKEN) {
      const response = await axios.get(
        `https://graph.facebook.com/${uid}/picture?width=300&height=300&access_token=${process.env.FB_TOKEN}`,
        { responseType: "arraybuffer", timeout: 8000 }
      );

      return await loadImage(Buffer.from(response.data));
    }
  } catch (error) {
    console.log("[SETMONEY] Avatar indisponible.");
  }

  const avatar = createCanvas(300, 300);
  const ctx = avatar.getContext("2d");

  ctx.fillStyle = "#38205D";
  ctx.fillRect(0, 0, 300, 300);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 120px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText((name || "?").charAt(0).toUpperCase(), 150, 150);

  return await loadImage(avatar.toBuffer());
}

async function buildCard(user, oldBalance, newBalance) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // Fond
  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, "#080514");
  bg.addColorStop(0.5, "#180B30");
  bg.addColorStop(1, "#050510");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Lumières décoratives
  for (const [x, y, color] of [
    [150, 100, "#8B35FF"],
    [1050, 400, "#FF45C8"],
    [600, 250, "#5730FF"]
  ]) {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 350);
    glow.addColorStop(0, color + "35");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  // Carte principale
  ctx.fillStyle = "rgba(15, 8, 30, 0.88)";
  ctx.beginPath();
  ctx.roundRect(18, 18, WIDTH - 36, HEIGHT - 36, 28);
  ctx.fill();

  ctx.strokeStyle = "#A65CFF";
  ctx.lineWidth = 3;
  ctx.shadowColor = "#A65CFF";
  ctx.shadowBlur = 20;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Titre
  ctx.textAlign = "center";
  ctx.fillStyle = "#E6B8FF";
  ctx.font = "bold 38px Arial";
  ctx.fillText("◈  SETMONEY — MODIFICATION RÉUSSIE  ◈", 600, 85);

  ctx.strokeStyle = "#A65CFF";
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(100, 115);
  ctx.lineTo(1100, 115);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Avatar
  const avatar = await getAvatar(user.uid, user.name);

  ctx.save();
  ctx.beginPath();
  ctx.arc(600, 220, 83, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(avatar, 517, 137, 166, 166);
  ctx.restore();

  ctx.beginPath();
  ctx.arc(600, 220, 87, 0, Math.PI * 2);
  ctx.strokeStyle = "#D6A0FF";
  ctx.lineWidth = 4;
  ctx.shadowColor = "#A65CFF";
  ctx.shadowBlur = 18;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Nom
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 28px Arial";
  ctx.textAlign = "center";
  ctx.fillText(user.name.slice(0, 35), 600, 345);

  // Anciens et nouveaux soldes
  const boxes = [
    { x: 120, title: "ANCIEN SOLDE", value: fmt(oldBalance), color: "#B9A3D9" },
    { x: 680, title: "NOUVEAU SOLDE", value: fmt(newBalance), color: "#DDA5FF" }
  ];

  for (const box of boxes) {
    ctx.fillStyle = "rgba(130, 65, 190, 0.13)";
    ctx.beginPath();
    ctx.roundRect(box.x, 385, 400, 90, 16);
    ctx.fill();

    ctx.strokeStyle = "#8B50C0";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#C9B4E8";
    ctx.font = "bold 17px Arial";
    ctx.textAlign = "center";
    ctx.fillText(box.title, box.x + 200, 413);

    ctx.fillStyle = box.color;
    ctx.font = "bold 29px Arial";
    ctx.fillText(box.value, box.x + 200, 451);
  }

  ctx.fillStyle = "#9B83B8";
  ctx.font = "14px Arial";
  ctx.textAlign = "center";
  ctx.fillText("✦  ADMINISTRATOR BALANCE CONTROL  ✦", 600, 510);

  return canvas;
}

module.exports = {
  config: {
    name: "setmoney",
    aliases: ["setbal", "setcash"],
    version: "2.0",
    author: "Jayden",
    countDown: 3,
    role: 0,
    description: {
      fr: "Modifier directement le solde d'un membre."
    },
    category: "economy",
    guide: {
      fr: [
        "_setmoney <montant>",
        "_setmoney @membre <montant>",
        "",
        "Exemples :",
        "_setmoney 999999999",
        "_setmoney @membre 1b"
      ].join("\n")
    }
  },

  onStart: async function ({ message, event, args, usersData, api }) {
    const { senderID, mentions, messageReply } = event;

    if (!isOwner(senderID)) {
      return message.reply("⛔ Cette commande est réservée aux administrateurs.");
    }

    const mentionedID = Object.keys(mentions || {})[0];
    const targetID = mentionedID || messageReply?.senderID || senderID;

    const amountArg = targetID === senderID && !mentionedID && !messageReply
      ? args[0]
      : args.find(a => /^[\d,.]+[kmbtq]?$/i.test(a));

    const amount = parseAmount(amountArg);

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return message.reply(
        "⚠️ Montant invalide.\n\n" +
        "Exemples :\n" +
        "_setmoney 999999999\n" +
        "_setmoney @membre 1b"
      );
    }

    try {
      const userData = await usersData.get(targetID);

      if (!userData) {
        return message.reply("❌ Utilisateur introuvable.");
      }

      const oldBalance = Number(userData.money) || 0;

      // Remplacement direct du solde
      await usersData.set(targetID, {
        money: amount
      });

      let name = userData.name || `User_${targetID}`;

      try {
        const info = await api.getUserInfo([targetID]);
        name = info[targetID]?.name || name;
      } catch (_) {}

      if (typeof name !== "string") name = String(name);

      const canvas = await buildCard(
        { uid: targetID, name },
        oldBalance,
        amount
      );

      const cacheDir = path.join(__dirname, "cache");
      fs.ensureDirSync(cacheDir);

      const filePath = path.join(
        cacheDir,
        `setmoney_${targetID}_${Date.now()}.png`
      );

      fs.writeFileSync(filePath, canvas.toBuffer("image/png"));

      await message.reply({
        body: "◈ SETMONEY — SOLDE MIS À JOUR",
        attachment: fs.createReadStream(filePath)
      });

      setTimeout(() => {
        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (_) {}
      }, 30000);

    } catch (error) {
      console.error("[SETMONEY ERROR]", error);
      return message.reply("❌ Une erreur est survenue lors de la création de la carte.");
    }
  }
};
    
