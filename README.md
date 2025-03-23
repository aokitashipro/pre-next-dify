# Dify Next.js チャットアプリケーション

このアプリケーションは、Next.js、Prisma、Dify APIを使用したAIチャットアプリケーションです。

## 機能

- Dify APIを使用したAIチャット
- 会話履歴の保存と表示
- リソース（引用情報）の表示
- マルチファイルアップロード対応（画像、ドキュメント、音声、動画）

## セットアップ手順

### 1. 環境変数の設定

`.env.local.example`を`.env.local`にコピーし、必要な環境変数を設定します。

```bash
cp .env.local.example .env.local
```

必要な環境変数:

- `DIFY_API_URL`: Dify APIのURL
- `DIFY_API_KEY`: Dify APIのアクセスキー
- `DATABASE_URL`: PostgreSQLデータベースの接続URL
- `NEXT_PUBLIC_BASE_URL`: アプリケーションのベースURL（ファイルアップロード機能に必要）
- `SECRET`: JWT認証に使用するシークレット

### 2. 依存関係のインストール

```bash
npm install
```

### 3. データベースのセットアップ

```bash
npx prisma migrate dev
```

### 4. アプリケーションの実行

開発モード:

```bash
npm run dev
```

本番モード:

```bash
npm run build
npm start
```

## ファイルアップロード機能

このアプリケーションでは、以下のタイプのファイルをアップロードしてAIとの会話に添付できます：

- 画像: JPEG, PNG, GIF, WebP
- ドキュメント: PDF, TXT, DOCX, XLSX, PPTX, CSV
- 音声: MP3, WAV, OGG
- 動画: MP4, WebM, OGG

アップロードされたファイルは`public/uploads`ディレクトリに保存され、チャットメッセージとともに表示されます。

### 本番環境でのファイルアップロード設定

1. `NEXT_PUBLIC_BASE_URL`環境変数を正しいドメインに設定してください。
   例: `NEXT_PUBLIC_BASE_URL=https://your-domain.com`

2. アップロードディレクトリのパーミッションが適切に設定されていることを確認してください。
   ```bash
   mkdir -p public/uploads
   chmod 755 public/uploads
   ```

3. 大量のファイルアップロードが予想される場合は、クラウドストレージ（AWS S3やGCP Cloud Storage）を使用することをお勧めします。

## ライセンス

[MIT License](LICENSE)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
