const {
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("hierarchielist")
    .setDescription("Zeigt den Kaufbaum aller Nutzer an")
    .addStringOption(option =>
      option
        .setName("typ")
        .setDescription("Art der Liste")
        .setRequired(true)
        .addChoices(
          { name: "Alle Nutzer", value: "all" },
          { name: "Einzelner Nutzer", value: "gekauft" }
        )
    )
    .addUserOption(option =>
      option
        .setName("nutzer")
        .setDescription("Für 'gekauft': Nutzer auswählen")
        .setRequired(false)
    ),

  // ❗ KEIN handleInteraction MEHR HIER
  async execute(interaction, db) {
    const typ = interaction.options.getString("typ");
    const selectedUser = interaction.options.getUser("nutzer");
    const guildId = interaction.guildId;
    const data = db.getFullDB(guildId);
    const users = data.users || {};

    // ------------------------------
    // Typ = "all"
    // ------------------------------
    if (typ === "all") {
      const owners = Object.values(users)
        .filter(u => Array.isArray(u.owned) && u.owned.length > 0 && !u.bot)
        .sort((a, b) => b.owned.length - a.owned.length)
        .slice(0, 20);

      if (!owners.length) {
        return { content: "📭 Keine Kaufdaten gefunden." };
      }

      const pages = [];
      const MAX_DESC_LENGTH = 3900;
      let currentPage = "";

      for (const owner of owners) {
        let ownerText = `**<@${owner.id}>** hat **${owner.owned.length} Personen** gekauft:\n`;
        for (const targetId of owner.owned) {
          const target = users[targetId];
          if (!target || target.bot) continue;
          const role = target.role || "Unbekannte Rolle";
          ownerText += `├─ <@${targetId}> → ${role}\n`;
        }

        if (currentPage.length + ownerText.length > MAX_DESC_LENGTH) {
          pages.push(currentPage);
          currentPage = "";
        }
        currentPage += ownerText + "\n";
      }

      if (currentPage) pages.push(currentPage);

      let pageIndex = 0;

      const embed = new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle("💰 Kaufbaum")
        .setDescription(pages[pageIndex])
        .setFooter({ text: `Seite 1 / ${pages.length}` });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("prev")
          .setLabel("⬅️ Zurück")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("➡️ Weiter")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pages.length <= 1)
      );

      return {
        embeds: [embed],
        components: pages.length > 1 ? [row] : [],
      };
    }

    // ------------------------------
    // Typ = "gekauft"
    // ------------------------------
    if (typ === "gekauft") {
      if (!selectedUser) {
        return { content: "❌ Bitte wähle einen Nutzer aus.", ephemeral: true };
      }

      const userData = users[selectedUser.id];
      const count = Array.isArray(userData?.owned) ? userData.owned.length : 0;

      return {
        content: `💰 **${selectedUser.username}** hat **${count}** Nutzer gekauft.`,
      };
    }

    return { content: "❌ Ungültiger Typ." };
  },
};
