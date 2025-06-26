-- 単語帳アプリ データベース作成スクリプト

-- データベース作成
CREATE DATABASE IF NOT EXISTS flashcard_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE flashcard_app;

-- カードテーブル
CREATE TABLE cards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    front_text TEXT NULL,
    back_text TEXT NULL,
    front_image VARCHAR(255) NULL,
    back_image VARCHAR(255) NULL,
    front_audio VARCHAR(255) NULL,
    back_audio VARCHAR(255) NULL,
    front_youtube_url VARCHAR(500) NULL,
    back_youtube_url VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_title (title),
    INDEX idx_created_at (created_at)
);

-- 学習進捗テーブル
CREATE TABLE learning_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    card_id INT NOT NULL,
    last_reviewed TIMESTAMP NULL,
    next_review TIMESTAMP NULL,
    review_count INT DEFAULT 0,
    difficulty_level INT DEFAULT 1,
    correct_streak INT DEFAULT 0,
    total_reviews INT DEFAULT 0,
    correct_reviews INT DEFAULT 0,
    is_learning BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
    INDEX idx_next_review (next_review),
    INDEX idx_card_id (card_id)
);

-- ユーザー設定テーブル
CREATE TABLE user_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_setting_key (setting_key)
);

-- プッシュ通知設定テーブル
CREATE TABLE push_subscriptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    endpoint VARCHAR(500) NOT NULL,
    p256dh_key VARCHAR(255) NOT NULL,
    auth_key VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_endpoint (endpoint(255))
);

-- デフォルト設定データ挿入
INSERT INTO user_settings (setting_key, setting_value) VALUES
('default_view_mode', 'front'),
('notification_enabled', 'true'),
('auto_schedule_enabled', 'true'),
('default_difficulty', 'medium');

-- サンプルデータ挿入
INSERT INTO cards (title, front_text, back_text) VALUES
('英単語: Apple', 'Apple', 'りんご'),
('英単語: Book', 'Book', '本'),
('英単語: Cat', 'Cat', '猫'),
('数学: 円周率', 'π（パイ）の値は？', '3.14159...'),
('歴史: 織田信長', '織田信長が生まれた年は？', '1534年');

-- 学習進捗の初期データ挿入
INSERT INTO learning_progress (card_id, next_review) VALUES
(1, NOW()),
(2, NOW()),
(3, NOW()),
(4, NOW()),
(5, NOW());