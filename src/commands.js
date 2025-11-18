import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { getTomorrowEvents } from "./calendar.js";
import { createMessage } from "./message.js";
import { loadConfig, saveConfig } from "./config.js";

/**
 * スラッシュコマンドを登録する
 * @returns {Array} コマンド定義の配列
 */
export function getCommandDefinitions() {
  return [
    new SlashCommandBuilder()
      .setName("schedule")
      .setDescription("カレンダーの自動送信を設定します")
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription("予定を送信するチャンネル")
          .setRequired(true)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    new SlashCommandBuilder()
      .setName("unschedule")
      .setDescription("カレンダーの自動送信を停止します")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    new SlashCommandBuilder()
      .setName("tomorrow")
      .setDescription("明日の予定を今すぐ表示します"),
  ].map((command) => command.toJSON());
}

/**
 * /schedule コマンドの処理
 * @param {CommandInteraction} interaction
 * @returns {Object} { success: boolean, channelId: string }
 */
export async function handleScheduleCommand(interaction) {
  const channel = interaction.options.getChannel("channel");

  if (!channel.isTextBased()) {
    await interaction.reply({
      content: "❌ テキストチャンネルを指定してください。",
      ephemeral: true,
    });
    return { success: false };
  }

  const config = loadConfig();
  config.channelId = channel.id;
  saveConfig(config);

  await interaction.reply({
    content: `✅ ${channel} で毎日18:00に明日の予定を送信します。`,
    ephemeral: true,
  });

  console.log(
    `送信先チャンネルを設定しました: ${channel.name} (${channel.id})`
  );

  return { success: true, channelId: channel.id };
}

/**
 * /unschedule コマンドの処理
 * @param {CommandInteraction} interaction
 * @param {string|null} currentChannelId
 * @returns {Object} { success: boolean }
 */
export async function handleUnscheduleCommand(interaction, currentChannelId) {
  if (!currentChannelId) {
    await interaction.reply({
      content: "⚠️ 自動送信は設定されていません。",
      ephemeral: true,
    });
    return { success: false };
  }

  const config = loadConfig();
  config.channelId = null;
  saveConfig(config);

  await interaction.reply({
    content: "✅ カレンダーの自動送信を停止しました。",
    ephemeral: true,
  });

  console.log("自動送信を停止しました");

  return { success: true };
}

/**
 * /tomorrow コマンドの処理
 * @param {CommandInteraction} interaction
 * @param {string} calendarUrl
 */
export async function handleTomorrowCommand(interaction, calendarUrl) {
  await interaction.deferReply();

  try {
    const events = await getTomorrowEvents(calendarUrl);

    if (events === null) {
      await interaction.editReply("❌ カレンダーの取得に失敗しました。");
      return;
    }

    const message = createMessage(events);
    await interaction.editReply(message);
  } catch (error) {
    console.error("コマンド実行エラー:", error);
    await interaction.editReply("❌ エラーが発生しました。");
  }
}
