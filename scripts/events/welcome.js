const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "welcome",
    version: "3.3 BLACKWOOD Edition",
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
        let botName = "BLACKWOOD";

        try {
          const botInfo = await api.getUserInfo(botID);
          botName = botInfo?.[botID]?.name || botInfo?.name || botName;
        } catch (err) {
          console.error("BLACKWOOD name error:", err.message);
        }

        const intro =

`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       𓆩 🦇 𝐁𝐋𝐀𝐂𝐊𝐖𝐎𝐎𝐃 𓆪
            ${botName} ☂
    ⚡ CONNECTED SUCCESSFULLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👑 𝐁𝐎𝐓 𝐀𝐃𝐌𝐈𝐍 :𓆩 ᏦᎬᏁᏁᎽ ᏰᏝᎪᏨᏦᏯᎾᎾᎠ 𓆪
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔵 𝐅𝐀𝐂𝐄𝐁𝐎𝐎𝐊 :
https://www.facebook.com/profile.php?id=61595650165092
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 𝐖𝐇𝐀𝐓𝐒𝐀𝐏𝐏 :wa.me/261360563128
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ☠️ 𝐖𝐄𝐋𝐂𝐎𝐌𝐄 𝐓𝐎 𝐓𝐇𝐄 𝐃𝐀𝐑𝐊 𝐒𝐈𝐃𝐄 ☠️
       『 𝐍𝐎𝐓 𝐉𝐔𝐒𝐓 𝐀 𝐁𝐎𝐓 』
        𓆩 🖤 𝐀 𝐋𝐄𝐆𝐀𝐂𝐘 🖤 𓆪
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

        await api.sendMessage(intro, threadID);

      } catch (err) {
        console.error("BLACKWOOD introduction error:", err);
      }
    }

    // Exclure le bot des nouveaux membres
    const membersToWelcome = newUsers.filter(
      user => String(user.userFbId) !== botID
    );

    if (membersToWelcome.length === 0) return;

    try {
      const threadInfo = await api.getThreadInfo(threadID);
      const groupName = threadInfo.threadName || "Secteur Inconnu";
      const memberCount = threadInfo.participantIDs.length;

      for (const user of membersToWelcome) {
        const userId = String(user.userFbId);
        const fullName = user.fullName || "Nouvel arrivant";

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

          // ==================================
          // RÉCUPÉRATION DE LA PHOTO DE PROFIL
          // ==================================

          let userAvatar = null;

          try {
            const userInfo = await api.getUserInfo(userId);
            const profile = userInfo?.[userId] || userInfo;

            const possibleAvatars = [
              profile?.thumbSrc,
              profile?.picture,
              profile?.avatar,
              profile?.avatarUrl,
              profile?.photoUrl,
              profile?.profilePicture
            ];

            userAvatar = possibleAvatars.find(
              url => typeof url === "string" &&
              /^https?:\/\//i.test(url)
            ) || null;

          } catch (profileError) {
            console.error(
              `Profile retrieval error for ${userId}:`,
              profileError.message
            );
          }

          // Vérifier que l'URL correspond réellement à une image
          const checkImage = async (url) => {
            if (!url) return false;

            try {
              const response = await axios.get(url, {
                responseType: "arraybuffer",
                timeout: 15000,
                maxRedirects: 10,
                headers: {
                  "User-Agent": "Mozilla/5.0"
                },
                validateStatus: status => status >= 200 && status < 400
              });

              const contentType =
                response.headers["content-type"] || "";

              return (
                contentType.toLowerCase().includes("image/") &&
                response.data &&
                response.data.length > 100
              );

            } catch (err) {
              console.log(
                `Avatar verification failed for ${userId}:`,
                err.message
              );
              return false;
            }
          };

          // Vérifier d'abord la photo récupérée par GoatBot
          if (!(await checkImage(userAvatar))) {
            userAvatar = null;
          }

          // Solution de secours avec Facebook Graph
          if (!userAvatar) {
            const fbToken = process.env.FB_TOKEN;

            if (fbToken) {
              const fallbackUrl =
                `https://graph.facebook.com/${userId}/picture?type=large&access_token=${encodeURIComponent(fbToken)}`;

              if (await checkImage(fallbackUrl)) {
                userAvatar = fallbackUrl;
              }
            }
          }

          if (!userAvatar) {
            console.error(
              `Aucune photo de profil accessible pour ${userId}`
            );
          }

          // ==================================
          // GÉNÉRATION DE LA CARTE DE BIENVENUE
          // ==================================

          const backgroundUrl =
            "https://i.ibb.co/4YBNyvP/images-76.jpg";

          const params = new URLSearchParams({
            username: fullName,
            avatarUrl: userAvatar || "",
            groupname: groupName,
            bg: backgroundUrl,
            memberCount: String(memberCount)
          });

          const apiUrl =
            `https://zetbot-page.onrender.com/api/welcome?${params.toString()}`;

          const tmp = path.join(__dirname, "..", "cache");
          await fs.ensureDir(tmp);

          imagePath = path.join(
            tmp,
            `welcome_${userId}_${Date.now()}.png`
          );

          const response = await axios.get(apiUrl, {
            responseType: "arraybuffer",
            timeout: 30000,
            headers: {
              "User-Agent": "BLACKWOOD-BOT/3.3"
            }
          });

          await fs.writeFile(imagePath, response.data);

          // Vérifier que l'image générée existe
          if (
            !(await fs.pathExists(imagePath)) ||
            (await fs.stat(imagePath)).size === 0
          ) {
            throw new Error("La carte de bienvenue est vide.");
          }

          // ==================================
          // MESSAGE DE BIENVENUE
          // ==================================

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
            mentions: [
              {
                tag: fullName,
                id: userId
              }
            ]
          }, threadID);

        } catch (err) {
          console.error(
            `Welcome card error for ${userId}:`,
            err
          );

        } finally {
          if (imagePath) {
            try {
              if (await fs.pathExists(imagePath)) {
                await fs.unlink(imagePath);
              }
            } catch (err) {
              console.error("Image cleanup error:", err.message);
            }
          }
        }
      }

    } catch (err) {
      console.error("Error fetching thread info:", err);
    }
  }
};
