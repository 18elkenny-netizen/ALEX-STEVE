
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "leave",
    version: "4.0.0 Shadow Edition",
    author: "Shade × Gemini",
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
    threadsData, message, event, api, usersData, getLang
  }) {
    if (event.logMessageType !== "log:unsubscribe") return;

    const { threadID } = event;
    const threadData = await threadsData.get(threadID);

    if (
      threadData &&
      threadData.settings &&
      threadData.settings.sendLeaveMessage === false
    ) return;

    const { leftParticipantFbId } = event.logMessageData;
    const botID = api.getCurrentUserID();

    if (leftParticipantFbId == botID) return;

    try {
      const threadInfo = await api.getThreadInfo(threadID);
      const threadName = threadInfo.threadName || "Secteur Inconnu";
      const memberCount = threadInfo.participantIDs.length;
      const userName = await usersData.getName(leftParticipantFbId);

      const date = new Date();
      const hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const timeFormatted = `${hours}:${minutes}`;

      const session =
        hours <= 10 ? "Matin" :
        hours <= 12 ? "Midi" :
        hours <= 18 ? "Après-midi" : "Soirée";

      const voluntary = String(leftParticipantFbId) ===
        String(event.author);

      const template = voluntary
        ? getLang("messageVoluntary")
        : getLang("messageRemoved");

      const leaveMessage = template
        .replace(/\{userName\}/g, userName)
        .replace(/\{threadName\}/g, threadName)
        .replace(/\{time\}/g, timeFormatted)
        .replace(/\{session\}/g, session);

      const form = { body: leaveMessage, mentions: [] };

      const userAvatar =
        `https://graph.facebook.com/${leftParticipantFbId}/picture?width=400&height=400`;

      const backgroundUrl =
        "https://i.ibb.co/4YBNyvP/images-76.jpg";

      const apiUrl =
        `https://zetbot-page.onrender.com/api/goodbye?pp=${encodeURIComponent(userAvatar)}&nama=${encodeURIComponent(userName)}&bg=${encodeURIComponent(backgroundUrl)}&member=${memberCount}`;

      const tmp = path.join(__dirname, "..", "cache");
      await fs.ensureDir(tmp);

      const imagePath = path.join(
        tmp,
        `leave_${leftParticipantFbId}_${Date.now()}.png`
      );

      try {
        const response = await axios.get(apiUrl, {
          responseType: "arraybuffer",
          timeout: 10000
        });

        await fs.writeFile(imagePath, response.data);
        form.attachment = fs.createReadStream(imagePath);
      } catch (apiErr) {
        console.error("Impossible de charger la carte :", apiErr.message);
      }

      await message.send(form);

      setTimeout(() => {
        try {
          if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        } catch (e) {}
      }, 5000);

    } catch (err) {
      console.error("Error running leave event:", err);
    }
  }
};
