// API通信クラス
class API {
    constructor() {
        this.baseURL = CONFIG.API_BASE_URL;
    }
    
    // 基本的なHTTPリクエスト
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        
        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'API request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }
    
    // GET リクエスト
    async get(endpoint, params = {}) {
        const url = new URL(`${this.baseURL}${endpoint}`, window.location.origin);
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                url.searchParams.append(key, params[key]);
            }
        });
        
        return this.request(url.pathname + url.search);
    }
    
    // POST リクエスト
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    // PUT リクエスト
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    // DELETE リクエスト
    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }
    
    // ファイルアップロード
    async uploadFile(file, type = 'image') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        
        try {
            const response = await fetch(`${this.baseURL}${CONFIG.ENDPOINTS.UPLOAD}`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Upload failed');
            }
            
            return data;
        } catch (error) {
            console.error('File Upload Error:', error);
            throw error;
        }
    }
    
    // カード関連API
    cards = {
        // 全カード取得
        getAll: () => this.get(CONFIG.ENDPOINTS.CARDS),
        
        // 特定カード取得
        getById: (id) => this.get(`${CONFIG.ENDPOINTS.CARDS}/${id}`),
        
        // カード検索
        search: (query) => this.get(CONFIG.ENDPOINTS.CARDS, { q: query }),
        
        // 学習キュー取得
        getQueue: () => this.get(CONFIG.ENDPOINTS.CARDS, { queue: true }),
        
        // カード作成
        create: (cardData) => this.post(CONFIG.ENDPOINTS.CARDS, cardData),
        
        // カード更新
        update: (id, cardData) => this.put(`${CONFIG.ENDPOINTS.CARDS}/${id}`, cardData),
        
        // カード削除
        delete: (id) => this.delete(`${CONFIG.ENDPOINTS.CARDS}/${id}`)
    };
    
    // 学習関連API
    learning = {
        // 学習キュー取得
        getQueue: () => this.get(`${CONFIG.ENDPOINTS.LEARNING}/queue`),
        
        // 学習統計取得
        getStats: () => this.get(`${CONFIG.ENDPOINTS.LEARNING}/stats`),
        
        // 学習進捗取得
        getProgress: (cardId) => this.get(`${CONFIG.ENDPOINTS.LEARNING}/progress/${cardId}`),
        
        // 復習結果記録
        recordReview: (reviewData) => this.post(`${CONFIG.ENDPOINTS.LEARNING}/review`, reviewData),
        
        // スケジュール設定
        setSchedule: (scheduleData) => this.post(`${CONFIG.ENDPOINTS.LEARNING}/schedule`, scheduleData)
    };
    
    // ファイル関連API
    files = {
        // ファイルアップロード
        upload: (file, type) => this.uploadFile(file, type),
        
        // ファイル削除
        delete: (filename, type) => this.request(CONFIG.ENDPOINTS.UPLOAD, {
            method: 'DELETE',
            body: JSON.stringify({ filename, type })
        }),
        
        // ファイル情報取得
        getInfo: (filename, type) => this.get(CONFIG.ENDPOINTS.UPLOAD, { filename, type })
    };
}

// API インスタンスを作成
const api = new API();

// エラーハンドリング用のラッパー関数
const apiCall = async (apiFunction, ...args) => {
    try {
        Loading.show();
        const result = await apiFunction(...args);
        return result;
    } catch (error) {
        console.error('API Call Error:', error);
        Notification.show(error.message || 'エラーが発生しました', 'error');
        throw error;
    } finally {
        Loading.hide();
    }
};

// 特定のAPIコール用のヘルパー関数
const ApiHelpers = {
    // カード操作
    async loadCards() {
        return apiCall(api.cards.getAll);
    },
    
    async loadCard(id) {
        return apiCall(api.cards.getById, id);
    },
    
    async searchCards(query) {
        return apiCall(api.cards.search, query);
    },
    
    async loadLearningQueue() {
        return apiCall(api.learning.getQueue);
    },
    
    async saveCard(cardData, isEdit = false, cardId = null) {
        if (isEdit && cardId) {
            return apiCall(api.cards.update, cardId, cardData);
        } else {
            return apiCall(api.cards.create, cardData);
        }
    },
    
    async deleteCard(id) {
        return apiCall(api.cards.delete, id);
    },
    
    // 学習操作
    async recordReview(cardId, isCorrect, difficulty = 'medium') {
        return apiCall(api.learning.recordReview, {
            card_id: cardId,
            is_correct: isCorrect,
            difficulty: difficulty
        });
    },
    
    async setCustomSchedule(cardId, scheduleType, customValue = null) {
        return apiCall(api.learning.setSchedule, {
            card_id: cardId,
            schedule_type: scheduleType,
            custom_value: customValue
        });
    },
    
    async loadStats() {
        return apiCall(api.learning.getStats);
    },
    
    // ファイル操作
    async uploadFile(file, type) {
        return apiCall(api.files.upload, file, type);
    },
    
    async deleteFile(filename, type) {
        return apiCall(api.files.delete, filename, type);
    }
};