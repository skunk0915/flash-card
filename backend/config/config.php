<?php
// データベース設定
define('DB_HOST', 'localhost');
define('DB_NAME', 'flashcard_app');
define('DB_USER', 'your_username');
define('DB_PASS', 'your_password');
define('DB_CHARSET', 'utf8mb4');

// アプリケーション設定
define('APP_NAME', '単語帳アプリ');
define('APP_VERSION', '1.0.0');
define('APP_URL', 'https://your-domain.com');

// ファイルアップロード設定
define('UPLOAD_DIR', '../frontend/assets/');
define('MAX_FILE_SIZE', 5 * 1024 * 1024); // 5MB
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/gif']);
define('ALLOWED_AUDIO_TYPES', ['audio/mp3', 'audio/wav', 'audio/ogg']);

// プッシュ通知設定
define('PUSH_SERVICE_URL', 'https://your-render-app.onrender.com');
define('VAPID_PUBLIC_KEY', 'your_vapid_public_key');
define('VAPID_PRIVATE_KEY', 'your_vapid_private_key');

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