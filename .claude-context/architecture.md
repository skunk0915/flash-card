# 単語帳ブラウザアプリ 設計書

## システム全体構成

### アーキテクチャ概要
```
[Frontend (Browser)]
    ↓ HTTP/HTTPS
[Backend API (さくらレンタルサーバー)]
    ↓ HTTP API
[Push Notification Service (render.com)]
```

### 技術スタック

#### フロントエンド
- **HTML5/CSS3/JavaScript**: 基本構成
- **Framework**: Vanilla JS またはライトウェイトフレームワーク
- **UI Components**: 
  - カード表示コンポーネント
  - メディアプレーヤー
  - ドラッグ&ドロップアップローダー
  - YouTube埋め込みプレーヤー

#### バックエンド（さくらレンタルサーバー）
- **言語**: PHP 8.x
- **データベース**: MySQL/MariaDB
- **ファイル管理**: ローカルファイルシステム
- **セッション管理**: PHP標準セッション

#### プッシュ通知サービス（render.com）
- **言語**: Node.js
- **フレームワーク**: Express.js
- **通知**: Web Push API
- **スリープ対策**: 定期的なヘルスチェック実装

## データベース設計

### テーブル構成

#### cards テーブル
```sql
CREATE TABLE cards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    front_text TEXT,
    back_text TEXT,
    front_image VARCHAR(255),
    back_image VARCHAR(255),
    front_audio VARCHAR(255),
    back_audio VARCHAR(255),
    front_youtube_url VARCHAR(255),
    back_youtube_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### learning_progress テーブル
```sql
CREATE TABLE learning_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    card_id INT NOT NULL,
    last_reviewed TIMESTAMP,
    next_review TIMESTAMP,
    review_count INT DEFAULT 0,
    difficulty_level INT DEFAULT 1,
    correct_streak INT DEFAULT 0,
    FOREIGN KEY (card_id) REFERENCES cards(id)
);
```

#### user_settings テーブル
```sql
CREATE TABLE user_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## API設計

### RESTful API エンドポイント

#### カード管理
- `GET /api/cards` - カード一覧取得
- `GET /api/cards/{id}` - 特定カード取得
- `POST /api/cards` - カード作成
- `PUT /api/cards/{id}` - カード更新
- `DELETE /api/cards/{id}` - カード削除

#### 学習管理
- `GET /api/learning/queue` - 学習キュー取得（優先度順）
- `POST /api/learning/review` - 復習結果記録
- `GET /api/learning/stats` - 学習統計取得

#### メディア管理
- `POST /api/media/upload` - ファイルアップロード
- `GET /api/media/{filename}` - メディアファイル取得
- `DELETE /api/media/{filename}` - メディアファイル削除

#### 設定管理
- `GET /api/settings` - 設定取得
- `PUT /api/settings` - 設定更新

### プッシュ通知API（render.com）
- `POST /api/push/register` - 通知登録
- `POST /api/push/schedule` - 通知スケジュール
- `GET /api/push/health` - ヘルスチェック

## フロントエンド設計

### ページ構成
1. **トップページ** (`index.html`)
   - 学習キュー表示
   - オモテ/ウラ切り替え
   - 学習開始ボタン

2. **学習ページ** (`study.html`)
   - カード表示
   - 裏返し機能
   - 次回復習時間設定
   - 前後カード移動

3. **カード管理ページ** (`cards.html`)
   - カード一覧
   - 個別カード編集
   - 新規作成

4. **カード詳細ページ** (`card-detail.html`)
   - カード内容表示
   - メディア再生
   - 編集機能

### コンポーネント設計

#### CardComponent
- カード表示・操作
- 裏返しアニメーション
- メディア再生機能

#### MediaPlayerComponent
- 音声再生コントロール
- 画像拡大表示
- YouTube埋め込み

#### UploadComponent
- ドラッグ&ドロップ
- プログレス表示
- エラーハンドリング

#### NotificationComponent
- プッシュ通知許可要求
- 設定管理

## 忘却曲線アルゴリズム

### 間隔反復法（Spaced Repetition）
```javascript
function calculateNextReview(difficulty, reviewCount, isCorrect) {
    const baseDays = [1, 3, 7, 14, 30, 90, 180, 365];
    let multiplier = isCorrect ? 1.0 : 0.5;
    
    if (difficulty === 'easy') multiplier *= 1.5;
    if (difficulty === 'hard') multiplier *= 0.8;
    
    const dayIndex = Math.min(reviewCount, baseDays.length - 1);
    const days = Math.floor(baseDays[dayIndex] * multiplier);
    
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
```

## セキュリティ設計

### データ保護
- ファイルアップロード時の検証
- SQLインジェクション対策
- XSS対策
- CSRF対策

### アクセス制御
- セッション管理
- ファイルアクセス制限
- API認証

## パフォーマンス設計

### 最適化戦略
- 画像の適切なリサイズ
- 音声ファイルの圧縮
- キャッシュ戦略
- 遅延読み込み

### render.com スリープ対策
- 定期的なヘルスチェック（10分間隔）
- 軽量なpingエンドポイント
- 通知スケジューリングの工夫

## 展開・運用設計

### デプロイメント
- さくらレンタルサーバーへのFTPアップロード
- データベースセットアップスクリプト
- 設定ファイルの環境別管理

### 監視・メンテナンス
- エラーログ管理
- パフォーマンス監視
- バックアップ戦略