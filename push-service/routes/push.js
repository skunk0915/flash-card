const express = require('express');
const webpush = require('web-push');
const { getDb } = require('../utils/database');
const { validateSubscription, validateNotification } = require('../utils/validation');

const router = express.Router();

// VAPID設定
webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

// プッシュ通知登録
router.post('/subscribe', async (req, res) => {
    try {
        const subscription = req.body;
        
        // バリデーション
        const validationError = validateSubscription(subscription);
        if (validationError) {
            return res.status(400).json({
                success: false,
                error: validationError
            });
        }
        
        const db = await getDb();
        
        // 既存の登録を確認
        const [existing] = await db.execute(
            'SELECT id FROM push_subscriptions WHERE endpoint = ?',
            [subscription.endpoint]
        );
        
        if (existing.length > 0) {
            // 既存の登録を更新
            await db.execute(
                `UPDATE push_subscriptions 
                 SET p256dh_key = ?, auth_key = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE endpoint = ?`,
                [
                    subscription.keys.p256dh,
                    subscription.keys.auth,
                    subscription.endpoint
                ]
            );
        } else {
            // 新規登録
            await db.execute(
                `INSERT INTO push_subscriptions (endpoint, p256dh_key, auth_key)
                 VALUES (?, ?, ?)`,
                [
                    subscription.endpoint,
                    subscription.keys.p256dh,
                    subscription.keys.auth
                ]
            );
        }
        
        res.json({
            success: true,
            message: 'プッシュ通知が登録されました'
        });
        
    } catch (error) {
        console.error('Subscribe error:', error);
        res.status(500).json({
            success: false,
            error: 'プッシュ通知の登録に失敗しました'
        });
    }
});

// プッシュ通知登録解除
router.post('/unsubscribe', async (req, res) => {
    try {
        const { endpoint } = req.body;
        
        if (!endpoint) {
            return res.status(400).json({
                success: false,
                error: 'エンドポイントが必要です'
            });
        }
        
        const db = await getDb();
        
        await db.execute(
            'DELETE FROM push_subscriptions WHERE endpoint = ?',
            [endpoint]
        );
        
        res.json({
            success: true,
            message: 'プッシュ通知が解除されました'
        });
        
    } catch (error) {
        console.error('Unsubscribe error:', error);
        res.status(500).json({
            success: false,
            error: 'プッシュ通知の解除に失敗しました'
        });
    }
});

// 即座にプッシュ通知送信
router.post('/send', async (req, res) => {
    try {
        const notification = req.body;
        
        // バリデーション
        const validationError = validateNotification(notification);
        if (validationError) {
            return res.status(400).json({
                success: false,
                error: validationError
            });
        }
        
        const db = await getDb();
        
        // アクティブなサブスクリプションを取得
        const [subscriptions] = await db.execute(
            'SELECT * FROM push_subscriptions ORDER BY created_at DESC'
        );
        
        if (subscriptions.length === 0) {
            return res.json({
                success: true,
                message: '送信対象のサブスクリプションがありません',
                sent: 0
            });
        }
        
        // 通知を送信
        const results = await Promise.allSettled(
            subscriptions.map(sub => sendPushNotification(sub, notification))
        );
        
        // 結果を集計
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        // 失敗したサブスクリプションを削除
        for (let i = 0; i < results.length; i++) {
            if (results[i].status === 'rejected') {
                const error = results[i].reason;
                if (error.statusCode === 410) {
                    // Gone - サブスクリプションが無効
                    await db.execute(
                        'DELETE FROM push_subscriptions WHERE id = ?',
                        [subscriptions[i].id]
                    );
                }
            }
        }
        
        res.json({
            success: true,
            message: `通知を送信しました`,
            sent: successful,
            failed: failed,
            total: subscriptions.length
        });
        
    } catch (error) {
        console.error('Send notification error:', error);
        res.status(500).json({
            success: false,
            error: '通知の送信に失敗しました'
        });
    }
});

// プッシュ通知スケジュール
router.post('/schedule', async (req, res) => {
    try {
        const { cardId, scheduleTime, notification } = req.body;
        
        if (!cardId || !scheduleTime || !notification) {
            return res.status(400).json({
                success: false,
                error: '必要なパラメータが不足しています'
            });
        }
        
        // バリデーション
        const validationError = validateNotification(notification);
        if (validationError) {
            return res.status(400).json({
                success: false,
                error: validationError
            });
        }
        
        const db = await getDb();
        
        // スケジュールされた通知を保存
        await db.execute(
            `INSERT INTO scheduled_notifications 
             (card_id, schedule_time, title, body, icon, badge, data)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                cardId,
                scheduleTime,
                notification.title,
                notification.body,
                notification.icon || '/icon-192x192.png',
                notification.badge || '/badge-72x72.png',
                JSON.stringify(notification.data || {})
            ]
        );
        
        res.json({
            success: true,
            message: '通知がスケジュールされました'
        });
        
    } catch (error) {
        console.error('Schedule notification error:', error);
        res.status(500).json({
            success: false,
            error: '通知のスケジュールに失敗しました'
        });
    }
});

// サブスクリプション一覧
router.get('/subscriptions', async (req, res) => {
    try {
        const db = await getDb();
        
        const [subscriptions] = await db.execute(
            `SELECT id, endpoint, created_at, 
                    SUBSTRING(endpoint, 1, 50) as endpoint_preview
             FROM push_subscriptions 
             ORDER BY created_at DESC`
        );
        
        res.json({
            success: true,
            data: subscriptions,
            total: subscriptions.length
        });
        
    } catch (error) {
        console.error('Get subscriptions error:', error);
        res.status(500).json({
            success: false,
            error: 'サブスクリプションの取得に失敗しました'
        });
    }
});

// プッシュ通知送信関数
async function sendPushNotification(subscription, notification) {
    const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
            p256dh: subscription.p256dh_key,
            auth: subscription.auth_key
        }
    };
    
    const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/icon-192x192.png',
        badge: notification.badge || '/badge-72x72.png',
        data: notification.data || {},
        actions: notification.actions || [],
        requireInteraction: notification.requireInteraction || false,
        tag: notification.tag || 'flashcard-notification'
    });
    
    const options = {
        TTL: 24 * 60 * 60, // 24時間
        urgency: 'normal',
        vapidDetails: {
            subject: process.env.VAPID_EMAIL,
            publicKey: process.env.VAPID_PUBLIC_KEY,
            privateKey: process.env.VAPID_PRIVATE_KEY
        }
    };
    
    return webpush.sendNotification(pushSubscription, payload, options);
}

module.exports = router;