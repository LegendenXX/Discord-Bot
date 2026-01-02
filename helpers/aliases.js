// helpers/aliases.js

// Alias-Namen für Nutzer
const ALIASES = {
  "528284722384601110": "Phantom Industries",
};

// Bundles (gekoppelte Paare)
const PAIRS = {
  "1015998157055864962": "839908473424183366",
  "839908473424183366": "1015998157055864962",
};

/**
 * Gibt Anzeigenamen zurück: Alias > Username > Fallback
 */
function getDisplayName(user) {
  if (!user) return "[Phantom Industries]";
  return ALIASES[user.id] || user.username || `[${user.id}]`;
}

/**
 * Gibt gebundelte Namen zurück (User & Pair)
 */
function getBundleDisplay(user, client) {
  if (!user) return "[Unbekannt]";

  const pairId = PAIRS[user.id];
  const ownName = getDisplayName(user);

  if (!pairId) return ownName;

  // Partner im Cache prüfen
  const pairUser = client.users.cache.get(pairId);

  if (!pairUser) return `${ownName} & [Unbekannt]`;

  const pairName = getDisplayName(pairUser);
  return `${ownName} & ${pairName}`;
}

/**
 * Erwähnung im Chat mit Alias: <@ID> (Alias)
 */
function getMentionWithAlias(userId) {
  if (!userId) return "[Unbekannt]";

  const alias = ALIASES[userId];

  return alias ? `<@${userId}> (${alias})` : `<@${userId}>`;
}

/**
 * Überprüft, ob Nutzer ein Paar hat
 */
function hasPair(userId) {
  return !!PAIRS[userId];
}

module.exports = {
  ALIASES,
  PAIRS,
  getDisplayName,
  getBundleDisplay,
  getMentionWithAlias,
  hasPair,
};
