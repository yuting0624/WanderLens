# WanderLens - 次世代の旅行AIエージェント

## 概要

WanderLensは、AIを活用した次世代の旅行アシスタントアプリケーションです。リアルタイムの音声会話によるサポートと、マルチモーダルAIを組み合わせることで、外出や旅行をより楽しく豊かな体験にします。

## 主な機能

### 🌐 リアルタイム会話サポート
- 音声入力による自然な対話
- リアルタイムでの言語変換
- 文脈を理解した適切な翻訳

### 🤖 インテリジェントアシスタント
- 場所や建物の視覚認識
- 文化的背景を含めた詳細な説明
- パーソナライズされた旅行提案

### 📍 ナビゲーション＆情報提供
- リアルタイムの経路案内
- 周辺スポット情報の提供

### 🧠 メモリの永続化
- 会話履歴の保存と活用
- ユーザー嗜好の学習
- セッションごとの要約生成

## 技術スタック

### フロントエンド
- Next.js
- TypeScript
- Tailwind CSS
- Framer Motion

### バックエンド
- Firebase (Authentication, Firestore)
- Google Cloud Run
- Gemini API

### AI/ML
- Google Gemini 2.0
- Multimodal Live API
- Translation API
- Text-to-Speech (出力モダリティをTEXTにする場合)

## セットアップ
```bash
リポジトリのクローン
git clone https://github.com/yuting0624/WanderLens.git
依存関係のインストール
npm install
開発サーバーの起動
npm run dev
```

## 環境変数

`.env.local`ファイルを作成し、以下の環境変数を設定してください：

## 開発状況

現在の実装状況：
- ✅ 基本的な対話システム
- ✅ Firebase認証・データ永続化
- ✅ 同時通訳機能の基盤
- ✅ セッション管理システム
- 🚧 AR機能
- 🚧 予約システム連携

## ライセンス

MIT License

## チーム

このプロジェクトはAIエージェントハッカソンの一環として開発されています。

## 貢献について

プルリクエストは大歓迎です。大きな変更を加える場合は、まずissueを作成して変更内容を議論しましょう。