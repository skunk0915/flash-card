require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cron = require('node-cron');

const pushRoutes = require('./routes/push');
const healthRoutes = require('./routes/health');
const { schedulePushNotifications } = require('./utils/scheduler');
const { keepAlive } = require('./utils/keepAlive');

const app = express();
const PORT = process.env.PORT || 3000;

// セキュリティミドルウェア
app.use(helmet());

// CORS設定
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost', 'https://your-domain.com'],
    credentials: true
}));

// ボディパーサー
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ルーティング
app.use('/api/push', pushRoutes);
app.use('/api/health', healthRoutes);

// ルートエンドポイント
app.get('/', (req, res) => {
    res.json({
        service: 'FlashCard Push Service',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString()
    });
});

// エラーハンドリングミドルウェア
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    res.status(err.status || 500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message,
        timestamp: new Date().toISOString()
    });
});

// 404ハンドリング
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        timestamp: new Date().toISOString()
    });
});

// プッシュ通知のスケジュール実行（5分おき）
cron.schedule('*/5 * * * *', async () => {
    console.log('Running scheduled push notifications...');
    try {
        await schedulePushNotifications();
    } catch (error) {
        console.error('Scheduled push notification error:', error);
    }
});

// render.comスリープ対策（10分おき）
cron.schedule('*/10 * * * *', async () => {
    try {
        await keepAlive();
    } catch (error) {
        console.error('Keep alive error:', error);
    }
});

// サーバー起動
app.listen(PORT, () => {
    console.log(`Push Service running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Started at: ${new Date().toISOString()}`);
});

// プロセス終了時のクリーンアップ
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

module.exports = app;