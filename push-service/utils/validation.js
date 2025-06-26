// バリデーション関数

// プッシュサブスクリプションのバリデーション
function validateSubscription(subscription) {
    if (!subscription) {
        return 'サブスクリプションデータが必要です';
    }
    
    if (!subscription.endpoint) {
        return 'エンドポイントが必要です';
    }
    
    if (!subscription.keys) {
        return 'キーが必要です';
    }
    
    if (!subscription.keys.p256dh) {
        return 'p256dhキーが必要です';
    }
    
    if (!subscription.keys.auth) {
        return 'authキーが必要です';
    }
    
    // エンドポイントURLの基本的な検証
    try {
        new URL(subscription.endpoint);
    } catch (error) {
        return '無効なエンドポイントURLです';
    }
    
    return null; // バリデーション成功
}

// プッシュ通知のバリデーション
function validateNotification(notification) {
    if (!notification) {
        return '通知データが必要です';
    }
    
    if (!notification.title) {
        return 'タイトルが必要です';
    }
    
    if (notification.title.length > 100) {
        return 'タイトルは100文字以内である必要があります';
    }
    
    if (!notification.body) {
        return '本文が必要です';
    }
    
    if (notification.body.length > 300) {
        return '本文は300文字以内である必要があります';
    }
    
    // アイコンURLの検証（存在する場合）
    if (notification.icon) {
        try {
            new URL(notification.icon, 'https://example.com');
        } catch (error) {
            return '無効なアイコンURLです';
        }
    }
    
    // バッジURLの検証（存在する場合）
    if (notification.badge) {
        try {
            new URL(notification.badge, 'https://example.com');
        } catch (error) {
            return '無効なバッジURLです';
        }
    }
    
    // アクションの検証（存在する場合）
    if (notification.actions) {
        if (!Array.isArray(notification.actions)) {
            return 'アクションは配列である必要があります';
        }
        
        if (notification.actions.length > 3) {
            return 'アクションは3個以下である必要があります';
        }
        
        for (const action of notification.actions) {
            if (!action.action || !action.title) {
                return 'アクションには action と title が必要です';
            }
            
            if (action.title.length > 50) {
                return 'アクションのタイトルは50文字以内である必要があります';
            }
        }
    }
    
    return null; // バリデーション成功
}

// 日時のバリデーション
function validateDateTime(dateString) {
    if (!dateString) {
        return '日時が必要です';
    }
    
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
        return '無効な日時形式です';
    }
    
    // 過去の日時は許可しない
    if (date <= new Date()) {
        return '未来の日時を指定してください';
    }
    
    // あまりに遠い未来（1年以上先）は許可しない
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    
    if (date > oneYearFromNow) {
        return '1年以内の日時を指定してください';
    }
    
    return null; // バリデーション成功
}

// カードIDのバリデーション
function validateCardId(cardId) {
    if (!cardId) {
        return 'カードIDが必要です';
    }
    
    const id = parseInt(cardId, 10);
    
    if (isNaN(id) || id <= 0) {
        return '有効なカードIDを指定してください';
    }
    
    return null; // バリデーション成功
}

// 環境変数のバリデーション
function validateEnvironment() {
    const required = [
        'VAPID_PUBLIC_KEY',
        'VAPID_PRIVATE_KEY',
        'VAPID_EMAIL',
        'DB_HOST',
        'DB_NAME',
        'DB_USER',
        'DB_PASS'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    // VAPIDメールアドレスの形式チェック
    const emailRegex = /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(process.env.VAPID_EMAIL)) {
        throw new Error('VAPID_EMAIL must be in format "mailto:your-email@domain.com"');
    }
}

// リクエストレート制限の検証
const rateLimitMap = new Map();

function validateRateLimit(identifier, maxRequests = 100, windowMs = 60000) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!rateLimitMap.has(identifier)) {
        rateLimitMap.set(identifier, []);
    }
    
    const requests = rateLimitMap.get(identifier);
    
    // 古いリクエストを削除
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);
    rateLimitMap.set(identifier, recentRequests);
    
    if (recentRequests.length >= maxRequests) {
        return 'レート制限に達しました。しばらく待ってから再試行してください。';
    }
    
    // 新しいリクエストを記録
    recentRequests.push(now);
    
    return null; // バリデーション成功
}

module.exports = {
    validateSubscription,
    validateNotification,
    validateDateTime,
    validateCardId,
    validateEnvironment,
    validateRateLimit
};