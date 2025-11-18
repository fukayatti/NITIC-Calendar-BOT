/**
 * Discord用のメッセージを生成する
 * @param {Array} events - イベント配列
 * @returns {string} フォーマット済みメッセージ
 */
export function createMessage(events) {
  // JSTでの明日を計算
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const nowJST = new Date(now.getTime() + jstOffset);
  const tomorrowJST = new Date(nowJST);
  tomorrowJST.setUTCDate(tomorrowJST.getUTCDate() + 1);

  const dateStr = tomorrowJST.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "UTC", // tomorrowJSTはすでにJST時刻なのでUTCとして読む
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

      const isAllDay = startTime === "09:00" && endTime === "09:00";

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
