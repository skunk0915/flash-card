// アプリケーション設定
const CONFIG = {
    // API設定
    API_BASE_URL: './backend/api',
    
    // エンドポイント
    ENDPOINTS: {
        CARDS: '/cards.php',
        LEARNING: '/learning.php',
        UPLOAD: '/upload.php'
    },
    
    // ファイルアップロード設定
    UPLOAD: {
        MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
        ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
        ALLOWED_AUDIO_TYPES: ['audio/mp3', 'audio/wav', 'audio/ogg']
    },
    
    // YouTube設定
    YOUTUBE: {
        API_KEY: '', // 必要に応じて設定
        EMBED_BASE_URL: 'https://www.youtube.com/embed/'
    },
    
    // UI設定
    UI: {
        ANIMATION_DURATION: 300,
        FLIP_DURATION: 600,
        NOTIFICATION_DURATION: 3000,
        CARDS_PER_PAGE: 20
    },
    
    // 学習設定
    LEARNING: {
        DEFAULT_DIFFICULTY: 'medium',
        AUTO_FLIP_ENABLED: false,
        SHOW_PROGRESS: true
    },
    
    // ローカルストレージキー
    STORAGE_KEYS: {
        VIEW_MODE: 'flashcard_view_mode',
        USER_PREFERENCES: 'flashcard_preferences',
        CURRENT_STUDY_SESSION: 'flashcard_current_session'
    },
    
    // デフォルト設定
    DEFAULTS: {
        VIEW_MODE: 'front',
        CARDS_SORT: 'created_desc'
    }
};

// ユーティリティ関数
const Utils = {
    // YouTubeのIDを抽出
    extractYouTubeId(url) {
        if (!url) return null;
        
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /youtube\.com\/watch\?.*v=([^&\n?#]+)/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        return null;
    },
    
    // YouTubeの埋め込みURLを生成
    getYouTubeEmbedUrl(url) {
        const videoId = this.extractYouTubeId(url);
        return videoId ? `${CONFIG.YOUTUBE.EMBED_BASE_URL}${videoId}` : null;
    },
    
    // ファイルサイズを人間が読める形式に変換
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    // 日時を相対的な表現に変換
    formatRelativeTime(date) {
        const now = new Date();
        const target = new Date(date);
        const diffMs = target.getTime() - now.getTime();
        const diffMinutes = Math.round(diffMs / (1000 * 60));
        const diffHours = Math.round(diffMs / (1000 * 60 * 60));
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffMs < 0) {
            const absDiffMinutes = Math.abs(diffMinutes);
            const absDiffHours = Math.abs(diffHours);
            const absDiffDays = Math.abs(diffDays);
            
            if (absDiffMinutes < 60) {
                return `${absDiffMinutes}分前`;
            } else if (absDiffHours < 24) {
                return `${absDiffHours}時間前`;
            } else {
                return `${absDiffDays}日前`;
            }
        } else {
            if (diffMinutes < 60) {
                return diffMinutes === 0 ? '今すぐ' : `${diffMinutes}分後`;
            } else if (diffHours < 24) {
                return `${diffHours}時間後`;
            } else {
                return `${diffDays}日後`;
            }
        }
    },
    
    // 日時をフォーマット
    formatDateTime(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        
        return `${year}/${month}/${day} ${hours}:${minutes}`;
    },
    
    // テキストを安全にHTMLエスケープ
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // テキストを切り詰め
    truncateText(text, maxLength = 100) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },
    
    // ランダムな文字列を生成
    generateRandomId(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },
    
    // ローカルストレージ操作
    storage: {
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.error('LocalStorage set error:', e);
                return false;
            }
        },
        
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.error('LocalStorage get error:', e);
                return defaultValue;
            }
        },
        
        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                console.error('LocalStorage remove error:', e);
                return false;
            }
        }
    },
    
    // デバウンス関数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // スロットル関数
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};