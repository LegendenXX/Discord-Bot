const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Zeigt die Bot- und API-Latenz an'),

  async execute(interaction) {
    // Latenzen berechnen
    const botLatency = Date.now() - interaction.createdTimestamp;
    const apiLatency = interaction.client.ws.ping;

    // Embed erstellen
    const pingEmbed = new EmbedBuilder()
      .setTitle('🏓 Pong!')
      .setColor('#00FF00') // Grün, du kannst jede Farbe nehmen
      .addFields(
        { name: '🤖 Bot-Latenz', value: `\`${botLatency}ms\``, inline: true },
        { name: '🌐 API-Latenz', value: `\`${apiLatency}ms\``, inline: true }
      )
      .setTimestamp();

    // Ergebnis zurückgeben, das vom interactionHandler verarbeitet wird
    return {
      embeds: [pingEmbed],
      ephemeral: true, // nur für den User sichtbar
    };
  },
};
