// ファイルアップロード管理クラス
class FileUploadManager {
    constructor() {
        this.uploadedFiles = new Map(); // ファイル管理用
        this.setupDragAndDrop();
    }
    
    // ドラッグ&ドロップ機能の設定
    setupDragAndDrop() {
        document.addEventListener('DOMContentLoaded', () => {
            const fileUploads = document.querySelectorAll('.file-upload');
            
            fileUploads.forEach(upload => {
                this.initializeFileUpload(upload);
            });
        });
    }
    
    // 個別のファイルアップロード要素を初期化
    initializeFileUpload(uploadElement) {
        const fileInput = uploadElement.querySelector('.file-input');
        const uploadArea = uploadElement.querySelector('.file-upload__area');
        const preview = uploadElement.querySelector('.file-preview');
        const type = uploadElement.dataset.type;
        const side = uploadElement.dataset.side;
        
        if (!fileInput || !uploadArea || !preview) return;
        
        // ドラッグイベント
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadElement.classList.add('file-upload--dragover');
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            if (!uploadElement.contains(e.relatedTarget)) {
                uploadElement.classList.remove('file-upload--dragover');
            }
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadElement.classList.remove('file-upload--dragover');
            
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                this.handleFileSelection(files[0], type, side, preview);
            }
        });
        
        // ファイル選択イベント
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFileSelection(file, type, side, preview);
            }
        });
        
        // クリックでファイル選択
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });
    }
    
    // ファイル選択処理
    async handleFileSelection(file, type, side, previewElement) {
        try {
            // バリデーション
            const validationResult = this.validateFile(file, type);
            if (!validationResult.isValid) {
                Notification.error(validationResult.error);
                return;
            }
            
            // プレビュー表示
            this.showFilePreview(file, type, previewElement);
            
            // アップロード実行
            Loading.show();
            const uploadResult = await ApiHelpers.uploadFile(file, type);
            
            if (uploadResult.success) {
                // アップロード成功
                const fileData = uploadResult.data;
                this.uploadedFiles.set(`${type}_${side}`, fileData);
                
                // プレビューを更新
                this.updatePreviewWithUploadedFile(fileData, type, previewElement);
                
                Notification.success('ファイルがアップロードされました');
            }
            
        } catch (error) {
            console.error('File upload error:', error);
            Notification.error('ファイルのアップロードに失敗しました');
            this.clearPreview(previewElement);
        } finally {
            Loading.hide();
        }
    }
    
    // ファイルバリデーション
    validateFile(file, type) {
        const result = { isValid: true, error: '' };
        
        // ファイルサイズチェック
        if (!Validator.validateFileSize(file)) {
            result.isValid = false;
            result.error = `ファイルサイズが${Utils.formatFileSize(CONFIG.UPLOAD.MAX_FILE_SIZE)}を超えています`;
            return result;
        }
        
        // ファイル形式チェック
        const allowedTypes = type === 'image' 
            ? CONFIG.UPLOAD.ALLOWED_IMAGE_TYPES 
            : CONFIG.UPLOAD.ALLOWED_AUDIO_TYPES;
            
        if (!Validator.validateFileType(file, allowedTypes)) {
            result.isValid = false;
            result.error = `許可されていないファイル形式です（${allowedTypes.join(', ')}）`;
            return result;
        }
        
        return result;
    }
    
    // ファイルプレビュー表示
    showFilePreview(file, type, previewElement) {
        DOMHelper.removeAllChildren(previewElement);
        
        if (type === 'image') {
            this.showImagePreview(file, previewElement);
        } else if (type === 'audio') {
            this.showAudioPreview(file, previewElement);
        }
    }
    
    // 画像プレビュー
    showImagePreview(file, previewElement) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = 'プレビュー';
            img.style.maxWidth = '100px';
            img.style.maxHeight = '100px';
            img.style.borderRadius = '4px';
            
            const container = document.createElement('div');
            container.appendChild(img);
            
            const fileName = document.createElement('div');
            fileName.textContent = file.name;
            fileName.style.fontSize = '12px';
            fileName.style.marginTop = '4px';
            fileName.style.color = '#666';
            
            container.appendChild(fileName);
            previewElement.appendChild(container);
        };
        
        reader.readAsDataURL(file);
    }
    
    // 音声プレビュー
    showAudioPreview(file, previewElement) {
        const container = document.createElement('div');
        
        const fileName = document.createElement('div');
        fileName.textContent = file.name;
        fileName.style.fontWeight = 'bold';
        fileName.style.marginBottom = '8px';
        
        const fileSize = document.createElement('div');
        fileSize.textContent = Utils.formatFileSize(file.size);
        fileSize.style.fontSize = '12px';
        fileSize.style.color = '#666';
        
        const audioPreview = document.createElement('audio');
        audioPreview.controls = true;
        audioPreview.style.width = '100%';
        audioPreview.style.marginTop = '8px';
        
        // ファイルのObjectURLを作成
        const objectURL = URL.createObjectURL(file);
        audioPreview.src = objectURL;
        
        // クリーンアップ
        audioPreview.addEventListener('loadstart', () => {
            setTimeout(() => {
                URL.revokeObjectURL(objectURL);
            }, 100);
        });
        
        container.appendChild(fileName);
        container.appendChild(fileSize);
        container.appendChild(audioPreview);
        
        previewElement.appendChild(container);
    }
    
    // アップロード済みファイルでプレビューを更新
    updatePreviewWithUploadedFile(fileData, type, previewElement) {
        const container = previewElement.querySelector('div') || document.createElement('div');
        
        // 削除ボタンを追加
        let deleteBtn = container.querySelector('.file-delete-btn');
        if (!deleteBtn) {
            deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn--small btn--danger file-delete-btn';
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.title = '削除';
            deleteBtn.style.marginTop = '8px';
            
            deleteBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (confirm('このファイルを削除しますか？')) {
                    try {
                        await ApiHelpers.deleteFile(fileData.filename, type);
                        this.clearPreview(previewElement);
                        Notification.success('ファイルが削除されました');
                    } catch (error) {
                        console.error('File delete error:', error);
                        Notification.error('ファイルの削除に失敗しました');
                    }
                }
            });
            
            container.appendChild(deleteBtn);
        }
        
        if (!previewElement.contains(container)) {
            previewElement.appendChild(container);
        }
    }
    
    // プレビューをクリア
    clearPreview(previewElement) {
        DOMHelper.removeAllChildren(previewElement);
    }
    
    // カード編集時に既存ファイルのプレビューを表示
    showExistingFilePreview(fileName, type, side, previewElement) {
        if (!fileName) return;
        
        DOMHelper.removeAllChildren(previewElement);
        
        const container = document.createElement('div');
        
        if (type === 'image') {
            const img = document.createElement('img');
            img.src = `assets/images/${fileName}`;
            img.alt = '既存の画像';
            img.style.maxWidth = '100px';
            img.style.maxHeight = '100px';
            img.style.borderRadius = '4px';
            
            img.addEventListener('error', () => {
                container.innerHTML = '<div style="color: #999;">画像が見つかりません</div>';
            });
            
            container.appendChild(img);
        } else if (type === 'audio') {
            const audioPreview = document.createElement('audio');
            audioPreview.controls = true;
            audioPreview.style.width = '100%';
            audioPreview.src = `assets/audio/${fileName}`;
            
            const fileName_display = document.createElement('div');
            fileName_display.textContent = fileName;
            fileName_display.style.fontSize = '12px';
            fileName_display.style.marginBottom = '8px';
            
            container.appendChild(fileName_display);
            container.appendChild(audioPreview);
        }
        
        // 削除ボタン
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn--small btn--danger';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.title = '削除';
        deleteBtn.style.marginTop = '8px';
        
        deleteBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (confirm('このファイルを削除しますか？')) {
                try {
                    await ApiHelpers.deleteFile(fileName, type);
                    this.clearPreview(previewElement);
                    Notification.success('ファイルが削除されました');
                    
                    // フォームの対応するフィールドもクリア
                    const formFieldId = `${side}-${type}`;
                    const hiddenInput = document.getElementById(formFieldId + '-hidden');
                    if (hiddenInput) {
                        hiddenInput.value = '';
                    }
                } catch (error) {
                    console.error('File delete error:', error);
                    Notification.error('ファイルの削除に失敗しました');
                }
            }
        });
        
        container.appendChild(deleteBtn);
        previewElement.appendChild(container);
    }
    
    // アップロードされたファイル情報を取得
    getUploadedFiles() {
        const files = {};
        
        this.uploadedFiles.forEach((fileData, key) => {
            files[key] = fileData.filename;
        });
        
        return files;
    }
    
    // アップロードファイル情報をクリア
    clearUploadedFiles() {
        this.uploadedFiles.clear();
    }
    
    // 特定のファイルを削除
    removeUploadedFile(key) {
        this.uploadedFiles.delete(key);
    }
}

// グローバルインスタンス
const fileUploadManager = new FileUploadManager();