const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require('discord.js');

function buildBankEmbed(user, lastTx, footerText = null) {
  const embed = new EmbedBuilder()
    .setTitle('🏦 Bankkonto')
    .setColor(0x00ffcc)
    .setDescription(
      `💵 **Bar:** ${user.balance.toLocaleString('de-DE')} €\n` +
      `🏦 **Bank:** ${user.bank.toLocaleString('de-DE')} €\n\n` +
      `📌 **Letzte Transaktion:**\n${
        lastTx ? `${lastTx.type.toUpperCase()} ${lastTx.amount.toLocaleString('de-DE')} €` : 'Keine Transaktion'
      }\n\n` +
      `🧰 **Job:** ${user.job || 'Arbeitslos'}`
    );

  if (footerText) embed.setFooter({ text: footerText });

  return embed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bank')
    .setDescription('Zeigt dein Bankkonto'),

  async execute(interaction, db, transactionLog) {
    const guildId = interaction.guildId;
    const user = db.getUser(guildId, interaction.user.id, false, interaction.user.username);
    const lastTx = transactionLog.getLastTransaction(guildId, user.id);

    const embed = buildBankEmbed(user, lastTx);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('bank_deposit')
        .setLabel('💰 Einzahlen')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('bank_withdraw')
        .setLabel('🏧 Abheben')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.editReply({ embeds: [embed], components: [row] });
  },

  async handleButton(interaction) {
    const modal = new ModalBuilder()
      .setCustomId(interaction.customId === 'bank_deposit' ? 'bank_deposit_modal' : 'bank_withdraw_modal')
      .setTitle(interaction.customId === 'bank_deposit' ? '💰 Geld einzahlen' : '🏧 Geld abheben');

    const input = new TextInputBuilder()
      .setCustomId('amount')
      .setLabel('Betrag')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('z.B. 1000')
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));

    await interaction.showModal(modal);
  },

  async handleModal(interaction, db, transactionLog) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const amount = Number(interaction.fields.getTextInputValue('amount'));
    if (!Number.isFinite(amount) || amount <= 0) {
      return interaction.reply({ content: '❌ Bitte einen gültigen Betrag eingeben', 
        flags: MessageFlags.Ephemeral });
    }

    let success = false;
    let footerText = '';
    const user = db.getUser(guildId, userId);

    if (interaction.customId === 'bank_deposit_modal') {
      success = db.deposit(guildId, userId, amount);
      if (success) {
        transactionLog.addTransaction({ guildId, userId, type: 'deposit', amount, balance: user.balance, bank: user.bank });
        footerText = '✅ Einzahlung erfolgreich abgeschlossen';
      } else {
        footerText = '❌ Nicht genug Bargeld vorhanden';
      }
    }

    if (interaction.customId === 'bank_withdraw_modal') {
      success = db.withdraw(guildId, userId, amount);
      if (success) {
        transactionLog.addTransaction({ guildId, userId, type: 'withdraw', amount, balance: user.balance, bank: user.bank });
        footerText = '✅ Abhebung erfolgreich abgeschlossen';
      } else {
        footerText = '❌ Nicht genug Guthaben auf der Bank';
      }
    }

    const lastTx = transactionLog.getLastTransaction(guildId, userId);
    const embed = buildBankEmbed(user, lastTx, footerText);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('bank_deposit').setLabel('💰 Einzahlen').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('bank_withdraw').setLabel('🏧 Abheben').setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
