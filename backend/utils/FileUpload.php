<?php
require_once __DIR__ . '/../config/config.php';

class FileUpload {
    private $uploadDir;
    private $allowedImageTypes;
    private $allowedAudioTypes;
    private $maxFileSize;
    
    public function __construct() {
        $this->uploadDir = UPLOAD_DIR;
        $this->allowedImageTypes = ALLOWED_IMAGE_TYPES;
        $this->allowedAudioTypes = ALLOWED_AUDIO_TYPES;
        $this->maxFileSize = MAX_FILE_SIZE;
        
        // アップロードディレクトリの作成
        $this->createDirectories();
    }
    
    public function uploadFile(array $file, string $type = 'image'): array {
        try {
            // バリデーション
            $this->validateFile($file, $type);
            
            // ファイル名の生成
            $filename = $this->generateFilename($file['name']);
            $subdir = $type === 'image' ? 'images/' : 'audio/';
            $filepath = $this->uploadDir . $subdir . $filename;
            
            // ファイルの移動
            if (!move_uploaded_file($file['tmp_name'], $filepath)) {
                throw new Exception('ファイルのアップロードに失敗しました');
            }
            
            // ファイルサイズを最適化（画像の場合）
            if ($type === 'image') {
                $this->optimizeImage($filepath);
            }
            
            return [
                'success' => true,
                'filename' => $filename,
                'path' => $subdir . $filename,
                'size' => filesize($filepath)
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    public function deleteFile(string $filename, string $type = 'image'): bool {
        $subdir = $type === 'image' ? 'images/' : 'audio/';
        $filepath = $this->uploadDir . $subdir . $filename;
        
        if (file_exists($filepath)) {
            return unlink($filepath);
        }
        
        return false;
    }
    
    public function getFileInfo(string $filename, string $type = 'image'): ?array {
        $subdir = $type === 'image' ? 'images/' : 'audio/';
        $filepath = $this->uploadDir . $subdir . $filename;
        
        if (!file_exists($filepath)) {
            return null;
        }
        
        return [
            'filename' => $filename,
            'size' => filesize($filepath),
            'type' => mime_content_type($filepath),
            'modified' => filemtime($filepath)
        ];
    }
    
    private function validateFile(array $file, string $type): void {
        // エラーチェック
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new Exception($this->getUploadErrorMessage($file['error']));
        }
        
        // ファイルサイズチェック
        if ($file['size'] > $this->maxFileSize) {
            $maxSizeMB = $this->maxFileSize / (1024 * 1024);
            throw new Exception("ファイルサイズが{$maxSizeMB}MBを超えています");
        }
        
        // MIMEタイプチェック
        $allowedTypes = $type === 'image' ? $this->allowedImageTypes : $this->allowedAudioTypes;
        if (!in_array($file['type'], $allowedTypes)) {
            throw new Exception('許可されていないファイル形式です');
        }
        
        // ファイル内容の検証（セキュリティ）
        $this->validateFileContent($file['tmp_name'], $type);
    }
    
    private function validateFileContent(string $tmpPath, string $type): void {
        if ($type === 'image') {
            $imageInfo = getimagesize($tmpPath);
            if ($imageInfo === false) {
                throw new Exception('有効な画像ファイルではありません');
            }
        } elseif ($type === 'audio') {
            // 音声ファイルの基本的な検証
            $fileContent = file_get_contents($tmpPath, false, null, 0, 4);
            if ($fileContent === false) {
                throw new Exception('ファイルの読み込みに失敗しました');
            }
        }
    }
    
    private function generateFilename(string $originalName): string {
        $extension = pathinfo($originalName, PATHINFO_EXTENSION);
        $basename = pathinfo($originalName, PATHINFO_FILENAME);
        
        // 安全なファイル名に変換
        $basename = preg_replace('/[^a-zA-Z0-9_-]/', '', $basename);
        $basename = substr($basename, 0, 50); // 長さ制限
        
        // タイムスタンプとランダム文字列を追加
        $timestamp = date('YmdHis');
        $random = substr(md5(uniqid()), 0, 8);
        
        return $basename . '_' . $timestamp . '_' . $random . '.' . $extension;
    }
    
    private function optimizeImage(string $filepath): void {
        $imageInfo = getimagesize($filepath);
        if ($imageInfo === false) return;
        
        list($width, $height, $type) = $imageInfo;
        
        // 大きすぎる画像をリサイズ
        $maxWidth = 1200;
        $maxHeight = 800;
        
        if ($width > $maxWidth || $height > $maxHeight) {
            $this->resizeImage($filepath, $maxWidth, $maxHeight, $type);
        }
    }
    
    private function resizeImage(string $filepath, int $maxWidth, int $maxHeight, int $imageType): void {
        // 元画像を読み込み
        switch ($imageType) {
            case IMAGETYPE_JPEG:
                $source = imagecreatefromjpeg($filepath);
                break;
            case IMAGETYPE_PNG:
                $source = imagecreatefrompng($filepath);
                break;
            case IMAGETYPE_GIF:
                $source = imagecreatefromgif($filepath);
                break;
            default:
                return;
        }
        
        if (!$source) return;
        
        $originalWidth = imagesx($source);
        $originalHeight = imagesy($source);
        
        // アスペクト比を保持してリサイズ
        $ratio = min($maxWidth / $originalWidth, $maxHeight / $originalHeight);
        $newWidth = intval($originalWidth * $ratio);
        $newHeight = intval($originalHeight * $ratio);
        
        // 新しい画像を作成
        $resized = imagecreatetruecolor($newWidth, $newHeight);
        
        // PNG/GIFの透明度を保持
        if ($imageType === IMAGETYPE_PNG || $imageType === IMAGETYPE_GIF) {
            imagealphablending($resized, false);
            imagesavealpha($resized, true);
            $transparent = imagecolorallocatealpha($resized, 255, 255, 255, 127);
            imagefill($resized, 0, 0, $transparent);
        }
        
        // リサイズ実行
        imagecopyresampled($resized, $source, 0, 0, 0, 0, $newWidth, $newHeight, $originalWidth, $originalHeight);
        
        // 保存
        switch ($imageType) {
            case IMAGETYPE_JPEG:
                imagejpeg($resized, $filepath, 85);
                break;
            case IMAGETYPE_PNG:
                imagepng($resized, $filepath, 6);
                break;
            case IMAGETYPE_GIF:
                imagegif($resized, $filepath);
                break;
        }
        
        // メモリ解放
        imagedestroy($source);
        imagedestroy($resized);
    }
    
    private function createDirectories(): void {
        $dirs = [
            $this->uploadDir . 'images/',
            $this->uploadDir . 'audio/'
        ];
        
        foreach ($dirs as $dir) {
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
        }
    }
    
    private function getUploadErrorMessage(int $errorCode): string {
        $messages = [
            UPLOAD_ERR_INI_SIZE => 'ファイルサイズが上限を超えています',
            UPLOAD_ERR_FORM_SIZE => 'ファイルサイズが上限を超えています',
            UPLOAD_ERR_PARTIAL => 'ファイルのアップロードが完了していません',
            UPLOAD_ERR_NO_FILE => 'ファイルが選択されていません',
            UPLOAD_ERR_NO_TMP_DIR => 'テンポラリディレクトリが見つかりません',
            UPLOAD_ERR_CANT_WRITE => 'ファイルの書き込みに失敗しました',
            UPLOAD_ERR_EXTENSION => 'PHPの拡張機能によりアップロードが中断されました'
        ];
        
        return $messages[$errorCode] ?? 'アップロードエラーが発生しました';
    }
}
?>