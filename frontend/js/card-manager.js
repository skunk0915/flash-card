// カード管理クラス
class CardManager {
    constructor() {
        this.cards = [];
        this.isEditMode = false;
        this.editingCardId = null;
        this.searchTimeout = null;
        
        this.initializeElements();
        this.setupEventListeners();
    }
    
    initializeElements() {
        this.cardsList = document.getElementById('all-cards-list');
        this.searchInput = document.getElementById('search-input');
        this.addCardButton = document.getElementById('add-card-btn');
        this.cardModal = document.getElementById('card-modal');
        this.cardForm = document.getElementById('card-form');
        this.modalTitle = document.getElementById('modal-title');
        this.modalClose = document.getElementById('modal-close');
        this.cancelButton = document.getElementById('cancel-btn');
        this.saveButton = document.getElementById('save-btn');
    }
    
    setupEventListeners() {
        // 検索
        this.searchInput?.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.searchCards(e.target.value);
            }, 300);
        });
        
        // カード追加
        this.addCardButton?.addEventListener('click', () => {
            this.showAddCardModal();
        });
        
        // モーダル関連
        this.modalClose?.addEventListener('click', () => {
            this.hideCardModal();
        });
        
        this.cancelButton?.addEventListener('click', () => {
            this.hideCardModal();
        });
        
        // フォーム送信
        this.cardForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCard();
        });
        
        // ESCキーでモーダルを閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.cardModal && !this.cardModal.classList.contains('hidden')) {
                this.hideCardModal();
            }
        });
    }
    
    async initialize() {
        await this.loadCards();
    }
    
    async loadCards() {
        try {
            const response = await ApiHelpers.loadCards();
            this.cards = response.data || [];
            this.renderCards();
        } catch (error) {
            console.error('Load cards error:', error);
            CardRenderer.renderEmptyState(this.cardsList, 'カードの読み込みに失敗しました', '❌');
        }
    }
    
    async searchCards(query) {
        if (!query.trim()) {
            await this.loadCards();
            return;
        }
        
        try {
            const response = await ApiHelpers.searchCards(query);
            this.cards = response.data || [];
            this.renderCards();
        } catch (error) {
            console.error('Search cards error:', error);
            Notification.error('検索に失敗しました');
        }
    }
    
    renderCards() {
        if (!this.cardsList) return;
        
        DOMHelper.removeAllChildren(this.cardsList);
        
        if (this.cards.length === 0) {
            const message = this.searchInput?.value 
                ? '検索結果が見つかりません' 
                : 'カードがまだありません。新しいカードを追加してください。';
            CardRenderer.renderEmptyState(this.cardsList, message);
            return;
        }
        
        this.cards.forEach(card => {
            const cardElement = CardRenderer.renderCardItem(card);
            this.cardsList.appendChild(cardElement);
        });
    }
    
    showAddCardModal() {
        this.isEditMode = false;
        this.editingCardId = null;
        
        if (this.modalTitle) {
            this.modalTitle.textContent = 'カードを追加';
        }
        
        this.resetForm();
        Modal.show('card-modal');
    }
    
    async editCard(cardId) {
        try {
            const response = await ApiHelpers.loadCard(cardId);
            const card = response.data;
            
            if (!card) {
                Notification.error('カードが見つかりません');
                return;
            }
            
            this.isEditMode = true;
            this.editingCardId = cardId;
            
            if (this.modalTitle) {
                this.modalTitle.textContent = 'カードを編集';
            }
            
            this.populateForm(card);
            Modal.show('card-modal');
            
        } catch (error) {
            console.error('Edit card error:', error);
            Notification.error('カードの読み込みに失敗しました');
        }
    }
    
    async deleteCard(cardId) {
        if (!confirm('このカードを削除しますか？\nこの操作は取り消せません。')) {
            return;
        }
        
        try {
            await ApiHelpers.deleteCard(cardId);
            Notification.success('カードが削除されました');
            await this.loadCards();
        } catch (error) {
            console.error('Delete card error:', error);
            Notification.error('カードの削除に失敗しました');
        }
    }
    
    hideCardModal() {
        Modal.hide('card-modal');
        this.resetForm();
        fileUploadManager.clearUploadedFiles();
    }
    
    resetForm() {
        if (this.cardForm) {
            this.cardForm.reset();
        }
        
        // プレビューをクリア
        const previews = document.querySelectorAll('.file-preview');
        previews.forEach(preview => {
            DOMHelper.removeAllChildren(preview);
        });
        
        // バリデーションエラーをクリア
        this.clearValidationErrors();
    }
    
    populateForm(card) {
        // テキストフィールド
        this.setFormValue('card-title', card.title);
        this.setFormValue('front-text', card.front_text);
        this.setFormValue('back-text', card.back_text);
        this.setFormValue('front-youtube', card.front_youtube_url);
        this.setFormValue('back-youtube', card.back_youtube_url);
        
        // ファイルプレビュー
        if (card.front_image) {
            const preview = document.getElementById('front-image-preview');
            fileUploadManager.showExistingFilePreview(card.front_image, 'image', 'front', preview);
        }
        
        if (card.back_image) {
            const preview = document.getElementById('back-image-preview');
            fileUploadManager.showExistingFilePreview(card.back_image, 'image', 'back', preview);
        }
        
        if (card.front_audio) {
            const preview = document.getElementById('front-audio-preview');
            fileUploadManager.showExistingFilePreview(card.front_audio, 'audio', 'front', preview);
        }
        
        if (card.back_audio) {
            const preview = document.getElementById('back-audio-preview');
            fileUploadManager.showExistingFilePreview(card.back_audio, 'audio', 'back', preview);
        }
    }
    
    setFormValue(id, value) {
        const element = document.getElementById(id);
        if (element && value) {
            element.value = value;
        }
    }
    
    async saveCard() {
        try {
            // フォームデータを収集
            const cardData = this.collectFormData();
            
            // バリデーション
            const errors = Validator.validateCardData(cardData);
            if (Object.keys(errors).length > 0) {
                this.showValidationErrors(errors);
                return;
            }
            
            // 保存
            const response = await ApiHelpers.saveCard(
                cardData,
                this.isEditMode,
                this.editingCardId
            );
            
            if (response.success) {
                const message = this.isEditMode ? 'カードが更新されました' : 'カードが作成されました';
                Notification.success(message);
                
                this.hideCardModal();
                await this.loadCards();
            }
            
        } catch (error) {
            console.error('Save card error:', error);
            Notification.error('カードの保存に失敗しました');
        }
    }
    
    collectFormData() {
        const data = {
            title: this.getFormValue('card-title'),
            front_text: this.getFormValue('front-text'),
            back_text: this.getFormValue('back-text'),
            front_youtube_url: this.getFormValue('front-youtube'),
            back_youtube_url: this.getFormValue('back-youtube')
        };
        
        // アップロードされたファイル情報を追加
        const uploadedFiles = fileUploadManager.getUploadedFiles();
        
        if (uploadedFiles.image_front) {
            data.front_image = uploadedFiles.image_front;
        }
        if (uploadedFiles.image_back) {
            data.back_image = uploadedFiles.image_back;
        }
        if (uploadedFiles.audio_front) {
            data.front_audio = uploadedFiles.audio_front;
        }
        if (uploadedFiles.audio_back) {
            data.back_audio = uploadedFiles.audio_back;
        }
        
        return data;
    }
    
    getFormValue(id) {
        const element = document.getElementById(id);
        return element ? element.value.trim() : '';
    }
    
    showValidationErrors(errors) {
        // 既存のエラーをクリア
        this.clearValidationErrors();
        
        Object.keys(errors).forEach(field => {
            const element = document.getElementById(field === 'title' ? 'card-title' : field);
            if (element) {
                element.classList.add('form-input--error');
                
                // エラーメッセージを表示
                const errorDiv = document.createElement('div');
                errorDiv.className = 'form-error';
                errorDiv.textContent = errors[field];
                
                const parent = element.parentNode;
                if (parent) {
                    parent.appendChild(errorDiv);
                }
            }
        });
        
        // 最初のエラーフィールドにフォーカス
        const firstError = this.cardForm.querySelector('.form-input--error');
        if (firstError) {
            firstError.focus();
        }
    }
    
    clearValidationErrors() {
        // エラークラスを削除
        const errorInputs = this.cardForm.querySelectorAll('.form-input--error');
        errorInputs.forEach(input => {
            input.classList.remove('form-input--error');
        });
        
        // エラーメッセージを削除
        const errorMessages = this.cardForm.querySelectorAll('.form-error');
        errorMessages.forEach(message => {
            message.remove();
        });
    }
}

// ホーム画面管理クラス
class HomeManager {
    constructor() {
        this.learningQueue = [];
        
        this.initializeElements();
        this.setupEventListeners();
    }
    
    initializeElements() {
        this.learningQueueList = document.getElementById('learning-queue-list');
        this.startLearningButton = document.getElementById('start-learning-btn');
        this.dueCardsCount = document.getElementById('due-cards-count');
        this.totalCardsCount = document.getElementById('total-cards-count');
        this.accuracyRate = document.getElementById('accuracy-rate');
        this.viewModeRadios = document.querySelectorAll('input[name="viewMode"]');
    }
    
    setupEventListeners() {
        // 学習開始
        this.startLearningButton?.addEventListener('click', () => {
            this.startLearning();
        });
        
        // 表示モード変更
        this.viewModeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.saveViewMode(e.target.value);
                }
            });
        });
    }
    
    async initialize() {
        this.loadViewMode();
        await this.loadLearningQueue();
        await this.loadStats();
    }
    
    loadViewMode() {
        const savedMode = Utils.storage.get(CONFIG.STORAGE_KEYS.VIEW_MODE, CONFIG.DEFAULTS.VIEW_MODE);
        
        this.viewModeRadios.forEach(radio => {
            if (radio.value === savedMode) {
                radio.checked = true;
            }
        });
    }
    
    saveViewMode(mode) {
        Utils.storage.set(CONFIG.STORAGE_KEYS.VIEW_MODE, mode);
    }
    
    async loadLearningQueue() {
        try {
            const response = await ApiHelpers.loadLearningQueue();
            this.learningQueue = response.data || [];
            this.renderLearningQueue();
        } catch (error) {
            console.error('Load learning queue error:', error);
            CardRenderer.renderEmptyState(this.learningQueueList, '学習キューの読み込みに失敗しました', '❌');
        }
    }
    
    async loadStats() {
        try {
            const response = await ApiHelpers.loadStats();
            const stats = response.data || {};
            
            this.updateStatsDisplay(stats);
        } catch (error) {
            console.error('Load stats error:', error);
        }
    }
    
    renderLearningQueue() {
        if (!this.learningQueueList) return;
        
        DOMHelper.removeAllChildren(this.learningQueueList);
        
        if (this.learningQueue.length === 0) {
            CardRenderer.renderEmptyState(
                this.learningQueueList,
                '現在復習が必要なカードはありません。新しいカードを追加するか、後でもう一度確認してください。',
                '🎉'
            );
            
            if (this.startLearningButton) {
                this.startLearningButton.disabled = true;
                this.startLearningButton.textContent = '復習するカードがありません';
            }
            return;
        }
        
        // 最初の5枚のカードのみ表示
        const displayCards = this.learningQueue.slice(0, 5);
        
        displayCards.forEach(card => {
            const cardElement = CardRenderer.renderCardItem(card);
            this.learningQueueList.appendChild(cardElement);
        });
        
        // 学習ボタンを有効化
        if (this.startLearningButton) {
            this.startLearningButton.disabled = false;
            this.startLearningButton.textContent = `学習を始める (${this.learningQueue.length}枚)`;
        }
    }
    
    updateStatsDisplay(stats) {
        if (this.dueCardsCount) {
            this.dueCardsCount.textContent = stats.due_cards || 0;
        }
        
        if (this.totalCardsCount) {
            this.totalCardsCount.textContent = stats.total_cards || 0;
        }
        
        if (this.accuracyRate) {
            const rate = stats.accuracy_rate ? Math.round(stats.accuracy_rate) : 0;
            this.accuracyRate.textContent = rate + '%';
        }
    }
    
    async startLearning() {
        if (this.learningQueue.length === 0) {
            Notification.warning('復習するカードがありません');
            return;
        }
        
        await StudyManager.startStudy(this.learningQueue);
    }
}

// 統計管理クラス
class StatsManager {
    constructor() {
        this.statsContent = document.getElementById('stats-content');
    }
    
    async initialize() {
        await this.loadStats();
    }
    
    async loadStats() {
        try {
            const response = await ApiHelpers.loadStats();
            const stats = response.data || {};
            
            this.renderStats(stats);
        } catch (error) {
            console.error('Load stats error:', error);
            this.renderError();
        }
    }
    
    renderStats(stats) {
        if (!this.statsContent) return;
        
        DOMHelper.removeAllChildren(this.statsContent);
        
        // 基本統計
        const basicStats = this.createStatsSection('基本統計', [
            { label: '総カード数', value: stats.total_cards || 0 },
            { label: '復習待ちカード', value: stats.due_cards || 0 },
            { label: '総復習回数', value: stats.total_reviews || 0 },
            { label: '正解回数', value: stats.correct_reviews || 0 },
            { label: '正解率', value: this.formatPercentage(stats.accuracy_rate) }
        ]);
        
        this.statsContent.appendChild(basicStats);
        
        // 追加の統計情報があれば表示
        // 例: 難易度別統計、時間別統計など
    }
    
    createStatsSection(title, metrics) {
        const section = document.createElement('div');
        section.className = 'stats__section';
        
        const titleEl = document.createElement('h3');
        titleEl.className = 'stats__section-title';
        titleEl.textContent = title;
        
        section.appendChild(titleEl);
        
        metrics.forEach(metric => {
            const metricEl = document.createElement('div');
            metricEl.className = 'stats__metric';
            
            const label = document.createElement('span');
            label.className = 'stats__metric-label';
            label.textContent = metric.label;
            
            const value = document.createElement('span');
            value.className = 'stats__metric-value';
            value.textContent = metric.value;
            
            metricEl.appendChild(label);
            metricEl.appendChild(value);
            section.appendChild(metricEl);
        });
        
        return section;
    }
    
    formatPercentage(value) {
        if (value === null || value === undefined) return '0%';
        return Math.round(value) + '%';
    }
    
    renderError() {
        if (!this.statsContent) return;
        
        CardRenderer.renderEmptyState(
            this.statsContent,
            '統計情報の読み込みに失敗しました',
            '❌'
        );
    }
}

// グローバルインスタンス
const CardManager = new CardManager();
const HomeManager = new HomeManager();
const StatsManager = new StatsManager();