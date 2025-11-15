# Discord Calendar Bot - Docker 版使用方法

この Bot を Docker コンテナで実行する方法を説明します。

## 前提条件

- Docker がインストールされていること
- Docker Compose がインストールされていること（オプション）

## セットアップ

### 1. 環境変数の設定

`.env`ファイルを作成し、以下の環境変数を設定してください：

```bash
cp .env.example .env
```

`.env`ファイルを編集：

```
DISCORD_TOKEN=your_discord_bot_token_here
CALENDAR_URL=https://calendar.google.com/calendar/ical/YOUR_CALENDAR_ID/public/basic.ics
```

### 2. データディレクトリの作成

設定ファイルを永続化するためのディレクトリを作成：

```bash
mkdir -p data
```

## 起動方法

### Docker Compose を使う場合（推奨）

```bash
# ビルドと起動
docker-compose up -d

# ログを確認
docker-compose logs -f

# 停止
docker-compose down

# 再起動
docker-compose restart
```

### Docker コマンドを直接使う場合

```bash
# イメージをビルド
docker build -t calendar-bot .

# コンテナを起動
docker run -d \
  --name discord-calendar-bot \
  --restart unless-stopped \
  -e DISCORD_TOKEN="your_token" \
  -e CALENDAR_URL="your_calendar_url" \
  -e TZ=Asia/Tokyo \
  -e CONFIG_FILE=/app/data/config.json \
  -v $(pwd)/data:/app/data \
  calendar-bot

# ログを確認
docker logs -f discord-calendar-bot

# 停止
docker stop discord-calendar-bot

# 削除
docker rm discord-calendar-bot
```

## 使用方法

Bot が起動したら、Discord サーバーで以下のスラッシュコマンドが使用できます：

- `/schedule` - カレンダーの自動送信を設定（毎日 18:00 に明日の予定を送信）
- `/unschedule` - カレンダーの自動送信を停止
- `/tomorrow` - 明日の予定を今すぐ表示

## トラブルシューティング

### ログの確認

```bash
# Docker Composeの場合
docker-compose logs -f

# Dockerコマンドの場合
docker logs -f discord-calendar-bot
```

### コンテナの再起動

```bash
# Docker Composeの場合
docker-compose restart

# Dockerコマンドの場合
docker restart discord-calendar-bot
```

### 設定ファイルの確認

設定ファイルは`./data/config.json`に保存されます。

```bash
cat data/config.json
```

### イメージの再ビルド

コードを変更した場合は、イメージを再ビルドしてください：

```bash
# Docker Composeの場合
docker-compose up -d --build

# Dockerコマンドの場合
docker build -t calendar-bot .
docker stop discord-calendar-bot
docker rm discord-calendar-bot
# 再度docker runコマンドを実行
```

## 注意事項

- `DISCORD_TOKEN`は必ず設定してください
- `CALENDAR_URL`は Google カレンダーの公開 iCal リンクを使用してください
- 設定ファイル（`config.json`）は`./data`ディレクトリにマウントされ、永続化されます
- タイムゾーンは`Asia/Tokyo`に設定されています（変更可能）
