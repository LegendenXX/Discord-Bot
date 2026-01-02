// === Discord.js & System Imports ===
const {
  Client,
  Collection,
  GatewayIntentBits,
  REST,
  Routes,
} = require('discord.js');

const fs = require('fs');
const path = require('path');
const config = require('./config.json');
const db = require('./db.js');
const transactionLog = require('./transactionLog.js');

// 👉 ZENTRALER BUTTON / MODAL HANDLER
const {
  handleButtonInteraction,
  handleModalSubmit,
} = require('./helpers/button.js');

// 👉 ZENTRALER INTERACTION HANDLER
const { handleInteraction } = require('./helpers/interactionHandler.js');

// === Datenbank laden ===
db.load();
console.log('✅ Datenbank erfolgreich geladen');

// === Discord Client Setup ===
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Collection();

// === Commands laden ===
const commandsPath = path.join(__dirname, 'commands');
fs.readdirSync(commandsPath)
  .filter(file => file.endsWith('.js'))
  .forEach(file => {
    const cmd = require(path.join(commandsPath, file));
    if ('data' in cmd && 'execute' in cmd) {
      client.commands.set(cmd.data.name, cmd);
    }
  });

// === Ready Event ===
client.once('clientReady', () => {
  console.log(`✅ Eingeloggt als ${client.user.tag}`);
});

// === Slash Commands GLOBAL registrieren ===
(async () => {
  const rest = new REST({ version: '10' }).setToken(config.token);
  try {
    const commandsJSON = client.commands.map(cmd => cmd.data.toJSON());
    await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commandsJSON }
    );
    console.log('✅ Global Slash Commands registriert!');
  } catch (err) {
    console.error('❌ Fehler beim Registrieren der Slash Commands:', err);
  }
})();

// === Interaction Handling ===
client.on('interactionCreate', async interaction => {
  try {
    if (interaction.user?.bot) return;

    if (interaction.isChatInputCommand()) {
      const cmd = client.commands.get(interaction.commandName);
      if (!cmd) return;
      await handleInteraction(interaction, db, transactionLog, cmd.execute);
    }

    else if (interaction.isAutocomplete()) {
      const cmd = client.commands.get(interaction.commandName);
      if (!cmd?.autocomplete) return;

      const focused = interaction.options.getFocused(true);
      const members = await interaction.guild.members.fetch();

      const filtered = members
        .filter(m =>
          !m.user.bot &&
          m.user.username.toLowerCase().includes(focused.value.toLowerCase())
        )
        .map(m => ({
          name: m.user.username,
          value: m.id,
        }))
        .slice(0, 25);

      await interaction.respond(filtered);
    }

    else if (interaction.isButton()) {
      await handleButtonInteraction(interaction, db, transactionLog);

      for (const cmd of client.commands.values()) {
        if (typeof cmd.button === 'function') {
          await cmd.button(interaction, db, transactionLog);
        }
      }
    }

    else if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction, db, transactionLog);

      for (const cmd of client.commands.values()) {
        if (typeof cmd.modal === 'function') {
          await cmd.modal(interaction, db, transactionLog);
        }
      }
    }

  } catch (err) {
    console.error('❌ Schwerer Interaktionsfehler:', err);
  }
});

// === Auto-Save ===
setInterval(() => {
  try {
    db.save();
    console.log('💾 Datenbank automatisch gespeichert.');
  } catch (err) {
    console.error('❌ Fehler beim DB-Autosave:', err);
  }
}, 300_000);

setInterval(() => {
  try {
    transactionLog.saveTransactionLog();
    console.log('💾 TransaktionsLog automatisch gespeichert.');
  } catch (err) {
    console.error('❌ Fehler beim TransactionLog-Autosave:', err);
  }
}, 360_000);

// =====================================================
// 🔁 AUTO-RESTART / CRASH / GATEWAY SICHERHEIT
// =====================================================

// ❌ Unhandled Promise Rejections
process.on('unhandledRejection', err => {
  console.error('❌ UnhandledRejection:', err);
  process.exit(1);
});

// ❌ Uncaught Exceptions
process.on('uncaughtException', err => {
  console.error('❌ UncaughtException:', err);
  process.exit(1);
});

// ❌ Discord Gateway Fehler
client.on('shardError', err => {
  console.error('❌ Shard Error:', err);
  process.exit(1);
});

client.on('error', err => {
  console.error('❌ Discord Client Error:', err);
  process.exit(1);
});

client.on('disconnect', () => {
  console.error('❌ Discord Disconnect – Neustart');
  process.exit(1);
});

// 🔁 Optional: geplanter Neustart (z.B. alle 6 Stunden)
setTimeout(() => {
  console.log('🔁 Geplanter Neustart');
  process.exit(0);
}, 6 * 60 * 60 * 1000);

// === Sicher speichern beim Beenden ===
process.on('exit', () => {
  db.save();
  transactionLog.saveTransactionLog();
});
process.on('SIGINT', () => process.exit());
process.on('SIGTERM', () => process.exit());

// === Login ===
client.login(config.token);
