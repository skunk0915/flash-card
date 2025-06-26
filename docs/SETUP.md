# セットアップガイド

このガイドでは、単語帳アプリの詳細なセットアップ手順を説明します。

## 📋 事前準備

### 必要なサービス

1. **さくらレンタルサーバー**（スタンダードプラン以上推奨）
   - PHP 8.0以上
   - MySQL 5.7以上
   - SSL証明書

2. **render.com**（無料プランで可）
   - Node.js 18.0以上対応
   - 環境変数設定可能

### 必要なツール

- FTPクライアント（FileZilla、Cyberduckなど）
- テキストエディタ
- Webブラウザ（Chrome、Firefox、Safari）

## 🗄️ データベースセットアップ

### 1. データベース作成

さくらレンタルサーバーの管理画面で：

1. 「データベース」メニューにアクセス
2. 「データベース新規作成」をクリック
3. データベース名を入力（例: `flashcard_app`）
4. 文字コードを `UTF-8` に設定
5. 「作成する」をクリック

### 2. データベースユーザー作成

1. 「データベースユーザー新規作成」をクリック
2. ユーザー名とパスワードを設定
3. 作成したデータベースへのアクセス権を付与

### 3. テーブル作成

phpMyAdminまたはSQLクライアントで：

```sql
-- backend/config/database.sql の内容を実行
SOURCE /path/to/backend/config/database.sql;
```

## 🌐 さくらレンタルサーバーの設定

### 1. ファイルアップロード

FTPクライアントで以下の構造でアップロード：

```
/home/your-account/www/
├── index.html              # frontend/index.html
├── css/                    # frontend/css/
├── js/                     # frontend/js/
├── assets/                 # frontend/assets/
│   ├── images/
│   └── audio/
└── backend/                # backend/
    ├── api/
    ├── config/
    ├── models/
    └── utils/
```

### 2. 設定ファイルの編集

`backend/config/config.php` を編集：

```php
<?php
// データベース設定
define('DB_HOST', 'mysql1234.db.sakura.ne.jp');  // さくらから提供
define('DB_NAME', 'your-account_flashcard');      // アカウント名_DB名
define('DB_USER', 'your-account');                // アカウント名
define('DB_PASS', 'your-database-password');      // 設定したパスワード

// アプリケーション設定
define('APP_URL', 'https://your-domain.sakura.ne.jp');

// プッシュ通知設定（後で設定）
define('PUSH_SERVICE_URL', 'https://your-app.onrender.com');
?>
```

### 3. .htaccessの設定

ルートディレクトリに `.htaccess` を作成：

```apache
# API リクエストの処理
RewriteEngine On

# API エンドポイントのルーティング
RewriteRule ^api/cards/?(.*)$ backend/api/cards.php/$1 [L,QSA]
RewriteRule ^api/learning/?(.*)$ backend/api/learning.php/$1 [L,QSA]
RewriteRule ^api/upload/?(.*)$ backend/api/upload.php/$1 [L,QSA]

# セキュリティ設定
<FilesMatch "\.(php)$">
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
</FilesMatch>

# CORS設定
<IfModule mod_headers.c>
    Header set Access-Control-Allow-Origin "*"
    Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    Header set Access-Control-Allow-Headers "Content-Type, Authorization"
</IfModule>

# ファイルアップロード用ディレクトリの設定
<Directory "assets">
    Options -Indexes
    AllowOverride None
    <FilesMatch "\.(jpg|jpeg|png|gif|mp3|wav|ogg)$">
        Order allow,deny
        Allow from all
    </FilesMatch>
</Directory>

# PHPの設定
php_value upload_max_filesize 5M
php_value post_max_size 10M
php_value max_execution_time 30
```

### 4. パーミッション設定

FTPクライアントで以下のディレクトリのパーミッションを設定：

```
assets/               → 755
assets/images/        → 755
assets/audio/         → 755
backend/config/       → 700
```

## ☁️ render.com プッシュ通知サービス

### 1. VAPIDキーの生成

ローカル環境で：

```bash
npm install -g web-push
web-push generate-vapid-keys
```

出力されたキーを保存しておきます。

### 2. render.comでサービス作成

1. [render.com](https://render.com)にアカウント作成・ログイン
2. 「New +」→「Web Service」を選択
3. GitHubリポジトリを連携、または「Public Git repository」でURL指定
4. 以下を設定：
   - **Name**: `flashcard-push-service`
   - **Region**: `Oregon (US West)`
   - **Branch**: `main`
   - **Root Directory**: `push-service`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 3. 環境変数設定

render.comの「Environment」タブで設定：

```bash
NODE_ENV=production
VAPID_PUBLIC_KEY=your_generated_public_key
VAPID_PRIVATE_KEY=your_generated_private_key
VAPID_EMAIL=mailto:your-email@domain.com

# データベース設定（さくらサーバーと同じ）
DB_HOST=mysql1234.db.sakura.ne.jp
DB_NAME=your-account_flashcard
DB_USER=your-account
DB_PASS=your-database-password

# その他
ALLOWED_ORIGINS=https://your-domain.sakura.ne.jp
KEEP_ALIVE_URL=https://your-app.onrender.com/api/health
MAIN_APP_URL=https://your-domain.sakura.ne.jp
```

### 4. データベーステーブル追加

phpMyAdminで以下のテーブルを追加作成：

```sql
-- scheduled_notifications テーブル
CREATE TABLE IF NOT EXISTS scheduled_notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    card_id INT NOT NULL,
    schedule_time DATETIME NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    icon VARCHAR(255) DEFAULT '/icon-192x192.png',
    badge VARCHAR(255) DEFAULT '/badge-72x72.png',
    data JSON,
    sent BOOLEAN DEFAULT FALSE,
    sent_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_schedule_time (schedule_time),
    INDEX idx_card_id (card_id),
    INDEX idx_sent (sent)
);

-- notification_logs テーブル
CREATE TABLE IF NOT EXISTS notification_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    subscription_id INT,
    notification_id INT,
    status ENUM('success', 'failed') NOT NULL,
    response_code INT,
    error_message TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_sent_at (sent_at),
    INDEX idx_status (status)
);
```

## 🔗 フロントエンドの設定

### 1. API設定

`frontend/js/config.js` を編集：

```javascript
const CONFIG = {
    API_BASE_URL: './backend/api',  // さくらサーバーの場合
    
    // プッシュ通知設定
    PUSH_SERVICE_URL: 'https://your-app.onrender.com',
    VAPID_PUBLIC_KEY: 'your_generated_public_key',
    
    // その他の設定...
};
```

### 2. Service Worker（オプション）

プッシュ通知を受け取るため、`frontend/sw.js` を作成：

```javascript
self.addEventListener('push', function(event) {
    if (event.data) {
        const data = event.data.json();
        
        const options = {
            body: data.body,
            icon: data.icon || '/icon-192x192.png',
            badge: data.badge || '/badge-72x72.png',
            data: data.data,
            actions: data.actions,
            requireInteraction: true,
            tag: data.tag || 'flashcard-notification'
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    if (event.action === 'study') {
        event.waitUntil(
            clients.openWindow('/index.html#study')
        );
    } else {
        event.waitUntil(
            clients.openWindow('/index.html')
        );
    }
});
```

## ✅ 動作テスト

### 1. 基本機能テスト

1. **Webアプリアクセス**: `https://your-domain.sakura.ne.jp`
2. **カード作成**: 新しいカードを作成してみる
3. **ファイルアップロード**: 画像・音声ファイルをアップロード
4. **学習機能**: カードの学習・復習を試す

### 2. API テスト

```bash
# カード一覧取得
curl https://your-domain.sakura.ne.jp/api/cards

# 学習キュー取得
curl https://your-domain.sakura.ne.jp/api/learning/queue
```

### 3. プッシュ通知テスト

```bash
# render.comサービスのヘルスチェック
curl https://your-app.onrender.com/api/health

# 通知送信テスト
curl -X POST https://your-app.onrender.com/api/push/send \
  -H "Content-Type: application/json" \
  -d '{"title":"テスト通知","body":"アプリが正常に動作しています"}'
```

## 🔧 トラブルシューティング

### よくある問題と解決方法

#### 1. データベース接続エラー
- ホスト名、ユーザー名、パスワードを再確認
- さくらサーバーのコントロールパネルでDB状態を確認

#### 2. ファイルアップロードエラー
- `assets/` ディレクトリのパーミッション確認（755）
- PHPの `upload_max_filesize` 設定確認

#### 3. プッシュ通知が送信されない
- render.comサービスの起動状態確認
- VAPID設定の確認
- ブラウザの通知許可設定確認

#### 4. render.com サービスがスリープ
- 無料プランでは15分無通信でスリープ
- Keep Alive機能が正常に動作しているか確認

### ログの確認方法

#### さくらレンタルサーバー
```bash
# エラーログ確認
tail -f /home/your-account/log/error_log
```

#### render.com
- ダッシュボードの「Logs」タブで確認

## 📈 パフォーマンス最適化

### 1. 画像最適化
- アップロード時に自動リサイズ（実装済み）
- WebP形式の利用検討

### 2. キャッシュ設定
`.htaccess` に追加：

```apache
# ブラウザキャッシュ設定
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType image/png "access plus 1 month"
    ExpiresByType image/jpg "access plus 1 month"
    ExpiresByType image/jpeg "access plus 1 month"
    ExpiresByType audio/mpeg "access plus 1 month"
</IfModule>
```

### 3. データベース最適化
- 定期的なクエリパフォーマンス確認
- インデックスの適切な設定（実装済み）

## 🔒 セキュリティ設定

### 1. SSL/HTTPS
- さくらレンタルサーバーでSSL証明書を設定
- HTTP→HTTPSリダイレクト設定

### 2. ファイルアップロードセキュリティ
- 許可ファイル形式の制限（実装済み）
- ファイルサイズ制限（実装済み）
- アップロードファイルの検証（実装済み）

これで単語帳アプリのセットアップが完了です。問題が発生した場合は、このガイドのトラブルシューティングセクションを参照してください。