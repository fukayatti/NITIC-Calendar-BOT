import ical from "node-ical";

// iCalカレンダーのURL
const calendarUrl =
  "https://calendar.google.com/calendar/ical/e5862bfdf048c1e523b453101aba7ef26c8fcb5d700bf83058071da8f1aa1547%40group.calendar.google.com/public/basic.ics";

// 11月17日の日付を取得(0時0分0秒に設定)
const targetDate = new Date(2025, 10, 17); // 月は0始まりなので10=11月
targetDate.setHours(0, 0, 0, 0);

// 11月18日の日付を取得(0時0分0秒に設定)
const nextDate = new Date(2025, 10, 18);
nextDate.setHours(0, 0, 0, 0);

console.log("📅 11月17日の予定を取得中...\n");

try {
  // iCalカレンダーを解析
  const events = await ical.async.fromURL(calendarUrl);

  // 11月17日の予定をフィルタリング
  const todaysEvents = [];

  for (const event of Object.values(events)) {
    // イベントタイプのみを処理
    if (event.type === "VEVENT") {
      let eventStart;

      // event.startがオブジェクトでDateインスタンスの場合
      if (event.start instanceof Date) {
        // UTC時間をローカル日付に変換（時刻部分を無視）
        const utcDate = new Date(event.start);
        const localDateStr = utcDate.toLocaleDateString("en-CA"); // YYYY-MM-DD形式
        const [year, month, day] = localDateStr.split("-").map(Number);
        eventStart = new Date(year, month - 1, day);
      } else if (typeof event.start === "string" && event.start.length === 8) {
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
        // UTC時間をローカル日付に変換（時刻部分を無視）
        const utcDate = new Date(event.end);
        const localDateStr = utcDate.toLocaleDateString("en-CA"); // YYYY-MM-DD形式
        const [year, month, day] = localDateStr.split("-").map(Number);
        eventEnd = new Date(year, month - 1, day);
      } else if (typeof event.end === "string" && event.end.length === 8) {
        const year = parseInt(event.end.substring(0, 4));
        const month = parseInt(event.end.substring(4, 6)) - 1;
        const day = parseInt(event.end.substring(6, 8));
        eventEnd = new Date(year, month, day);
      } else {
        eventEnd = new Date(event.end);
      }

      // 11月17日の予定かどうかをチェック
      // イベントが11月17日を含む期間の場合
      if (eventStart < nextDate && eventEnd > targetDate) {
        todaysEvents.push({
          summary: event.summary,
          start: eventStart,
          end: eventEnd,
          description: event.description || "",
          location: event.location || "",
        });
      }
    }
  }

  // 開始時刻でソート
  todaysEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

  // 結果を出力
  if (todaysEvents.length === 0) {
    console.log("11月17日の予定はありません。");
  } else {
    console.log(`11月17日の予定: ${todaysEvents.length}件\n`);
    console.log("=".repeat(50));

    todaysEvents.forEach((event, index) => {
      const startTime = new Date(event.start).toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const endTime = new Date(event.end).toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      });

      console.log(`\n📌 予定 ${index + 1}`);
      console.log(`タイトル: ${event.summary}`);

      // 終日イベント（00:00 - 00:00）でない場合のみ時間を表示
      if (startTime !== "00:00" || endTime !== "00:00") {
        console.log(`時間: ${startTime} - ${endTime}`);
      }

      if (event.location) {
        console.log(`場所: ${event.location}`);
      }

      if (event.description) {
        console.log(`詳細: ${event.description}`);
      }

      console.log("-".repeat(50));
    });
  }
} catch (error) {
  console.error("❌ カレンダーの取得に失敗しました:", error.message);
  process.exit(1);
}
