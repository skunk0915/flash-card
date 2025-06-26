// ユーティリティクラス集

// ローディング表示管理
class Loading {
    static show() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.remove('hidden');
        }
    }
    
    static hide() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.add('hidden');
        }
    }
}

// 通知表示管理
class Notification {
    static show(message, type = 'info', duration = CONFIG.UI.NOTIFICATION_DURATION) {
        const notification = document.getElementById('notification');
        const messageEl = notification.querySelector('.notification__message');
        const closeBtn = notification.querySelector('.notification__close');
        
        if (!notification || !messageEl) return;
        
        // メッセージを設定
        messageEl.textContent = message;
        
        // タイプに応じてスタイル設定
        notification.className = `notification notification--${type}`;
        
        // 表示
        notification.classList.remove('hidden');
        notification.classList.add('notification--active');
        
        // 閉じるボタンのイベント
        const closeHandler = () => {
            this.hide();
            closeBtn.removeEventListener('click', closeHandler);
        };
        closeBtn.addEventListener('click', closeHandler);
        
        // 自動非表示
        if (duration > 0) {
            setTimeout(() => {
                this.hide();
            }, duration);
        }
    }
    
    static hide() {
        const notification = document.getElementById('notification');
        if (notification) {
            notification.classList.remove('notification--active');
            setTimeout(() => {
                notification.classList.add('hidden');
            }, CONFIG.UI.ANIMATION_DURATION);
        }
    }
    
    static success(message, duration) {
        this.show(message, 'success', duration);
    }
    
    static error(message, duration) {
        this.show(message, 'error', duration);
    }
    
    static warning(message, duration) {
        this.show(message, 'warning', duration);
    }
}

// モーダル管理
class Modal {
    static show(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('modal--active');
            
            // ESCキーで閉じる
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    this.hide(modalId);
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
            
            // 背景クリックで閉じる
            const clickHandler = (e) => {
                if (e.target === modal) {
                    this.hide(modalId);
                }
            };
            modal.addEventListener('click', clickHandler);
            
            // フォーカス管理
            const firstInput = modal.querySelector('input, textarea, button');
            if (firstInput) {
                firstInput.focus();
            }
        }
    }
    
    static hide(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('modal--active');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, CONFIG.UI.ANIMATION_DURATION);
        }
    }
}

// ページ管理
class PageManager {
    static currentPage = 'home';
    
    static showPage(pageId) {
        // 全ページを非表示
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('page--active');
        });
        
        // 指定ページを表示
        const targetPage = document.getElementById(`${pageId}-page`);
        if (targetPage) {
            targetPage.classList.add('page--active');
            this.currentPage = pageId;
        }
        
        // ナビゲーションボタンの状態更新
        document.querySelectorAll('.nav-button').forEach(btn => {
            btn.classList.remove('nav-button--active');
            if (btn.dataset.page === pageId) {
                btn.classList.add('nav-button--active');
            }
        });
        
        // ページ固有の初期化処理
        this.initializePage(pageId);
    }
    
    static initializePage(pageId) {
        switch (pageId) {
            case 'home':
                HomeManager.initialize();
                break;
            case 'cards':
                CardManager.initialize();
                break;
            case 'stats':
                StatsManager.initialize();
                break;
            case 'study':
                StudyManager.initialize();
                break;
        }
    }
}

// 画像拡大表示
class ImageViewer {
    static show(imageSrc, altText = '') {
        // 既存のモーダルがあれば削除
        const existingModal = document.getElementById('image-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // モーダルを作成
        const modal = document.createElement('div');
        modal.id = 'image-modal';
        modal.className = 'image-modal';
        modal.innerHTML = `
            <div class="image-modal__content">
                <img src="${imageSrc}" alt="${altText}" class="image-modal__image">
                <button class="image-modal__close">&times;</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 表示
        setTimeout(() => {
            modal.classList.add('image-modal--active');
        }, 10);
        
        // 閉じるイベント
        const closeBtn = modal.querySelector('.image-modal__close');
        const closeHandler = () => {
            this.hide();
        };
        
        closeBtn.addEventListener('click', closeHandler);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeHandler();
            }
        });
        
        // ESCキーで閉じる
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeHandler();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }
    
    static hide() {
        const modal = document.getElementById('image-modal');
        if (modal) {
            modal.classList.remove('image-modal--active');
            setTimeout(() => {
                modal.remove();
            }, CONFIG.UI.ANIMATION_DURATION);
        }
    }
}

// 音声プレーヤー管理
class AudioPlayer {
    static currentAudio = null;
    
    static play(audioSrc) {
        // 既存の音声を停止
        this.stop();
        
        // 新しい音声を再生
        this.currentAudio = new Audio(audioSrc);
        this.currentAudio.play().catch(error => {
            console.error('Audio play error:', error);
            Notification.error('音声の再生に失敗しました');
        });
        
        // 再生終了時の処理
        this.currentAudio.addEventListener('ended', () => {
            this.currentAudio = null;
        });
    }
    
    static stop() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
    }
    
    static pause() {
        if (this.currentAudio && !this.currentAudio.paused) {
            this.currentAudio.pause();
        }
    }
    
    static resume() {
        if (this.currentAudio && this.currentAudio.paused) {
            this.currentAudio.play().catch(error => {
                console.error('Audio resume error:', error);
            });
        }
    }
}

// バリデーション関数
class Validator {
    static isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
    
    static isValidYouTubeUrl(url) {
        return Utils.extractYouTubeId(url) !== null;
    }
    
    static validateCardData(data) {
        const errors = {};
        
        if (!data.title || data.title.trim() === '') {
            errors.title = 'タイトルは必須です';
        } else if (data.title.length > 255) {
            errors.title = 'タイトルは255文字以内で入力してください';
        }
        
        if (data.front_text && data.front_text.length > 2000) {
            errors.front_text = 'オモテのテキストは2000文字以内で入力してください';
        }
        
        if (data.back_text && data.back_text.length > 2000) {
            errors.back_text = 'ウラのテキストは2000文字以内で入力してください';
        }
        
        if (data.front_youtube_url && !this.isValidYouTubeUrl(data.front_youtube_url)) {
            errors.front_youtube_url = '有効なYouTube URLを入力してください';
        }
        
        if (data.back_youtube_url && !this.isValidYouTubeUrl(data.back_youtube_url)) {
            errors.back_youtube_url = '有効なYouTube URLを入力してください';
        }
        
        return errors;
    }
    
    static validateFileSize(file, maxSize = CONFIG.UPLOAD.MAX_FILE_SIZE) {
        return file.size <= maxSize;
    }
    
    static validateFileType(file, allowedTypes) {
        return allowedTypes.includes(file.type);
    }
}

// DOM操作ヘルパー
class DOMHelper {
    static createElement(tag, className = '', innerHTML = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (innerHTML) element.innerHTML = innerHTML;
        return element;
    }
    
    static removeAllChildren(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }
    
    static show(element) {
        if (element) {
            element.classList.remove('hidden');
        }
    }
    
    static hide(element) {
        if (element) {
            element.classList.add('hidden');
        }
    }
    
    static toggle(element) {
        if (element) {
            element.classList.toggle('hidden');
        }
    }
    
    static fadeIn(element, duration = CONFIG.UI.ANIMATION_DURATION) {
        if (!element) return;
        
        element.style.opacity = '0';
        element.classList.remove('hidden');
        
        const start = performance.now();
        const animate = (timestamp) => {
            const elapsed = timestamp - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.opacity = progress.toString();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    static fadeOut(element, duration = CONFIG.UI.ANIMATION_DURATION) {
        if (!element) return;
        
        const start = performance.now();
        const startOpacity = parseFloat(getComputedStyle(element).opacity);
        
        const animate = (timestamp) => {
            const elapsed = timestamp - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.opacity = (startOpacity * (1 - progress)).toString();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.classList.add('hidden');
                element.style.opacity = '';
            }
        };
        
        requestAnimationFrame(animate);
    }
}