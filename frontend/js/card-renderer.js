// カードレンダリングクラス
class CardRenderer {
    // カードコンテンツをレンダリング
    static renderCardContent(card, side = 'front') {
        const content = document.createElement('div');
        content.className = 'card-content';
        
        const textKey = `${side}_text`;
        const imageKey = `${side}_image`;
        const audioKey = `${side}_audio`;
        const youtubeKey = `${side}_youtube_url`;
        
        // テキスト
        if (card[textKey]) {
            const textEl = document.createElement('div');
            textEl.className = 'card-content__text';
            textEl.textContent = card[textKey];
            content.appendChild(textEl);
        }
        
        // 画像
        if (card[imageKey]) {
            const imageEl = this.createImageElement(card[imageKey]);
            content.appendChild(imageEl);
        }
        
        // 音声
        if (card[audioKey]) {
            const audioEl = this.createAudioElement(card[audioKey]);
            content.appendChild(audioEl);
        }
        
        // YouTube
        if (card[youtubeKey]) {
            const youtubeEl = this.createYouTubeElement(card[youtubeKey]);
            content.appendChild(youtubeEl);
        }
        
        return content;
    }
    
    // 画像要素を作成
    static createImageElement(imagePath) {
        const container = document.createElement('div');
        container.className = 'card-content__image';
        
        const img = document.createElement('img');
        img.src = `assets/${imagePath}`;
        img.alt = 'カード画像';
        img.className = 'img-responsive';
        img.loading = 'lazy';
        
        // クリックで拡大表示
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            ImageViewer.show(img.src, img.alt);
        });
        
        // エラーハンドリング
        img.addEventListener('error', () => {
            container.innerHTML = '<div class="image-error">画像が見つかりません</div>';
        });
        
        container.appendChild(img);
        return container;
    }
    
    // 音声要素を作成
    static createAudioElement(audioPath) {
        const container = document.createElement('div');
        container.className = 'card-content__audio';
        
        const controls = document.createElement('div');
        controls.className = 'audio-controls';
        
        const playBtn = document.createElement('button');
        playBtn.className = 'btn btn--outline btn--small';
        playBtn.innerHTML = '▶ 再生';
        playBtn.type = 'button';
        
        const stopBtn = document.createElement('button');
        stopBtn.className = 'btn btn--outline btn--small';
        stopBtn.innerHTML = '⏹ 停止';
        stopBtn.type = 'button';
        stopBtn.disabled = true;
        
        let currentAudio = null;
        
        // 再生ボタン
        playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            if (!currentAudio) {
                currentAudio = new Audio(`assets/${audioPath}`);
                
                currentAudio.addEventListener('ended', () => {
                    playBtn.innerHTML = '▶ 再生';
                    playBtn.disabled = false;
                    stopBtn.disabled = true;
                    currentAudio = null;
                });
                
                currentAudio.addEventListener('error', () => {
                    Notification.error('音声ファイルの再生に失敗しました');
                    playBtn.disabled = false;
                    stopBtn.disabled = true;
                    currentAudio = null;
                });
            }
            
            if (currentAudio.paused) {
                currentAudio.play().then(() => {
                    playBtn.innerHTML = '⏸ 一時停止';
                    stopBtn.disabled = false;
                }).catch((error) => {
                    console.error('Audio play error:', error);
                    Notification.error('音声の再生に失敗しました');
                });
            } else {
                currentAudio.pause();
                playBtn.innerHTML = '▶ 再生';
            }
        });
        
        // 停止ボタン
        stopBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            if (currentAudio) {
                currentAudio.pause();
                currentAudio.currentTime = 0;
                playBtn.innerHTML = '▶ 再生';
                playBtn.disabled = false;
                stopBtn.disabled = true;
                currentAudio = null;
            }
        });
        
        controls.appendChild(playBtn);
        controls.appendChild(stopBtn);
        container.appendChild(controls);
        
        return container;
    }
    
    // YouTube要素を作成
    static createYouTubeElement(youtubeUrl) {
        const container = document.createElement('div');
        container.className = 'card-content__youtube';
        
        const embedUrl = Utils.getYouTubeEmbedUrl(youtubeUrl);
        
        if (embedUrl) {
            const wrapper = document.createElement('div');
            wrapper.className = 'youtube-embed';
            
            const iframe = document.createElement('iframe');
            iframe.src = embedUrl;
            iframe.frameBorder = '0';
            iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
            iframe.allowFullscreen = true;
            iframe.loading = 'lazy';
            
            wrapper.appendChild(iframe);
            container.appendChild(wrapper);
        } else {
            const errorEl = document.createElement('div');
            errorEl.className = 'youtube-error';
            errorEl.textContent = '無効なYouTube URLです';
            container.appendChild(errorEl);
        }
        
        return container;
    }
    
    // カードアイテム（リスト表示用）をレンダリング
    static renderCardItem(card) {
        const cardEl = document.createElement('div');
        cardEl.className = 'card-item';
        cardEl.dataset.cardId = card.id;
        
        // ヘッダー
        const header = document.createElement('div');
        header.className = 'card-item__header';
        
        const title = document.createElement('h3');
        title.className = 'card-item__title';
        title.textContent = card.title;
        
        const actions = document.createElement('div');
        actions.className = 'card-item__actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn--small btn--outline';
        editBtn.innerHTML = '✏️';
        editBtn.title = '編集';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            CardManager.editCard(card.id);
        });
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn--small btn--danger';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.title = '削除';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            CardManager.deleteCard(card.id);
        });
        
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        
        header.appendChild(title);
        header.appendChild(actions);
        
        // コンテンツプレビュー
        const content = document.createElement('div');
        content.className = 'card-item__content';
        
        const preview = document.createElement('div');
        preview.className = 'card-item__preview';
        
        const frontText = card.front_text || '';
        const backText = card.back_text || '';
        const previewText = frontText + (frontText && backText ? ' / ' : '') + backText;
        preview.textContent = Utils.truncateText(previewText, 100);
        
        content.appendChild(preview);
        
        // メタ情報
        const meta = document.createElement('div');
        meta.className = 'card-item__meta';
        
        const createdAt = document.createElement('span');
        createdAt.textContent = Utils.formatDateTime(card.created_at);
        
        const due = document.createElement('span');
        due.className = 'card-item__due';
        
        if (card.next_review) {
            const nextReview = new Date(card.next_review);
            const now = new Date();
            
            due.textContent = Utils.formatRelativeTime(card.next_review);
            
            if (nextReview <= now) {
                due.classList.add('card-item__due--overdue');
            } else if (nextReview <= new Date(now.getTime() + 24 * 60 * 60 * 1000)) {
                due.classList.add('card-item__due--today');
            } else {
                due.classList.add('card-item__due--future');
            }
        } else {
            due.textContent = '新規';
            due.classList.add('card-item__due--overdue');
        }
        
        meta.appendChild(createdAt);
        meta.appendChild(due);
        
        // 組み立て
        cardEl.appendChild(header);
        cardEl.appendChild(content);
        cardEl.appendChild(meta);
        
        // クリックで詳細表示または学習開始
        cardEl.addEventListener('click', () => {
            if (PageManager.currentPage === 'cards') {
                this.showCardDetail(card);
            } else {
                StudyManager.startStudyWithCard(card.id);
            }
        });
        
        return cardEl;
    }
    
    // カード詳細表示
    static showCardDetail(card) {
        const existingDetail = document.querySelector('.card-detail');
        if (existingDetail) {
            existingDetail.remove();
        }
        
        const detail = document.createElement('div');
        detail.className = 'card-detail';
        
        // ヘッダー
        const header = document.createElement('div');
        header.className = 'card-detail__header';
        
        const title = document.createElement('h2');
        title.className = 'card-detail__title';
        title.textContent = card.title;
        
        const meta = document.createElement('div');
        meta.className = 'card-detail__meta';
        
        const created = document.createElement('span');
        created.textContent = `作成: ${Utils.formatDateTime(card.created_at)}`;
        
        const reviews = document.createElement('span');
        reviews.textContent = `復習回数: ${card.review_count || 0}回`;
        
        meta.appendChild(created);
        meta.appendChild(reviews);
        
        header.appendChild(title);
        header.appendChild(meta);
        
        // コンテンツ
        const content = document.createElement('div');
        content.className = 'card-detail__content';
        
        // オモテ
        const frontSide = document.createElement('div');
        frontSide.className = 'card-detail__side';
        
        const frontTitle = document.createElement('h3');
        frontTitle.className = 'card-detail__side-title';
        frontTitle.textContent = 'オモテ';
        
        frontSide.appendChild(frontTitle);
        frontSide.appendChild(this.renderCardContent(card, 'front'));
        
        // ウラ
        const backSide = document.createElement('div');
        backSide.className = 'card-detail__side';
        
        const backTitle = document.createElement('h3');
        backTitle.className = 'card-detail__side-title';
        backTitle.textContent = 'ウラ';
        
        backSide.appendChild(backTitle);
        backSide.appendChild(this.renderCardContent(card, 'back'));
        
        content.appendChild(frontSide);
        content.appendChild(backSide);
        
        // アクション
        const actions = document.createElement('div');
        actions.className = 'card-detail__actions';
        
        const studyBtn = document.createElement('button');
        studyBtn.className = 'btn btn--primary';
        studyBtn.textContent = 'この カードで学習開始';
        studyBtn.addEventListener('click', () => {
            StudyManager.startStudyWithCard(card.id);
        });
        
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn--secondary';
        editBtn.textContent = '編集';
        editBtn.addEventListener('click', () => {
            CardManager.editCard(card.id);
        });
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn btn--outline';
        closeBtn.textContent = '閉じる';
        closeBtn.addEventListener('click', () => {
            detail.remove();
        });
        
        actions.appendChild(studyBtn);
        actions.appendChild(editBtn);
        actions.appendChild(closeBtn);
        
        // 組み立て
        detail.appendChild(header);
        detail.appendChild(content);
        detail.appendChild(actions);
        
        // ページに追加
        const cardsPage = document.getElementById('cards-page');
        cardsPage.appendChild(detail);
        
        // スクロール
        detail.scrollIntoView({ behavior: 'smooth' });
    }
    
    // フラッシュカードをレンダリング
    static renderFlashCard(card, side = 'front') {
        const frontContent = document.getElementById('card-front-content');
        const backContent = document.getElementById('card-back-content');
        
        if (frontContent && backContent) {
            // 既存のコンテンツをクリア
            DOMHelper.removeAllChildren(frontContent);
            DOMHelper.removeAllChildren(backContent);
            
            // コンテンツを追加
            frontContent.appendChild(this.renderCardContent(card, 'front'));
            backContent.appendChild(this.renderCardContent(card, 'back'));
        }
        
        // カードの向きを設定
        const flashCard = document.getElementById('flash-card');
        if (flashCard) {
            if (side === 'back') {
                flashCard.classList.add('flash-card--flipped');
            } else {
                flashCard.classList.remove('flash-card--flipped');
            }
        }
    }
    
    // 空の状態を表示
    static renderEmptyState(container, message, icon = '📚') {
        DOMHelper.removeAllChildren(container);
        
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        
        const iconEl = document.createElement('div');
        iconEl.className = 'empty-state__icon';
        iconEl.textContent = icon;
        
        const messageEl = document.createElement('div');
        messageEl.className = 'empty-state__message';
        messageEl.textContent = message;
        
        emptyState.appendChild(iconEl);
        emptyState.appendChild(messageEl);
        container.appendChild(emptyState);
    }
}