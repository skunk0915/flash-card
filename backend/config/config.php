<?php
// データベース設定
define('DB_HOST', 'mysql80.mizy.sakura.ne.jp');
define('DB_NAME', 'mizy_flash');
define('DB_USER', 'mizy');
define('DB_PASS', '8rjcp4ck');
define('DB_CHARSET', 'utf8mb4');

// アプリケーション設定
define('APP_NAME', '単語帳アプリ');
define('APP_VERSION', '1.0.0');
define('APP_URL', 'https://mizy.sakura.ne.jp/flash-card/');

// ファイルアップロード設定
define('UPLOAD_DIR', '../frontend/assets/');
define('MAX_FILE_SIZE', 5 * 1024 * 1024); // 5MB
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/gif']);
define('ALLOWED_AUDIO_TYPES', ['audio/mp3', 'audio/wav', 'audio/ogg']);

// プッシュ通知設定
define('PUSH_SERVICE_URL', 'https://flash-card-ymtw.onrender.com');
define('VAPID_PUBLIC_KEY', 'BLLLszuffWZYsrtAgZVWK_37QUWqsBF6PYGyAA3A2k6yTs_4obOgdk20o48iS8WQQmtVJmSOp9FeZM1ICLRP0xI');
define('VAPID_PRIVATE_KEY', '1fwmUR7842tPJyRVALu5l3nXO8Yinnc_WrtdzkIbFbQ');

// セキュリティ設定
define('JWT_SECRET', 'your_jwt_secret_key');
define('SESSION_LIFETIME', 3600); // 1時間

// CORS設定
$allowed_origins = [
    'http://localhost',
    'https://your-domain.com'
];

// エラー報告設定
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/error.log');

// タイムゾーン設定
date_default_timezone_set('Asia/Tokyo');
?>