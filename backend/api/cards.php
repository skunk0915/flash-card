<?php
require_once __DIR__ . '/../models/Card.php';
require_once __DIR__ . '/../utils/Response.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// OPTIONSリクエストの処理
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $card = new Card();
    $method = $_SERVER['REQUEST_METHOD'];
    $pathInfo = $_SERVER['PATH_INFO'] ?? '';
    $pathParts = explode('/', trim($pathInfo, '/'));
    
    switch ($method) {
        case 'GET':
            if (empty($pathParts[0])) {
                // 全カード取得または検索
                if (isset($_GET['q'])) {
                    $results = $card->search($_GET['q']);
                    Response::success($results, '検索結果を取得しました');
                } elseif (isset($_GET['queue'])) {
                    // 学習キュー取得
                    $queue = $card->getLearningQueue();
                    Response::success($queue, '学習キューを取得しました');
                } else {
                    $cards = $card->getAll();
                    Response::success($cards, 'カード一覧を取得しました');
                }
            } else {
                // 特定カード取得
                $id = intval($pathParts[0]);
                $cardData = $card->getById($id);
                
                if ($cardData) {
                    Response::success($cardData, 'カードを取得しました');
                } else {
                    Response::notFound('カードが見つかりません');
                }
            }
            break;
            
        case 'POST':
            // カード作成
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                Response::badRequest('無効なJSONデータです');
            }
            
            // バリデーション
            $errors = validateCardData($input);
            if (!empty($errors)) {
                Response::badRequest('入力データが無効です', $errors);
            }
            
            $cardId = $card->create($input);
            $newCard = $card->getById($cardId);
            
            Response::success($newCard, 'カードを作成しました');
            break;
            
        case 'PUT':
            // カード更新
            if (empty($pathParts[0])) {
                Response::badRequest('カードIDが必要です');
            }
            
            $id = intval($pathParts[0]);
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                Response::badRequest('無効なJSONデータです');
            }
            
            // バリデーション
            $errors = validateCardData($input);
            if (!empty($errors)) {
                Response::badRequest('入力データが無効です', $errors);
            }
            
            $success = $card->update($id, $input);
            
            if ($success) {
                $updatedCard = $card->getById($id);
                Response::success($updatedCard, 'カードを更新しました');
            } else {
                Response::notFound('カードが見つかりません');
            }
            break;
            
        case 'DELETE':
            // カード削除
            if (empty($pathParts[0])) {
                Response::badRequest('カードIDが必要です');
            }
            
            $id = intval($pathParts[0]);
            $success = $card->delete($id);
            
            if ($success) {
                Response::success([], 'カードを削除しました');
            } else {
                Response::notFound('カードが見つかりません');
            }
            break;
            
        default:
            Response::methodNotAllowed();
    }
    
} catch (Exception $e) {
    error_log('Cards API Error: ' . $e->getMessage());
    Response::internalError('サーバーエラーが発生しました');
}

function validateCardData(array $data): array {
    $errors = [];
    
    // タイトルのバリデーション
    if (empty($data['title']) || trim($data['title']) === '') {
        $errors['title'] = 'タイトルは必須です';
    } elseif (strlen($data['title']) > 255) {
        $errors['title'] = 'タイトルは255文字以内で入力してください';
    }
    
    // テキストの長さチェック
    if (isset($data['front_text']) && strlen($data['front_text']) > 2000) {
        $errors['front_text'] = 'オモテのテキストは2000文字以内で入力してください';
    }
    
    if (isset($data['back_text']) && strlen($data['back_text']) > 2000) {
        $errors['back_text'] = 'ウラのテキストは2000文字以内で入力してください';
    }
    
    // YouTubeURLのバリデーション
    if (isset($data['front_youtube_url']) && !empty($data['front_youtube_url'])) {
        if (!isValidYouTubeUrl($data['front_youtube_url'])) {
            $errors['front_youtube_url'] = '有効なYouTube URLではありません';
        }
    }
    
    if (isset($data['back_youtube_url']) && !empty($data['back_youtube_url'])) {
        if (!isValidYouTubeUrl($data['back_youtube_url'])) {
            $errors['back_youtube_url'] = '有効なYouTube URLではありません';
        }
    }
    
    return $errors;
}

function isValidYouTubeUrl(string $url): bool {
    $patterns = [
        '/^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/',
        '/^https?:\/\/(www\.)?youtu\.be\/[\w-]+/',
        '/^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/'
    ];
    
    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $url)) {
            return true;
        }
    }
    
    return false;
}
?>