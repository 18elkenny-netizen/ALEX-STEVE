
const moment = require("moment-timezone");

module.exports = {
	config: {
		name: "banall",
		version: "1.0",
		author: "DARK SYSTEM",
		countDown: 30,
		role: 2,
		description: "Bannir plusieurs membres d'un groupe",
		category: "box chat",
		guide: {
			fr:
				"{pn} : Préparer le bannissement de tous les membres bannissables\n" +
				"{pn} @mention : Préparer le bannissement d'un membre"
		}
	},

	onStart: async function ({
		api,
		event,
		message,
		args,
		threadsData,
		usersData
	}) {
		const { threadID, senderID } = event;

		try {
			const threadData = await threadsData.get(threadID);
			const members = Array.isArray(threadData.members)
				? threadData.members
				: Object.values(threadData.members || {});

			const adminIDs = threadData.adminIDs || [];
			const botID = api.getCurrentUserID();
			const participants = event.participantIDs || [];

			// Vérification des droits du bot
			if (!adminIDs.includes(botID)) {
				return message.reply(
					"🛡️ Le bot doit être administrateur du groupe pour effectuer cette opération."
				);
			}

			// Liste des membres à bannir
			let targets = [];

			if (Object.keys(event.mentions || {}).length > 0) {
				targets = Object.keys(event.mentions);
			}
			else if (args[0] && /^\d+$/.test(args[0])) {
				targets = [args[0]];
			}
			else {
				targets = participants;
			}

			// Protection des administrateurs, du bot et de l'auteur
			targets = [...new Set(targets)].filter(id =>
				id !== botID &&
				id !== senderID &&
				!adminIDs.includes(id) &&
				participants.includes(id)
			);

			if (!targets.length) {
				return message.reply(
					"⚠️ Aucun membre bannissable trouvé.\n" +
					"Les administrateurs, le bot et toi-même sont protégés."
				);
			}

			const names = [];

			for (const id of targets.slice(0, 10)) {
				const member = members.find(item => item.userID == id);
				const name = member?.name || await usersData.getName(id) || id;
				names.push("• " + name);
			}

			const more = targets.length > 10
				? `\n• ... et ${targets.length - 10} autre(s)`
				: "";

			const preview = names.join("\n") + more;

			const confirmation = await message.reply(
				"╔═══━━━〔 🩸 𝐃𝐀𝐑𝐊 𝐒𝐘𝐒𝐓𝐄𝐌 〕━━━═══╗\n\n" +
				"       ⚠️ 𝐁𝐀𝐍𝐍𝐈𝐒𝐒𝐄𝐌𝐄𝐍 𝐌𝐀𝐒𝐒𝐈𝐅 ⚠️\n\n" +
				`👥 Membres concernés : ${targets.length}\n\n` +
				"📜 Liste des cibles :\n" + preview + "\n\n" +
				"🛡️ Administrateurs protégés.\n" +
				"🩸 Réponds exactement CONFIRMER pour continuer.\n" +
				"❌ Réponds ANNULER pour abandonner.\n\n" +
				"╚════════════════════════════════╝"
			);

			if (!confirmation || !confirmation.messageID)
				return;

			global.GoatBot.onReply.push({
				name: this.config.name,
				messageID: confirmation.messageID,
				author: senderID,
				threadID,
				targets,
				onReply: async function ({ event, message, threadsData, api }) {
					const answer = (event.body || "").trim().toUpperCase();

					if (event.senderID !== this.author)
						return;

					if (answer === "ANNULER") {
						global.GoatBot.onReply =
							global.GoatBot.onReply.filter(
								item => item.messageID !== this.messageID
							);

						return message.reply(
							"🛑 Opération annulée.\nLe DARK SYSTEM reste en veille."
						);
					}

					if (answer !== "CONFIRMER") {
						return message.reply(
							"⚠️ Réponse invalide.\nÉcris CONFIRMER ou ANNULER."
						);
					}

					global.GoatBot.onReply =
						global.GoatBot.onReply.filter(
							item => item.messageID !== this.messageID
						);

					const currentData = await threadsData.get(this.threadID);
					const currentAdmins = currentData.adminIDs || [];
					const currentParticipants = event.participantIDs || [];

					let bannedList = await threadsData.get(
						this.threadID,
						"data.banned_ban",
						[]
					);

					let success = 0;
					let failed = 0;
					let skipped = 0;

					const wait = ms =>
						new Promise(resolve => setTimeout(resolve, ms));

					for (const id of this.targets) {
						// Nouvelle vérification avant chaque bannissement
						if (
							id === api.getCurrentUserID() ||
							id === this.author ||
							currentAdmins.includes(id) ||
							!currentParticipants.includes(id)
						) {
							skipped++;
							continue;
						}

						if (!bannedList.some(item => item.id == id)) {
							bannedList.push({
								id,
								time: moment()
									.tz(global.GoatBot.config.timeZone)
									.format("HH:mm:ss DD/MM/YYYY"),
								reason: "Bannissement DARK SYSTEM"
							});
						}

						try {
							await new Promise((resolve, reject) => {
								api.removeUserFromGroup(
									id,
									this.threadID,
									err => err ? reject(err) : resolve()
								);
							});

							success++;
						}
						catch (err) {
							failed++;
						}

						await wait(1000);
					}

					await threadsData.set(
						this.threadID,
						bannedList,
						"data.banned_ban"
					);

					return message.reply(
						"╔═══━━━〔 🩸 𝐑𝐀𝐏𝐏𝐎𝐑𝐓 〕━━━═══╗\n\n" +
						"       𝐁𝐀𝐍𝐍𝐈𝐒𝐒𝐄𝐌𝐄𝐍𝐓 𝐓𝐄𝐑𝐌𝐈𝐍𝐄́\n\n" +
						`✅ Réussis : ${success}\n` +
						`❌ Échecs : ${failed}\n` +
						`🛡️ Ignorés : ${skipped}\n\n` +
						"👑 DARK SYSTEM | Opération terminée.\n\n" +
						"╚════════════════════════════════╝"
					);
				}
			});

		}
		catch (err) {
			console.error("[BANALL ERROR]", err);
			return message.reply(
				"❌ Une erreur est survenue pendant la préparation de l'opération."
			);
		}
	}
};
            
