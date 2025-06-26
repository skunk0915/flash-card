const express = require('express');
const { getDb } = require('../utils/database');

const router = express.Router();

// ヘルスチェック
router.get('/', async (req, res) => {
    try {
        const healthCheck = {
            service: 'FlashCard Push Service',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development'
        };
        
        // データベース接続チェック
        try {
            const db = await getDb();
            await db.execute('SELECT 1');
            healthCheck.database = 'connected';
        } catch (dbError) {
            healthCheck.database = 'disconnected';
            healthCheck.status = 'unhealthy';
            healthCheck.errors = healthCheck.errors || [];
            healthCheck.errors.push('Database connection failed');
        }
        
        // VAPID設定チェック
        if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
            healthCheck.vapid = 'not_configured';
            healthCheck.status = 'unhealthy';
            healthCheck.errors = healthCheck.errors || [];
            healthCheck.errors.push('VAPID keys not configured');
        } else {
            healthCheck.vapid = 'configured';
        }
        
        const statusCode = healthCheck.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(healthCheck);
        
    } catch (error) {
        console.error('Health check error:', error);
        res.status(503).json({
            service: 'FlashCard Push Service',
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// 詳細ステータス
router.get('/status', async (req, res) => {
    try {
        const db = await getDb();
        
        // 統計情報を取得
        const [subscriptions] = await db.execute(
            'SELECT COUNT(*) as total FROM push_subscriptions'
        );
        
        const [recentSubs] = await db.execute(
            `SELECT COUNT(*) as recent 
             FROM push_subscriptions 
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`
        );
        
        const [scheduledNotifications] = await db.execute(
            `SELECT COUNT(*) as pending 
             FROM scheduled_notifications 
             WHERE schedule_time > NOW() AND sent = 0`
        );
        
        const status = {
            service: 'FlashCard Push Service',
            timestamp: new Date().toISOString(),
            statistics: {
                totalSubscriptions: subscriptions[0].total,
                recentSubscriptions: recentSubs[0].recent,
                pendingNotifications: scheduledNotifications[0].pending
            },
            systemInfo: {
                nodeVersion: process.version,
                platform: process.platform,
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                cpu: process.cpuUsage()
            }
        };
        
        res.json({
            success: true,
            data: status
        });
        
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({
            success: false,
            error: 'ステータス情報の取得に失敗しました'
        });
    }
});

// Ping（Keep Alive用）
router.get('/ping', (req, res) => {
    res.json({
        success: true,
        message: 'pong',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;