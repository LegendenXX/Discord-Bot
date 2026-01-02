const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const archy = require('archy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hierarchie')
    .setDescription('Zeigt die Besitz-Hierarchie.')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('Nur die Hierarchie von einem Nutzer anzeigen')
        .setRequired(false)
    ),

  async execute(interaction, db) {
    return new Promise(async resolve => {
      const visited = new Set();
      const guildId = interaction.guildId;
      const targetUser = interaction.options.getUser('user');

      const data = db.getFullDB(guildId);
      const users = data.users || {};

      function buildTree(userId) {
        if (visited.has(userId)) return null;
        visited.add(userId);

        const user = users[userId];
        if (!user || user.bot) return null;

        const nodes = (user.owned || [])
          .map(buildTree)
          .filter(n => n !== null);

        const role = data.ownerships[userId]?.role
          ? ` (${data.ownerships[userId].role})`
          : '';

        return { label: `<@${userId}>${role}`, nodes };
      }

      let forest = [];

      if (targetUser) {
        const target = users[targetUser.id];
        if (target && !target.bot) {
          const tree = buildTree(target.id);
          if (tree) forest.push(tree);
        }
      } else {
        const roots = Object.keys(users).filter(id => {
          const owner = db.getOwner(guildId, id);
          const user = users[id];
          return !owner && !user.bot;
        });

        forest = roots.map(buildTree).filter(t => t !== null);
      }

      const ascii = forest.map(t => archy(t)).join("\n");

      const embed = new EmbedBuilder()
        .setTitle('🐾 Besitz-Hierarchie')
        .setDescription(ascii || 'Keine Hierarchie vorhanden.')
        .setColor('Random');

      resolve({ embeds: [embed] });
    });
  }
};
