
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const moment = require("moment-timezone");
const fonts = require("../func/fonts.js");

// ======================================================
// CONFIGURATION DU FONDATEUR SUPRÊME
// ======================================================

// Recherche config.json dans les emplacements habituels.
function getConfigPath() {
    const possiblePaths = [
        path.resolve(__dirname, "../../config.json"),
        path.resolve(process.cwd(), "config.json"),
        path.resolve(__dirname, "../config.json")
    ];

    return possiblePaths.find(file => fs.existsSync(file));
}

// Seuls les UID de adminBot sont autorisés.
function getSupremeOwners() {
    try {
        const configPath = getConfigPath();

        if (!configPath) {
            console.error("[SUPREME OWNER] config.json introuvable.");
            return [];
        }

        const config = fs.readJsonSync(configPath);

        if (!Array.isArray(config.adminBot)) {
            console.error("[SUPREME OWNER] adminBot doit être un tableau.");
            return [];
        }

        return config.adminBot.map(String);
    } catch (error) {
        console.error("[SUPREME OWNER] Erreur de configuration :", error);
        return [];
    }
}

function isSupremeOwner(uid) {
    return getSupremeOwners().includes(String(uid));
}

// Jeton Facebook à configurer dans les variables d'environnement.
const FB_TOKEN = process.env.FB_TOKEN || "";

// ======================================================
// GÉNÉRATION DES BANNIÈRES
// ======================================================

async function generateActionBanner(uid, name, actionType, reason = "") {
    const canvas = createCanvas(1000, 300);
    const ctx = canvas.getContext("2d");

    const grad = ctx.createLinearGradient(0, 0, 1000, 300);

    if (actionType === "BAN") {
        grad.addColorStop(0, "#1a0505");
        grad.addColorStop(1, "#660000");
    } else {
        grad.addColorStop(0, "#051a05");
        grad.addColorStop(1, "#006622");
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1000, 300);

    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(0, 0, 1000, 300);

    ctx.strokeStyle = actionType === "BAN" ? "#ff3333" : "#33ff33";
    ctx.lineWidth = 6;
    ctx.strokeRect(15, 15, 970, 270);

    const avatarX = 150;
    const avatarY = 150;
    const radius = 80;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, radius, 0, Math.PI * 2);
    ctx.clip();

    try {
        if (!FB_TOKEN) throw new Error("FB_TOKEN non configuré.");

        const avatarUrl =
            `https://graph.facebook.com/${uid}/picture?width=300&height=300&access_token=${FB_TOKEN}`;

        const img = await loadImage(avatarUrl);
        ctx.drawImage(
            img,
            avatarX - radius,
            avatarY - radius,
            radius * 2,
            radius * 2
        );
    } catch (error) {
        ctx.fillStyle = actionType === "BAN" ? "#ff3333" : "#33ff33";
        ctx.fill();
    }

    ctx.restore();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, radius + 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px Arial";

    ctx.fillStyle = actionType === "BAN" ? "#ff3333" : "#33ff33";
    ctx.fillText(`[PROTOCOLE SECURITE : ${actionType}]`, 280, 80);

    ctx.font = "bold 36px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(
        name.length > 25 ? name.substring(0, 23) + "..." : name,
        280,
        135
    );

    ctx.font = "20px Arial";
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.fillText(`ID de la cible : ${uid}`, 280, 180);

    if (actionType === "BAN") {
        ctx.font = "italic 20px Arial";
        ctx.fillStyle = "#ffcccc";
        ctx.fillText(`Raison : ${reason.substring(0, 50)}`, 280, 225);
    } else {
        ctx.font = "italic 20px Arial";
        ctx.fillStyle = "#ccffcc";
        ctx.fillText(
            "Statut : Acces de nouveau autorise au terminal.",
            280,
            225
        );
    }

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);

    const pathSave = path.join(
        cacheDir,
        `ban_action_${uid}_${Date.now()}.png`
    );

    await fs.writeFile(pathSave, canvas.toBuffer("image/png"));

    return pathSave;
}

// ======================================================
// COMMANDE BAN
// ======================================================

module.exports = {
    config: {
        name: "ban",
        aliases: ["blacklist", "block"],
        version: "5.0.0",
        author: "Shade",
        countDown: 3,
        role: 2,
        description: "Systeme d'exclusion et de bannissement graphique complet (Supreme Owner Only)",
        category: "admin",
        guide: {
            fr:
                "{p}{n} [@tag | uid | reply] [Raison] → Bannir\n" +
                "{p}{n} unban [@tag | uid | reply] → Rehabiliter\n" +
                "{p}{n} list → Liste graphique des bannis"
        }
    },

    // ==================================================
    // SURVEILLANCE DES UTILISATEURS BANNIS
    // ==================================================

    onChat: async function ({ api, event, threadsData }) {
        const { threadID, senderID, body } = event;

        if (!body || isSupremeOwner(senderID)) return;

        const threadData = await threadsData.get(threadID) || {};
        const dataBanned = threadData.data?.banned_ban || [];

        if (dataBanned.some(u => String(u.id) === String(senderID))) {
            try {
                api.setMessageReaction(
                    "🚫",
                    event.messageID,
                    () => {},
                    true
                );
            } catch (error) {}

            return;
        }
    },

    // ==================================================
    // EXÉCUTION PRINCIPALE
    // ==================================================

    onStart: async function ({
        api,
        event,
        args,
        threadsData,
        usersData
    }) {
        const {
            threadID,
            messageID,
            senderID,
            mentions,
            type,
            messageReply
        } = event;

        // ==============================================
        // VÉRIFICATION DU FONDATEUR SUPRÊME
        // ==============================================

        if (!isSupremeOwner(senderID)) {
            try {
                api.setMessageReaction(
                    "❌",
                    messageID,
                    () => {},
                    true
                );
            } catch (error) {}

            return message.reply(
                fonts.christus(
                    "⛔ | Accès refusé. Seuls les Fondateurs Suprêmes enregistrés dans config.json possèdent l'autorité d'exclusion."
                )
            );
        }

        const threadData = await threadsData.get(threadID) || {};
        const dataBanned = threadData.data?.banned_ban || [];

        const action = args[0]?.toLowerCase();

        // ==============================================
        // RÉHABILITATION
        // ==============================================

        if (action === "unban") {
            let target = null;

            if (type === "message_reply") {
                target = messageReply.senderID;
            } else if (Object.keys(mentions).length > 0) {
                target = Object.keys(mentions)[0];
            } else if (args[1] && !isNaN(args[1])) {
                target = args[1];
            }

            if (!target) {
                return message.reply(
                    fonts.christus(
                        "⚠️ | Veuillez specifier un UID, taguer la cible ou faire un reply."
                    )
                );
            }

            const index = dataBanned.findIndex(
                item => String(item.id) === String(target)
            );

            if (index === -1) {
                return message.reply(
                    fonts.christus(
                        "⚠️ | Ce sujet n'est pas repertorie dans la blacklist de ce groupe."
                    )
                );
            }

            dataBanned.splice(index, 1);

            await threadsData.set(
                threadID,
                dataBanned,
                "data.banned_ban"
            );

            const name = await usersData.getName(target) || "Utilisateur";

            const imagePath = await generateActionBanner(
                target,
                name,
                "UNBAN"
            );

            try {
                api.setMessageReaction("🔓", messageID, () => {}, true);
            } catch (error) {}

            const title = fonts.bold("REHABILITATION") + "\n\n";
            const bodyText =
                `🔓 | L'acces a ete restaure pour **${name}**.`;

            return message.reply(
                {
                    body: fonts.christus(title + bodyText),
                    attachment: fs.createReadStream(imagePath)
                },
                threadID,
                () => {
                    try {
                        fs.unlinkSync(imagePath);
                    } catch (error) {}
                },
                messageID
            );
        }

        // ==============================================
        // LISTE DES UTILISATEURS BANNIS
        // ==============================================

        if (action === "list") {
            if (!dataBanned.length) {
                return message.reply(
                    fonts.christus(
                        "📡 | Aucun bannissement actif enregistre dans ce groupe."
                    )
                );
            }

            const activeDisplay = dataBanned.slice(0, 4);

            const width = 1200;
            const height = 500;

            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext("2d");

            ctx.fillStyle = "#0d031c";
            ctx.fillRect(0, 0, width, height);

            ctx.fillStyle = "rgba(192, 132, 252, 0.05)";
            ctx.fillRect(20, 20, width - 40, height - 40);

            ctx.strokeStyle = "rgba(192, 132, 252, 0.3)";
            ctx.lineWidth = 2;
            ctx.strokeRect(20, 20, width - 40, height - 40);

            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#ff3333";
            ctx.font = "bold 36px Arial";

            ctx.fillText(
                "💀 BLACKLIST — TERMINAL DES BANNIS 💀",
                width / 2,
                60
            );

            const cardWidth = 220;

            const totalWidth =
                activeDisplay.length * cardWidth +
                (activeDisplay.length - 1) * 40;

            let startX =
                (width - totalWidth) / 2 + cardWidth / 2;

            const centerY = 260;

            for (const u of activeDisplay) {
                const name = await usersData.getName(u.id) || "Inconnu";

                ctx.save();
                ctx.beginPath();
                ctx.arc(startX, centerY - 20, 75, 0, Math.PI * 2);
                ctx.clip();

                try {
                    if (!FB_TOKEN) throw new Error("FB_TOKEN non configuré.");

                    const avatarUrl =
                        `https://graph.facebook.com/${u.id}/picture?width=300&height=300&access_token=${FB_TOKEN}`;

                    const img = await loadImage(avatarUrl);

                    ctx.drawImage(
                        img,
                        startX - 75,
                        centerY - 95,
                        150,
                        150
                    );
                } catch (error) {
                    ctx.fillStyle = "#ff3333";
                    ctx.fill();
                }

                ctx.restore();

                ctx.strokeStyle = "#ff3333";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(startX, centerY - 20, 77, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 20px Arial";

                ctx.fillText(
                    name.length > 14
                        ? name.substring(0, 12) + ".."
                        : name,
                    startX,
                    centerY + 85
                );

                ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
                ctx.font = "13px Arial";
                ctx.fillText(`ID: ${u.id}`, startX, centerY + 115);

                ctx.fillStyle = "#ffcccc";
                ctx.font = "italic 13px Arial";

                const reason = u.reason || "Aucune raison";

                ctx.fillText(
                    reason.length > 20
                        ? reason.substring(0, 18) + ".."
                        : reason,
                    startX,
                    centerY + 140
                );

                startX += cardWidth + 40;
            }

            const cacheDir = path.join(__dirname, "cache");
            await fs.ensureDir(cacheDir);

            const pathSave = path.join(
                cacheDir,
                `ban_list_${Date.now()}.png`
            );

            await fs.writeFile(
                pathSave,
                canvas.toBuffer("image/png")
            );

            try {
                api.setMessageReaction("📡", messageID, () => {}, true);
            } catch (error) {}

            const title = fonts.bold("FICHIER BLACKLIST") + "\n\n";

            const descText =
                `Total de sujets deconnectes dans ce groupe : ${dataBanned.length}`;

            return message.reply(
                {
                    body: fonts.christus(title + descText),
                    attachment: fs.createReadStream(pathSave)
                },
                threadID,
                () => {
                    try {
                        fs.unlinkSync(pathSave);
                    } catch (error) {}
                },
                messageID
            );
        }

        // ==============================================
        // IDENTIFICATION DE LA CIBLE
        // ==============================================

        let target = null;
        let reasonText = "";

        if (type === "message_reply") {
            target = messageReply.senderID;
            reasonText = args.join(" ").trim();

        } else if (Object.keys(mentions).length > 0) {
            target = Object.keys(mentions)[0];

            const mentionName = mentions[target];

            reasonText = args
                .join(" ")
                .replace(mentionName, "")
                .replace("@", "")
                .trim();

        } else if (args[0] && !isNaN(args[0])) {
            target = args[0];
            reasonText = args.slice(1).join(" ").trim();
        }

        if (!target) {
            return message.reply(
                fonts.christus(
                    "⚠️ | Configuration de cible incorrecte. Indiquez un UID, mentionnez l'utilisateur ou repondez a son message."
                )
            );
        }

        if (String(target) === String(senderID)) {
            return message.reply(
                fonts.christus(
                    "❌ | Auto-destruction impossible. Vous ne pouvez pas vous bannir vous-meme."
                )
            );
        }

        if (dataBanned.some(u => String(u.id) === String(target))) {
            return message.reply(
                fonts.christus(
                    "⚠️ | Ce sujet est deja repertorie comme banni."
                )
            );
        }

        // ==============================================
        // ENREGISTREMENT DU BANNISSEMENT
        // ==============================================

        const name = await usersData.getName(target) || "Sujet Indexe";

        const time = moment()
            .tz("Africa/Kinshasa")
            .format("HH:mm [le] DD/MM/YYYY");

        const reason =
            reasonText ||
            "Aucune raison specifiee (Protocole Standard)";

        dataBanned.push({
            id: String(target),
            reason,
            time
        });

        await threadsData.set(
            threadID,
            dataBanned,
            "data.banned_ban"
        );

        const imagePath = await generateActionBanner(
            target,
            name,
            "BAN",
            reason
        );

        try {
            api.setMessageReaction("🚫", messageID, () => {}, true);
        } catch (error) {}

        const title = fonts.bold("SECURITE ENCLENCHEE") + "\n\n";

        const bodyText =
            `🟩 | Le sujet **${name}** a ete banni du terminal avec succes.`;

        return message.reply(
            {
                body: fonts.christus(title + bodyText),
                attachment: fs.createReadStream(imagePath)
            },
            threadID,
            () => {
                try {
                    fs.unlinkSync(imagePath);
                } catch (error) {}
            },
            messageID
        );
    }
};
