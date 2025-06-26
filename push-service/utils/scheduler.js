const webpush = require('web-push');
const { getDb } = require('./database');

// スケジュールされたプッシュ通知を実行
async function schedulePushNotifications() {
    try {
        const db = await getDb();
        
        // 送信時刻が来たスケジュール済み通知を取得
        const [notifications] = await db.execute(`
            SELECT sn.*, c.title as card_title, c.front_text, c.back_text
            FROM scheduled_notifications sn
            LEFT JOIN cards c ON sn.card_id = c.id
            WHERE sn.schedule_time <= NOW() 
            AND sn.sent = FALSE
            ORDER BY sn.schedule_time ASC
            LIMIT 50
        `);
        
        if (notifications.length === 0) {
            console.log('No notifications to send');
            return;
        }
        
        console.log(`Processing ${notifications.length} scheduled notifications`);
        
        // アクティブなサブスクリプションを取得
        const [subscriptions] = await db.execute(
            'SELECT * FROM push_subscriptions'
        );
        
        if (subscriptions.length === 0) {
            console.log('No active subscriptions');
            // 通知を送信済みとしてマーク（サブスクリプションがないため）
            const notificationIds = notifications.map(n => n.id);
            await db.execute(`
                UPDATE scheduled_notifications 
                SET sent = TRUE, sent_at = NOW() 
                WHERE id IN (${notificationIds.map(() => '?').join(',')})
            `, notificationIds);
            return;
        }
        
        // 各通知を処理
        for (const notification of notifications) {
            await processNotification(notification, subscriptions);
        }
        
    } catch (error) {
        console.error('Schedule push notifications error:', error);
    }
}

// 個別の通知を処理
async function processNotification(notification, subscriptions) {
    try {
        const db = await getDb();
        
        // 通知ペイロードを構築
        const payload = buildNotificationPayload(notification);
        
        // 全サブスクリプションに送信
        const sendPromises = subscriptions.map(subscription => 
            sendToSubscription(subscription, payload, notification.id)
        );
        
        const results = await Promise.allSettled(sendPromises);
        
        // 結果を集計
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        console.log(`Notification ${notification.id}: ${successful} sent, ${failed} failed`);
        
        // 通知を送信済みとしてマーク
        await db.execute(`
            UPDATE scheduled_notifications 
            SET sent = TRUE, sent_at = NOW() 
            WHERE id = ?
        `, [notification.id]);
        
        // 失敗したサブスクリプションを処理
        await cleanupFailedSubscriptions(results, subscriptions);
        
    } catch (error) {
        console.error(`Process notification ${notification.id} error:`, error);
    }
}

// 通知ペイロードを構築
function buildNotificationPayload(notification) {
    const data = JSON.parse(notification.data || '{}');
    
    return {
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/icon-192x192.png',
        badge: notification.badge || '/badge-72x72.png',
        data: {
            cardId: notification.card_id,
            notificationId: notification.id,
            url: `${process.env.MAIN_APP_URL || 'https://your-domain.com'}#study`,
            ...data
        },
        actions: [
            {
                action: 'study',
                title: '今すぐ学習',
                icon: '/icon-study.png'
            },
            {
                action: 'later',
                title: '後で',
                icon: '/icon-later.png'
            }
        ],
        requireInteraction: true,
        tag: `flashcard-${notification.card_id}`,
        renotify: true
    };
}

// 特定のサブスクリプションに送信
async function sendToSubscription(subscription, payload, notificationId) {
    const db = await getDb();
    
    try {
        const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
                p256dh: subscription.p256dh_key,
                auth: subscription.auth_key
            }
        };
        
        const options = {
            TTL: 24 * 60 * 60, // 24時間
            urgency: 'normal',
            vapidDetails: {
                subject: process.env.VAPID_EMAIL,
                publicKey: process.env.VAPID_PUBLIC_KEY,
                privateKey: process.env.VAPID_PRIVATE_KEY
            }
        };
        
        await webpush.sendNotification(
            pushSubscription, 
            JSON.stringify(payload), 
            options
        );
        
        // 成功ログを記録
        await db.execute(`
            INSERT INTO notification_logs 
            (subscription_id, notification_id, status, response_code) 
            VALUES (?, ?, 'success', 200)
        `, [subscription.id, notificationId]);
        
        return { success: true, subscriptionId: subscription.id };
        
    } catch (error) {
        console.error(`Send to subscription ${subscription.id} failed:`, error);
        
        // 失敗ログを記録
        await db.execute(`
            INSERT INTO notification_logs 
            (subscription_id, notification_id, status, response_code, error_message) 
            VALUES (?, ?, 'failed', ?, ?)
        `, [
            subscription.id, 
            notificationId, 
            error.statusCode || 0, 
            error.message || 'Unknown error'
        ]);
        
        throw { error, subscriptionId: subscription.id, statusCode: error.statusCode };
    }
}

// 失敗したサブスクリプションをクリーンアップ
async function cleanupFailedSubscriptions(results, subscriptions) {
    const db = await getDb();
    
    for (let i = 0; i < results.length; i++) {
        if (results[i].status === 'rejected') {
            const error = results[i].reason;
            const subscription = subscriptions[i];
            
            // 410 Gone または 404 Not Found の場合は無効なサブスクリプション
            if (error.statusCode === 410 || error.statusCode === 404) {
                console.log(`Removing invalid subscription ${subscription.id}`);
                await db.execute(
                    'DELETE FROM push_subscriptions WHERE id = ?',
                    [subscription.id]
                );
            }
        }
    }
}

// 学習カードに基づく通知を作成
async function createCardNotification(cardId, scheduleTime) {
    try {
        const db = await getDb();
        
        // カード情報を取得
        const [cards] = await db.execute(
            'SELECT * FROM cards WHERE id = ?',
            [cardId]
        );
        
        if (cards.length === 0) {
            throw new Error(`Card ${cardId} not found`);
        }
        
        const card = cards[0];
        
        // 通知内容を構築
        const notification = {
            title: '復習時間です！',
            body: `「${card.title}」の復習をしましょう`,
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            data: JSON.stringify({
                cardId: cardId,
                cardTitle: card.title,
                action: 'review'
            })
        };
        
        // スケジュールに追加
        await db.execute(`
            INSERT INTO scheduled_notifications 
            (card_id, schedule_time, title, body, icon, badge, data)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            cardId,
            scheduleTime,
            notification.title,
            notification.body,
            notification.icon,
            notification.badge,
            JSON.stringify(notification.data)
        ]);
        
        console.log(`Notification scheduled for card ${cardId} at ${scheduleTime}`);
        
    } catch (error) {
        console.error('Create card notification error:', error);
        throw error;
    }
}

// 古い通知をクリーンアップ
async function cleanupOldNotifications(daysOld = 30) {
    try {
        const db = await getDb();
        
        // 古い送信済み通知を削除
        const [result] = await db.execute(`
            DELETE FROM scheduled_notifications 
            WHERE sent = TRUE 
            AND sent_at < DATE_SUB(NOW(), INTERVAL ? DAY)
        `, [daysOld]);
        
        // 古いログを削除
        const [logResult] = await db.execute(`
            DELETE FROM notification_logs 
            WHERE sent_at < DATE_SUB(NOW(), INTERVAL ? DAY)
        `, [daysOld]);
        
        console.log(`Cleaned up ${result.affectedRows} old notifications and ${logResult.affectedRows} old logs`);
        
    } catch (error) {
        console.error('Cleanup old notifications error:', error);
    }
}

module.exports = {
    schedulePushNotifications,
    createCardNotification,
    cleanupOldNotifications,
    processNotification,
    buildNotificationPayload
};