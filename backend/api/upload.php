<?php
require_once __DIR__ . '/../utils/FileUpload.php';
require_once __DIR__ . '/../utils/Response.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// OPTIONSリクエストの処理
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $fileUpload = new FileUpload();
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'POST':
            // ファイルアップロード
            if (empty($_FILES['file'])) {
                Response::badRequest('ファイルが選択されていません');
            }
            
            $file = $_FILES['file'];
            $type = $_POST['type'] ?? 'image'; // image または audio
            
            if (!in_array($type, ['image', 'audio'])) {
                Response::badRequest('ファイルタイプはimageまたはaudioを指定してください');
            }
            
            $result = $fileUpload->uploadFile($file, $type);
            
            if ($result['success']) {
                Response::success([
                    'filename' => $result['filename'],
                    'path' => $result['path'],
                    'size' => $result['size'],
                    'type' => $type
                ], 'ファイルをアップロードしました');
            } else {
                Response::badRequest($result['error']);
            }
            break;
            
        case 'DELETE':
            // ファイル削除
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input || empty($input['filename'])) {
                Response::badRequest('ファイル名が必要です');
            }
            
            $filename = $input['filename'];
            $type = $input['type'] ?? 'image';
            
            if (!in_array($type, ['image', 'audio'])) {
                Response::badRequest('ファイルタイプはimageまたはaudioを指定してください');
            }
            
            $success = $fileUpload->deleteFile($filename, $type);
            
            if ($success) {
                Response::success([], 'ファイルを削除しました');
            } else {
                Response::notFound('ファイルが見つかりません');
            }
            break;
            
        case 'GET':
            // ファイル情報取得
            if (empty($_GET['filename'])) {
                Response::badRequest('ファイル名が必要です');
            }
            
            $filename = $_GET['filename'];
            $type = $_GET['type'] ?? 'image';
            
            $fileInfo = $fileUpload->getFileInfo($filename, $type);
            
            if ($fileInfo) {
                Response::success($fileInfo, 'ファイル情報を取得しました');
            } else {
                Response::notFound('ファイルが見つかりません');
            }
            break;
            
        default:
            Response::methodNotAllowed();
    }
    
} catch (Exception $e) {
    error_log('Upload API Error: ' . $e->getMessage());
    Response::internalError('サーバーエラーが発生しました');
}
?>