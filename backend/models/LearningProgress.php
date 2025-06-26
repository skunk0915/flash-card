<?php
require_once __DIR__ . '/../config/database.php';

class LearningProgress {
    private $pdo;
    
    public function __construct() {
        $this->pdo = Database::getInstance()->getConnection();
    }
    
    public function recordReview(int $cardId, bool $isCorrect, string $difficulty = 'medium'): array {
        // 現在の進捗を取得
        $currentProgress = $this->getProgress($cardId);
        
        if (!$currentProgress) {
            // 進捗レコードが存在しない場合は作成
            $this->createProgress($cardId);
            $currentProgress = $this->getProgress($cardId);
        }
        
        // 次回復習時間を計算
        $nextReview = $this->calculateNextReview(
            $currentProgress['review_count'] + 1,
            $isCorrect,
            $difficulty,
            $currentProgress['correct_streak']
        );
        
        // 進捗を更新
        $stmt = $this->pdo->prepare("
            UPDATE learning_progress SET
                last_reviewed = NOW(),
                next_review = :next_review,
                review_count = review_count + 1,
                total_reviews = total_reviews + 1,
                correct_reviews = correct_reviews + :correct_increment,
                correct_streak = :correct_streak,
                difficulty_level = :difficulty_level
            WHERE card_id = :card_id
        ");
        
        $newCorrectStreak = $isCorrect ? $currentProgress['correct_streak'] + 1 : 0;
        $difficultyLevel = $this->getDifficultyLevel($difficulty);
        
        $stmt->execute([
            ':next_review' => $nextReview,
            ':correct_increment' => $isCorrect ? 1 : 0,
            ':correct_streak' => $newCorrectStreak,
            ':difficulty_level' => $difficultyLevel,
            ':card_id' => $cardId
        ]);
        
        return [
            'next_review' => $nextReview,
            'review_count' => $currentProgress['review_count'] + 1,
            'correct_streak' => $newCorrectStreak
        ];
    }
    
    public function calculateNextReview(int $reviewCount, bool $isCorrect, string $difficulty, int $correctStreak): string {
        // 基本間隔（分）
        $baseIntervals = [
            1 => 10,      // 10分
            2 => 60,      // 1時間
            3 => 180,     // 3時間
            4 => 720,     // 12時間
            5 => 1440,    // 1日
            6 => 2880,    // 2日
            7 => 7200,    // 5日
            8 => 14400,   // 10日
            9 => 43200,   // 30日
            10 => 129600  // 90日
        ];
        
        // 間隔のインデックスを決定
        $intervalIndex = min($reviewCount, count($baseIntervals));
        $baseMinutes = $baseIntervals[$intervalIndex] ?? 129600;
        
        // 難易度による調整
        $difficultyMultiplier = [
            'easy' => 1.5,
            'medium' => 1.0,
            'hard' => 0.7
        ];
        
        $multiplier = $difficultyMultiplier[$difficulty] ?? 1.0;
        
        // 正解/不正解による調整
        if (!$isCorrect) {
            $multiplier *= 0.3; // 不正解の場合は大幅に短縮
        } elseif ($correctStreak >= 3) {
            $multiplier *= 1.2; // 連続正解の場合は少し延長
        }
        
        $finalMinutes = intval($baseMinutes * $multiplier);
        
        // 次回復習時間を計算
        $nextReview = new DateTime();
        $nextReview->add(new DateInterval('PT' . $finalMinutes . 'M'));
        
        return $nextReview->format('Y-m-d H:i:s');
    }
    
    public function scheduleCustomReview(int $cardId, string $scheduleType, ?int $customValue = null): string {
        $nextReview = new DateTime();
        
        switch ($scheduleType) {
            case 'hours':
                $hours = $customValue ?? 1;
                $nextReview->add(new DateInterval('PT' . $hours . 'H'));
                break;
                
            case 'days':
                $days = $customValue ?? 1;
                $nextReview->add(new DateInterval('P' . $days . 'D'));
                break;
                
            case 'time':
                // HH:MM形式の時間指定
                if ($customValue) {
                    $hours = intval($customValue / 100);
                    $minutes = $customValue % 100;
                    
                    $nextReview = new DateTime();
                    $nextReview->setTime($hours, $minutes, 0);
                    
                    // 指定時間が過去の場合は翌日に設定
                    if ($nextReview <= new DateTime()) {
                        $nextReview->add(new DateInterval('P1D'));
                    }
                }
                break;
                
            case 'forgetting_curve':
            default:
                // 忘却曲線に基づく自動設定は既存のロジックを使用
                $progress = $this->getProgress($cardId);
                return $this->calculateNextReview(
                    $progress['review_count'],
                    true,
                    'medium',
                    $progress['correct_streak']
                );
        }
        
        // データベースを更新
        $stmt = $this->pdo->prepare("
            UPDATE learning_progress SET
                next_review = :next_review
            WHERE card_id = :card_id
        ");
        
        $nextReviewStr = $nextReview->format('Y-m-d H:i:s');
        $stmt->execute([
            ':next_review' => $nextReviewStr,
            ':card_id' => $cardId
        ]);
        
        return $nextReviewStr;
    }
    
    public function getProgress(int $cardId): ?array {
        $stmt = $this->pdo->prepare("
            SELECT * FROM learning_progress WHERE card_id = :card_id
        ");
        $stmt->execute([':card_id' => $cardId]);
        
        $result = $stmt->fetch();
        return $result ?: null;
    }
    
    public function getStats(): array {
        $stmt = $this->pdo->query("
            SELECT 
                COUNT(*) as total_cards,
                SUM(CASE WHEN next_review <= NOW() THEN 1 ELSE 0 END) as due_cards,
                SUM(total_reviews) as total_reviews,
                SUM(correct_reviews) as correct_reviews,
                AVG(correct_reviews * 100.0 / NULLIF(total_reviews, 0)) as accuracy_rate
            FROM learning_progress
        ");
        
        return $stmt->fetch();
    }
    
    private function createProgress(int $cardId): void {
        $stmt = $this->pdo->prepare("
            INSERT INTO learning_progress (card_id, next_review) 
            VALUES (:card_id, NOW())
        ");
        $stmt->execute([':card_id' => $cardId]);
    }
    
    private function getDifficultyLevel(string $difficulty): int {
        $levels = [
            'easy' => 1,
            'medium' => 2,
            'hard' => 3
        ];
        
        return $levels[$difficulty] ?? 2;
    }
}
?>