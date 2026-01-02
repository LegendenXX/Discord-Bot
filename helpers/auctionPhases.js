// helpers/auctionPhasen.js
const { EmbedBuilder } = require("discord.js");

/**
 * Sende Phasen-Update während der Auktion
 */
async function sendStageState(opts) {
  const {
    message,
    role,
    currentPrice,
    currentWinner,
    getMentionWithAlias,
    row,
    stage,
    seconds,
  } = opts;

  const stageNames = {
    1: "📣 Zum ersten!",
    2: "📣 Zum zweiten!",
    3: "📣 Zum dritten!",
    4: "📢 ⚠️ LETZTE CHANCE ⚠️",
  };

  const stageColors = {
    1: 0xffff00, // Yellow
    2: 0xffa500, // Orange
    3: 0xff0000, // Red
    4: 0x8b0000, // DarkRed
  };

  // Fallback, falls kein Gewinner
  const winnerDisplay = currentWinner
    ? getMentionWithAlias(currentWinner)
    : "— keiner bisher —";

  // Progress-Bar
  const max = 30; // Sekunden pro Phase
  const filled = "■".repeat(Math.floor((seconds / max) * 10));
  const empty = "□".repeat(10 - filled.length);
  const timerBar = filled + empty;

  const embed = new EmbedBuilder()
    .setTitle(stageNames[stage] || "🌀 Unbekannte Phase")
    .setDescription(
      `🪧 **Phase:** ${stage}\n\n` +
        `💰 **Aktuelles Gebot:** \`${currentPrice.toLocaleString()} 💵\`\n` +
        `👑 **Führend:** ${winnerDisplay}\n` +
        `🎭 **Als Rolle:** \`${role}\`\n\n` +
        `⏳ **Zeit verbleibend:** ${seconds}s\n` +
        `\`\`\`${timerBar}\`\`\``
    )
    .setColor(stageColors[stage] || 0x999999)
    .setFooter({ text: "Biete weiter über den Button!" });

  // Embed editieren mit aktiven Buttons
  try {
    await message.edit({
      embeds: [embed],
      components: [row],
    });
  } catch (err) {
    console.warn("⚠️ Konnte Stage-Embed nicht editieren:", err.message);
  }
}

module.exports = { sendStageState };
