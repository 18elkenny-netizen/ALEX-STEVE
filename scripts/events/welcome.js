const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "welcome",
    version: "3.4 BLACKWOOD Edition",
    author: "KENNY BLACKWOOD",
    category: "events"
  },

  onStart: async function ({ api, event }) {
    if (event.logMessageType !== "log:subscribe") return;

    const { threadID, logMessageData } = event;
    const newUsers = logMessageData.addedParticipants || [];
    const botID = String(api.getCurrentUserID());

    // ==================================
    // DÉTECTION DE L'ARRIVÉE DU BOT
    // ==================================

    const botJoined = newUsers.some(
      user => String(user.userFbId) === botID
    );

    if (botJoined) {
      try {
        let botName = "BLACKWOOD";

        try {
          const botInfo = await api.getUserInfo(botID);
          botName =
            botInfo?.[botID]?.name ||
            botInfo?.name ||
            botName;
        } catch (err) {
          console.error("BLACKWOOD name error:", err.message);
        }

        const intro =

`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          𓆩 🦇 𝐁𝐋𝐀𝐂𝐊𝐖𝐎𝐎𝐃 𓆪
            ☂ ${botName} ☂
     ⚡ CONNECTED SUCCESSFULLY ⚡
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👑 𝐁𝐎𝐓 𝐀𝐃𝐌𝐈𝐍 :𓆩 ᏦᎬᏁᏁᎽ ᏰᏝᎪᏨᏦᏯᎾᎾᎠ 𓆪
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔵 𝐅𝐀𝐂𝐄𝐁𝐎𝐎𝐊 :
https://www.facebook.com/profile.php?id=61595650165092
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 𝐖𝐇𝐀𝐓𝐒𝐀𝐏𝐏 : wa.me/261360563128
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

    // ==================================
    // EXCLURE LE BOT
    // ==================================

    const membersToWelcome = newUsers.filter(
      user => String(user.userFbId) !== botID
    );

    if (membersToWelcome.length === 0) return;

    try {
      const threadInfo = await api.getThreadInfo(threadID);

      const groupName =
        threadInfo.threadName || "Secteur Inconnu";

      const memberCount =
        threadInfo.participantIDs?.length || 0;

      // ==================================
      // FONCTION DE RÉCUPÉRATION AVATAR
      // ==================================

      async function getAvatar(userId, participant) {

        let userInfo = {};

        try {
          const result = await api.getUserInfo(userId);

          userInfo =
            result?.[userId] ||
            result?.[String(userId)] ||
            result ||
            {};

        } catch (err) {
          console.error(
            "User info error:",
            userId,
            err.message
          );
        }

        // Récupération de toutes les URL possibles
        const possibleUrls = [
          participant?.thumbSrc,
          participant?.picture,
          participant?.avatar,
          participant?.avatarUrl,
          participant?.photoUrl,
          participant?.profilePicture,
          participant?.profilePic,

          userInfo?.thumbSrc,
          userInfo?.picture,
          userInfo?.avatar,
          userInfo?.avatarUrl,
          userInfo?.photoUrl,
          userInfo?.profilePicture,
          userInfo?.profilePic,
          userInfo?.image,
          userInfo?.imageUrl,
          userInfo?.photo,
          userInfo?.thumbnail
        ];

        const uniqueUrls = [...new Set(
          possibleUrls.filter(url =>
            typeof url === "string" &&
            /^https?:\/\//i.test(url)
          )
        )];

        // Vérification des URL
        for (const url of uniqueUrls) {
          try {
            const response = await axios.get(url, {
              responseType: "arraybuffer",
              timeout: 15000,
              maxRedirects: 10,
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
                "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"
              },
              validateStatus: status =>
                status >= 200 && status < 400
            });

            const contentType =
              response.headers["content-type"] || "";

            if (
              contentType.toLowerCase().includes("image/") &&
              response.data &&
              response.data.length > 100
            ) {
              console.log(
                "Avatar successfully retrieved:",
                userId
              );

              return url;
            }

          } catch (err) {
            console.log(
              "Avatar URL failed:",
              err.message
            );
          }
        }

        // ==================================
        // FACEBOOK GRAPH FALLBACK
        // ==================================

        const fallbackUrls = [
          `https://graph.facebook.com/${userId}/picture?type=large`,
          `https://graph.facebook.com/${userId}/picture?type=large&redirect=true`
        ];

        if (process.env.FB_TOKEN) {
          fallbackUrls.unshift(
            `https://graph.facebook.com/${userId}/picture?type=large&access_token=${encodeURIComponent(process.env.FB_TOKEN)}`
          );
        }

        for (const url of fallbackUrls) {
          try {
            const response = await axios.get(url, {
              responseType: "arraybuffer",
              timeout: 15000,
              maxRedirects: 10,
              headers: {
                "User-Agent": "Mozilla/5.0"
              },
              validateStatus: status =>
                status >= 200 && status < 400
            });

            const contentType =
              response.headers["content-type"] || "";

            if (
              contentType.toLowerCase().includes("image/") &&
              response.data &&
              response.data.length > 100
            ) {
              console.log(
                "Facebook fallback avatar retrieved:",
                userId
              );

              return url;
            }

          } catch (err) {
            console.log(
              "Facebook fallback failed:",
              err.message
            );
          }
        }

        console.error(
          "No accessible profile picture:",
          userId
        );

        return null;
      }

      // ==================================
      // ACCUEIL DES NOUVEAUX MEMBRES
      // ==================================

      for (const user of membersToWelcome) {

        const userId = String(user.userFbId);

        const fullName =
          user.fullName || "Nouvel arrivant";

        let imagePath = null;

        try {

          const timeStr = new Date().toLocaleString(
            "fr-FR",
            {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour12: false
            }
          );

          // ==================================
          // RÉCUPÉRATION DE LA PHOTO
          // ==================================

          const userAvatar = await getAvatar(
            userId,
            user
          );

          // ==================================
          // GÉNÉRATION DE LA CARTE
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

          const tmp = path.join(
            __dirname,
            "..",
            "cache"
          );

          await fs.ensureDir(tmp);

          imagePath = path.join(
            tmp,
            `welcome_${userId}_${Date.now()}.png`
          );

          const response = await axios.get(apiUrl, {
            responseType: "arraybuffer",
            timeout: 45000,
            headers: {
              "User-Agent": "BLACKWOOD-BOT/3.4"
            }
          });

          // Vérification du résultat de l'API
          const contentType =
            response.headers["content-type"] || "";

          if (
            !contentType.toLowerCase().includes("image/") ||
            !response.data ||
            response.data.length < 500
          ) {
            throw new Error(
              "L'API Welcome n'a pas retourné une image valide."
            );
          }

          await fs.writeFile(
            imagePath,
            response.data
          );

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

          await api.sendMessage(
            {
              body: msg,
              attachment: fs.createReadStream(imagePath),
              mentions: [
                {
                  tag: fullName,
                  id: userId
                }
              ]
            },
            threadID
          );

          console.log(
            `Welcome successfully sent to ${fullName} (${userId})`
          );

        } catch (err) {

          console.error(
            `Welcome card error for ${userId}:`,
            err
          );

          // Message de secours si la carte échoue
          try {
            await api.sendMessage(
              {
                body:
`🌸 Bienvenue ${fullName} !
━━━━━━━━━━━━━━━━━━━━
👤 Nouveau membre : ${fullName}
💬 Groupe : ${groupName}
━━━━━━━━━━━━━━━━━━━━
🖤 BLACKWOOD vous souhaite la bienvenue.`,
                mentions: [
                  {
                    tag: fullName,
                    id: userId
                  }
                ]
              },
              threadID
            );

          } catch (sendError) {
            console.error(
              "Fallback welcome error:",
              sendError.message
            );
          }

        } finally {

          // ==================================
          // SUPPRESSION DU FICHIER TEMPORAIRE
          // ==================================

          if (imagePath) {
            try {
              if (await fs.pathExists(imagePath)) {
                await fs.unlink(imagePath);
              }
            } catch (err) {
              console.error(
                "Image cleanup error:",
                err.message
              );
            }
          }
        }
      }

    } catch (err) {
      console.error(
        "Error fetching thread info:",
        err
      );
    }
  }
};
