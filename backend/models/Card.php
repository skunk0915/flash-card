<?php
require_once __DIR__ . '/../config/database.php';

class Card {
    private $pdo;
    
    public function __construct() {
        $this->pdo = Database::getInstance()->getConnection();
    }
    
    public function getAll(): array {
        $stmt = $this->pdo->query("
            SELECT c.*, 
                   lp.next_review, 
                   lp.review_count, 
                   lp.difficulty_level,
                   lp.correct_streak
            FROM cards c
            LEFT JOIN learning_progress lp ON c.id = lp.card_id
            ORDER BY c.created_at DESC
        ");
        
        return $stmt->fetchAll();
    }
    
    public function getById(int $id): ?array {
        $stmt = $this->pdo->prepare("
            SELECT c.*, 
                   lp.next_review, 
                   lp.review_count, 
                   lp.difficulty_level,
                   lp.correct_streak,
                   lp.last_reviewed
            FROM cards c
            LEFT JOIN learning_progress lp ON c.id = lp.card_id
            WHERE c.id = :id
        ");
        
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        
        $result = $stmt->fetch();
        return $result ?: null;
    }
    
    public function getLearningQueue(): array {
        $stmt = $this->pdo->query("
            SELECT c.*, 
                   lp.next_review, 
                   lp.review_count, 
                   lp.difficulty_level,
                   lp.correct_streak
            FROM cards c
            LEFT JOIN learning_progress lp ON c.id = lp.card_id
            WHERE lp.next_review <= NOW() OR lp.next_review IS NULL
            ORDER BY 
                CASE WHEN lp.next_review IS NULL THEN 0 ELSE 1 END,
                lp.next_review ASC,
                c.created_at ASC
            LIMIT 50
        ");
        
        return $stmt->fetchAll();
    }
    
    public function create(array $data): int {
        $stmt = $this->pdo->prepare("
            INSERT INTO cards (
                title, front_text, back_text, 
                front_image, back_image, 
                front_audio, back_audio,
                front_youtube_url, back_youtube_url
            ) VALUES (
                :title, :front_text, :back_text,
                :front_image, :back_image,
                :front_audio, :back_audio,
                :front_youtube_url, :back_youtube_url
            )
        ");
        
        $stmt->execute([
            ':title' => $data['title'] ?? '',
            ':front_text' => $data['front_text'] ?? null,
            ':back_text' => $data['back_text'] ?? null,
            ':front_image' => $data['front_image'] ?? null,
            ':back_image' => $data['back_image'] ?? null,
            ':front_audio' => $data['front_audio'] ?? null,
            ':back_audio' => $data['back_audio'] ?? null,
            ':front_youtube_url' => $data['front_youtube_url'] ?? null,
            ':back_youtube_url' => $data['back_youtube_url'] ?? null
        ]);
        
        $cardId = $this->pdo->lastInsertId();
        
        // 学習進捗の初期レコード作成
        $this->initializeLearningProgress($cardId);
        
        return $cardId;
    }
    
    public function update(int $id, array $data): bool {
        $stmt = $this->pdo->prepare("
            UPDATE cards SET 
                title = :title,
                front_text = :front_text,
                back_text = :back_text,
                front_image = :front_image,
                back_image = :back_image,
                front_audio = :front_audio,
                back_audio = :back_audio,
                front_youtube_url = :front_youtube_url,
                back_youtube_url = :back_youtube_url,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        ");
        
        return $stmt->execute([
            ':id' => $id,
            ':title' => $data['title'] ?? '',
            ':front_text' => $data['front_text'] ?? null,
            ':back_text' => $data['back_text'] ?? null,
            ':front_image' => $data['front_image'] ?? null,
            ':back_image' => $data['back_image'] ?? null,
            ':front_audio' => $data['front_audio'] ?? null,
            ':back_audio' => $data['back_audio'] ?? null,
            ':front_youtube_url' => $data['front_youtube_url'] ?? null,
            ':back_youtube_url' => $data['back_youtube_url'] ?? null
        ]);
    }
    
    public function delete(int $id): bool {
        $stmt = $this->pdo->prepare("DELETE FROM cards WHERE id = :id");
        return $stmt->execute([':id' => $id]);
    }
    
    private function initializeLearningProgress(int $cardId): void {
        $stmt = $this->pdo->prepare("
            INSERT INTO learning_progress (card_id, next_review) 
            VALUES (:card_id, NOW())
        ");
        $stmt->execute([':card_id' => $cardId]);
    }
    
    public function search(string $query): array {
        $stmt = $this->pdo->prepare("
            SELECT c.*, 
                   lp.next_review, 
                   lp.review_count, 
                   lp.difficulty_level
            FROM cards c
            LEFT JOIN learning_progress lp ON c.id = lp.card_id
            WHERE c.title LIKE :query 
               OR c.front_text LIKE :query 
               OR c.back_text LIKE :query
            ORDER BY c.updated_at DESC
        ");
        
        $searchQuery = '%' . $query . '%';
        $stmt->execute([':query' => $searchQuery]);
        
        return $stmt->fetchAll();
    }
}
?>