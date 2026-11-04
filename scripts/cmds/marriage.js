const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

const DATA_DIR = path.join(__dirname, "cache", "mariage");
fs.ensureDirSync(DATA_DIR);

// ==============================
// BLACKWOOD - HELPERS
// ==============================

const getName = async (usersData, uid) => {
	try {
		const data = await usersData.get(uid);
		return data?.name || `Utilisateur ${uid}`;
	} catch {
		return `Utilisateur ${uid}`;
	}
};

const getMoney = async (usersData, uid) => {
	try {
		const data = await usersData.get(uid);
		return Number(data?.money || 0);
	} catch {
		return 0;
	}
};

const getAvatar = async (api, uid) => {
	try {
		const info = await api.getUserInfo(uid);
		return info?.[uid]?.thumbSrc || null;
	} catch {
		return null;
	}
};

const getPrefix = (threadID) => {
	try {
		if (global.utils?.getPrefix) {
			return global.utils.getPrefix(threadID) || "!";
		}
	} catch {}

	return "!";
};

const getMarriage = async (usersData, uid) => {
	try {
		const data = await usersData.get(uid);
		return data?.marriage || null;
	} catch {
		return null;
	}
};

const setMarriage = async (usersData, uid, marriage) => {
	const data = await usersData.get(uid) || {};

	await usersData.set(uid, {
		...data,
		marriage
	});
};

const removeMarriage = async (usersData, uid, expectedPartnerID = null) => {
	const data = await usersData.get(uid) || {};

	if (
		expectedPartnerID &&
		data.marriage?.partnerID !== expectedPartnerID
	) {
		return false;
	}

	const updated = { ...data };
	delete updated.marriage;

	await usersData.set(uid, updated);
	return true;
};

const getAllUsers = async (usersData) => {
	try {
		const result = await usersData.getAll();

		if (Array.isArray(result)) {
			return result;
		}

		if (result && typeof result === "object") {
			return Object.entries(result).map(([uid, data]) => ({
				...data,
				userID: data?.userID || uid
			}));
		}

		return [];
	} catch (error) {
		console.error("[BLACKWOOD] getAllUsers:", error);
		return [];
	}
};

const getAllMarriageUsers = async (usersData) => {
	const allUsers = await getAllUsers(usersData);

	return allUsers.filter(user =>
		user?.marriage?.partnerID
	);
};

const clearMarriageRequest = async (usersData, uid) => {
	try {
		const data = await usersData.get(uid);

		if (!data) return;

		const updated = { ...data };

		delete updated.marriageRequest;
		delete updated.marriageRequestOut;

		await usersData.set(uid, updated);
	} catch (error) {
		console.error("[BLACKWOOD] clearMarriageRequest:", error);
	}
};

const formatMoney = (amount) => {
	return Number(amount || 0).toLocaleString("fr-FR");
};

// ==============================
// BLACKWOOD - CANVAS
// ==============================

const roundedRect = (ctx, x, y, w, h, r) => {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.closePath();
};

const drawBackground = (ctx, width, height) => {
	const gradient = ctx.createLinearGradient(0, 0, width, height);

	gradient.addColorStop(0, "#050505");
	gradient.addColorStop(0.5, "#17100b");
	gradient.addColorStop(1, "#000000");

	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, width, height);

	ctx.strokeStyle = "rgba(212, 175, 55, 0.35)";
	ctx.lineWidth = 3;
	ctx.strokeRect(12, 12, width - 24, height - 24);

	ctx.strokeStyle = "rgba(212, 175, 55, 0.15)";
	ctx.lineWidth = 1;
	ctx.strokeRect(22, 22, width - 44, height - 44);
};

const drawText = (ctx, text, x, y, size, color = "#f5d27a") => {
	ctx.font = `bold ${size}px Arial`;
	ctx.fillStyle = color;
	ctx.textAlign = "center";
	ctx.shadowColor = color;
	ctx.shadowBlur = 8;
	ctx.fillText(String(text), x, y);
	ctx.shadowBlur = 0;
};

const drawAvatar = async (ctx, url, x, y, size) => {
	ctx.save();

	ctx.beginPath();
	ctx.arc(
		x + size / 2,
		y + size / 2,
		size / 2,
		0,
		Math.PI * 2
	);
	ctx.closePath();
	ctx.clip();

	try {
		if (url) {
			const image = await loadImage(url);
			ctx.drawImage(image, x, y, size, size);
		} else {
			ctx.fillStyle = "#292018";
			ctx.fillRect(x, y, size, size);
			drawText(ctx, "?", x + size / 2, y + size / 2 + 15, 45);
		}
	} catch {
		ctx.fillStyle = "#292018";
		ctx.fillRect(x, y, size, size);
	}

	ctx.restore();

	ctx.beginPath();
	ctx.arc(
		x + size / 2,
		y + size / 2,
		size / 2 + 4,
		0,
		Math.PI * 2
	);

	ctx.strokeStyle = "#d4af37";
	ctx.lineWidth = 5;
	ctx.stroke();
};

// ==============================
// AFFICHES DE MARIAGE
// ==============================

const createPoster = async ({
	api,
	uid1,
	uid2,
	name1,
	name2,
	title,
	subtitle
}) => {
	const width = 900;
	const height = 520;

	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext("2d");

	drawBackground(ctx, width, height);

	drawText(ctx, "𓆩 BLACKWOOD 𓆪", 450, 75, 32);
	drawText(ctx, title, 450, 145, 42, "#ffffff");

	const avatar1 = await getAvatar(api, uid1);
	const avatar2 = await getAvatar(api, uid2);

	await drawAvatar(ctx, avatar1, 180, 185, 170);
	await drawAvatar(ctx, avatar2, 550, 185, 170);

	drawText(ctx, "♥", 450, 285, 65, "#ff304f");

	drawText(ctx, name1, 265, 395, 25, "#ffffff");
	drawText(ctx, name2, 635, 395, 25, "#ffffff");

	drawText(
		ctx,
		subtitle || "Une histoire commence...",
		450,
		465,
		20
	);

	const filePath = path.join(
		DATA_DIR,
		`marriage_${Date.now()}_${Math.floor(Math.random() * 10000)}.png`
	);

	await fs.writeFile(filePath, canvas.toBuffer("image/png"));

	return filePath;
};

// ==============================
// CLASSEMENT DES COUPLES
// ==============================

const createTopPoster = async (ranking) => {
	const canvas = createCanvas(900, 760);
	const ctx = canvas.getContext("2d");

	drawBackground(ctx, 900, 760);

	drawText(ctx, "𓆩 BLACKWOOD 𓆪", 450, 75, 34);
	drawText(ctx, "TOP DES COUPLES", 450, 145, 40, "#ffffff");

	let y = 220;

	for (let i = 0; i < ranking.length; i++) {
		const couple = ranking[i];

		ctx.fillStyle = "rgba(212,175,55,0.12)";

		roundedRect(ctx, 100, y - 35, 700, 55, 12);
		ctx.fill();

		ctx.fillStyle = "#f5d27a";
		ctx.font = "bold 22px Arial";
		ctx.textAlign = "left";

		ctx.fillText(
			`${i + 1}. ${couple.name}`,
			130,
			y,
			450
		);

		ctx.textAlign = "right";
		ctx.fillStyle = "#ffffff";

		ctx.fillText(
			`${formatMoney(couple.money)} $`,
			770,
			y
		);

		y += 75;
	}

	const filePath = path.join(
		DATA_DIR,
		`top_${Date.now()}.png`
	);

	await fs.writeFile(filePath, canvas.toBuffer("image/png"));

	return filePath;
};

// ==============================
// ENVOI DES AFFICHES
// ==============================

const sendPoster = async (message, filePath, body = "") => {
	try {
		return await message.reply({
			body,
			attachment: fs.createReadStream(filePath)
		});
	} finally {
		setTimeout(() => {
			fs.remove(filePath).catch(() => {});
		}, 60000);
	}
};module.exports = {
	config: {
		name: "mariage",
		version: "3.3 BLACKWOOD",
		author: "KENNY BLACKWOOD",
		countDown: 5,
		role: 0,
		shortDescription: "Système de mariage",
		description: "Se marier, consulter son couple et découvrir les couples les plus riches.",
		category: "fun",
		guide: {
			fr: "{pn} @mention\n{pn} accept\n{pn} refuse\n{pn} profil\n{pn} top\n{pn} destin\n{pn} divorce"
		}
	},

	onStart: async function ({
		api,
		event,
		args,
		message,
		usersData
	}) {
		const { threadID, senderID, mentions } = event;

		const prefix = getPrefix(threadID);
		const command = `${prefix}mariage`;

		const send = body => message.reply(body);

		try {
			const action = (args[0] || "").toLowerCase();
			const myMarriage = await getMarriage(usersData, senderID);

			// ==============================
			// AIDE
			// ==============================

			if (!action) {
				return send(
					`𓆩 🦇 BLACKWOOD MARRIAGE 𓆪

━━━━━━━━━━━━━━━━━━━━

💍 SYSTÈME DE MARIAGE

${command} @mention
└ Demander quelqu'un en mariage.

${command} accept
└ Accepter une demande.

${command} refuse
└ Refuser une demande.

${command} profil
└ Voir ton profil amoureux.

${command} top
└ Classement des couples les plus riches.

${command} destin
└ Découvrir ton âme sœur.

${command} divorce
└ Mettre fin à ton mariage.

━━━━━━━━━━━━━━━━━━━━
𓆩 BLACKWOOD SYSTEM 𓆪`
				);
			}

			// ==============================
			// TOP DES COUPLES
			// ==============================

			if (action === "top") {
				const allUsers = await getAllMarriageUsers(usersData);

				const couples = [];
				const checked = new Set();

				for (const user of allUsers) {
					const uid = user.userID;
					const partnerID = user.marriage.partnerID;

					if (
						!uid ||
						!partnerID ||
						checked.has(String(uid)) ||
						checked.has(String(partnerID))
					) {
						continue;
					}

					checked.add(String(uid));
					checked.add(String(partnerID));

					const name1 = await getName(usersData, uid);
					const name2 = await getName(usersData, partnerID);

					const money1 = await getMoney(usersData, uid);
					const money2 = await getMoney(usersData, partnerID);

					couples.push({
						name: `${name1} ♥ ${name2}`,
						money: money1 + money2
					});
				}

				couples.sort((a, b) => b.money - a.money);

				if (!couples.length) {
					return send(
						"💔 Aucun couple enregistré pour le moment."
					);
				}

				const ranking = couples.slice(0, 7);
				const filePath = await createTopPoster(ranking);

				return sendPoster(
					message,
					filePath,
					"𓆩 🏆 CLASSEMENT BLACKWOOD 🏆 𓆪"
				);
			}

			// ==============================
			// PROFIL
			// ==============================

			if (action === "profil") {
				if (!myMarriage) {
					return send(
						"💔 Tu n'es actuellement marié à personne."
					);
				}

				const partnerID = myMarriage.partnerID;

				const partnerName = await getName(usersData, partnerID);
				const myName = await getName(usersData, senderID);

				const money1 = await getMoney(usersData, senderID);
				const money2 = await getMoney(usersData, partnerID);

				const total = money1 + money2;
				const date = myMarriage.date || "Date inconnue";

				const filePath = await createPoster({
					api,
					uid1: senderID,
					uid2: partnerID,
					name1: myName,
					name2: partnerName,
					title: "COUPLE BLACKWOOD",
					subtitle: `Fortune commune : ${formatMoney(total)} $`
				});

				return sendPoster(
					message,
					filePath,
					`𓆩 💍 PROFIL DE MARIAGE 𓆪

👤 Partenaire : ${partnerName}
📅 Mariage : ${date}
💰 Fortune commune : ${formatMoney(total)} $`
				);
			}

			// ==============================
			// ACCEPTER UNE DEMANDE
			// ==============================

			if (action === "accept") {
				const data = await usersData.get(senderID);
				const request = data?.marriageRequest;

				if (!request || !request.from) {
					return send(
						"💔 Tu n'as aucune demande de mariage."
					);
				}

				if (myMarriage) {
					return send("💍 Tu es déjà marié(e).");
				}

				const partnerID = request.from;

				const partnerMarriage = await getMarriage(
					usersData,
					partnerID
				);

				if (partnerMarriage) {
					await clearMarriageRequest(usersData, senderID);
					await clearMarriageRequest(usersData, partnerID);

					return send(
						"💔 Cette personne est déjà mariée."
					);
				}

				const partnerData = await usersData.get(partnerID);

				// Vérifie que la demande correspond bien
				// à la personne qui l'a envoyée.
				if (
					partnerData?.marriageRequestOut &&
					String(partnerData.marriageRequestOut.to) !== String(senderID)
				) {
					return send(
						"⚠️ Cette demande n'est plus valide."
					);
				}

				// Vérification supplémentaire
				const latestMyMarriage = await getMarriage(
					usersData,
					senderID
				);

				const latestPartnerMarriage = await getMarriage(
					usersData,
					partnerID
				);

				if (latestMyMarriage || latestPartnerMarriage) {
					return send(
						"💔 L'un de vous est déjà marié."
					);
				}

				const date = new Date().toLocaleDateString("fr-FR");

				await setMarriage(usersData, senderID, {
					partnerID,
					date
				});

				await setMarriage(usersData, partnerID, {
					partnerID: senderID,
					date
				});

				// Nettoyage des demandes des deux utilisateurs
				await clearMarriageRequest(usersData, senderID);
				await clearMarriageRequest(usersData, partnerID);

				const name1 = await getName(usersData, senderID);
				const name2 = await getName(usersData, partnerID);

				const filePath = await createPoster({
					api,
					uid1: senderID,
					uid2: partnerID,
					name1,
					name2,
					title: "MARIAGE OFFICIEL",
					subtitle: "Deux âmes, une seule histoire."
				});

				return sendPoster(
					message,
					filePath,
					`𓆩 💍 MARIAGE CONFIRMÉ 💍 𓆪

❤️ ${name1} et ${name2} sont désormais mariés !

━━━━━━━━━━━━━━━━━━━━
𓆩 BLACKWOOD FAMILY 𓆪`
				);
			}

			// ==============================
			// REFUSER UNE DEMANDE
			// ==============================

			if (action === "refuse") {
				const data = await usersData.get(senderID);
				const request = data?.marriageRequest;

				if (!request || !request.from) {
					return send(
						"💔 Tu n'as aucune demande à refuser."
					);
				}

				const partnerID = request.from;

				const name1 = await getName(usersData, senderID);
				const name2 = await getName(usersData, partnerID);

				// Supprime la demande chez les deux personnes
				await clearMarriageRequest(usersData, senderID);
				await clearMarriageRequest(usersData, partnerID);

				const filePath = await createPoster({
					api,
					uid1: senderID,
					uid2: partnerID,
					name1,
					name2,
					title: "AMOUR REFUSÉ",
					subtitle: "Toutes les histoires ne sont pas éternelles..."
				});

				return sendPoster(
					message,
					filePath,
					`💔 ${name1} a refusé la demande de mariage de ${name2}.`
				);
			}

			// ==============================
			// DESTIN
			// ==============================

			if (action === "destin") {
				if (myMarriage) {
					return send(
						"💍 Tu as déjà trouvé ton âme sœur."
					);
				}

				const allUsers = await getAllUsers(usersData);

				const candidates = allUsers.filter(user => {
					const uid = String(user.userID || "");

					return (
						uid &&
						uid !== String(senderID) &&
						!user.marriage &&
						!user.marriageRequest &&
						!user.marriageRequestOut
					);
				});

				if (!candidates.length) {
					return send(
						"💔 Aucun partenaire disponible pour le moment."
					);
				}

				const random = candidates[
					Math.floor(Math.random() * candidates.length)
				];

				const partnerID = random.userID;
				const partnerName = await getName(usersData, partnerID);

				return send(
					`𓆩 🔮 TON DESTIN 𓆪

Ton âme sœur potentielle est :

💗 ${partnerName}

Pour lui demander sa main :
${command} @mention

━━━━━━━━━━━━━━━━━━━━
𓆩 BLACKWOOD DESTINY 𓆪`
				);
			}

			// ==============================
			// DIVORCE
			// ==============================

			if (action === "divorce") {
				if (!myMarriage) {
					return send(
						"💔 Tu n'es pas marié(e)."
					);
				}

				const partnerID = myMarriage.partnerID;

				const name1 = await getName(usersData, senderID);
				const name2 = await getName(usersData, partnerID);

				// Supprime uniquement le mariage concerné
				await removeMarriage(
					usersData,
					senderID,
					partnerID
				);

				await removeMarriage(
					usersData,
					partnerID,
					senderID
				);

				const filePath = await createPoster({
					api,
					uid1: senderID,
					uid2: partnerID,
					name1,
					name2,
					title: "DIVORCE",
					subtitle: "Une histoire vient de prendre fin."
				});

				return sendPoster(
					message,
					filePath,
					`💔 DIVORCE OFFICIEL

${name1} et ${name2} ne sont désormais plus mariés.`
				);
			}

			// ==============================
			// DEMANDE DE MARIAGE
			// ==============================

			const targetID = Object.keys(mentions || {})[0];

			if (!targetID) {
				return send(
					`💍 Mentionne une personne pour lui demander sa main.

Exemple :
${command} @mention`
				);
			}

			if (String(targetID) === String(senderID)) {
				return send(
					"💔 Tu ne peux pas te marier avec toi-même."
				);
			}

			if (myMarriage) {
				return send(
					"💍 Tu es déjà marié(e)."
				);
			}

			const targetMarriage = await getMarriage(
				usersData,
				targetID
			);

			if (targetMarriage) {
				return send(
					"💔 Cette personne est déjà mariée."
				);
			}

			const targetData = await usersData.get(targetID) || {};
			const senderData = await usersData.get(senderID) || {};

			// Vérifie si la cible a déjà une demande reçue
			if (targetData.marriageRequest) {
				return send(
					"⏳ Cette personne a déjà une demande de mariage en attente."
				);
			}

			// Vérifie si la cible a déjà envoyé une demande
			if (targetData.marriageRequestOut) {
				return send(
					"⏳ Cette personne a déjà envoyé une demande de mariage."
				);
			}

			// Vérifie si l'expéditeur a déjà envoyé une demande
			if (senderData.marriageRequestOut) {
				return send(
					"⏳ Tu as déjà envoyé une demande de mariage."
				);
			}

			// Vérifie si l'expéditeur a une demande reçue
			if (senderData.marriageRequest) {
				return send(
					"⏳ Tu dois d'abord accepter ou refuser ta demande actuelle."
				);
			}

			const name1 = await getName(usersData, senderID);
			const name2 = await getName(usersData, targetID);

			// Enregistre la demande chez la personne ciblée
			await usersData.set(targetID, {
				...targetData,
				marriageRequest: {
					from: senderID,
					date: Date.now()
				}
			});

			// Enregistre également la demande chez l'expéditeur
			await usersData.set(senderID, {
				...senderData,
				marriageRequestOut: {
					to: targetID,
					date: Date.now()
				}
			});

			const filePath = await createPoster({
				api,
				uid1: senderID,
				uid2: targetID,
				name1,
				name2,
				title: "DEMANDE DE MARIAGE",
				subtitle: "Une nouvelle histoire pourrait commencer..."
			});

			return sendPoster(
				message,
				filePath,
				`𓆩 💍 DEMANDE DE MARIAGE 💍 𓆪

❤️ ${name1} demande ${name2} en mariage !

Pour accepter :
${command} accept

Pour refuser :
${command} refuse

━━━━━━━━━━━━━━━━━━━━
𓆩 BLACKWOOD FAMILY 𓆪`
			);

		} catch (error) {
			console.error("[BLACKWOOD MARIAGE]", error);

			return send(
				"⚠️ Une erreur est survenue pendant l'exécution de la commande."
			);
		}
	}
};
