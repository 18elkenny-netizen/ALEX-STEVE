
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "welcome",
    version: "3.0 KEN AI Edition",
    author: "KEN AI",
    category: "events"
  },

  onStart: async function ({ api, event }) {
    if (event.logMessageType !== "log:subscribe") return;

    const { threadID, logMessageData } = event;
    const newUsers = logMessageData.addedParticipants || [];
    const botID = String(api.getCurrentUserID());

    // Détecter l'arrivée de KEN AI
    const botJoined = newUsers.some(
      user => String(user.userFbId) === botID
    );

    // Présentation spéciale de KEN AI
    if (botJoined) {
      const intro =
`╭─────── ⋆｡˚ ☾ ˚｡⋆ ───────╮
       ✦ 𝑺𝒀𝑺𝑻𝑬𝑴 𝑶𝑵𝑳𝑰𝑵𝑬 ✦
╰─────── ⋆｡˚ ☾ ˚｡⋆ ───────╯

          ✧･ﾟ: *✧･ﾟ:* 
          𝑲𝑬𝑵 𝑨𝑰
          *:･ﾟ✧*:･ﾟ✧

꒰ა 💜 𝑩𝒐𝒏𝒋𝒐𝒖𝒓 𝒂̀ 𝒕𝒐𝒖𝒔 ! ໒꒱

Je suis 𝑲𝑬𝑵 𝑨𝑰, votre nouvel assistant intelligent. ✨
Je viens de rejoindre votre univers pour vous divertir, vous assister et rendre vos échanges encore plus intéressants.

╭───────「 🌸 𝑴𝑬𝑺 𝑭𝑶𝑵𝑪𝑻𝑰𝑶𝑵𝑺 」───────╮

꒰ 🧠 ꒱ 𝑹𝒂𝒑𝒉𝒂𝒆̈𝒍
       ↳ Assistant intelligent.

꒰ 💰 ꒱ _bal
       ↳ Consulter votre solde.

꒰ 🎁 ꒱ _give
       ↳ Transférer de l'argent.

꒰ 🎮 ꒱ _jeu
       ↳ Jouer et vous divertir.

꒰ ❔ ꒱ _help
       ↳ Découvrir mes commandes.

╰────────────────────────────╯

꒰ ⚙️ ꒱ 𝑷𝒓𝒆́𝒇𝒊𝒙𝒆 : _

╭─────── ⋆｡˚ ✦ ˚｡⋆ ───────╮
« 𝑼𝒏 𝒏𝒐𝒖𝒗𝒆𝒂𝒖 𝒔𝒚𝒔𝒕𝒆̀𝒎𝒆
𝒗𝒊𝒆𝒏𝒕 𝒅𝒆 𝒓𝒆𝒋𝒐𝒊𝒏𝒅𝒓𝒆
𝒗𝒐𝒕𝒓𝒆 𝒖𝒏𝒊𝒗𝒆𝒓𝒔. » 💜

      ☾ END OF INTRODUCTION ☽
╰─────── ⋆｡˚ ✦ ˚｡⋆ ───────╯`;

      try {
        await api.sendMessage(intro, threadID);
      } catch (err) {
        console.error("KEN AI introduction error:", err);
      }
    }

    // Ne pas traiter le bot comme un nouveau membre ordinaire
    const membersToWelcome = newUsers.filter(
      user => String(user.userFbId) !== botID
    );

    if (membersToWelcome.length === 0) return;

    try {
      const threadInfo = await api.getThreadInfo(threadID);
      const groupName = threadInfo.threadName || "Secteur Inconnu";
      const memberCount = threadInfo.participantIDs.length;

      for (const user of membersToWelcome) {
        const userId = user.userFbId;
        const fullName = user.fullName;

        let imagePath;

        try {
          const timeStr = new Date().toLocaleString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour12: false
          });

          // Avatar : token configuré dans Render
          const fbToken = process.env.FB_TOKEN;
          const tokenPart = fbToken
            ? `&access_token=${encodeURIComponent(fbToken)}`
            : "";

          const userAvatar =
            `https://graph.facebook.com/${userId}/picture?width=400&height=400${tokenPart}`;

          const backgroundUrl =
            "https://i.ibb.co/4YBNyvP/images-76.jpg";

          const apiUrl =
            `https://zetbot-page.onrender.com/api/welcome?username=${encodeURIComponent(fullName)}&avatarUrl=${encodeURIComponent(userAvatar)}&groupname=${encodeURIComponent(groupName)}&bg=${encodeURIComponent(backgroundUrl)}&memberCount=${memberCount}`;

          const tmp = path.join(__dirname, "..", "cache");
          await fs.ensureDir(tmp);

          imagePath = path.join(
            tmp,
            `welcome_${userId}_${Date.now()}.png`
          );

          // Carte de bienvenue originale : conservée
          const response = await axios.get(apiUrl, {
            responseType: "arraybuffer",
            timeout: 10000
          });

          await fs.writeFile(imagePath, response.data);

          const msg =
`✨ 🌸 **[ NOUVEAU SIGNAL D'ARRIVÉE ]** 🌸 ✨
━━━━━━━━━━━━━━━━━━━━━━━━━━
꒰ა ✦ **WELCOME PROTOCOL** ✦ ໒꒱

» 👤 **Utilisateur :** ${fullName}
» 💬 **Bienvenue dans :** ${groupName}
» 📊 **Index de présence :** Membre n° ${memberCount}

✦ _Installe-toi confortablement et respecte les règles du groupe !_ ✦
━━━━━━━━━━━━━━━━━━━━━━━━━━
⏰ Synchronisé le : ${timeStr}`;

          await api.sendMessage({
            body: msg,
            attachment: fs.createReadStream(imagePath),
            mentions: [{ tag: fullName, id: userId }]
          }, threadID);

        } catch (err) {
          console.error(
            `Welcome card error for ${userId}:`,
            err
          );
        } finally {
          if (imagePath) {
            try {
              if (fs.existsSync(imagePath)) {
                await fs.unlink(imagePath);
              }
            } catch (e) {}
          }
        }
      }
    } catch (gErr) {
      console.error("Error fetching thread info:", gErr);
    }
  }
};
