# デプロイガイド

## 簡単デプロイ（1 コマンド）

```bash
./deploy.sh
```

このコマンド 1 つで以下が自動実行されます:

1. 📥 `git pull` - 最新のコードを取得
2. ⏹️ `docker-compose down` - 既存のコンテナを停止
3. 🔨 `docker-compose build` - 新しいイメージをビルド
4. 🚀 `docker-compose up -d` - コンテナを起動
5. 🧹 古いイメージを削除

---

## 初回セットアップ

### 1. リポジトリをクローン

```bash
git clone https://github.com/fukayatti/NITIC-Calendar-BOT.git
cd NITIC-Calendar-BOT
```

### 2. .env ファイルを作成

```bash
cp .env.example .env
nano .env  # DISCORD_TOKENとCALENDAR_URLを設定
```

### 3. デプロイスクリプトに実行権限を付与

```bash
chmod +x deploy.sh
```

### 4. 初回デプロイ

```bash
./deploy.sh
```

---

## その他のコマンド

### ログを確認

```bash
docker-compose logs -f calendar-bot
```

### コンテナの状態を確認

```bash
docker-compose ps
```

### コンテナを停止

```bash
docker-compose down
```

### コンテナを再起動

```bash
docker-compose restart
```

---

## トラブルシューティング

### デプロイが失敗する場合

```bash
# Dockerが動作しているか確認
docker ps

# ログを確認
docker-compose logs calendar-bot

# 手動で各ステップを実行
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### チャンネル設定が消える場合

`data/config.json`が正しくマウントされているか確認:

```bash
ls -la data/
cat data/config.json
```
