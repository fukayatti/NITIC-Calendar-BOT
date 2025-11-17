import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionFlagsBits,
} from "discord.js";
import ical from "node-ical";
import cron from "node-cron";
import * as fs from "fs";

// 環境変数の読み込み（.envファイルがある場合）
let DISCORD_TOKEN, CALENDAR_URL;
let scheduledChannelId = null; // スケジュール送信先のチャンネルID

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

// 設定ファイルの読み書き
const CONFIG_FILE = process.env.CONFIG_FILE || "config.json";

function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = fs.readFileSync(CONFIG_FILE, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      console.error("設定ファイルの読み込みに失敗しました:", error);
      return {};
    }
  }
  return {};
}

function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error("設定ファイルの保存に失敗しました:", error);
  }
}

// 設定を読み込み
const config = loadConfig();
scheduledChannelId = config.channelId || null;

// Discord botクライアントの作成
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// カレンダーイベントを取得する関数
async function getTomorrowEvents() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

  try {
    // キャッシュを回避するためにタイムスタンプを追加
    const urlWithTimestamp = `${CALENDAR_URL}${
      CALENDAR_URL.includes("?") ? "&" : "?"
    }_t=${Date.now()}`;
    const events = await ical.async.fromURL(urlWithTimestamp);
    const tomorrowEvents = [];

    for (const event of Object.values(events)) {
      // イベントタイプのみを処理
      if (event.type === "VEVENT") {
        let eventStart;

        // event.startがオブジェクトでDateインスタンスの場合
        if (event.start instanceof Date) {
          // UTCの年月日を取得してJSTの日付オブジェクトを作成
          const utcDate = new Date(event.start);
          const year = utcDate.getUTCFullYear();
          const month = utcDate.getUTCMonth();
          const day = utcDate.getUTCDate();
          eventStart = new Date(year, month, day);
        } else if (
          typeof event.start === "string" &&
          event.start.length === 8
        ) {
          // YYYYMMDD形式の場合
          const year = parseInt(event.start.substring(0, 4));
          const month = parseInt(event.start.substring(4, 6)) - 1;
          const day = parseInt(event.start.substring(6, 8));
          eventStart = new Date(year, month, day);
        } else {
          // その他の場合はそのまま使用
          eventStart = new Date(event.start);
        }

        // 終了日も同様に処理
        let eventEnd;
        if (event.end instanceof Date) {
          // UTCの年月日を取得してJSTの日付オブジェクトを作成
          const utcDate = new Date(event.end);
          const year = utcDate.getUTCFullYear();
          const month = utcDate.getUTCMonth();
          const day = utcDate.getUTCDate();
          eventEnd = new Date(year, month, day);
        } else if (typeof event.end === "string" && event.end.length === 8) {
          const year = parseInt(event.end.substring(0, 4));
          const month = parseInt(event.end.substring(4, 6)) - 1;
          const day = parseInt(event.end.substring(6, 8));
          eventEnd = new Date(year, month, day);
        } else {
          eventEnd = new Date(event.end);
        }

        // 明日の予定かどうかをチェック
        if (eventStart < dayAfterTomorrow && eventEnd >= tomorrow) {
          tomorrowEvents.push({
            summary: event.summary,
            start: event.start, // 元の時刻情報を保存
            end: event.end, // 元の時刻情報を保存
            description: event.description || "",
            location: event.location || "",
          });
        }
      }
    }

    tomorrowEvents.sort((a, b) => new Date(a.start) - new Date(b.start));
    return tomorrowEvents;
  } catch (error) {
    console.error("カレンダーの取得に失敗しました:", error);
    return null;
  }
}

// Discord用のメッセージを生成する関数
function createMessage(events) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  let message = "";

  if (events.length === 0) {
    message = `📅 **明日(${dateStr})の予定**\n\n予定はありません。`;
  } else {
    message = `📅 **明日(${dateStr})の予定** (${events.length}件)\n\n`;

    events.forEach((event, index) => {
      const startTime = new Date(event.start).toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Tokyo",
      });
      const endTime = new Date(event.end).toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Tokyo",
      });

      const isAllDay = startTime === "00:00" && endTime === "00:00";

      message += `### ${event.summary}\n`;

      if (!isAllDay) {
        message += `⏰ ${startTime} - ${endTime}\n`;
      }

      if (event.location) {
        message += `📍 ${event.location}\n`;
      }

      if (event.description) {
        message += `📝 ${event.description}\n`;
      }

      if (index < events.length - 1) {
        message += "\n---\n\n";
      }
    });
  }

  return message;
}

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
    const events = await getTomorrowEvents();

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
  const commands = [
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
    const channel = interaction.options.getChannel("channel");

    if (!channel.isTextBased()) {
      await interaction.reply({
        content: "❌ テキストチャンネルを指定してください。",
        ephemeral: true,
      });
      return;
    }

    scheduledChannelId = channel.id;
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
  } else if (interaction.commandName === "unschedule") {
    if (!scheduledChannelId) {
      await interaction.reply({
        content: "⚠️ 自動送信は設定されていません。",
        ephemeral: true,
      });
      return;
    }

    scheduledChannelId = null;
    const config = loadConfig();
    config.channelId = null;
    saveConfig(config);

    await interaction.reply({
      content: "✅ カレンダーの自動送信を停止しました。",
      ephemeral: true,
    });

    console.log("自動送信を停止しました");
  } else if (interaction.commandName === "tomorrow") {
    await interaction.deferReply();

    try {
      const events = await getTomorrowEvents();

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
