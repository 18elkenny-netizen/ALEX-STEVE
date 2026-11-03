
const fs = require("fs-extra");
const path = require("path");

// =============================================
// CONFIGURATION DU FONDATEUR SUPRÊME
// =============================================

function getConfigPath() {
    const paths = [
        path.resolve(__dirname, "../../config.json"),
        path.resolve(process.cwd(), "config.json"),
        path.resolve(__dirname, "../config.json")
    ];

    return paths.find(file => fs.existsSync(file));
}

function isSupremeOwner(uid) {
    try {
        const configPath = getConfigPath();

        if (!configPath) {
            console.error("[SETBOTNAME] config.json introuvable.");
            return false;
        }

        const config = fs.readJsonSync(configPath);

        return Array.isArray(config.adminBot) &&
            config.adminBot.map(String).includes(String(uid));

    } catch (error) {
        console.error("[SETBOTNAME] Erreur de configuration :", error);
        return false;
    }
}

// =============================================
// COMMANDE SETBOTNAME
// =============================================

module.exports = {
    config: {
        name: "setbotname",
        aliases: ["setbotnick", "botname"],
        version: "2.0",
        author: "Shade × ChatGPT",
        role: 0,
        category: "admin",
        shortDescription: "Change le pseudonyme du bot dans tous les groupes",
        guide: "{pn} [Nouveau pseudonyme]"
    },

    onStart: async function ({ api, event, args, message }) {
        const { senderID } = event;

        // =====================================
        // VÉRIFICATION DU FONDATEUR SUPRÊME
        // =====================================

        if (!isSupremeOwner(senderID)) {
            return message.reply(
                "⛔ Accès refusé.\n\n" +
                "Cette commande est exclusivement réservée " +
                "aux Fondateurs Suprêmes enregistrés dans config.json."
            );
        }

        // =====================================
        // VÉRIFICATION DU NOUVEAU PSEUDONYME
        // =====================================

        const newNickname = args.join(" ").trim();

        if (!newNickname) {
            return message.reply(
                "💡 Veuillez spécifier un nouveau pseudonyme.\n\n" +
                "Exemple : _setbotname Mon Super Bot"
            );
        }

        if (newNickname.length > 50) {
            return message.reply(
                "⚠️ Le pseudonyme ne doit pas dépasser 50 caractères."
            );
        }

        await message.reply(
            `⏳ Modification du pseudonyme en "${newNickname}" dans tous les groupes en cours...`
        );

        // =====================================
        // MODIFICATION DANS LES GROUPES
        // =====================================

        try {
            const inboxList = await api.getThreadList(
                100,
                null,
                ["INBOX"]
            );

            const groupThreads = inboxList.filter(
                thread => thread.isGroup && thread.isSubscribed
            );

            let successCount = 0;
            let failCount = 0;

            const botID = api.getCurrentUserID();

            for (const thread of groupThreads) {
                try {
                    await api.changeNickname(
                        newNickname,
                        thread.threadID,
                        botID
                    );

                    successCount++;

                } catch (error) {
                    failCount++;

                    console.error(
                        `[SETBOTNAME] Échec dans ${thread.threadID}:`,
                        error
                    );
                }
            }

            return message.reply(
                "╔══════ ⚜️ ══════╗\n" +
                "    IMPERIAL REPORT\n" +
                "╚════════════════╝\n\n" +
                `👑 Nouveau pseudonyme : ${newNickname}\n\n` +
                `✅ Groupes modifiés : ${successCount}\n` +
                `⚠️ Échecs : ${failCount}\n` +
                `📦 Groupes détectés : ${groupThreads.length}\n\n` +
                (
                    failCount === 0
                        ? "✧ MODIFICATION TERMINÉE ✧"
                        : "✧ MODIFICATION PARTIELLE ✧"
                )
            );

        } catch (error) {
            console.error("[SETBOTNAME] Erreur générale :", error);

            return message.reply(
                "❌ Une erreur est survenue pendant la récupération des groupes."
            );
        }
    }
};
