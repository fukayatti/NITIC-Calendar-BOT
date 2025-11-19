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
 * @returns {Object} { success: boolean, channelIds: string[] }
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
  // 配列で管理
  if (!config.channelIds) {
    config.channelIds = [];
  }

  // 既に登録済みかチェック
  if (config.channelIds.includes(channel.id)) {
    await interaction.reply({
      content: `⚠️ ${channel} は既に登録されています。`,
      ephemeral: true,
    });
    return { success: false };
  }

  config.channelIds.push(channel.id);
  saveConfig(config);

  await interaction.reply({
    content: `✅ ${channel} で毎日18:00に明日の予定を送信します。\n登録チャンネル数: ${config.channelIds.length}件`,
    ephemeral: true,
  });

  console.log(
    `送信先チャンネルを追加しました: ${channel.name} (${channel.id})`
  );

  return { success: true, channelIds: config.channelIds };
}

/**
 * /unschedule コマンドの処理
 * @param {CommandInteraction} interaction
 * @param {string[]} currentChannelIds
 * @returns {Object} { success: boolean, channelIds: string[] }
 */
export async function handleUnscheduleCommand(interaction, currentChannelIds) {
  if (!currentChannelIds || currentChannelIds.length === 0) {
    await interaction.reply({
      content: "⚠️ 自動送信は設定されていません。",
      ephemeral: true,
    });
    return { success: false };
  }

  const config = loadConfig();

  // 実行したチャンネルのみ削除
  const channelId = interaction.channelId;
  const index = config.channelIds.indexOf(channelId);

  if (index === -1) {
    await interaction.reply({
      content: "⚠️ このチャンネルは登録されていません。",
      ephemeral: true,
    });
    return { success: false };
  }

  config.channelIds.splice(index, 1);
  saveConfig(config);

  await interaction.reply({
    content: `✅ このチャンネルの自動送信を停止しました。\n残り登録チャンネル数: ${config.channelIds.length}件`,
    ephemeral: true,
  });

  console.log(`自動送信を停止しました: ${channelId}`);

  return { success: true, channelIds: config.channelIds };
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
