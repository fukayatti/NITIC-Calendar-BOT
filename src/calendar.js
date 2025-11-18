import ical from "node-ical";

/**
 * カレンダーから明日の予定を取得する
 * @param {string} calendarUrl - カレンダーのURL
 * @returns {Promise<Array|null>} 明日のイベント配列、失敗時はnull
 */
export async function getTomorrowEvents(calendarUrl) {
  // JSTでの現在時刻を取得
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000; // JSTはUTC+9
  const nowJST = new Date(now.getTime() + jstOffset);

  // JSTでの明日の日付を計算
  const tomorrowJST = new Date(nowJST);
  tomorrowJST.setUTCDate(tomorrowJST.getUTCDate() + 1);
  tomorrowJST.setUTCHours(0, 0, 0, 0);

  // JSTでの明後日の日付を計算
  const dayAfterTomorrowJST = new Date(tomorrowJST);
  dayAfterTomorrowJST.setUTCDate(dayAfterTomorrowJST.getUTCDate() + 1);

  // UTCに戻す（比較用）
  const tomorrow = new Date(tomorrowJST.getTime() - jstOffset);
  const dayAfterTomorrow = new Date(dayAfterTomorrowJST.getTime() - jstOffset);

  // デバッグログ
  console.log(
    "[DEBUG] システム時刻:",
    now.toISOString(),
    "JST:",
    now.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
  );
  console.log(
    "[DEBUG] 明日 (JST 00:00):",
    tomorrow.toISOString(),
    "=",
    tomorrow.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
  );
  console.log(
    "[DEBUG] 明後日 (JST 00:00):",
    dayAfterTomorrow.toISOString(),
    "=",
    dayAfterTomorrow.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
  );

  try {
    // キャッシュを回避するためにタイムスタンプを追加
    const urlWithTimestamp = `${calendarUrl}${
      calendarUrl.includes("?") ? "&" : "?"
    }_t=${Date.now()}`;
    const events = await ical.async.fromURL(urlWithTimestamp);
    const tomorrowEvents = [];

    for (const event of Object.values(events)) {
      // イベントタイプのみを処理
      if (event.type === "VEVENT") {
        let eventStart;

        // event.startがオブジェクトでDateインスタンスの場合
        if (event.start instanceof Date) {
          // JSTでの年月日を取得してUTC 00:00の日付オブジェクトを作成
          const jstDate = new Date(event.start.getTime() + 9 * 60 * 60 * 1000);
          const year = jstDate.getUTCFullYear();
          const month = jstDate.getUTCMonth();
          const day = jstDate.getUTCDate();
          eventStart = new Date(Date.UTC(year, month, day));
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
          // JSTでの年月日を取得してUTC 00:00の日付オブジェクトを作成
          const jstDate = new Date(event.end.getTime() + 9 * 60 * 60 * 1000);
          const year = jstDate.getUTCFullYear();
          const month = jstDate.getUTCMonth();
          const day = jstDate.getUTCDate();
          eventEnd = new Date(Date.UTC(year, month, day));
        } else if (typeof event.end === "string" && event.end.length === 8) {
          const year = parseInt(event.end.substring(0, 4));
          const month = parseInt(event.end.substring(4, 6)) - 1;
          const day = parseInt(event.end.substring(6, 8));
          eventEnd = new Date(year, month, day);
        } else {
          eventEnd = new Date(event.end);
        }

        // 明日の予定かどうかをチェック
        const isTomorrow =
          eventStart < dayAfterTomorrow && eventEnd >= tomorrow;
        if (isTomorrow) {
          console.log(`[DEBUG] ✅ 明日の予定: ${event.summary}`);
          console.log(
            `[DEBUG]   開始: ${eventStart.toISOString()} (${eventStart.toLocaleString(
              "ja-JP",
              { timeZone: "Asia/Tokyo" }
            )})`
          );
          console.log(
            `[DEBUG]   終了: ${eventEnd.toISOString()} (${eventEnd.toLocaleString(
              "ja-JP",
              { timeZone: "Asia/Tokyo" }
            )})`
          );
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
