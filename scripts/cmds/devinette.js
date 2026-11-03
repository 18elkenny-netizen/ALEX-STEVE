
const { Readable } = require("stream");
const {
  createQuestionCard
} = require("../func/enigmaCard");

const QUESTIONS = [
  {
    question: "Je suis un fruit violet, mais je ne pousse pas sur un arbre. Qui suis-je ?",
    options: ["Une prune", "Une myrtille", "Une aubergine", "Un raisin"],
    answer: 2
  },
  {
    question: "Quel personnage possède le pouvoir du Gear 5 ?",
    options: ["Naruto", "Luffy", "Ichigo", "Goku"],
    answer: 1
  },
  {
    question: "Je suis le compagnon de Naruto, je suis un renard à neuf queues. Qui suis-je ?",
    options: ["Shukaku", "Kurama", "Gyuki", "Matatabi"],
    answer: 1
  },
  {
    question: "Quel est le nom du capitaine des pirates au chapeau de paille ?",
    options: ["Zoro", "Sanji", "Monkey D. Luffy", "Shanks"],
    answer: 2
  },
  {
    question: "Dans Dragon Ball, quelle transformation donne des cheveux dorés à Goku ?",
    options: ["Kaioken", "Super Saiyan", "Ultra Instinct", "Fusion"],
    answer: 1
  },
  {
    question: "Quel est le nom du frère de Tanjiro dans Demon Slayer ?",
    options: ["Zenitsu", "Inosuke", "Il n'a pas de frère", "Giyu"],
    answer: 2
  },
  {
    question: "Quel est le nom du village de Naruto ?",
    options: ["Konoha", "Suna", "Kiri", "Iwa"],
    answer: 0
  }
];

const ACTIVE = new Set();

function getLevel(totalXP) {
  let level = 1;
  let remaining = totalXP;
  let needed = 1000;

  while (remaining >= needed) {
    remaining -= needed;
    level++;
    needed = 1000 + (level - 1) * 200;
  }

  return { level, xpProgress: remaining, xpNeeded: needed };
}

async function getStats(usersData, userID) {
  const user = await usersData.get(userID);
  return user?.data?.enigma || {
    points: 0,
    xp: 0,
    wins: 0,
    games: 0,
    streak: 0
  };
}

async function saveStats(usersData, userID, stats) {
  await usersData.set(userID, stats, "data.enigma");
}

module.exports = {
  config: {
    name: "devinette",
    aliases: ["enigme", "riddle"],
    version: "1.0.0",
    author: "KEN AI",
    countDown: 5,
    role: 0,
    shortDescription: "Jouer aux devinettes",
    longDescription: "Réponds aux énigmes et gagne des points et de l'expérience.",
    category: "games",
    guide: "{pn}"
  },

  onStart: async function ({ message, event, usersData }) {
    const userID = String(event.senderID);
    const threadID = String(event.threadID);

    if (ACTIVE.has(userID)) {
      return message.reply(
        "☾ Tu as déjà une énigme en cours ! Termine-la avant d'en commencer une autre."
      );
    }

    try {
      const stats = await getStats(usersData, userID);
      const levelData = getLevel(stats.xp);
      const name = await usersData.getName(userID);
      const avatarUrl = await usersData.getAvatarUrl(userID);

      const question = QUESTIONS[
        Math.floor(Math.random() * QUESTIONS.length)
      ];

      const card = await createQuestionCard({
        name,
        avatarUrl,
        points: stats.points,
        level: levelData.level,
        xpProgress: levelData.xpProgress,
        xpNeeded: levelData.xpNeeded,
        number: Math.floor(Math.random() * 900) + 1,
        question: question.question,
        options: question.options
      });

      const sent = await message.reply({
        body:
`☾ 𝑲𝑬𝑵 𝑨𝑰 — 𝑫𝑬𝑽𝑰𝑵𝑬𝑻𝑻𝑬 ☽

✦ Une énigme t'attend !
✦ Tu as 45 secondes pour répondre.
✦ Réponds en envoyant A, B, C ou D en réponse à cette carte.

♛ Bonne chance, ${name} !`,
        attachment: Readable.from(card)
      });

      if (!sent || !sent.messageID) {
        return message.reply(
          "Impossible de démarrer la partie : je n'ai pas reçu l'identifiant de la carte."
        );
      }

      ACTIVE.add(userID);

      global.GoatBot.onReply.set(sent.messageID, {
        commandName: "devinette",
        messageID: sent.messageID,
        userID,
        threadID,
        answer: question.answer,
        question: question.question,
        expiresAt: Date.now() + 45000
      });

      setTimeout(async () => {
        const current = global.GoatBot.onReply.get(sent.messageID);

        if (!current) return;

        global.GoatBot.onReply.delete(sent.messageID);
        ACTIVE.delete(userID);

        try {
          await global.GoatBot.api.sendMessage(
            `⌛ Temps écoulé, ${name} !\nLa bonne réponse était : ${String.fromCharCode(65 + question.answer)} — ${question.options[question.answer]}.\n\n☾ Une nouvelle énigme t'attend quand tu seras prêt !`,
            threadID
          );
        } catch (err) {
          console.error("Erreur fin de devinette :", err);
        }
      }, 45000);

    } catch (err) {
      ACTIVE.delete(userID);
      console.error("Erreur devinette :", err);
      return message.reply(
        "Une erreur est survenue pendant la création de ton énigme. Vérifie les logs de Render."
      );
    }
  },

  onReply: async function ({ event, Reply, usersData, message }) {
    const userID = String(event.senderID);

    if (userID !== String(Reply.userID)) {
      return message.reply(
        "Cette énigme appartient à un autre joueur. Lance `_devinette` pour jouer à ton tour."
      );
    }

    if (Date.now() > Reply.expiresAt) {
      global.GoatBot.onReply.delete(Reply.messageID);
      ACTIVE.delete(userID);
      return message.reply("⌛ Cette énigme a expiré.");
    }

    const input = String(event.body || "").trim().toUpperCase();
    const choice = input.replace(/[^ABCD]/g, "");

    if (!["A", "B", "C", "D"].includes(choice) || choice.length !== 1) {
      return message.reply("Réponse invalide ! Envoie seulement A, B, C ou D.");
    }

    global.GoatBot.onReply.delete(Reply.messageID);
    ACTIVE.delete(userID);

    try {
      const stats = await getStats(usersData, userID);
      stats.games = (stats.games || 0) + 1;

      const selected = choice.charCodeAt(0) - 65;
      const correct = selected === Reply.answer;

      if (correct) {
        stats.points = (stats.points || 0) + 100;
        stats.xp = (stats.xp || 0) + 50;
        stats.wins = (stats.wins || 0) + 1;
        stats.streak = (stats.streak || 0) + 1;

        await saveStats(usersData, userID, stats);

        const level = getLevel(stats.xp).level;

        return message.reply(
`╭─────── ⋆｡˚ ☾ ˚｡⋆ ───────╮
       ✨ 𝑩𝑹𝑨𝑽𝑶 ! 𝑩𝑶𝑵𝑵𝑬 𝑹𝑬́𝑷𝑶𝑵𝑺𝑬 ✨
╰──────────────────────────╯

♛ Réponse : ${choice}
💎 Récompense : +100 points
🌟 Expérience : +50 XP
👑 Niveau actuel : ${level}
🔥 Série : ${stats.streak}

☾ Continue de faire travailler ton esprit !`
        );
      }

      stats.streak = 0;
      await saveStats(usersData, userID, stats);

      return message.reply(
`☾ 𝑲𝑬𝑵 𝑨𝑰 — 𝑹𝑬́𝑺𝑼𝑳𝑻𝑨𝑻 ☽

✧ Ta réponse : ${choice}
✧ Bonne réponse : ${String.fromCharCode(65 + Reply.answer)}
✧ ${["A", "B", "C", "D"][Reply.answer]} — Réponse correcte : ${Reply.answer + 1}

Aucun point gagné cette fois.
Ne baisse pas les bras, une autre énigme t'attend !`
      );

    } catch (err) {
      console.error("Erreur réponse devinette :", err);
      return message.reply("Impossible d'enregistrer ton résultat.");
    }
  }
};
  
