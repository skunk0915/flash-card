<?php
require_once __DIR__ . '/../models/LearningProgress.php';
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
    $learningProgress = new LearningProgress();
    $method = $_SERVER['REQUEST_METHOD'];
    $pathInfo = $_SERVER['PATH_INFO'] ?? '';
    $pathParts = explode('/', trim($pathInfo, '/'));
    
    switch ($method) {
        case 'GET':
            if (empty($pathParts[0])) {
                Response::badRequest('エンドポイントが指定されていません');
            }
            
            switch ($pathParts[0]) {
                case 'queue':
                    // 学習キュー取得
                    $card = new Card();
                    $queue = $card->getLearningQueue();
                    Response::success($queue, '学習キューを取得しました');
                    break;
                    
                case 'stats':
                    // 学習統計取得
                    $stats = $learningProgress->getStats();
                    Response::success($stats, '学習統計を取得しました');
                    break;
                    
                case 'progress':
                    // 特定カードの進捗取得
                    if (empty($pathParts[1])) {
                        Response::badRequest('カードIDが必要です');
                    }
                    
                    $cardId = intval($pathParts[1]);
                    $progress = $learningProgress->getProgress($cardId);
                    
                    if ($progress) {
                        Response::success($progress, '学習進捗を取得しました');
                    } else {
                        Response::notFound('学習進捗が見つかりません');
                    }
                    break;
                    
                default:
                    Response::notFound('エンドポイントが見つかりません');
            }
            break;
            
        case 'POST':
            if (empty($pathParts[0])) {
                Response::badRequest('エンドポイントが指定されていません');
            }
            
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                Response::badRequest('無効なJSONデータです');
            }
            
            switch ($pathParts[0]) {
                case 'review':
                    // 復習結果記録
                    $errors = validateReviewData($input);
                    if (!empty($errors)) {
                        Response::badRequest('入力データが無効です', $errors);
                    }
                    
                    $cardId = intval($input['card_id']);
                    $isCorrect = (bool)$input['is_correct'];
                    $difficulty = $input['difficulty'] ?? 'medium';
                    
                    $result = $learningProgress->recordReview($cardId, $isCorrect, $difficulty);
                    Response::success($result, '復習結果を記録しました');
                    break;
                    
                case 'schedule':
                    // カスタムスケジュール設定
                    $errors = validateScheduleData($input);
                    if (!empty($errors)) {
                        Response::badRequest('入力データが無効です', $errors);
                    }
                    
                    $cardId = intval($input['card_id']);
                    $scheduleType = $input['schedule_type'];
                    $customValue = isset($input['custom_value']) ? intval($input['custom_value']) : null;
                    
                    $nextReview = $learningProgress->scheduleCustomReview($cardId, $scheduleType, $customValue);
                    
                    Response::success([
                        'next_review' => $nextReview,
                        'schedule_type' => $scheduleType
                    ], 'スケジュールを設定しました');
                    break;
                    
                default:
                    Response::notFound('エンドポイントが見つかりません');
            }
            break;
            
        default:
            Response::methodNotAllowed();
    }
    
} catch (Exception $e) {
    error_log('Learning API Error: ' . $e->getMessage());
    Response::internalError('サーバーエラーが発生しました');
}

function validateReviewData(array $data): array {
    $errors = [];
    
    if (!isset($data['card_id']) || !is_numeric($data['card_id'])) {
        $errors['card_id'] = 'カードIDが必要です';
    }
    
    if (!isset($data['is_correct']) || !is_bool($data['is_correct'])) {
        $errors['is_correct'] = '正解/不正解の情報が必要です';
    }
    
    if (isset($data['difficulty']) && !in_array($data['difficulty'], ['easy', 'medium', 'hard'])) {
        $errors['difficulty'] = '難易度はeasy、medium、hardのいずれかを指定してください';
    }
    
    return $errors;
}

function validateScheduleData(array $data): array {
    $errors = [];
    
    if (!isset($data['card_id']) || !is_numeric($data['card_id'])) {
        $errors['card_id'] = 'カードIDが必要です';
    }
    
    $allowedTypes = ['hours', 'days', 'time', 'forgetting_curve'];
    if (!isset($data['schedule_type']) || !in_array($data['schedule_type'], $allowedTypes)) {
        $errors['schedule_type'] = 'スケジュールタイプが無効です';
    }
    
    // カスタム値の検証
    if (isset($data['schedule_type'])) {
        switch ($data['schedule_type']) {
            case 'hours':
                if (!isset($data['custom_value']) || $data['custom_value'] < 1 || $data['custom_value'] > 168) {
                    $errors['custom_value'] = '時間は1〜168の範囲で指定してください';
                }
                break;
                
            case 'days':
                if (!isset($data['custom_value']) || $data['custom_value'] < 1 || $data['custom_value'] > 365) {
                    $errors['custom_value'] = '日数は1〜365の範囲で指定してください';
                }
                break;
                
            case 'time':
                if (!isset($data['custom_value']) || !isValidTimeFormat($data['custom_value'])) {
                    $errors['custom_value'] = '時刻はHHMM形式（例：1430）で指定してください';
                }
                break;
        }
    }
    
    return $errors;
}

function isValidTimeFormat(int $time): bool {
    $hours = intval($time / 100);
    $minutes = $time % 100;
    
    return $hours >= 0 && $hours <= 23 && $minutes >= 0 && $minutes <= 59;
}
?>