const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');

/**
 * =========================
 * 📄 PAGINATION BUTTONS
 * =========================
 */
function createPaginationButtons(currentPage, totalPages) {
  const prevDisabled = currentPage <= 0;
  const nextDisabled = currentPage >= totalPages - 1;

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('prev')
      .setLabel('⬅️ Zurück')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(prevDisabled),
    new ButtonBuilder()
      .setCustomId('next')
      .setLabel('➡️ Weiter')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(nextDisabled)
  );
}

/**
 * =========================
 * 🏦 BANK BUTTON HANDLER
 * =========================
 */
async function handleButtonInteraction(interaction, db, transactionLog) {
  const { customId, user } = interaction;

  if (customId !== 'bank_deposit' && customId !== 'bank_withdraw') return;

  // 🔒 Nur der Command-Ersteller darf Buttons nutzen
  const ownerId = interaction.message?.interaction?.user?.id;
  if (ownerId && ownerId !== user.id) {
    const embed = new EmbedBuilder()
      .setTitle('⚠️ Zugriff verweigert')
      .setDescription('Dies ist nicht deine Interaktion.')
      .setColor('Red');

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });

    setTimeout(() => {
      interaction.deleteReply().catch(() => {});
    }, 15_000);

    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(
      customId === 'bank_deposit'
        ? 'bank_modal_deposit'
        : 'bank_modal_withdraw'
    )
    .setTitle(
      customId === 'bank_deposit'
        ? '💰 Geld einzahlen'
        : '🏧 Geld abheben'
    );

  const amountInput = new TextInputBuilder()
    .setCustomId('amount')
    .setLabel('Betrag')
    .setPlaceholder('z. B. 500')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(amountInput));

  await interaction.showModal(modal);
}

/**
 * =========================
 * 🧾 BANK MODAL HANDLER
 * =========================
 */
async function handleModalSubmit(interaction, db, transactionLog) {
  if (!interaction.customId.startsWith('bank_modal_')) return;

  const guildId = interaction.guildId;
  const userId = interaction.user.id;
  const user = db.getUser(guildId, userId);

  const amount = Number(interaction.fields.getTextInputValue('amount'));
  if (!Number.isFinite(amount) || amount <= 0) {
    return interaction.reply({
      content: '❌ Bitte gib einen gültigen Betrag ein.',
      flags: MessageFlags.Ephemeral,
    });
  }

  let success = false;
  let type = null;
  let footerText = '';

  if (interaction.customId === 'bank_modal_deposit') {
    success = db.deposit(guildId, userId, amount);
    type = 'deposit';
    footerText = success
      ? '✅ Einzahlung erfolgreich abgeschlossen'
      : '❌ Nicht genug Bargeld vorhanden';
  }

  if (interaction.customId === 'bank_modal_withdraw') {
    success = db.withdraw(guildId, userId, amount);
    type = 'withdraw';
    footerText = success
      ? '✅ Abhebung erfolgreich abgeschlossen'
      : '❌ Nicht genug Guthaben auf der Bank';
  }

  // 🔹 TransactionLog + letzte Transaktion (FIX)
  if (success) {
    const tx = {
      guildId,
      userId,
      type,
      amount,
      balance: user.balance,
      bank: user.bank,
      date: Date.now(),
    };

    user.lastTransaction = tx;

    if (transactionLog && typeof transactionLog.addTransaction === 'function') {
      transactionLog.addTransaction(
        guildId,
        userId,
        type,
        amount,
        user.balance,
        user.bank
      );
    }
  }

  const embed = new EmbedBuilder()
    .setTitle('🏦 Bankkonto')
    .setColor(0x00ffcc)
    .setDescription(
      `💵 **Bar:** ${user.balance.toLocaleString('de-DE')} €\n` +
      `🏦 **Bank:** ${user.bank.toLocaleString('de-DE')} €\n\n` +
      `📌 **Letzte Transaktion:**\n${formatTransaction(user.lastTransaction)}`
    )
    .setFooter({ text: footerText });

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

  await interaction.update({
    embeds: [embed],
    components: [row],
  });
}

/**
 * =========================
 * 🔧 HILFSFUNKTION
 * =========================
 */
function formatTransaction(tx) {
  if (!tx) return 'Keine Transaktion vorhanden';

  const amount = tx.amount.toLocaleString('de-DE') + ' €';

  switch (tx.type) {
    case 'deposit':
      return `💰 Einzahlung: **+${amount}**`;
    case 'withdraw':
      return `🏧 Abhebung: **-${amount}**`;
    default:
      return `ℹ️ ${amount}`;
  }
}

module.exports = {
  createPaginationButtons,
  handleButtonInteraction,
  handleModalSubmit,
};
