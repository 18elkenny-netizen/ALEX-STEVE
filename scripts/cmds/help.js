const { commands } = global.GoatBot;
const config = global.GoatBot.config;
const fonts = require("../func/fonts.js");

const CATEGORY_ORDER = [
  "admin", "ai", "anime", "contacts admin",
  "download", "economy", "fun", "game",
  "image", "media", "owner", "security",
  "settings", "system", "tools", "utility"
];

const CATEGORY_DESIGNS = {
  admin: "⚔️ 𝐀𝐃𝐌𝐈𝐍",
  ai: "🤖 𝐀𝐈",
  anime: "⛩️ 𝐀𝐍𝐈𝐌𝐄",
  "contacts admin": "📞 𝐂𝐎𝐍𝐓𝐀𝐂𝐓𝐒 𝐀𝐃𝐌𝐈𝐍",
  download: "📥 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃",
  economy: "💰 𝐄𝐂𝐎𝐍𝐎𝐌𝐘",
  fun: "🎭 𝐅𝐔𝐍",
  game: "🎮 𝐆𝐀𝐌𝐄 & 𝐅𝐔𝐍",
  image: "🎨 𝐈𝐌𝐀𝐆𝐄",
  media: "🎧 𝐌𝐄𝐃𝐈𝐀",
  owner: "👑 𝐎𝐖𝐍𝐄𝐑",
  security: "🛡️ 𝐒𝐄𝐂𝐔𝐑𝐈𝐓𝐘",
  settings: "⚙️ 𝐒𝐄𝐓𝐓𝐈𝐍𝐆𝐒",
  system: "💻 𝐒𝐘𝐒𝐓𝐄𝐌",
  tools: "🧰 𝐓𝐎𝐎𝐋𝐒",
  utility: "🔧 𝐔𝐓𝐈𝐋𝐈𝐓𝐘"
};

const CATEGORY_ICONS = {
  admin: "⚔️",
  ai: "🤖",
  anime: "⛩️",
  "contacts admin": "📞",
  download: "📥",
  economy: "💰",
  fun: "🎭",
  game: "🎮",
  image: "🎨",
  media: "🎧",
  owner: "👑",
  security: "🛡️",
  settings: "⚙️",
  system: "💻",
  tools: "🧰",
  utility: "🔧",
  other: "📁"
};

function normalizeCategory(category) {
  return String(category || "other").trim().toLowerCase();
}

function buildHelpMenu() {
  const cats = {};

  for (const [name, cmd] of commands) {
    const c = cmd?.config || {};
    const category = normalizeCategory(c.category);

    if (!cats[category]) cats[category] = [];

    const commandName = c.name || name;

    if (!cats[category].includes(commandName)) {
      cats[category].push(commandName);
    }
  }

  // Commandes DARK SYSTEM ajoutées à GAME & FUN.
  const gameCommands = [
    "gang",
    "echecs",
    "devinette"
  ];

  for (const name of gameCommands) {
    const cmd = commands.get(name);

    if (cmd) {
      const category = "game";

      if (!cats[category]) cats[category] = [];

      const commandName = cmd.config?.name || name;

      if (!cats[category].includes(commandName)) {
        cats[category].push(commandName);
      }
    }
  }

  // Ajouter Raphaël si sa commande est chargée.
  const raphaelCommand = commands.get("raphael");

  if (raphaelCommand) {
    const category = normalizeCategory(
      raphaelCommand.config?.category
    );

    if (!cats[category]) cats[category] = [];

    const name = raphaelCommand.config?.name || "raphael";

    if (!cats[category].includes(name)) {
      cats[category].push(name);
    }
  }

  // Trier les commandes.
  for (const category of Object.keys(cats)) {
    cats[category].sort((a, b) => a.localeCompare(b));
  }

  const orderedCategories = [
    ...CATEGORY_ORDER.filter(category => cats[category]),
    ...Object.keys(cats)
      .filter(category => !CATEGORY_ORDER.includes(category))
      .sort()
  ];

  let menu = [
    "𓆩 𝐃𝐀𝐑𝐊 𝐒𝐘𝐒𝐓𝐄𝐌 𓆪",
    "⛧ 𝐎𝐅𝐅𝐈𝐂𝐈𝐀𝐋 𝐂𝐎𝐌𝐌𝐀𝐍𝐃 𝐂𝐄𝐍𝐓𝐄𝐑 ⛧",
    "━━━━━━━━━━━━━━━━━━━━",
    "☠️ 𝐌𝐄𝐍𝐔 𝐃𝐄𝐒 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐄𝐒 ☠️",
    `『 ${commands.size} 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐄𝐒 • ${orderedCategories.length} 𝐂𝐀𝐓𝐄𝐆𝐎𝐑𝐈𝐄𝐒 』`
  ].join("\n");

  // Affichage des catégories.
  for (const category of orderedCategories) {
    const list = cats[category];

    const title = CATEGORY_DESIGNS[category] ||
      `${CATEGORY_ICONS[category] || "📁"} 𝐎𝐓𝐇𝐄𝐑 : ${category.toUpperCase()}`;

    menu += `\n\n𓆩 ${title} 𓆪`;
    menu += `\n╰➤ ${list.map(name => `• ${name}`).join("  ")}`;
    menu += `\n<${list.length} commande${list.length > 1 ? "s" : ""}>`;
  }

  const p = config.prefix || "_";

  // Guide et signature du créateur.
  menu += [
    "",
    "━━━━━━━━━━━━━━━━━━━━",
    "𓆩 🩸 𝐂𝐎𝐌𝐌𝐀𝐍𝐃 𝐆𝐔𝐈𝐃𝐄 𓆪",
    `➤ ${p}help <commande>`,
    `➤ ${p}help basics`,
    `➤ ${p}help search <mot>`,
    "━━━━━━━━━━━━━━━━━━━━",
    "☠️ 𝐃𝐄𝐕𝐄𝐋𝐎𝐏𝐄𝐃 𝐁𝐘 @𝐒𝐇𝐀𝐃𝐄 🎀",
    "⛧ 𝐖𝐄𝐋𝐂𝐎𝐌𝐄 𝐓𝐎 𝐓𝐇𝐄 𝐃𝐀𝐑𝐊 𝐒𝐈𝐃𝐄 ⛧",
    "",
    "╭━━━〔 👑 𝐂𝐑𝐄𝐀𝐓𝐎𝐑 〕━━━╮",
    "┃",
    "┃  🩸 𝐔𝐧𝐞 𝐪𝐮𝐞𝐬𝐭𝐢𝐨𝐧 ? 𝐔𝐧 𝐩𝐫𝐨𝐛𝐥𝐞̀𝐦𝐞 ?",
    "┃  ☠️ 𝐂𝐨𝐧𝐭𝐚𝐜𝐭𝐞 𝐦𝐨𝐧 𝐌𝐚𝐢̂𝐭𝐫𝐞 𝐨𝐮 𝐦𝐨𝐧 𝐂𝐫𝐞́𝐚𝐭𝐞𝐮𝐫.",
    "┃",
    "┃  🔗 𝐅𝐀𝐂𝐄𝐁𝐎𝐎𝐊 :",
    "┃  https://www.facebook.com/profile.php?id=61595650165092",
    "┃",
    "╰━━━━━━〔 🖤 〕━━━━━━╯"
  ].join("\n");

  return {
    menu,
    total: commands.size,
    categoryCount: orderedCategories.length,
    categories: orderedCategories
  };
}

// Actualiser le cache du menu.
global.GoatBot.refreshHelpMenu = function () {
  global.GoatBot.helpMenuCache = buildHelpMenu();
  return global.GoatBot.helpMenuCache;
};

module.exports = {
  config: {
    name: "help",
    version: "11.2",
    author: "Shade × Christus",
    countDown: 2,
    role: 0,
    category: "system",
    guide: "help [commande | search <mot>]"
  },

  onStart: async function ({ message, args }) {
    const p = config.prefix || "_";

    // RECHERCHE DE COMMANDES.
    if (args[0] && args[0].toLowerCase() === "search") {
      const keyword = args.slice(1).join(" ").toLowerCase();

      if (!keyword) {
        return message.reply(
          `❌ Utilisation : ${p}help search <mot>`
        );
      }

      const matchedCmds = [];

      for (const [name, cmd] of commands) {
        const c = cmd.config || {};
        const cmdName = (c.name || name).toLowerCase();

        let descStr = "";

        if (typeof c.shortDescription === "string") {
          descStr = c.shortDescription;
        } else if (c.shortDescription?.fr) {
          descStr = c.shortDescription.fr;
        } else if (c.shortDescription?.en) {
          descStr = c.shortDescription.en;
        } else if (typeof c.description === "string") {
          descStr = c.description;
        } else if (c.description?.fr) {
          descStr = c.description.fr;
        } else if (c.description?.en) {
          descStr = c.description.en;
        }

        const aliases = Array.isArray(c.aliases)
          ? c.aliases.map(a => String(a).toLowerCase())
          : [];

        if (
          cmdName.includes(keyword) ||
          descStr.toLowerCase().includes(keyword) ||
          aliases.some(a => a.includes(keyword))
        ) {
          matchedCmds.push({
            name: c.name || name,
            config: c,
            description: descStr
          });
        }
      }

      if (!matchedCmds.length) {
        return message.reply(
          `❌ Aucune commande trouvée pour "${keyword}".`
        );
      }

      let resultMsg =
        `🔎 𝐒𝐄𝐀𝐑𝐂𝐇 𝐑𝐄𝐒𝐔𝐋𝐓𝐒 (${matchedCmds.length})`;

      for (const item of matchedCmds) {
        const c = item.config;

        const aliases = c.aliases?.length
          ? c.aliases.join(", ")
          : "Aucun";

        const guide =
          c.guide?.fr ||
          c.guide?.en ||
          (typeof c.guide === "string" ? c.guide : "");

        resultMsg += `\n\n𓆩 📁 ${item.name} 𓆪`;
        resultMsg += `\n➤ ${item.description || "Aucune description"}`;
        resultMsg += `\n➤ Alias : ${aliases}`;

        if (guide) {
          resultMsg += `\n➤ Guide : ${guide}`;
        }
      }

      resultMsg += "\n\n☠️ 𝐃𝐄𝐕𝐄𝐋𝐎𝐏𝐄𝐃 𝐁𝐘 @𝐒𝐇𝐀𝐃𝐄 🎀";

      return message.reply(fonts.christus(resultMsg));
    }

    // DÉTAIL D'UNE COMMANDE.
    if (args[0]) {
      const search = args[0].toLowerCase();

      const cmd = commands.get(search) ||
        Array.from(commands.values()).find(c =>
          c.config?.name?.toLowerCase() === search ||
          c.config?.aliases?.some(alias =>
            String(alias).toLowerCase() === search
          )
        );

      if (!cmd) {
        return message.reply("❌ Commande introuvable.");
      }

      const c = cmd.config || {};
      const rawName = c.name || "Unknown";
      const author = c.author || "Unknown";

      let descStr = "Aucune description";

      if (typeof c.shortDescription === "string") {
        descStr = c.shortDescription;
      } else if (c.shortDescription?.fr) {
        descStr = c.shortDescription.fr;
      } else if (c.shortDescription?.en) {
        descStr = c.shortDescription.en;
      } else if (typeof c.description === "string") {
        descStr = c.description;
      } else if (c.description?.fr) {
        descStr = c.description.fr;
      } else if (c.description?.en) {
        descStr = c.description.en;
      }

      const usage =
        c.guide?.fr ||
        c.guide?.en ||
        (typeof c.guide === "string"
          ? c.guide
          : "Aucun guide disponible");

      const category = c.category || "other";
      const cooldown = `${c.countDown || 0}s`;

      const roleText = {
        0: "Tous les utilisateurs",
        1: "Modérateur du groupe",
        2: "VIP",
        3: "Premium",
        4: "Administrateur du bot",
        5: "Développeur",
        6: "Créateur"
      }[c.role] || "Tous les utilisateurs";

      const aliases = c.aliases?.length
        ? c.aliases.join(", ")
        : "Aucun";

      const detailMsg = [
        `𓆩 📄 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐄 : ${rawName.toUpperCase()} 𓆪`,
        "━━━━━━━━━━━━━━━━━━━━",
        `👤 Auteur : ${author}`,
        `📝 Description : ${descStr}`,
        `📌 Utilisation : ${usage}`,
        `📁 Catégorie : ${category}`,
        `⏱️ Cooldown : ${cooldown}`,
        `🛡️ Rôle : ${roleText}`,
        `🔗 Alias : ${aliases}`,
        "━━━━━━━━━━━━━━━━━━━━"
      ].join("\n");

      return message.reply(fonts.christus(detailMsg));
    }

    // MENU GLOBAL.
    const data = global.GoatBot.refreshHelpMenu();

    return message.reply(data.menu);
  }
};
