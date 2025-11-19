import * as fs from "fs";
import * as path from "path";

const CONFIG_FILE = process.env.CONFIG_FILE || "config.json";

/**
 * 設定ファイルを読み込む
 * @returns {Object} 設定オブジェクト
 */
export function loadConfig() {
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

/**
 * 設定ファイルを保存する
 * @param {Object} config - 設定オブジェクト
 */
export function saveConfig(config) {
  try {
    // ディレクトリが存在しない場合は作成
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log(`設定を保存しました: ${CONFIG_FILE}`);
  } catch (error) {
    console.error("設定ファイルの保存に失敗しました:", error);
  }
}
