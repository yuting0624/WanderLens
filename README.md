# WanderLens - 次世代の旅行AIエージェント

## 概要

WanderLensは、Gemini Multimodal Live APIを活用した次世代のお出かけサポートアプリケーションです。
リアルタイムの音声会話によるサポートと、マルチモーダルAIを組み合わせることで、外出や旅行をより楽しく豊かな体験にします。

### 🎥 デモ動画
https://youtu.be/vkWUWjnJFMU

## 💡 主な機能

### 🎯 AIカメラガイド
- カメラを通じた環境認識とリアルタイム情報提供
- 建物、看板、メニューなどの即時認識と解説
- ARオーバーレイによる直感的な情報表示

### 🗺️ インテリジェントナビゲーション
- ユーザーの好みを考慮した最適ルート提案
- 周辺スポットのリアルタイム提案
- 歩行者に特化した細やかなルート案内

### 👤 パーソナライズされた体験
- Firestoreを活用した会話履歴の永続化
- ユーザーの興味・好みに基づく推薦
- 過去の訪問履歴を活用した提案

### 🔧 ツール統合
- 周辺施設検索（Places API）
- 経路案内（Maps API）
- 多言語翻訳（Translation API）
- セッション要約（Vertex AI）

## 🛠️ 技術スタック

### フロントエンド
- Next.js
- TailwindCSS
- Framer Motion

### バックエンド
- Gemini Multimodal Live API
- Firebase Authentication
- Firestore
- Cloud Run

### API統合
- Google Places API
- Google Maps JavaScript API
- Translation API
- Vertex AI

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

## 🔜 今後の展望

1. **機能拡張**
   - 音声認識の強化
   - 電話予約代行機能
   - AR技術の拡充

2. **プラットフォーム展開**
   - ネイティブアプリ化
   - オフライン対応
   - ウェアラブル対応

3. **ビジネス展開**
   - 地域事業者連携
   - プレミアム機能
   - グローバル展開

## 👥 プロジェクト

このプロジェクトは、AI Agent Hackathon with Google Cloudの一環として開発されています。

## ライセンス

MIT License

## 貢献について

プルリクエストは大歓迎です。大きな変更を加える場合は、まずissueを作成して変更内容を議論しましょう。