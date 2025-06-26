const mysql = require('mysql2/promise');

let connection = null;

// データベース接続の取得
async function getDb() {
    if (!connection) {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306,
            charset: 'utf8mb4',
            timezone: '+00:00',
            acquireTimeout: 60000,
            timeout: 60000,
            reconnect: true
        });
        
        console.log('Database connected successfully');
    }
    
    return connection;
}

// データベース接続を閉じる
async function closeDb() {
    if (connection) {
        await connection.end();
        connection = null;
        console.log('Database connection closed');
    }
}

// 必要なテーブルが存在するかチェック・作成
async function initializeTables() {
    const db = await getDb();
    
    // scheduled_notifications テーブル
    await db.execute(`
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
        )
    `);
    
    // notification_logs テーブル（送信ログ用）
    await db.execute(`
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
        )
    `);
    
    console.log('Database tables initialized');
}

// データベースの統計情報を取得
async function getDbStats() {
    const db = await getDb();
    
    const [subscriptions] = await db.execute(
        'SELECT COUNT(*) as count FROM push_subscriptions'
    );
    
    const [scheduled] = await db.execute(
        'SELECT COUNT(*) as count FROM scheduled_notifications WHERE sent = 0'
    );
    
    const [logs] = await db.execute(
        `SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
         FROM notification_logs 
         WHERE sent_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`
    );
    
    return {
        subscriptions: subscriptions[0].count,
        scheduledNotifications: scheduled[0].count,
        logsLast24h: logs[0] || { total: 0, successful: 0, failed: 0 }
    };
}

module.exports = {
    getDb,
    closeDb,
    initializeTables,
    getDbStats
};