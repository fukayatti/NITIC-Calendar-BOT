#!/bin/bash

# デプロイスクリプト
# 使い方: ./deploy.sh

set -e  # エラーが発生したら終了

echo "========================================="
echo "デプロイを開始します"
echo "$(date)"
echo "========================================="

# リポジトリのディレクトリに移動
cd "$(dirname "$0")"

echo "📥 Gitリポジトリを更新中..."
git pull origin main

echo "⏹️  Dockerコンテナを停止中..."
docker-compose down

echo "🔨 Dockerイメージをビルド中..."
docker-compose build

echo "🚀 Dockerコンテナを起動中..."
docker-compose up -d

echo "🧹 古いDockerイメージを削除中..."
docker image prune -f

echo ""
echo "========================================="
echo "✅ デプロイが完了しました"
echo "$(date)"
echo "========================================="
echo ""

# ログを表示
echo "📋 起動ログ:"
docker-compose logs --tail=30 calendar-bot

echo ""
echo "💡 リアルタイムログを見る: docker-compose logs -f calendar-bot"
