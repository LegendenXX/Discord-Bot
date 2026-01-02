const fs = require('fs');
const path = require('path');
const transactionLog = require('./transactionLog.js'); // ✅ FIX

const dbPath = path.join(__dirname, 'database.json');

// === Interner Speicher ===
let data = { guilds: {} };

// === Daten laden ===
function load() {
  if (fs.existsSync(dbPath)) {
    try {
      const raw = fs.readFileSync(dbPath, 'utf8');
      data = JSON.parse(raw);
      if (!data.guilds) data.guilds = {};
    } catch (err) {
      console.error('❌ Fehler beim Laden der Datenbank:', err);
      data = { guilds: {} };
    }
  }
  save();
}

// === Daten speichern ===
function save() {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('❌ Fehler beim Speichern der Datenbank:', err);
  }
}

// === Guild sicherstellen ===
function ensureGuild(guildId) {
  if (!data.guilds[guildId]) {
    data.guilds[guildId] = {
      users: {},
      ownerships: {},
      ownershipHistory: [],
    };
  }
  return data.guilds[guildId];
}

// === Nutzer holen oder erstellen ===
function getUser(guildId, id, isBot = false, username = null) {
  if (isBot) return null;

  const guildData = ensureGuild(guildId);

  if (!guildData.users[id]) {
    guildData.users[id] = {
      id,
      username: username || 'Unbekannt',
      balance: 10_000,
      bank: 0,
      job: 'Arbeitslos',
      lastTransaction: null,
      purchases: [],
      owned: [],
      role: null,
      bot: false,
    };
    save();
  }

  return guildData.users[id];
}

// === Bargeld ändern ===
function updateBalance(guildId, id, amount) {
  const user = getUser(guildId, id);
  if (!user) return 0;

  amount = Number(amount);
  user.balance += amount;
  if (user.balance < 0) user.balance = 0;

  const tx = {
    type: 'balance',
    amount,
    date: Date.now(),
  };

  user.lastTransaction = tx;
  transactionLog.addTransaction(guildId, id, 'balance', amount, user.balance, user.bank);

  save();
  return user.balance;
}

// === 🏦 EINZAHLEN ===
function deposit(guildId, id, amount) {
  const user = getUser(guildId, id);
  amount = Number(amount);

  if (!user || amount <= 0) return false;
  if (user.balance < amount) return false;

  user.balance -= amount;
  user.bank += amount;

  save();
  return true;
}

// === 🏧 ABHEBEN ===
function withdraw(guildId, id, amount) {
  const user = getUser(guildId, id);
  amount = Number(amount);

  if (!user || amount <= 0) return false;
  if (user.bank < amount) return false;

  user.bank -= amount;
  user.balance += amount;

  save();
  return true;
}

// === Zyklenschutz ===
function createsCycle(guildId, ownerId, targetId, visited = new Set()) {
  if (ownerId === targetId) return true;
  if (visited.has(targetId)) return false;

  visited.add(targetId);
  const target = getUser(guildId, targetId);
  if (!target) return false;

  for (const sub of target.owned) {
    if (sub === ownerId || createsCycle(guildId, ownerId, sub, visited)) {
      return true;
    }
  }
  return false;
}

// === Besitzer setzen ===
function setOwner(guildId, ownerId, targetId, role) {
  const guildData = ensureGuild(guildId);
  const owner = getUser(guildId, ownerId);
  const target = getUser(guildId, targetId);

  if (!owner || !target || owner.bot || target.bot) return false;

  for (const user of Object.values(guildData.users)) {
    user.owned = user.owned.filter(o => o !== targetId);
  }

  if (!owner.owned.includes(targetId)) owner.owned.push(targetId);
  target.role = role;

  guildData.ownerships[targetId] = {
    ownerId,
    role,
    date: Date.now(),
  };

  guildData.ownershipHistory.push({
    ownerId,
    targetId,
    role,
    date: Date.now(),
    action: 'setOwner',
  });

  save();
  return true;
}

// === Besitz hinzufügen ===
function addOwnership(guildId, ownerId, targetId, price, role = 'Besitz') {
  if (ownerId === targetId) return false;

  const owner = getUser(guildId, ownerId);
  const target = getUser(guildId, targetId);
  const diff = Number(price);

  if (!owner || !target || owner.bot || target.bot) return false;
  if (createsCycle(guildId, ownerId, targetId)) return false;
  if (owner.balance < diff) return false;

  owner.balance -= diff;

  const tx = {
    type: 'purchase',
    amount: diff,
    role,
    targetId,
    date: Date.now(),
  };

  owner.lastTransaction = tx;
  transactionLog.addTransaction(guildId, ownerId, 'purchase', diff, owner.balance, owner.bank);

  setOwner(guildId, ownerId, targetId, role);

  owner.purchases.push({ targetId, role, price: diff, date: Date.now() });

  save();
  return true;
}

// === Besitzer abrufen ===
function getOwner(guildId, targetId) {
  return ensureGuild(guildId).ownerships[targetId]?.ownerId || null;
}

// === Guild-Daten abrufen ===
function getFullDB(guildId) {
  return ensureGuild(guildId);
}

module.exports = {
  load,
  save,
  getUser,
  updateBalance,
  deposit,
  withdraw,
  addOwnership,
  getOwner,
  getFullDB,
  setOwner,
  data,
};
