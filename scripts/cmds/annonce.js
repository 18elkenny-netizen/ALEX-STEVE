
const fs = require("fs");
const path = require("path");

const CATEGORIES = [
	"📢 ANNONCE GÉNÉRALE",
	"🚨 ANNONCE URGENTE",
	"🎉 ANNONCE ÉVÉNEMENTIELLE",
	"⚖️ ANNONCE ADMINISTRATIVE",
	"⚠️ AVERTISSEMENT"
];

const STYLES = [
	"🌑 DARK IMPERIAL",
	"🚨 ROYAL ALERT",
	"🩸 BLOOD DYNASTY",
	"💠 CYBER EMPIRE",
	"👑 ROYAL SHADOW",
	"🌙 SOFT LUXURY",
	"⚜️ IMPERIAL MINIMAL"
];

const STYLE_DETAILS = [
	{
		title: "𓆩 ☾ DARK IMPERIAL ☽ 𓆪",
		top: "╔════════ ◈ ☾ ◈ ════════╗",
		bottom: "╚════════ ◈ ☽ ◈ ════════╝",
		emojis: "🌑 🖤 🦇 ⛓️ 🥀",
		side: "𓆩",
		heading: "『 DARK TRANSMISSION 』"
	},
	{
		title: "♛ IMPERIAL ALERT ♛",
		top: "╔═══════〔 🚨 〕═══════╗",
		bottom: "╚═══════〔 ⚜️ 〕═══════╝",
		emojis: "🚨 ⚠️ 🔔 ⚜️ ❗",
		side: "♛",
		heading: "『 OFFICIAL ALERT 』"
	},
	{
		title: "𓆩 🩸 BLOOD DYNASTY 🩸 𓆪",
		top: "╔══════〔 🩸 ⛓️ 〕══════╗",
		bottom: "╚══════〔 ⛓️ 🩸 〕══════╝",
		emojis: "🩸 🥀 🔥 ⛓️",
		side: "⛓️",
		heading: "『 DYNASTY TRANSMISSION 』"
	},
	{
		title: "『 💠 CYBER EMPIRE 💠 』",
		top: "╔══════【 ⚡ SYSTEM ⚡ 】══════╗",
		bottom: "╚══════【 💠 END SYSTEM 💠 】╝",
		emojis: "💠 ⚡ 🤖 🔷 💻",
		side: "◆",
		heading: "『 SYSTEM NOTIFICATION 』"
	},
	{
		title: "♛ ROYAL SHADOW IMPERIAL ♛",
		top: "╔═══════ ◈ ♛ ◈ ═══════╗",
		bottom: "╚═══════ ◈ ♛ ◈ ═══════╝",
		emojis: "👑 💎 🏰 ⚜️ 🌑",
		side: "♛",
		heading: "『 THE IMPERIAL DECREE 』"
	},
	{
		title: "˚₊‧ 🌙 SOFT LUXURY ‧₊˚",
		top: "╔══════ ✧ 🌙 ✧ ══════╗",
		bottom: "╚══════ ✧ 🌸 ✧ ══════╝",
		emojis: "🌙 ✨ 🌸 🕊️ 💎",
		side: "✧",
		heading: "『 ELEGANT MESSAGE 』"
	},
	{
		title: "⚜️ IMPERIAL MINIMAL ⚜️",
		top: "╔══════════════════════╗",
		bottom: "╚══════════════════════╝",
		emojis: "⚜️ ◈ ✦ ◆",
		side: "✦",
		heading: "『 OFFICIAL NOTICE 』"
	}
];

const CONCURRENCY = 5;
const SEND_TIMEOUT = 15000;
const BATCH_DELAY = 500;
const MAX_HISTORY = 30;

const STORE_FILE = path.join(__dirname, "announcements.json");

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/* =========================================
   STOCKAGE DES ANNONCES
========================================= */

function loadStore() {
	try {
		if (!fs.existsSync(STORE_FILE))
			return [];

		const data = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));

		return Array.isArray(data) ? data : [];
	}
	catch (err) {
		console.error("[ANNONCE] Erreur de lecture :", err);
		return [];
	}
}

function saveStore(records) {
	const temporaryFile = STORE_FILE + ".tmp";

	fs.writeFileSync(
		temporaryFile,
		JSON.stringify(records, null, 2),
		"utf8"
	);

	fs.renameSync(temporaryFile, STORE_FILE);
}

function createAnnouncementID() {
	return `ANN-${Date.now()}`;
}

/* =========================================
   DESIGN DES ANNONCES
========================================= */

function formatAnnouncement(category, style, content) {
	const details = STYLE_DETAILS[style];

	return [
		details.top,
		"",
		`       ${details.title}`,
		"",
		`      ${details.heading}`,
		"",
		"╭━━━━━━━━━━━━━━━━━━━━━━╮",
		`   ${details.side}  ${category}`,
		"╰━━━━━━━━━━━━━━━━━━━━━━╯",
		"",
		"┏━━━━━━━━━━━━━━━━━━━━━━┓",
		"       📜 MESSAGE OFFICIEL",
		"┗━━━━━━━━━━━━━━━━━━━━━━┛",
		"",
		"✦ ─────── ✧ ─────── ✦",
		"",
		content.trim(),
		"",
		"✦ ─────── ✧ ─────── ✦",
		"",
		"━━━━━━━━━━━━━━━━━━━━━━━━",
		`       ${details.emojis}`,
		"",
		"♛ TRANSMIS PAR L'ADMINISTRATION ♛",
		"",
		"『 END OF TRANSMISSION 』",
		"",
		details.bottom
	].join("\n");
}

/* =========================================
   MENUS ET RÉPONSES
========================================= */

async function createReply(message, state) {
	const sent = await message.reply(state.text);

	if (!sent || !sent.messageID)
		throw new Error("Impossible de créer le menu.");

	global.GoatBot.onReply.set(sent.messageID, {
		commandName: "annonce",
		...state
	});
}

function mainMenu() {
	return [
		"╔════════ ◈ ♛ ◈ ════════╗",
		"       ROYAL SHADOW",
		"       IMPERIAL CENTER",
		"╚════════ ◈ ♛ ◈ ════════╝",
		"",
		"『 CENTRE DE GESTION 』",
		"",
		"1️⃣ CRÉER UNE ANNONCE",
		"",
		"2️⃣ RETIRER UNE ANNONCE",
		"",
		"3️⃣ HISTORIQUE DES ANNONCES",
		"",
		"━━━━━━━━━━━━━━━━━━━━━━━━",
		"Réponds avec 1, 2 ou 3."
	].join("\n");
}

/* =========================================
   ENVOI AVEC DÉLAI DE SÉCURITÉ
========================================= */

function sendWithTimeout(api, body, threadID) {
	return new Promise((resolve, reject) => {
		let finished = false;

		const timer = setTimeout(() => {
			finish(new Error("Délai d'envoi dépassé."));
		}, SEND_TIMEOUT);

		function finish(err, info) {
			if (finished) return;

			finished = true;
			clearTimeout(timer);

			if (err)
				return reject(err);

			resolve(info);
		}

		try {
			const result = api.sendMessage(
				{ body },
				threadID,
				finish
			);

			if (result && typeof result.then === "function") {
				result.then(info => {
					if (info) finish(null, info);
				}).catch(finish);
			}
		}
		catch (err) {
			finish(err);
		}
	});
}

/* =========================================
   SUPPRESSION AVEC DÉLAI DE SÉCURITÉ
========================================= */

function unsendWithTimeout(api, messageID) {
	return new Promise((resolve, reject) => {
		if (typeof api.unsendMessage !== "function") {
			return reject(
				new Error("La fonction unsendMessage n'est pas disponible.")
			);
		}

		let finished = false;

		const timer = setTimeout(() => {
			finish(new Error("Délai de suppression dépassé."));
		}, SEND_TIMEOUT);

		function finish(err, result) {
			if (finished) return;

			finished = true;
			clearTimeout(timer);

			if (err)
				return reject(err);

			resolve(result);
		}

		try {
			const result = api.unsendMessage(messageID, finish);

			if (result && typeof result.then === "function") {
				result.then(info => finish(null, info)).catch(finish);
			}
		}
		catch (err) {
			finish(err);
		}
	});
}

/* =========================================
   HISTORIQUE
========================================= */

function getHistoryText(records) {
	if (records.length === 0) {
		return [
			"╔═══════ 📜 ═══════╗",
			"       HISTORIQUE",
			"╚══════════════════╝",
			"",
			"⚠️ Aucune annonce enregistrée."
		].join("\n");
	}

	const latest = records.slice(-10).reverse();

	return [
		"╔════════ ◈ ♛ ◈ ════════╗",
		"       IMPERIAL ARCHIVE",
		"╚════════ ◈ ♛ ◈ ════════╝",
		"",
		...latest.map((record, index) => {
			const remaining = record.messages.length;

			return [
				`${index + 1}️⃣ ${record.category}`,
				`   🆔 ${record.id}`,
				`   📅 ${record.date}`,
				`   📦 Messages enregistrés : ${record.sentCount}`,
				`   🗑️ Messages retirés : ${record.removedCount}`,
				`   📌 Messages restants : ${remaining}`,
				`   📍 État : ${record.status}`,
				""
			].join("\n");
		}),
		"━━━━━━━━━━━━━━━━━━━━━━━━",
		"✦ FIN DES ARCHIVES ✦"
	].join("\n");
}

function getRemovableRecords(records) {
	return records.filter(record =>
		Array.isArray(record.messages) &&
		record.messages.length > 0
	).slice(-10).reverse();
}

function getRemovalMenu(records) {
	const removable = getRemovableRecords(records);

	if (removable.length === 0) {
		return {
			ids: [],
			text: [
				"╔══════ 🗑️ ══════╗",
				"    CENTRE DE RETRAIT",
				"╚════════════════╝",
				"",
				"⚠️ Aucune annonce enregistrée à retirer.",
				"",
				"Les nouvelles annonces seront enregistrées automatiquement."
			].join("\n")
		};
	}

	return {
		ids: removable.map(record => record.id),
		text: [
			"╔════════ ◈ ♛ ◈ ════════╗",
			"       IMPERIAL REMOVAL",
			"╚════════ ◈ ♛ ◈ ════════╝",
			"",
			"📜 ANNONCES DISPONIBLES",
			"",
			...removable.map((record, index) => [
				`${index + 1}️⃣ ${record.category}`,
				`   📅 ${record.date}`,
				`   📦 Groupes concernés : ${record.sentCount}`,
				`   🗑️ Messages encore présents : ${record.messages.length}`,
				""
			].join("\n")),
			"━━━━━━━━━━━━━━━━━━━━━━━━",
			"Choisis le numéro de l'annonce à retirer."
		].join("\n")
	};
}

/* =========================================
   CONFIGURATION DE LA COMMANDE
========================================= */

module.exports = {
	config: {
		name: "annonce",
		version: "4.0.0",
		author: "Kenny",
		countDown: 10,
		role: 4,
		description: "Centre impérial de création et gestion des annonces",
		category: "owner",
		guide: {
			fr: "~annonce : ouvrir le centre impérial"
		}
	},

	/* =====================================
	   OUVERTURE DU MENU
	===================================== */

	onStart: async function ({ message, role, event }) {
		if (role < 4)
			return message.reply(
				"⛔ Accès réservé aux administrateurs du bot."
			);

		const ownerID = event.senderID || event.author;

		await createReply(message, {
			ownerID,
			step: "main",
			text: mainMenu()
		});
	},

	/* =====================================
	   GESTION DES RÉPONSES
	===================================== */

	onReply: async function ({ api, event, message, Reply, role }) {
		if (role < 4)
			return message.reply("⛔ Autorisation insuffisante.");

		const senderID = event.senderID || event.author;

		if (senderID !== Reply.ownerID)
			return message.reply(
				"⛔ Ce menu appartient à un autre administrateur."
			);

		const answer = (event.body || "").trim();
		const choice = Number(answer);
		const replyID = event.messageReply?.messageID;

		if (replyID)
			global.GoatBot.onReply.delete(replyID);

		const next = async (state, text) => {
			return createReply(message, {
				ownerID: Reply.ownerID,
				...state,
				text
			});
		};

		/* =================================
		   MENU PRINCIPAL
		================================= */

		if (Reply.step === "main") {
			if (![1, 2, 3].includes(choice)) {
				return next(
					{ step: "main" },
					mainMenu() + "\n\n❌ Choix invalide."
				);
			}

			// CRÉER UNE ANNONCE
			if (choice === 1) {
				return next(
					{ step: "category" },
					[
						"╔══════ ⚜️ ══════╗",
						"    CHOIX DE CATÉGORIE",
						"╚════════════════╝",
						"",
						...CATEGORIES.map((item, i) =>
							`${i + 1}️⃣ ${item}`
						),
						"",
						"Réponds avec un numéro entre 1 et 5."
					].join("\n")
				);
			}

			// RETIRER UNE ANNONCE
			if (choice === 2) {
				const records = loadStore();
				const menu = getRemovalMenu(records);

				if (menu.ids.length === 0)
					return message.reply(menu.text);

				return next(
					{
						step: "removeList",
						announcementIDs: menu.ids
					},
					menu.text
				);
			}

			// HISTORIQUE
			if (choice === 3) {
				return message.reply(
					getHistoryText(loadStore())
				);
			}
		}

		/* =================================
		   CHOIX DE CATÉGORIE
		================================= */

		if (Reply.step === "category") {
			if (
				!Number.isInteger(choice) ||
				choice < 1 ||
				choice > CATEGORIES.length
			) {
				return next(
					{ step: "category" },
					"❌ Catégorie invalide.\n\n" +
					CATEGORIES.map((item, i) =>
						`${i + 1}️⃣ ${item}`
					).join("\n")
				);
			}

			return next(
				{
					step: "style",
					category: choice - 1
				},
				[
					"╔══════ 👑 ══════╗",
					"       STYLE IMPÉRIAL",
					"╚════════════════╝",
					"",
					...STYLES.map((item, i) =>
						`${i + 1}️⃣ ${item}`
					),
					"",
					"Choisis un style entre 1 et 7."
				].join("\n")
			);
		}

		/* =================================
		   CHOIX DU STYLE
		================================= */

		if (Reply.step === "style") {
			if (
				!Number.isInteger(choice) ||
				choice < 1 ||
				choice > STYLES.length
			) {
				return next(
					{
						step: "style",
						category: Reply.category
					},
					"❌ Style invalide.\n\n" +
					STYLES.map((item, i) =>
						`${i + 1}️⃣ ${item}`
					).join("\n")
				);
			}

			return next(
				{
					step: "content",
					category: Reply.category,
					style: choice - 1
				},
				[
					"╔══════ ✍️ ══════╗",
					"       RÉDACTION",
					"╚════════════════╝",
					"",
					`📂 Catégorie : ${CATEGORIES[Reply.category]}`,
					`🎨 Style : ${STYLES[choice - 1]}`,
					"",
					"Envoie le contenu de ton annonce.",
					"",
					"Maximum : 5 000 caractères."
				].join("\n")
			);
		}

		/* =================================
		   CONTENU DE L'ANNONCE
		================================= */

		if (Reply.step === "content") {
			if (answer.length < 2 || answer.length > 5000) {
				return next(
					{
						step: "content",
						category: Reply.category,
						style: Reply.style
					},
					"❌ Ton annonce doit contenir entre 2 et 5 000 caractères."
				);
			}

			const preview = formatAnnouncement(
				CATEGORIES[Reply.category],
				Reply.style,
				answer
			);

			return next(
				{
					step: "confirm",
					category: Reply.category,
					style: Reply.style,
					content: answer
				},
				preview +
				"\n\n╔══════ 👁️ ══════╗\n" +
				"       APERÇU FINAL\n" +
				"╚════════════════╝\n\n" +
				"1️⃣ CONFIRMER LA DIFFUSION\n" +
				"2️⃣ ANNULER\n\n" +
				"Réponds avec 1 ou 2."
			);
		}

		/* =================================
		   CONFIRMATION ET DIFFUSION
		================================= */

		if (Reply.step === "confirm") {
			if (choice === 2) {
				return message.reply(
					"╔══════ ❌ ══════╗\n" +
					"    DIFFUSION ANNULÉE\n" +
					"╚════════════════╝\n\n" +
					"♛ Aucun groupe n'a reçu cette annonce."
				);
			}

			if (choice !== 1) {
				return next(
					{
						step: "confirm",
						category: Reply.category,
						style: Reply.style,
						content: Reply.content
					},
					"⚠️ Réponse invalide.\n\n1️⃣ Confirmer\n2️⃣ Annuler"
				);
			}

			const groups = (global.db.allThreadData || []).filter(thread =>
				thread &&
				thread.isGroup === true &&
				thread.threadID &&
				!isNaN(thread.threadID)
			);

			const uniqueGroups = [
				...new Map(
					groups.map(group => [
						String(group.threadID),
						group
					])
				).values()
			];

			if (uniqueGroups.length === 0) {
				return message.reply(
					"⚠️ Aucun groupe disponible."
				);
			}

			const announcement = formatAnnouncement(
				CATEGORIES[Reply.category],
				Reply.style,
				Reply.content
			);

			const records = loadStore();

			const record = {
				id: createAnnouncementID(),
				category: CATEGORIES[Reply.category],
				style: STYLES[Reply.style],
				date: new Date().toLocaleString("fr-FR"),
				content: Reply.content,
				sentCount: 0,
				removedCount: 0,
				messages: [],
				status: "en cours"
			};

			// Enregistrement avant la diffusion
			records.push(record);

			while (records.length > MAX_HISTORY)
				records.shift();

			try {
				saveStore(records);
			}
			catch (err) {
				console.error("[ANNONCE] Stockage impossible :", err);

				return message.reply(
					"⛔ Impossible d'enregistrer l'annonce. " +
					"Aucune diffusion n'a été lancée."
				);
			}

			await message.reply(
				"╔══════ 🚀 ══════╗\n" +
				"    IMPERIAL BROADCAST\n" +
				"╚════════════════╝\n\n" +
				`🆔 ${record.id}\n` +
				`📦 Groupes ciblés : ${uniqueGroups.length}\n` +
				`⚡ Envois simultanés : ${CONCURRENCY}\n\n` +
				"✦ Diffusion en cours..."
			);

			let success = 0;
			let failed = 0;
			let untracked = 0;
			let completed = 0;

			for (
				let i = 0;
				i < uniqueGroups.length;
				i += CONCURRENCY
			) {
				const batch = uniqueGroups.slice(i, i + CONCURRENCY);

				const results = await Promise.all(
					batch.map(async group => {
						try {
							const info = await sendWithTimeout(
								api,
								announcement,
								group.threadID
							);

							return {
								ok: true,
								threadID: String(group.threadID),
								messageID: info?.messageID || info?.messageId || null
							};
						}
						catch (err) {
							console.error(
								"[ANNONCE] Échec :",
								group.threadID,
								err.message || err
							);

							return {
								ok: false,
								threadID: String(group.threadID)
							};
						}
					})
				);

				for (const result of results) {
					completed++;

					if (!result.ok) {
						failed++;
						continue;
					}

					if (!result.messageID) {
						untracked++;
						continue;
					}

					success++;

					record.messages.push({
						threadID: result.threadID,
						messageID: result.messageID
					});

					record.sentCount++;

					// Sauvegarde après chaque message enregistré
					try {
						saveStore(records);
					}
					catch (err) {
						console.error(
							"[ANNONCE] Erreur de sauvegarde :",
							err
						);
					}
				}

				if (completed < uniqueGroups.length)
					await sleep(BATCH_DELAY);
			}

			record.status = "diffusion terminée";

			try {
				saveStore(records);
			}
			catch (err) {
				console.error("[ANNONCE] Sauvegarde finale :", err);
			}

			return message.reply(
				"╔════════ ◈ ♛ ◈ ════════╗\n" +
				"       IMPERIAL REPORT\n" +
				"╚════════ ◈ ♛ ◈ ════════╝\n\n" +
				`🆔 ${record.id}\n` +
				`📦 Groupes ciblés : ${uniqueGroups.length}\n` +
				`✅ Messages enregistrés : ${success}\n` +
				`⚠️ Messages sans identifiant : ${untracked}\n` +
				`❌ Échecs : ${failed}\n` +
				`📊 Total traité : ${completed}\n\n` +
				"━━━━━━━━━━━━━━━━━━━━━━━━\n" +
				"♛ ANNONCE ARCHIVÉE ♛\n" +
				"━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
				(
					failed === 0 && untracked === 0
						? "💎 Tous les messages ont été enregistrés."
						: "⚠️ Certains messages ne pourront pas être retirés automatiquement."
				)
			);
		}

		/* =================================
		   SÉLECTION DE L'ANNONCE À RETIRER
		================================= */

		if (Reply.step === "removeList") {
			if (
				!Number.isInteger(choice) ||
				choice < 1 ||
				choice > Reply.announcementIDs.length
			) {
				return next(
					{
						step: "removeList",
						announcementIDs: Reply.announcementIDs
					},
					"❌ Numéro invalide. Choisis une annonce dans la liste."
				);
			}

			const announcementID =
				Reply.announcementIDs[choice - 1];

			const record = loadStore().find(
				item => item.id === announcementID
			);

			if (!record || !record.messages.length) {
				return message.reply(
					"⚠️ Cette annonce n'est plus disponible."
				);
			}

			return next(
				{
					step: "removeConfirm",
					announcementID
				},
				[
					"╔════════ ◈ 🗑️ ◈ ════════╗",
					"       CONFIRMATION",
					"╚════════ ◈ 🗑️ ◈ ════════╝",
					"",
					`📜 ${record.category}`,
					`🆔 ${record.id}`,
					`📦 Messages à retirer : ${record.messages.length}`,
					"",
					"⚠️ Cette action tentera de retirer",
					"cette annonce dans tous les groupes",
					"où elle a été diffusée.",
					"",
					"1️⃣ CONFIRMER LE RETRAIT",
					"2️⃣ ANNULER",
					"",
					"Réponds avec 1 ou 2."
				].join("\n")
			);
		}

		/* =================================
		   CONFIRMATION DE SUPPRESSION
		================================= */

		if (Reply.step === "removeConfirm") {
			if (choice === 2) {
				return message.reply(
					"🖤 Opération annulée. Aucun message n'a été retiré."
				);
			}

			if (choice !== 1) {
				return next(
					{
						step: "removeConfirm",
						announcementID: Reply.announcementID
					},
					"⚠️ Réponse invalide.\n\n1️⃣ Confirmer\n2️⃣ Annuler"
				);
			}

			const records = loadStore();

			const record = records.find(
				item => item.id === Reply.announcementID
			);

			if (!record || !record.messages.length) {
				return message.reply(
					"⚠️ Cette annonce ne contient plus de messages à retirer."
				);
			}

			const targets = [...record.messages];

			await message.reply(
		"╔══════ 🗑️ ══════╗\n" +
        "   IMPERIAL REMOVAL\n" +
        "╚════════════════╝\n\n" +
`📦 Messages à retirer : ${targets.length}\n` +
"✦ Opération en cours..."
);

let removed = 0;
let failed = 0;
let completed = 0;

for (
    let i = 0;
    i < targets.length;
    i += CONCURRENCY
) {
    const batch = targets.slice(i, i + CONCURRENCY);

    const results = await Promise.all(
        batch.map(async target => {
            try {
                await unsendWithTimeout(
                    api,
                    target.messageID
                );

                return {
                    ok: true,
                    target
                };
            }
            catch (err) {
                console.error(
                    "[IMPERIAL REMOVAL] Error:",
                    err
                );

                return {
                    ok: false,
                    target
                };
            }
        })
    );

    for (const result of results) {
        completed++;

        if (result.ok) {
            removed++;
        } else {
            failed++;
        }
    }

    if (i + CONCURRENCY < targets.length) {
        await delay(400);
    }
}

const remaining = targets.filter(target => {
    return !removedTargets.includes(target.messageID);
});

return api.sendMessage(
    "╔══════ ⚜️ ══════╗\n" +
    "    IMPERIAL REPORT\n" +
    "╚════════════════╝\n\n" +
    `✦ Messages traités : ${completed}\n` +
    `🗑️ Messages retirés : ${removed}\n` +
    `⚠️ Échecs : ${failed}\n` +
    `📦 Messages restants : ${failed}\n\n` +
    (
        failed === 0
            ? "✧ IMPERIAL REMOVAL COMPLETE ✧"
            : "✧ IMPERIAL REMOVAL PARTIAL ✧"
    ),
    event.threadID
);
