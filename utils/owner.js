const fs = require("fs-extra");
const path = require("path");

// Récupère config.json à la racine du projet
const configPath = path.join(__dirname, "../config.json");

// Récupère tous les propriétaires depuis adminBot
function getOwnerIDs() {
  const config = fs.readJsonSync(configPath);

  return (config.adminBot || []).map(id => String(id));
}

// Vérifie si un utilisateur est propriétaire
function isOwner(senderID) {
  return getOwnerIDs().includes(String(senderID));
}

module.exports = {
  getOwnerIDs,
  isOwner
};
