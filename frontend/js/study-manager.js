// 学習管理クラス
class StudyManager {
    constructor() {
        this.currentCards = [];
        this.currentCardIndex = 0;
        this.currentCard = null;
        this.isFlipped = false;
        this.startViewMode = 'front';
        this.isStudyActive = false;
        
        this.initializeElements();
        this.setupEventListeners();
    }
    
    initializeElements() {
        this.flashCard = document.getElementById('flash-card');
        this.flipButton = document.getElementById('flip-card-btn');
        this.studyFeedback = document.getElementById('study-feedback');
        this.studyControls = document.getElementById('study-controls');
        this.currentCardIndexEl = document.getElementById('current-card-index');
        this.totalCardsEl = document.getElementById('total-cards-in-study');
        this.prevButton = document.getElementById('prev-card-btn');
        this.nextButton = document.getElementById('next-card-btn');
        this.backToHomeButton = document.getElementById('back-to-home-btn');
    }
    
    setupEventListeners() {
        // カードをめくる
        this.flipButton?.addEventListener('click', () => {
            this.flipCard();
        });
        
        // フラッシュカード直接クリックでもめくる
        this.flashCard?.addEventListener('click', () => {
            if (!this.isFlipped) {
                this.flipCard();
            }
        });
        
        // 難易度ボタン
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-correct]')) {
                const isCorrect = e.target.dataset.correct === 'true';
                const difficulty = e.target.dataset.difficulty;
                this.recordReview(isCorrect, difficulty);
            }
        });
        
        // スケジュールボタン
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-schedule]')) {
                const scheduleType = e.target.dataset.schedule;
                const value = e.target.dataset.value;
                this.setSchedule(scheduleType, value);
            }
        });
        
        // カスタムスケジュール
        document.getElementById('custom-hours-btn')?.addEventListener('click', () => {
            const hours = document.getElementById('custom-hours').value;
            if (hours) {
                this.setSchedule('hours', parseInt(hours));
            }
        });
        
        document.getElementById('custom-time-btn')?.addEventListener('click', () => {
            const time = document.getElementById('custom-time').value;
            if (time) {
                this.setSchedule('time', parseInt(time));
            }
        });
        
        // ナビゲーション
        this.prevButton?.addEventListener('click', () => {
            this.showPreviousCard();
        });
        
        this.nextButton?.addEventListener('click', () => {
            this.showNextCard();
        });
        
        // ホームに戻る
        this.backToHomeButton?.addEventListener('click', () => {
            this.endStudy();
        });
        
        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            if (!this.isStudyActive) return;
            
            switch (e.key) {
                case ' ':
                case 'Enter':
                    e.preventDefault();
                    if (!this.isFlipped) {
                        this.flipCard();
                    }
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.showPreviousCard();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    if (this.isFlipped) {
                        this.showNextCard();
                    }
                    break;
                case 'Escape':
                    this.endStudy();
                    break;
            }
        });
    }
    
    async initialize() {
        // 学習キューが空の場合の処理は HomeManager で行う
    }
    
    async startStudy(cards = null) {
        try {
            // 学習カードを取得
            if (!cards) {
                const response = await ApiHelpers.loadLearningQueue();
                this.currentCards = response.data || [];
            } else {
                this.currentCards = Array.isArray(cards) ? cards : [cards];
            }
            
            if (this.currentCards.length === 0) {
                this.showEmptyState();
                return;
            }
            
            // 表示モードを設定
            this.startViewMode = Utils.storage.get(CONFIG.STORAGE_KEYS.VIEW_MODE, CONFIG.DEFAULTS.VIEW_MODE);
            
            // 学習開始
            this.currentCardIndex = 0;
            this.isStudyActive = true;
            
            // ページ表示
            PageManager.showPage('study');
            
            // 最初のカードを表示
            this.showCurrentCard();
            
            Notification.success('学習を開始しました');
            
        } catch (error) {
            console.error('Study start error:', error);
            Notification.error('学習の開始に失敗しました');
        }
    }
    
    async startStudyWithCard(cardId) {
        try {
            const response = await ApiHelpers.loadCard(cardId);
            const card = response.data;
            
            if (card) {
                await this.startStudy([card]);
            } else {
                Notification.error('カードが見つかりません');
            }
        } catch (error) {
            console.error('Study with card error:', error);
            Notification.error('学習の開始に失敗しました');
        }
    }
    
    showCurrentCard() {
        if (this.currentCardIndex < 0 || this.currentCardIndex >= this.currentCards.length) {
            return;
        }
        
        this.currentCard = this.currentCards[this.currentCardIndex];
        this.isFlipped = false;
        
        // カードをレンダリング
        CardRenderer.renderFlashCard(this.currentCard, this.startViewMode);
        
        // UI更新
        this.updateUI();
        this.resetCardState();
    }
    
    flipCard() {
        if (!this.currentCard || this.isFlipped) return;
        
        this.isFlipped = true;
        
        // カードを裏返す
        const targetSide = this.startViewMode === 'front' ? 'back' : 'front';
        CardRenderer.renderFlashCard(this.currentCard, targetSide);
        
        // UIを更新
        this.updateUI();
    }
    
    async recordReview(isCorrect, difficulty) {
        if (!this.currentCard) return;
        
        try {
            await ApiHelpers.recordReview(this.currentCard.id, isCorrect, difficulty);
            
            // 次のカードまたは終了
            if (this.currentCardIndex < this.currentCards.length - 1) {
                this.showNextCard();
            } else {
                this.completeStudy();
            }
            
        } catch (error) {
            console.error('Record review error:', error);
            Notification.error('復習結果の記録に失敗しました');
        }
    }
    
    async setSchedule(scheduleType, value = null) {
        if (!this.currentCard) return;
        
        try {
            const customValue = value ? parseInt(value) : null;
            await ApiHelpers.setCustomSchedule(this.currentCard.id, scheduleType, customValue);
            
            Notification.success('スケジュールが設定されました');
            
            // 次のカードまたは終了
            if (this.currentCardIndex < this.currentCards.length - 1) {
                this.showNextCard();
            } else {
                this.completeStudy();
            }
            
        } catch (error) {
            console.error('Set schedule error:', error);
            Notification.error('スケジュールの設定に失敗しました');
        }
    }
    
    showNextCard() {
        if (this.currentCardIndex < this.currentCards.length - 1) {
            this.currentCardIndex++;
            this.showCurrentCard();
        }
    }
    
    showPreviousCard() {
        if (this.currentCardIndex > 0) {
            this.currentCardIndex--;
            this.showCurrentCard();
        }
    }
    
    updateUI() {
        // 進捗表示
        if (this.currentCardIndexEl && this.totalCardsEl) {
            this.currentCardIndexEl.textContent = this.currentCardIndex + 1;
            this.totalCardsEl.textContent = this.currentCards.length;
        }
        
        // ボタン状態
        if (this.prevButton) {
            this.prevButton.disabled = this.currentCardIndex === 0;
        }
        
        if (this.nextButton) {
            this.nextButton.disabled = this.currentCardIndex >= this.currentCards.length - 1;
        }
        
        // フリップボタンとフィードバック表示
        if (this.isFlipped) {
            DOMHelper.hide(this.studyControls);
            DOMHelper.show(this.studyFeedback);
            
            if (this.flipButton) {
                this.flipButton.textContent = 'カードがめくられました';
                this.flipButton.disabled = true;
            }
        } else {
            DOMHelper.show(this.studyControls);
            DOMHelper.hide(this.studyFeedback);
            
            if (this.flipButton) {
                this.flipButton.textContent = 'カードをめくる';
                this.flipButton.disabled = false;
            }
        }
    }
    
    resetCardState() {
        // カスタム入力フィールドをクリア
        const customHours = document.getElementById('custom-hours');
        const customTime = document.getElementById('custom-time');
        
        if (customHours) customHours.value = '';
        if (customTime) customTime.value = '';
        
        // フィードバック非表示
        DOMHelper.hide(this.studyFeedback);
        DOMHelper.show(this.studyControls);
    }
    
    completeStudy() {
        const completedCount = this.currentCards.length;
        
        Notification.success(`学習完了！ ${completedCount}枚のカードを復習しました`);
        
        // 完了画面を表示してからホームに戻る
        setTimeout(() => {
            this.endStudy();
        }, 2000);
    }
    
    endStudy() {
        this.isStudyActive = false;
        this.currentCards = [];
        this.currentCardIndex = 0;
        this.currentCard = null;
        this.isFlipped = false;
        
        // ホームページに戻る
        PageManager.showPage('home');
    }
    
    showEmptyState() {
        const studyPage = document.getElementById('study-page');
        const studyContent = studyPage.querySelector('.study');
        
        DOMHelper.removeAllChildren(studyContent);
        
        const emptyState = document.createElement('div');
        emptyState.className = 'study__empty';
        emptyState.innerHTML = `
            <div class="study__empty-icon">🎉</div>
            <h2 class="study__empty-title">学習完了！</h2>
            <p class="study__empty-message">現在復習が必要なカードはありません。</p>
            <button class="btn btn--primary" onclick="PageManager.showPage('home')">
                ホームに戻る
            </button>
        `;
        
        studyContent.appendChild(emptyState);
        PageManager.showPage('study');
    }
}

// グローバルインスタンス
const StudyManager = new StudyManager();