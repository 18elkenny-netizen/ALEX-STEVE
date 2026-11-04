const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "welcome",
    version: "3.2 BLACKWOOD Edition",
    author: "KENNY BLACKWOOD",
    category: "events"
  },

  onStart: async function ({ api, event }) {
    if (event.logMessageType !== "log:subscribe") return;

    const { threadID, logMessageData } = event;
    const newUsers = logMessageData.addedParticipants || [];
    const botID = String(api.getCurrentUserID());

    // Détecter l'arrivée de BLACKWOOD
    const botJoined = newUsers.some(
      user => String(user.userFbId) === botID
    );

    // Présentation spéciale de BLACKWOOD
    if (botJoined) {
      try {
        // Récupérer automatiquement le nom Facebook du bot
        let botName = "BLACKWOOD";

        try {
          const botInfo = await api.getUserInfo(botID);
          botName = botInfo?.[botID]?.name || botName;
        } catch (nameErr) {
          console.error("BLACKWOOD name error:", nameErr);
        }

        const intro =

`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

𓆩 🦇 𝐁𝐋𝐀𝐂𝐊𝐖𝐎𝐎𝐃 𓆪

${botName} ☂
⚡ CONNECTED SUCCESSFULLY

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👑 𝐁𝐎𝐓 𝐀𝐃𝐌𝐈𝐍 :
𓆩 ᏦᎬᏁᏁᎽ ᏰᏝᎪᏨᏦᏯᎾᎾᎠ 𓆪

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔵 𝐅𝐀𝐂𝐄𝐁𝐎𝐎𝐊 :
https://www.facebook.com/profile.php?id=61595650165092

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟢 𝐖𝐇𝐀𝐓𝐒𝐀𝐏𝐏 :
wa.me/261360563128

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

☠️ 𝐖𝐄𝐋𝐂𝐎𝐌𝐄 𝐓𝐎
      𝐓𝐇𝐄 𝐃𝐀𝐑𝐊 𝐒𝐈𝐃𝐄

   『 𝐍𝐎𝐓 𝐉𝐔𝐒𝐓 𝐀 𝐁𝐎𝐓 』
      𓆩 🖤 𝐀 𝐋𝐄𝐆𝐀𝐂𝐘 🖤 𓆪

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

        await api.sendMessage(intro, threadID);

      } catch (err) {
        console.error("BLACKWOOD introduction error:", err);
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

          // Récupération améliorée de la photo de profil
          const fbToken = process.env.FB_TOKEN;

          const tokenPart = fbToken
            ? `&access_token=${encodeURIComponent(fbToken)}`
            : "";

          // Résolution élevée pour récupérer une photo plus nette
          const avatarUrls = [
            `https://graph.facebook.com/${userId}/picture?type=large&width=720&height=720${tokenPart}`,
            `https://graph.facebook.com/${userId}/picture?width=720&height=720${tokenPart}`,
            `https://graph.facebook.com/${userId}/picture?type=large${tokenPart}`
          ];

          let userAvatar = avatarUrls[0];

          // Vérifier les différentes possibilités de récupération
          for (const avatarUrl of avatarUrls) {
            try {
              const avatarCheck = await axios.get(avatarUrl, {
                responseType: "arraybuffer",
                timeout: 10000,
                maxRedirects: 5,
                validateStatus: status => status >= 200 && status < 400
              });

              if (avatarCheck.data && avatarCheck.data.length > 0) {
                userAvatar = avatarUrl;
                break;
              }
            } catch (avatarErr) {
              console.log(
                `Avatar attempt failed for ${userId}:`,
                avatarErr.message
              );
            }
          }

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

`✨ 🌸 [ NOUVEAU SIGNAL D'ARRIVÉE ] 🌸 ✨
━━━━━━━━━━━━━━━━━━━━━━━━━━
꒰ა ✦ WELCOME PROTOCOL ✦ ໒꒱

» 👤 Utilisateur : ${fullName}
» 💬 Bienvenue dans : ${groupName}
» 📊 Index de présence : Membre n° ${memberCount}

✦ Installe-toi confortablement et respecte les règles du groupe ! ✦
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
