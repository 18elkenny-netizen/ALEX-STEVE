
const { Readable } = require("stream");
const {
  createProfileCard
} = require("../func/enigmaCard");

function getLevel(totalXP) {
  let level = 1;
  let remaining = totalXP || 0;
  let needed = 1000;

  while (remaining >= needed) {
    remaining -= needed;
    level++;
    needed = 1000 + (level - 1) * 200;
  }

  return {
    level,
    xpProgress: remaining,
    xpNeeded: needed
  };
}

module.exports = {
  config: {
    name: "enigmestat",
    aliases: ["enigmeprofil"],
    version: "1.0.0",
    author: "KEN AI",
    countDown: 5,
    role: 0,
    shortDescription: "Voir son profil Enigma",
    longDescription: "Affiche les points, l'expérience et le niveau d'un joueur.",
    category: "games",
    guide: "{pn} ou {pn} @membre"
  },

  onStart: async function ({ message, event, usersData }) {
    try {
      const mentions = event.mentions || {};
      const mentionedIDs = Object.keys(mentions);

      const userID = String(
        mentionedIDs.length > 0
          ? mentionedIDs[0]
          : event.senderID
      );

      const name = await usersData.getName(userID);
      const avatarUrl = await usersData.getAvatarUrl(userID);

      const user = await usersData.get(userID);

      const stats = user?.data?.enigma || {
        points: 0,
        xp: 0,
        wins: 0,
        games: 0,
        streak: 0
      };

      // Récupération des profils pour le classement
      let rank = 1;

      try {
        const allUsers = await usersData.getAll();

        const list = Array.isArray(allUsers)
          ? allUsers
          : Object.values(allUsers || {});

        const ranking = list
          .map(item => item?.data?.enigma)
          .filter(Boolean)
          .sort((a, b) => {
            if ((b.points || 0) !== (a.points || 0)) {
              return (b.points || 0) - (a.points || 0);
            }

            return (b.xp || 0) - (a.xp || 0);
          });

        const position = ranking.findIndex(item =>
          (item.points || 0) === (stats.points || 0) &&
          (item.xp || 0) === (stats.xp || 0)
        );

        if (position !== -1) {
          rank = position + 1;
        }
      } catch (rankError) {
        console.error("Erreur classement Enigma :", rankError);
      }

      const levelData = getLevel(stats.xp);

      const card = await createProfileCard({
        name,
        avatarUrl,
        points: stats.points || 0,
        xp: stats.xp || 0,
        wins: stats.wins || 0,
        games: stats.games || 0,
        level: levelData.level,
        xpProgress: levelData.xpProgress,
        xpNeeded: levelData.xpNeeded,
        rank: `#${rank}`
      });

      return message.reply({
        body:
`☾ 𝑲𝑬𝑵 𝑨𝑰 — 𝑬𝑵𝑰𝑮𝑴𝑨 𝑷𝑹𝑶𝑭𝑰𝑳 ☽

♛ Voici la fiche de ${name} !

💎 Points : ${stats.points || 0}
🌟 Expérience : ${stats.xp || 0} XP
👑 Niveau : ${levelData.level}
🏆 Classement : #${rank}

✦ Continue à résoudre des énigmes pour progresser !`,
        attachment: Readable.from(card)
      });

    } catch (err) {
      console.error("Erreur enigmestat :", err);
      return message.reply(
        "Impossible de générer le profil Enigma. Vérifie les logs de Render."
      );
    }
  }
};
