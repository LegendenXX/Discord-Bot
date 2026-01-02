const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, 'transactionLog.json');

let transactionLog = { guilds: {} };

// === Log Speicher ===
function loadTransactionLog() {
  if (fs.existsSync(logPath)) {
    try {
      const raw = fs.readFileSync(logPath, 'utf8');
      transactionLog = JSON.parse(raw);
    } catch (err) {
      console.error('❌ Fehler beim Laden des TransactionLogs:', err);
      transactionLog = { guilds: {} };
    }
  }
  console.log('✅ TransactionLog erfolgreich geladen');
}

/**
 * Speichere TransactionLog in die Datei
 */
function saveTransactionLog() {
  try {
    fs.writeFileSync(logPath, JSON.stringify(transactionLog, null, 2));
  } catch (err) {
    console.error('❌ Fehler beim Speichern des TransactionLogs:', err);
  }
}

/**
 * Füge eine neue Transaktion hinzu
 * @param {string} guildId 
 * @param {string} userId 
 * @param {'deposit'|'withdraw'} type 
 * @param {number} amount 
 * @param {number} balance 
 * @param {number} bank 
 */
function addTransaction(guildId, userId, type, amount, balance, bank) {
  if (!transactionLog.guilds[guildId]) transactionLog.guilds[guildId] = {};
  transactionLog.guilds[guildId][userId] = {
    type,
    amount,
    balance,
    bank,
    date: Date.now(),
  };
  saveTransactionLog();
}

/**
 * Hole die letzte Transaktion eines Nutzers
 * @param {string} guildId 
 * @param {string} userId 
 */
function getLastTransaction(guildId, userId) {
  return transactionLog.guilds[guildId]?.[userId] || null;
}

module.exports = {
  loadTransactionLog,
  saveTransactionLog,
  addTransaction,
  getLastTransaction,
};
