const axios = require('axios');

// render.com のスリープ対策用 Keep Alive 機能
async function keepAlive() {
    const keepAliveUrl = process.env.KEEP_ALIVE_URL;
    
    if (!keepAliveUrl) {
        console.log('KEEP_ALIVE_URL not configured, skipping keep alive');
        return;
    }
    
    try {
        const response = await axios.get(keepAliveUrl, {
            timeout: 10000,
            headers: {
                'User-Agent': 'FlashCard-KeepAlive/1.0'
            }
        });
        
        console.log(`Keep alive successful: ${response.status} - ${new Date().toISOString()}`);
        return true;
        
    } catch (error) {
        console.error('Keep alive failed:', error.message);
        
        // 自分自身にもpingを送る（バックアップ）
        try {
            const selfPing = await axios.get(`http://localhost:${process.env.PORT || 3000}/api/health/ping`, {
                timeout: 5000
            });
            console.log('Self ping successful as backup');
        } catch (selfError) {
            console.error('Self ping also failed:', selfError.message);
        }
        
        return false;
    }
}

// 外部APIからのヘルスチェック要求を処理
async function handleExternalHealthCheck() {
    try {
        // 基本的なシステムチェック
        const checks = {
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            pid: process.pid
        };
        
        // データベース接続チェック
        try {
            const { getDb } = require('./database');
            const db = await getDb();
            await db.execute('SELECT 1');
            checks.database = 'healthy';
        } catch (dbError) {
            checks.database = 'unhealthy';
            checks.dbError = dbError.message;
        }
        
        // 環境変数チェック
        const requiredEnvVars = ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_EMAIL'];
        const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missingEnvVars.length > 0) {
            checks.environment = 'incomplete';
            checks.missingEnvVars = missingEnvVars;
        } else {
            checks.environment = 'healthy';
        }
        
        // 全体的な健康状態を判定
        const isHealthy = checks.database === 'healthy' && checks.environment === 'healthy';
        checks.status = isHealthy ? 'healthy' : 'unhealthy';
        
        return checks;
        
    } catch (error) {
        console.error('Health check error:', error);
        return {
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// render.com 用の詳細ログ
function logRenderInfo() {
    const renderInfo = {
        service: process.env.RENDER_SERVICE_NAME || 'unknown',
        region: process.env.RENDER_REGION || 'unknown',
        instanceId: process.env.RENDER_INSTANCE_ID || 'unknown',
        serviceVersion: process.env.RENDER_SERVICE_VERSION || 'unknown',
        gitCommit: process.env.RENDER_GIT_COMMIT || 'unknown',
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        startTime: new Date().toISOString()
    };
    
    console.log('Render.com Service Info:', JSON.stringify(renderInfo, null, 2));
    return renderInfo;
}

// アプリケーション起動時の初期化
function initializeKeepAlive() {
    // Render.com の情報をログ出力
    logRenderInfo();
    
    // プロセス監視の設定
    process.on('SIGTERM', () => {
        console.log('SIGTERM received - shutting down gracefully');
        process.exit(0);
    });
    
    process.on('SIGINT', () => {
        console.log('SIGINT received - shutting down gracefully');
        process.exit(0);
    });
    
    // メモリ使用量の監視
    setInterval(() => {
        const memUsage = process.memoryUsage();
        const memUsageMB = {
            rss: Math.round(memUsage.rss / 1024 / 1024),
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
            external: Math.round(memUsage.external / 1024 / 1024)
        };
        
        // メモリ使用量が高い場合は警告
        if (memUsageMB.heapUsed > 100) {
            console.warn('High memory usage detected:', memUsageMB);
        }
        
        // 非常に高い場合は詳細ログ
        if (memUsageMB.heapUsed > 200) {
            console.error('Critical memory usage!', {
                memory: memUsageMB,
                uptime: process.uptime(),
                timestamp: new Date().toISOString()
            });
        }
    }, 5 * 60 * 1000); // 5分ごと
    
    console.log('Keep alive system initialized');
}

// render.com の無料プランの制限への対応
function handleRenderLimitations() {
    // CPUとメモリの制限に対する対応
    const limitations = {
        maxMemoryMB: 512,
        maxCpuPercent: 100,
        sleepAfterInactivity: 15 * 60 * 1000, // 15分
        maxRequestsPerMinute: 100
    };
    
    // リクエスト数の監視
    let requestCount = 0;
    let requestWindow = Date.now();
    
    const originalListen = require('http').Server.prototype.listen;
    
    // リクエスト監視のミドルウェア的な処理
    process.on('beforeExit', () => {
        const now = Date.now();
        if (now - requestWindow > 60000) {
            console.log(`Requests in last window: ${requestCount}`);
            requestCount = 0;
            requestWindow = now;
        }
    });
    
    return limitations;
}

module.exports = {
    keepAlive,
    handleExternalHealthCheck,
    logRenderInfo,
    initializeKeepAlive,
    handleRenderLimitations
};