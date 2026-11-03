
const axios = require("axios");
const { createCanvas, loadImage } = require("canvas");

const WIDTH = 1200;
const HEIGHT = 800;

function roundedRect(ctx, x, y, w, h, r, color, stroke = "#A855F7") {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function drawText(ctx, text, x, y, size = 28, color = "#F1D9FF", align = "left") {
  ctx.font = `${size}px Georgia`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(String(text), x, y);
}

async function getAvatar(url) {
  if (!url) return null;

  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 7000
    });

    return await loadImage(Buffer.from(response.data));
  } catch (err) {
    return null;
  }
}

function drawAvatar(ctx, avatar, name) {
  const x = 150;
  const y = 190;
  const radius = 85;

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (avatar) {
    ctx.drawImage(
      avatar,
      x - radius,
      y - radius,
      radius * 2,
      radius * 2
    );
  } else {
    ctx.fillStyle = "#542080";
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    drawText(ctx, (name || "?").charAt(0).toUpperCase(), x, y + 25, 75, "#FFFFFF", "center");
  }

  ctx.restore();

  ctx.beginPath();
  ctx.arc(x, y, radius + 7, 0, Math.PI * 2);
  ctx.lineWidth = 7;
  ctx.strokeStyle = "#C084FC";
  ctx.shadowColor = "#A855F7";
  ctx.shadowBlur = 25;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawBackground(ctx) {
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, "#090313");
  gradient.addColorStop(0.5, "#1D0739");
  gradient.addColorStop(1, "#080210");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = "#A855F7";
  ctx.lineWidth = 5;
  ctx.strokeRect(18, 18, WIDTH - 36, HEIGHT - 36);

  ctx.strokeStyle = "#5B21B6";
  ctx.lineWidth = 2;
  ctx.strokeRect(30, 30, WIDTH - 60, HEIGHT - 60);

  for (let i = 0; i < 75; i++) {
    const x = Math.random() * WIDTH;
    const y = Math.random() * HEIGHT;

    ctx.beginPath();
    ctx.arc(x, y, Math.random() * 2 + 1, 0, Math.PI * 2);
    ctx.fillStyle = "#D8B4FE";
    ctx.fill();
  }
}

function drawHeader(ctx, subtitle) {
  drawText(ctx, "KEN AI", 65, 80, 40, "#D8B4FE");
  drawText(ctx, "GAME SYSTEM", 65, 112, 19, "#C084FC");

  drawText(ctx, "ROYAL ENIGMA", 600, 88, 48, "#E9D5FF", "center");
  drawText(ctx, subtitle, 600, 125, 22, "#C084FC", "center");

  ctx.beginPath();
  ctx.moveTo(55, 145);
  ctx.lineTo(1145, 145);
  ctx.strokeStyle = "#8B5CF6";
  ctx.lineWidth = 2;
  ctx.stroke();
}

async function createQuestionCard(data) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  drawBackground(ctx);
  drawHeader(ctx, "TESTEZ VOTRE ESPRIT ET TROUVEZ LA BONNE RÉPONSE");

  const avatar = await getAvatar(data.avatarUrl);

  roundedRect(ctx, 45, 175, 300, 570, 25, "#130722");
  drawAvatar(ctx, avatar, data.name);

  drawText(ctx, data.name, 195, 325, 25, "#F3E8FF", "center");
  drawText(ctx, `NIVEAU ${data.level}`, 195, 365, 22, "#C084FC", "center");

  drawText(ctx, `${data.points} POINTS`, 195, 430, 25, "#E9D5FF", "center");
  drawText(ctx, `${data.xpProgress} / ${data.xpNeeded} XP`, 195, 475, 22, "#C084FC", "center");

  roundedRect(ctx, 75, 500, 240, 18, 9, "#32164F", "#32164F");
  roundedRect(
    ctx,
    75,
    500,
    240 * Math.min(1, data.xpProgress / data.xpNeeded),
    18,
    9,
    "#C084FC",
    "#C084FC"
  );

  drawText(ctx, "DEVINETTE", 745, 230, 48, "#E9D5FF", "center");
  drawText(ctx, `ÉNIGME #${data.number}`, 745, 280, 25, "#C084FC", "center");

  roundedRect(ctx, 385, 310, 760, 220, 25, "#10051F", "#A855F7");

  drawText(ctx, data.question, 765, 385, 30, "#F5E8FF", "center");
  drawText(ctx, "CHOISISSEZ LA BONNE RÉPONSE", 765, 455, 22, "#C084FC", "center");

  const positions = [
    [385, 565],
    [775, 565],
    [385, 650],
    [775, 650]
  ];

  data.options.forEach((option, index) => {
    const [x, y] = positions[index];
    roundedRect(ctx, x, y, 370, 65, 15, "#210D3A", "#A855F7");
    drawText(
      ctx,
      `${String.fromCharCode(65 + index)}. ${option}`,
      x + 185,
      y + 42,
      23,
      "#F3E8FF",
      "center"
    );
  });

  drawText(ctx, "KEN AI  •  GAME DIVISION", 600, 730, 20, "#C084FC", "center");

  return canvas.toBuffer("image/png");
}

async function createProfileCard(data) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  drawBackground(ctx);
  drawHeader(ctx, "VOTRE IDENTITÉ DANS LE ROYAUME DES ÉNIGMES");

  const avatar = await getAvatar(data.avatarUrl);

  roundedRect(ctx, 55, 175, 1090, 565, 30, "#130722");

  drawAvatar(ctx, avatar, data.name);

  drawText(ctx, data.name, 285, 205, 42, "#F3E8FF");
  drawText(ctx, `Facebook : ${data.name}`, 285, 250, 21, "#C084FC");
  drawText(ctx, `NIVEAU ${data.level}  •  ${data.rank}`, 285, 295, 25, "#E9D5FF");

  const boxes = [
    { x: 90, y: 365, title: "POINTS", value: data.points },
    { x: 625, y: 365, title: "EXPÉRIENCE", value: `${data.xp} XP` },
    { x: 90, y: 495, title: "VICTOIRES", value: data.wins },
    { x: 625, y: 495, title: "PARTIES", value: data.games }
  ];

  for (const box of boxes) {
    roundedRect(ctx, box.x, box.y, 485, 105, 18, "#25103F", "#9333EA");
    drawText(ctx, box.title, box.x + 25, box.y + 35, 19, "#C084FC");
    drawText(ctx, box.value, box.x + 455, box.y + 72, 35, "#F3E8FF", "right");
  }

  drawText(
    ctx,
    `PROGRESSION : ${data.xpProgress} / ${data.xpNeeded} XP`,
    600,
    645,
    23,
    "#E9D5FF",
    "center"
  );

  roundedRect(ctx, 170, 670, 860, 22, 11, "#32164F", "#32164F");

  roundedRect(
    ctx,
    170,
    670,
    860 * Math.min(1, data.xpProgress / data.xpNeeded),
    22,
    11,
    "#C084FC",
    "#C084FC"
  );

  drawText(ctx, "KEN AI  •  ROYAL ENIGMA", 600, 725, 21, "#C084FC", "center");

  return canvas.toBuffer("image/png");
}

module.exports = {
  createQuestionCard,
  createProfileCard
};
