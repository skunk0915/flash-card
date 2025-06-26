// メインアプリケーションクラス
class FlashCardApp {
    constructor() {
        this.isInitialized = false;
        this.currentPage = 'home';
        
        this.initializeApp();
    }
    
    async initializeApp() {
        try {
            // DOM読み込み完了を待つ
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            // アプリケーションの初期化
            await this.setup();
            
            // 初期ページを表示
            PageManager.showPage('home');
            
            this.isInitialized = true;
            console.log('FlashCard App initialized successfully');
            
        } catch (error) {
            console.error('App initialization error:', error);
            this.showInitializationError();
        }
    }
    
    async setup() {
        // 基本的なイベントリスナーを設定
        this.setupGlobalEventListeners();
        
        // プッシュ通知の初期化（可能であれば）
        this.initializePushNotifications();
        
        // Service Worker の登録（可能であれば）
        this.registerServiceWorker();
        
        // アプリケーションの状態を復元
        this.restoreAppState();
    }
    
    setupGlobalEventListeners() {
        // ナビゲーションボタン
        document.querySelectorAll('.nav-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const page = e.target.dataset.page;
                if (page) {
                    PageManager.showPage(page);
                }
            });
        });
        
        // アプリ全体のエラーハンドリング
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            Notification.error('予期しないエラーが発生しました');
        });
        
        // 未処理のPromise拒否をキャッチ
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            event.preventDefault();
        });
        
        // オフライン/オンライン状態の監視
        window.addEventListener('online', () => {
            Notification.success('インターネット接続が復旧しました');
        });
        
        window.addEventListener('offline', () => {
            Notification.warning('インターネット接続が失われました');
        });
        
        // ページ離脱前の確認（編集中の場合）
        window.addEventListener('beforeunload', (event) => {
            if (this.hasUnsavedChanges()) {
                const message = '未保存の変更があります。ページを離れますか？';
                event.preventDefault();
                event.returnValue = message;
                return message;
            }
        });
        
        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            this.handleGlobalKeyboardShortcuts(e);
        });
    }
    
    handleGlobalKeyboardShortcuts(event) {
        // Ctrl/Cmd + キー の組み合わせ
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 'h':
                    event.preventDefault();
                    PageManager.showPage('home');
                    break;
                case 'n':
                    event.preventDefault();
                    if (PageManager.currentPage === 'cards') {
                        CardManager.showAddCardModal();
                    }
                    break;
                case 'f':
                    event.preventDefault();
                    const searchInput = document.getElementById('search-input');
                    if (searchInput && PageManager.currentPage === 'cards') {
                        searchInput.focus();
                    }
                    break;
            }
        }
        
        // その他のショートカット
        switch (event.key) {
            case 'F1':
                event.preventDefault();
                this.showHelpModal();
                break;
        }
    }
    
    async initializePushNotifications() {
        // Service Workerとプッシュ通知のサポート確認
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.log('Push notifications not supported');
            return;
        }
        
        try {
            // 通知の許可状態を確認
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                console.log('Push notifications enabled');
                // ここで実際のプッシュ通知の設定を行う
                // render.comのプッシュサービスとの連携
            } else {
                console.log('Push notifications denied');
            }
        } catch (error) {
            console.error('Push notification initialization error:', error);
        }
    }
    
    async registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.log('Service Worker not supported');
            return;
        }
        
        try {
            // Service Workerファイルがある場合のみ登録
            // const registration = await navigator.serviceWorker.register('/sw.js');
            // console.log('Service Worker registered:', registration);
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }
    
    restoreAppState() {
        // 最後に表示していたページを復元（必要であれば）
        const lastPage = Utils.storage.get('last_page');
        if (lastPage && ['home', 'cards', 'stats'].includes(lastPage)) {
            // ホームページ以外は手動で切り替える必要があるため、
            // ここでは特に何もしない
        }
        
        // その他の状態復元
        this.restoreUserPreferences();
    }
    
    restoreUserPreferences() {
        const preferences = Utils.storage.get(CONFIG.STORAGE_KEYS.USER_PREFERENCES, {});
        
        // テーマ設定などがある場合はここで適用
        if (preferences.theme) {
            document.body.classList.add(`theme-${preferences.theme}`);
        }
    }
    
    hasUnsavedChanges() {
        // モーダルが開いていて、フォームに入力がある場合
        const modal = document.getElementById('card-modal');
        if (modal && !modal.classList.contains('hidden')) {
            const form = document.getElementById('card-form');
            if (form) {
                const formData = new FormData(form);
                for (let [key, value] of formData.entries()) {
                    if (value.trim() !== '') {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    showInitializationError() {
        document.body.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                padding: 2rem;
                text-align: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">
                <h1 style="color: #dc3545; margin-bottom: 1rem;">
                    アプリケーションの初期化に失敗しました
                </h1>
                <p style="color: #666; margin-bottom: 2rem;">
                    ページを再読み込みして、もう一度お試しください。<br>
                    問題が続く場合は、ブラウザのキャッシュをクリアしてください。
                </p>
                <button 
                    onclick="window.location.reload()" 
                    style="
                        padding: 0.75rem 1.5rem;
                        background-color: #007bff;
                        color: white;
                        border: none;
                        border-radius: 0.375rem;
                        cursor: pointer;
                        font-size: 1rem;
                    "
                >
                    ページを再読み込み
                </button>
            </div>
        `;
    }
    
    showHelpModal() {
        // ヘルプモーダルの内容
        const helpContent = `
            <div class="help-content">
                <h3>キーボードショートカット</h3>
                <ul>
                    <li><kbd>Ctrl/Cmd + H</kbd> - ホームページ</li>
                    <li><kbd>Ctrl/Cmd + N</kbd> - 新しいカード作成</li>
                    <li><kbd>Ctrl/Cmd + F</kbd> - 検索</li>
                    <li><kbd>Space/Enter</kbd> - カードをめくる（学習中）</li>
                    <li><kbd>←/→</kbd> - カード移動（学習中）</li>
                    <li><kbd>Esc</kbd> - モーダルを閉じる/学習終了</li>
                </ul>
                
                <h3>使い方</h3>
                <ol>
                    <li>「カード管理」で新しい単語カードを作成</li>
                    <li>オモテとウラにテキスト、画像、音声、YouTubeを追加</li>
                    <li>「ホーム」から学習を開始</li>
                    <li>カードをめくって答えを確認</li>
                    <li>難易度を選択して次回復習時間を設定</li>
                </ol>
            </div>
        `;
        
        // 簡易的なヘルプ表示
        alert('FlashCard App\n\nCtrl+H: ホーム\nCtrl+N: 新規カード\nCtrl+F: 検索\nSpace: カードをめくる\nEsc: 閉じる');
    }
    
    // アプリケーション終了時のクリーンアップ
    cleanup() {
        // 音声再生停止
        AudioPlayer.stop();
        
        // 状態保存
        Utils.storage.set('last_page', PageManager.currentPage);
        
        // その他のクリーンアップ処理
    }
}

// アプリケーションのメインエントリーポイント
const app = new FlashCardApp();

// ページ離脱時のクリーンアップ
window.addEventListener('beforeunload', () => {
    app.cleanup();
});