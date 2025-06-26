# 単語帳ブラウザアプリ

さくらレンタルサーバーで動作する忘却曲線に基づく単語帳学習アプリです。

## 🌟 特徴

- **忘却曲線ベース**: エビングハウスの忘却曲線に基づく最適な復習タイミング
- **マルチメディア対応**: テキスト、画像、音声、YouTube動画に対応
- **プッシュ通知**: 復習時間をプッシュ通知でお知らせ
- **カード裏返し**: 直感的なカード操作でインタラクティブな学習
- **レスポンシブデザイン**: PC・スマートフォン・タブレット対応

## 📱 機能

### 基本機能
- ✅ 単語カードの作成・編集・削除
- ✅ オモテ・ウラ両面のコンテンツ設定
- ✅ 画像・音声・YouTube動画の埋め込み
- ✅ ドラッグ&ドロップファイルアップロード
- ✅ 全文検索機能

### 学習機能
- ✅ フラッシュカード形式の学習画面
- ✅ 忘却曲線アルゴリズムによる復習スケジューリング
- ✅ 学習進捗の追跡
- ✅ カスタム復習時間設定
- ✅ オモテ・ウラ表示モード切り替え

### 通知機能
- ✅ プッシュ通知による復習リマインダー
- ✅ render.com無料版対応（スリープ対策）
- ✅ 通知のスケジューリング

## 🏗️ アーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │  Push Service   │
│   (HTML/CSS/JS) │◄──►│   (PHP/MySQL)   │◄──►│   (Node.js)     │
│                 │    │                 │    │                 │
│ ・学習UI        │    │ ・REST API      │    │ ・プッシュ通知  │
│ ・カード管理    │    │ ・ファイル管理  │    │ ・スケジューラー│
│ ・統計表示      │    │ ・忘却曲線      │    │ ・render.com対応│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📦 セットアップ

### 必要環境

#### さくらレンタルサーバー（メインアプリ）
- PHP 8.0以上
- MySQL 5.7以上
- .htaccess対応

#### render.com（プッシュ通知サービス）
- Node.js 18.0以上
- 無料プランで動作可能

### 1. データベースセットアップ

```bash
# さくらレンタルサーバーのphpMyAdminまたはコマンドラインで実行
mysql -u username -p database_name < backend/config/database.sql
```

### 2. 設定ファイル

#### backend/config/config.php
```php
define('DB_HOST', 'your_db_host');
define('DB_NAME', 'your_db_name');
define('DB_USER', 'your_db_user');
define('DB_PASS', 'your_db_password');
```

#### プッシュ通知サービス (.env)
```bash
cp push-service/.env.example push-service/.env
# .envファイルを適切に設定
```

### 3. ファイルアップロード

#### さくらレンタルサーバーに以下をアップロード:
```
public_html/
├── frontend/
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── assets/
└── backend/
    ├── api/
    ├── config/
    ├── models/
    └── utils/
```

### 4. render.comデプロイ

```bash
# render.comに push-service ディレクトリをデプロイ
# 環境変数を設定:
# - VAPID_PUBLIC_KEY
# - VAPID_PRIVATE_KEY
# - VAPID_EMAIL
# - DB_* (データベース設定)
```

## 🚀 使い方

### 1. カード作成
1. 「カード管理」ページで「新しいカードを追加」をクリック
2. タイトル、オモテ・ウラのコンテンツを入力
3. 画像・音声・YouTubeのURLを追加（オプション）
4. 「保存」をクリック

### 2. 学習開始
1. ホームページで「学習を始める」をクリック
2. カードをクリックまたはスペースキーで裏返し
3. 難易度を選択して次回復習時間を設定
4. 次のカードに進む

### 3. 復習通知
- ブラウザで通知許可を設定
- 復習時間になると自動でプッシュ通知
- 通知をクリックして学習画面に移動

## ⌨️ キーボードショートカット

| キー | 機能 |
|------|------|
| `Space` / `Enter` | カードをめくる |
| `←` / `→` | 前/次のカード |
| `Ctrl+H` | ホームページ |
| `Ctrl+N` | 新規カード作成 |
| `Ctrl+F` | 検索 |
| `Esc` | モーダルを閉じる/学習終了 |

## 🎯 忘却曲線アルゴリズム

本アプリは以下の間隔で復習をスケジュールします：

| 復習回数 | 間隔 |
|----------|------|
| 1回目 | 10分後 |
| 2回目 | 1時間後 |
| 3回目 | 3時間後 |
| 4回目 | 12時間後 |
| 5回目 | 1日後 |
| 6回目 | 2日後 |
| 7回目 | 5日後 |
| 8回目 | 10日後 |
| 9回目 | 30日後 |
| 10回目以降 | 90日後 |

難易度に応じて間隔が調整されます：
- **簡単**: 1.5倍
- **普通**: 1.0倍
- **難しい**: 0.8倍
- **間違い**: 0.3倍

## 🔧 開発

### ローカル開発環境

```bash
# プッシュ通知サービスのローカル実行
cd push-service
npm install
npm run dev

# PHPローカルサーバー（オプション）
cd frontend
php -S localhost:8000
```

### ディレクトリ構造

```
flash-card/
├── .claude-context/          # プロジェクト管理ファイル
│   ├── requirements.md
│   ├── architecture.md
│   └── style-guide.md
├── frontend/                 # フロントエンド
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── assets/
├── backend/                  # バックエンド（PHP）
│   ├── api/
│   ├── config/
│   ├── models/
│   └── utils/
├── push-service/            # プッシュ通知サービス（Node.js）
│   ├── app.js
│   ├── routes/
│   └── utils/
└── docs/                    # ドキュメント
```

## 📝 API仕様

### カード管理
- `GET /api/cards.php` - カード一覧取得
- `POST /api/cards.php` - カード作成
- `PUT /api/cards.php/{id}` - カード更新
- `DELETE /api/cards.php/{id}` - カード削除

### 学習
- `GET /api/learning.php/queue` - 学習キュー取得
- `POST /api/learning.php/review` - 復習結果記録
- `POST /api/learning.php/schedule` - スケジュール設定

### ファイル管理
- `POST /api/upload.php` - ファイルアップロード
- `DELETE /api/upload.php` - ファイル削除

## 🐛 トラブルシューティング

### よくある問題

#### プッシュ通知が届かない
1. ブラウザの通知許可を確認
2. render.comサービスが起動しているか確認
3. VAPID設定が正しいか確認

#### ファイルアップロードできない
1. PHPのfile_uploads設定を確認
2. upload_max_filesizeとpost_max_sizeを確認
3. assetsディレクトリの書き込み権限を確認

#### 学習データが保存されない
1. データベース接続設定を確認
2. テーブルが正しく作成されているか確認

## 📄 ライセンス

MIT License

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/AmazingFeature`)
3. 変更をコミット (`git commit -m 'Add some AmazingFeature'`)
4. ブランチにプッシュ (`git push origin feature/AmazingFeature`)
5. プルリクエストを開く

## 📞 サポート

問題が発生した場合は、以下を確認してください：

1. [トラブルシューティングセクション](#🐛-トラブルシューティング)
2. ブラウザの開発者ツールでエラーを確認
3. サーバーログを確認

---

**🎓 効率的な学習をお楽しみください！**