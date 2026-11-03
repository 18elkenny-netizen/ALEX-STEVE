const CATEGORIES = [
	"📢 ANNONCE GÉNÉRALE",
	"🚨 ANNONCE URGENTE",
	"🎉 ANNONCE ÉVÉNEMENTIELLE",
	"⚖️ ANNONCE ADMINISTRATIVE",
	"⚠️ AVERTISSEMENT"
];

const STYLES = [
	"DARK 🖤",
	"ATTENTION 🚨",
	"BLOOD 🩸",
	"CYBER 💠",
	"ROYAL 👑",
	"SOFT 🌙",
	"MINIMALISTE ✦"
];

const STYLE_DETAILS = [
	{
		title: "𓆩 🖤 DARK SYSTEM ANNOUNCEMENT 🖤 𓆪",
		top: "╔═══════〔 🖤 〕═══════╗",
		bottom: "╚═══════〔 🦇 〕═══════╝",
		emojis: "🖤 🦇 ⛓️ 🌑 🥀",
		side: "𓆩"
	},
	{
		title: "🚨 URGENT ALERT 🚨",
		top: "╔═══════〔 🚨 〕═══════╗",
		bottom: "╚═══════〔 ⚠️ 〕═══════╝",
		emojis: "🚨 ⚠️ 🔴 ❗ 📛",
		side: "⚠️"
	},
	{
		title: "𓆩 🩸 BLOOD ANNOUNCEMENT 🩸 𓆪",
		top: "╔══════〔 🩸 ⛓️ 〕══════╗",
		bottom: "╚══════〔 ⛓️ 🩸 〕══════╝",
		emojis: "🩸 🥀 ⛓️ 🔥 🗡️",
		side: "🩸"
	},
	{
		title: "『 💠 CYBER SYSTEM 💠 』",
		top: "╔════【 ⚡ SYSTEM ⚡ 】════╗",
		bottom: "╚════【 💠 END SYSTEM 💠 】╝",
		emojis: "💠 ⚡ 🤖 🔷 💻",
		side: "◆"
	},
	{
		title: "♛ ROYAL ANNOUNCEMENT ♛",
		top: "╔═══════ 👑 ♛ 👑 ═══════╗",
		bottom: "╚═══════ 👑 ♛ 👑 ═══════╝",
		emojis: "👑 💎 🏰 ✨ ⚜️",
		side: "♛"
	},
	{
		title: "˚₊‧ SOFT MESSAGE ‧₊˚",
		top: "╔══════ 🌙 ✨ 🌸 ══════╗",
		bottom: "╚══════ 🌸 ✨ 🌙 ══════╝",
		emojis: "🌙 ✨ 🌸 🕊️ 💗",
		side: "✧"
	},
	{
		title: "✦ ANNOUNCEMENT ✦",
		top: "╔══════════════════════╗",
		bottom: "╚══════════════════════╝",
		emojis: "✦ • ◈ ◆ ✧",
		side: "•"
	}
];

const CONCURRENCY = 5;
const SEND_TIMEOUT = 10000;
const BATCH_DELAY = 400;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function formatAnnouncement(category, style, content) {
	const details = STYLE_DETAILS[style];

	return [
		details.top,
		"",
		details.title,
		"",
		`╭─────── ${details.side} ───────╮`,
		`📌 ${category}`,
		"╰────────────────────────╯",
		"",
		"┏━━━━━━━━━━━━━━━━━━━━━━┓",
		"       📜 MESSAGE OFFICIEL",
		"┗━━━━━━━━━━━━━━━━━━━━━━┛",
		"",
		content.trim(),
		"",
		"━━━━━━━━━━━━━━━━━━━━━━",
		`       ${details.emojis}`,
		"",
		"✦ FIN DE L'ANNONCE ✦",
		"",
		details.bottom
	].join("\n");
}

async function createReply(message, state) {
	const sent = await message.reply(state.text);

	if (!sent || !sent.messageID)
		throw new Error("Impossible de créer le menu de réponse.");

	global.GoatBot.onReply.set(sent.messageID, {
		commandName: "annonce",
		...state
	});
}

function sendWithTimeout(api, body, threadID) {
	return new Promise((resolve, reject) => {
		let finished = false;

		const timer = setTimeout(() => {
			if (finished) return;
			finished = true;
			reject(new Error("Délai d'envoi dépassé."));
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

			if (result && typeof result.then === "function")
				result.then(info => finish(null, info)).catch(finish);
		}
		catch (err) {
			finish(err);
		}
	});
}

module.exports = {
	config: {
		name: "annonce",
		version: "3.0.0",
		author: "Kenny",
		countDown: 10,
		role: 4,
		description: "Diffuser une annonce décorée dans tous les groupes",
		category: "owner",
		guide: {
			fr: "~annonce : ouvrir le menu de diffusion"
		}
	},

	onStart: async function ({ event, message, role }) {
		if (role < 4)
			return message.reply(
				"⛔ Cette commande est réservée aux administrateurs du bot."
			);

		const ownerID = event.senderID || event.author;

		const text =
			"╔════════════════════════════╗\n" +
			"       🖤 CENTRE D'ANNONCES 🖤\n" +
			"╚════════════════════════════╝\n\n" +
			"📂 CHOISIS UNE CATÉGORIE\n\n" +
			CATEGORIES.map((item, i) => `${i + 1}️⃣ ${item}`).join("\n") +
			"\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
			"✉️ Réponds avec le numéro de ton choix.";

		await createReply(message, {
			ownerID,
			step: "category",
			text
		});
	},

	onReply: async function ({ api, event, message, Reply, role }) {
		if (role < 4)
			return message.reply(
				"⛔ Tu n'as plus l'autorisation d'utiliser cette commande."
			);

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
			await createReply(message, {
				ownerID: Reply.ownerID,
				...state,
				text
			});
		};

		// ÉTAPE 1 : CATÉGORIE
		if (Reply.step === "category") {
			if (!Number.isInteger(choice) || choice < 1 || choice > CATEGORIES.length) {
				return next(
					{ step: "category" },
					"❌ Numéro invalide.\n\n" +
					CATEGORIES.map((item, i) => `${i + 1}️⃣ ${item}`).join("\n") +
					"\n\nChoisis un numéro entre 1 et 5."
				);
			}

			return next(
				{
					step: "style",
					category: choice - 1
				},
				"╔══════ 🎨 ══════╗\n" +
				"       CHOIX DU STYLE\n" +
				"╚════════════════╝\n\n" +
				STYLES.map((item, i) => `${i + 1}️⃣ ${item}`).join("\n") +
				"\n\n✧ Réponds avec un numéro entre 1 et 7."
			);
		}

		// ÉTAPE 2 : STYLE
		if (Reply.step === "style") {
			if (!Number.isInteger(choice) || choice < 1 || choice > STYLES.length) {
				return next(
					{
						step: "style",
						category: Reply.category
					},
					"❌ Style invalide.\n\n" +
					STYLES.map((item, i) => `${i + 1}️⃣ ${item}`).join("\n") +
					"\n\nChoisis un numéro entre 1 et 7."
				);
			}

			return next(
				{
					step: "content",
					category: Reply.category,
					style: choice - 1
				},
				"╔══════ ✍️ ══════╗\n" +
				"       RÉDACTION\n" +
				"╚════════════════╝\n\n" +
				`📂 Catégorie : ${CATEGORIES[Reply.category]}\n` +
				`🎨 Style : ${STYLES[choice - 1]}\n\n` +
				"Envoie maintenant le texte de ton annonce.\n\n" +
				"⚠️ Ton texte sera conservé et présenté dans le style choisi."
			);
		}

		// ÉTAPE 3 : CONTENU
		if (Reply.step === "content") {
			if (!answer || answer.length < 2) {
				return next(
					{
						step: "content",
						category: Reply.category,
						style: Reply.style
					},
					"❌ Ton annonce est trop courte.\nEnvoie un texte valide."
				);
			}

			if (answer.length > 5000) {
				return next(
					{
						step: "content",
						category: Reply.category,
						style: Reply.style
					},
					"❌ Maximum autorisé : 5 000 caractères.\nRaccourcis ton annonce."
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
				"1️⃣ ENVOYER DANS TOUS LES GROUPES\n" +
				"2️⃣ ANNULER LA DIFFUSION\n\n" +
				"Réponds avec 1 ou 2."
			);
		}

		// ÉTAPE 4 : CONFIRMATION
		if (Reply.step === "confirm") {
			if (choice === 2) {
				return message.reply(
					"╔══════ ❌ ══════╗\n" +
					"     DIFFUSION ANNULÉE\n" +
					"╚════════════════╝\n\n" +
					"🖤 Aucun groupe n'a reçu cette annonce."
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
					"⚠️ Réponse invalide.\n\n1️⃣ Envoyer\n2️⃣ Annuler"
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
					groups.map(group => [String(group.threadID), group])
				).values()
			];

			if (uniqueGroups.length === 0) {
				return message.reply(
					"⚠️ Aucun groupe disponible pour la diffusion."
				);
			}

			const announcement = formatAnnouncement(
				CATEGORIES[Reply.category],
				Reply.style,
				Reply.content
			);

			await message.reply(
				"╔══════ 🚀 ══════╗\n" +
				"     DIFFUSION LANCÉE\n" +
				"╚════════════════╝\n\n" +
				`📦 Groupes ciblés : ${uniqueGroups.length}\n` +
				`⚡ Envois simultanés : ${CONCURRENCY}\n\n` +
				"Le rapport sera envoyé à la fin."
			);

			let success = 0;
			let failed = 0;
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
							await sendWithTimeout(
								api,
								announcement,
								group.threadID
							);
							return true;
						}
						catch (err) {
							console.error(
								`[ANNONCE] Échec ${group.threadID}:`,
								err.message || err
							);
							return false;
						}
					})
				);

				for (const result of results) {
					if (result)
						success++;
					else
						failed++;
				}

				completed += batch.length;

				if (completed < uniqueGroups.length)
					await sleep(BATCH_DELAY);

				console.log(
					`[ANNONCE] Progression : ${completed}/${uniqueGroups.length} | Réussis : ${success} | Échecs : ${failed}`
				);
			}

			return message.reply(
				"╔════════════════════════════╗\n" +
				"       📊 RAPPORT FINAL\n" +
				"╚════════════════════════════╝\n\n" +
				`📂 Catégorie : ${CATEGORIES[Reply.category]}\n` +
				`🎨 Style : ${STYLES[Reply.style]}\n\n` +
				"━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
				`📦 Groupes ciblés : ${uniqueGroups.length}\n` +
				`✅ Envois réussis : ${success}\n` +
				`❌ Envois échoués : ${failed}\n` +
				`📊 Total traité : ${completed}\n` +
				"━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
				(
					failed === 0
						? "🖤 Toutes les annonces ont été envoyées."
						: "⚠️ Diffusion terminée. Certains envois ont échoué."
				)
			);
		}
	}
};
