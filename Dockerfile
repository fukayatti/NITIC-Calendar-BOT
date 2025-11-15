# Node.js 20のAlpineイメージを使用（軽量）
FROM node:20-alpine

# 作業ディレクトリを設定
WORKDIR /app

# pnpmをインストール
RUN npm install -g pnpm

# package.jsonとpnpm-lock.yamlをコピー
COPY package.json pnpm-lock.yaml ./

# 依存関係をインストール
RUN pnpm install --frozen-lockfile --prod

# アプリケーションのソースコードをコピー
COPY index.js ./

# 設定ファイル用のボリュームマウントポイント
VOLUME ["/app/data"]

# 環境変数（デフォルト値、.envやdocker-composeで上書き可能）
ENV NODE_ENV=production

# アプリケーションを起動
CMD ["node", "index.js"]
