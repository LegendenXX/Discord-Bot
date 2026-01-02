const { MessageFlags } = require('discord.js');

/**
 * Zentrale Funktion für Slash Commands
 *
 * @param {CommandInteraction} interaction
 * @param {Object} db
 * @param {Object|null} transactionLog
 * @param {Function} callback  async (interaction, db, transactionLog) => result
 *
 * result = {
 *   embeds?: [],
 *   content?: string,
 *   components?: [],
 *   ephemeral?: boolean
 * }
 */
async function handleInteraction(interaction, db, transactionLog, callback) {
  try {
    // 🛡️ Harte Absicherung
    if (typeof callback !== 'function') {
      throw new TypeError('callback is not a function');
    }

    // ⏳ Nur EINMAL deferReply
    if (!interaction.replied && !interaction.deferred) {
      await interaction.deferReply();
    }

    // ▶️ Command ausführen
    const result = await callback(interaction, db, transactionLog);

    // Command hat selbst geantwortet
    if (!result) return;

    const options = {};

    if (result.content) options.content = result.content;
    if (result.embeds) options.embeds = result.embeds;
    if (result.components) options.components = result.components;

    // ✅ v15-konform
    if (result.ephemeral === true) {
      options.flags = MessageFlags.Ephemeral;
    }

    // ✏️ Antwort bearbeiten
    await interaction.editReply(options);

  } catch (err) {
    console.error('❌ Interaktionsfehler:', err);

    try {
      const errorMessage = {
        content: '❌ Ein unerwarteter Fehler ist aufgetreten.',
        flags: MessageFlags.Ephemeral,
      };

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply(errorMessage);
      } else {
        await interaction.editReply(errorMessage);
      }
    } catch (sendErr) {
      console.error('⚠️ Fehler beim Senden der Fehlermeldung:', sendErr);
    }
  }
}

module.exports = { handleInteraction };
