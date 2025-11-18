import { Client, GatewayIntentBits, REST, Routes } from "discord.js";
import cron from "node-cron";
import * as fs from "fs";
import { getTomorrowEvents } from "./src/calendar.js";
import { createMessage } from "./src/message.js";
import { loadConfig, saveConfig } from "./src/config.js";
import {
  getCommandDefinitions,
  handleScheduleCommand,
  handleUnscheduleCommand,
  handleTomorrowCommand,
} from "./src/commands.js";

// 環境変数の読み込み（.envファイルがある場合）
let DISCORD_TOKEN, CALENDAR_URL;

if (fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf-8");
  envContent.split("\n").forEach((line) => {
    const [key, value] = line.split("=");
    if (key && value) {
      if (key.trim() === "DISCORD_TOKEN") DISCORD_TOKEN = value.trim();
      if (key.trim() === "CALENDAR_URL") CALENDAR_URL = value.trim();
    }
  });
} else {
  // 環境変数から取得
  DISCORD_TOKEN = process.env.DISCORD_TOKEN;
  CALENDAR_URL =
    process.env.CALENDAR_URL ||
    "https://calendar.google.com/calendar/ical/e5862bfdf048c1e523b453101aba7ef26c8fcb5d700bf83058071da8f1aa1547%40group.calendar.google.com/public/basic.ics";
}

// 設定を読み込み
const config = loadConfig();
let scheduledChannelId = config.channelId || null;

// Discord botクライアントの作成
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// 明日の予定を送信する関数
async function sendTomorrowSchedule(channelId = null) {
  try {
    const targetChannelId = channelId || scheduledChannelId;

    if (!targetChannelId) {
      console.error("送信先チャンネルが設定されていません");
      return;
    }

    const channel = await client.channels.fetch(targetChannelId);
    if (!channel) {
      console.error("チャンネルが見つかりません");
      return;
    }

    console.log("明日の予定を取得中...");
    const events = await getTomorrowEvents(CALENDAR_URL);

    if (events === null) {
      await channel.send("❌ カレンダーの取得に失敗しました。");
      return;
    }

    const message = createMessage(events);
    await channel.send(message);
    console.log(`予定を送信しました (チャンネル: ${channel.name})`);
  } catch (error) {
    console.error("メッセージの送信に失敗しました:", error);
  }
}

// スラッシュコマンドの登録
async function registerCommands() {
  const commands = getCommandDefinitions();
  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

  try {
    console.log("スラッシュコマンドを登録中...");
    await rest.put(Routes.applicationCommands(client.user.id), {
      body: commands,
    });
    console.log("✅ スラッシュコマンドを登録しました");
  } catch (error) {
    console.error("スラッシュコマンドの登録に失敗しました:", error);
  }
}

// Bot起動時の処理
client.once("ready", async () => {
  console.log(`✅ ${client.user.tag} でログインしました`);

  // スラッシュコマンドを登録
  await registerCommands();

  if (scheduledChannelId) {
    console.log(
      `毎日18:00に明日の予定を送信します (チャンネルID: ${scheduledChannelId})`
    );
  } else {
    console.log("⚠️ 送信先チャンネルが設定されていません");
    console.log("/schedule コマンドでチャンネルを設定してください");
  }

  // 毎日18:00に実行（日本時間）
  cron.schedule(
    "0 18 * * *",
    () => {
      if (scheduledChannelId) {
        console.log("スケジュール実行: 18:00");
        sendTomorrowSchedule();
      }
    },
    {
      timezone: "Asia/Tokyo",
    }
  );
});

// スラッシュコマンドの処理
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "schedule") {
    const result = await handleScheduleCommand(interaction);
    if (result.success) {
      scheduledChannelId = result.channelId;
    }
  } else if (interaction.commandName === "unschedule") {
    const result = await handleUnscheduleCommand(
      interaction,
      scheduledChannelId
    );
    if (result.success) {
      scheduledChannelId = null;
    }
  } else if (interaction.commandName === "tomorrow") {
    await handleTomorrowCommand(interaction, CALENDAR_URL);
  }
});

// エラーハンドリング
client.on("error", (error) => {
  console.error("Discordクライアントエラー:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("未処理のエラー:", error);
});

// Botの起動
if (!DISCORD_TOKEN) {
  console.error("❌ DISCORD_TOKENが設定されていません");
  console.error(".envファイルを作成するか、環境変数を設定してください");
  process.exit(1);
}

if (!CALENDAR_URL) {
  console.error("❌ CALENDAR_URLが設定されていません");
  process.exit(1);
}

client.login(DISCORD_TOKEN);
