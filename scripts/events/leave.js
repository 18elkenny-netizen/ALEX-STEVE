const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "leave",
    version: "5.0.0 SHADOW HD Edition",
    author: "KENNY BLACKWOOD",
    category: "events"
  },

  langs: {
    fr: {
      leaveType1: "a quitté le groupe de son plein gré",
      leaveType2: "a été expulsé(e) du groupe",

      messageVoluntary:
`╔═══════「 ☾ SHADOW SYSTEM ☽ 」═══════╗
       ⚜️ DÉCONNEXION DÉTECTÉE ⚜️
╚══════════════════════════════════╝

👤 Nom : {userName}
🚪 Statut : Départ volontaire

💬 « Même les légendes savent quand
il est temps de disparaître. »

☠️ Le groupe continuera sans toi.
Ne t'inquiète pas, personne ne va
arrêter le monde pour ton départ. 😏

🏰 Groupe : {threadName}
⏰ Heure : {time} | {session}

╔══════════════════════════════════╗
       SYSTEM : SESSION TERMINÉE
╚══════════════════════════════════╝`,

      messageRemoved:
`╔═══════「 ☾ SHADOW SYSTEM ☽ 」═══════╗
       ⚜️ EXPULSION DÉTECTÉE ⚜️
╚══════════════════════════════════╝

👤 Nom : {userName}
🚫 Statut : Retiré(e) du groupe

💬 « Visiblement, ta présence
n'était plus indispensable. »

☠️ Une place vient de se libérer.
Le groupe respire déjà un peu mieux.
La prochaine fois, réfléchis avant
de jouer au génie. 😈

🏰 Groupe : {threadName}
⏰ Heure : {time} | {session}

╔══════════════════════════════════╗
       SYSTEM : ACCÈS RÉVOQUÉ
╚══════════════════════════════════╝`
    }
  },

  onStart: async function ({
    threadsData,
    message,
    event,
    api,
    usersData,
    getLang
  }) {
    if (event.logMessageType !== "log:unsubscribe") return;

    const { threadID, logMessageData } = event;

    const leftParticipantFbId =
      logMessageData?.leftParticipantFbId;

    if (!leftParticipantFbId) return;

    const userId = String(leftParticipantFbId);
    const botID = String(api.getCurrentUserID());

    // Ne pas afficher le départ du bot
    if (userId === botID) return;

    let imagePath = null;

    try {
      // Vérifier les paramètres du groupe
      const threadData = await threadsData.get(threadID);

      if (
        threadData?.settings?.sendLeaveMessage === false
      ) return;

      // ==================================
      // INFORMATIONS DU GROUPE
      // ==================================

      let threadName = "Secteur Inconnu";
      let memberCount = 0;

      try {
        const threadInfo = await api.getThreadInfo(threadID);

        threadName =
          threadInfo.threadName || threadName;

        memberCount =
          threadInfo.participantIDs?.length || 0;

      } catch (err) {
        console.error("SHADOW thread error:", err.message);
      }

      // ==================================
      // NOM DU MEMBRE
      // ==================================

      let userName = "Membre inconnu";

      try {
        userName =
          await usersData.getName(userId) || userName;
      } catch (err) {
        console.error("SHADOW name error:", err.message);
      }

      // ==================================
      // RÉCUPÉRATION DE LA PHOTO DE PROFIL
      // ==================================

      let userAvatar = null;

      try {
        const userInfo = await api.getUserInfo(userId);
        const profile = userInfo?.[userId] || userInfo;

        if (profile?.name) {
          userName = profile.name;
        }

        // Priorité aux URL potentiellement HD
        const possibleAvatars = [
          profile?.largePictureUrl,
          profile?.profilePictureUrl,
          profile?.avatarUrl,
          profile?.photoUrl,
          profile?.profilePicture,
          profile?.picture,
          profile?.avatar,
          profile?.thumbSrc
        ];

        userAvatar = possibleAvatars.find(
          url =>
            typeof url === "string" &&
            /^https?:\/\//i.test(url)
        ) || null;

      } catch (err) {
        console.error(
          "SHADOW avatar retrieval error:",
          err.message
        );
      }

      // ==================================
      // VÉRIFICATION DE LA PHOTO
      // ==================================

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
            validateStatus: status =>
              status >= 200 && status < 400
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
            "SHADOW avatar verification:",
            err.message
          );

          return false;
        }
      };

      // Vérifier l'avatar de GoatBot
      if (!(await checkImage(userAvatar))) {
        userAvatar = null;
      }

      // ==================================
      // SECOURS FACEBOOK HD
      // ==================================

      if (!userAvatar) {
        const fbToken = process.env.FB_TOKEN;

        const fallbackUrl = fbToken
          ? `https://graph.facebook.com/${userId}/picture?width=1000&height=1000&access_token=${encodeURIComponent(fbToken)}`
          : `https://graph.facebook.com/${userId}/picture?width=1000&height=1000`;

        if (await checkImage(fallbackUrl)) {
          userAvatar = fallbackUrl;
        }
      }

      if (!userAvatar) {
        console.error(
          `SHADOW: aucune photo accessible pour ${userId}`
        );
      }

      // ==================================
      // DATE ET SESSION
      // ==================================

      const date = new Date();
      const hours = date.getHours();

      const timeFormatted =
        date.toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        });

      const session =
        hours <= 10 ? "Matin" :
        hours <= 12 ? "Midi" :
        hours <= 18 ? "Après-midi" :
        "Soirée";

      // Départ volontaire ou expulsion
      const voluntary =
        userId === String(event.author);

      const fallbackTemplate = voluntary
        ? module.exports.langs.fr.messageVoluntary
        : module.exports.langs.fr.messageRemoved;

      let template = fallbackTemplate;

      try {
        if (typeof getLang === "function") {
          template = getLang(
            voluntary
              ? "messageVoluntary"
              : "messageRemoved"
          ) || fallbackTemplate;
        }
      } catch (err) {
        console.error("SHADOW language error:", err.message);
      }

      const leaveMessage = template
        .replace(/\{userName\}/g, String(userName))
        .replace(/\{threadName\}/g, String(threadName))
        .replace(/\{time\}/g, timeFormatted)
        .replace(/\{session\}/g, session);

      // ==================================
      // GÉNÉRATION DE LA CARTE GOODBYE
      // ==================================

      const backgroundUrl =
        "https://i.ibb.co/4YBNyvP/images-76.jpg";

      // Conservation de ton API et de ses paramètres
      const params = new URLSearchParams({
        pp: userAvatar || "",
        nama: userName,
        bg: backgroundUrl,
        member: String(memberCount)
      });

      const apiUrl =
        `https://zetbot-page.onrender.com/api/goodbye?${params.toString()}`;

      const cacheDir = path.join(
        __dirname,
        "..",
        "cache"
      );

      await fs.ensureDir(cacheDir);

      imagePath = path.join(
        cacheDir,
        `leave_${userId}_${Date.now()}.png`
      );

      // ==================================
      // ENVOI DU MESSAGE ET DE LA CARTE
      // ==================================

      const form = {
        body: leaveMessage,
        mentions: [
          {
            tag: userName,
            id: userId
          }
        ]
      };

      try {
        const response = await axios.get(apiUrl, {
          responseType: "arraybuffer",
          timeout: 30000,
          maxRedirects: 10,
          headers: {
            "User-Agent": "SHADOW-BLACKWOOD/5.0"
          }
        });

        const contentType =
          response.headers["content-type"] || "";

        if (
          !contentType.toLowerCase().includes("image/") ||
          !response.data ||
          response.data.length < 100
        ) {
          throw new Error(
            "L'API GOODBYE n'a pas retourné une image valide."
          );
        }

        await fs.writeFile(imagePath, response.data);

        if (
          !(await fs.pathExists(imagePath)) ||
          (await fs.stat(imagePath)).size === 0
        ) {
          throw new Error("Carte GOODBYE vide.");
        }

        form.attachment =
          fs.createReadStream(imagePath);

      } catch (apiErr) {
        console.error(
          "Impossible de charger la carte :",
          apiErr.message
        );
      }

      await message.send(form);

      console.log(
        `SHADOW: départ traité pour ${userName} (${userId})`
      );

    } catch (err) {
      console.error(
        "Error running SHADOW leave event:",
        err
      );

    } finally {
      // Nettoyage du fichier temporaire
      if (imagePath) {
        try {
          if (await fs.pathExists(imagePath)) {
            await fs.unlink(imagePath);
          }
        } catch (err) {
          console.error(
            "SHADOW cleanup error:",
            err.message
          );
        }
      }
    }
  }
};
