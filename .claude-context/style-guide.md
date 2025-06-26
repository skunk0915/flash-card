# 単語帳ブラウザアプリ コーディング規約

## 全般的な規約

### プロジェクト構成
```
flash-card/
├── .claude-context/          # プロジェクト管理ファイル
├── frontend/                 # フロントエンド
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── assets/
├── backend/                  # バックエンド（PHP）
│   ├── api/
│   ├── config/
│   ├── models/
│   └── utils/
├── push-service/            # プッシュ通知サービス（Node.js）
│   ├── app.js
│   ├── routes/
│   └── utils/
└── docs/                    # ドキュメント
```

### 命名規則

#### ファイル・ディレクトリ名
- **ケバブケース**: `card-manager.js`, `user-settings.php`
- **小文字のみ**: すべて小文字で統一
- **英語**: 日本語ファイル名は避ける

#### 変数・関数名
- **JavaScript**: キャメルケース `getUserCards()`, `cardId`
- **PHP**: スネークケース `get_user_cards()`, `card_id`
- **CSS**: ケバブケース `.card-container`, `--primary-color`

#### データベース
- **テーブル名**: スネークケース複数形 `cards`, `learning_progress`
- **カラム名**: スネークケース `created_at`, `card_id`

## HTML規約

### 基本構造
```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ページタイトル - 単語帳アプリ</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <!-- コンテンツ -->
    <script src="js/main.js"></script>
</body>
</html>
```

### セマンティックHTML
- 適切なHTML5セマンティック要素を使用
- `<main>`, `<section>`, `<article>`, `<nav>`, `<header>`, `<footer>`
- アクセシビリティを考慮した`role`属性

### クラス命名（BEM記法）
```html
<!-- ブロック -->
<div class="card">
  <!-- エレメント -->
  <div class="card__front">
    <h2 class="card__title">タイトル</h2>
  </div>
  <!-- モディファイア -->
  <div class="card card--flipped">
    <div class="card__back">内容</div>
  </div>
</div>
```

## CSS規約

### ファイル構成
```
css/
├── reset.css           # リセットCSS
├── variables.css       # CSS変数
├── base.css           # 基本スタイル
├── components.css     # コンポーネント
├── pages.css          # ページ固有
└── responsive.css     # レスポンシブ
```

### CSS変数
```css
:root {
  /* カラーパレット */
  --primary-color: #007bff;
  --secondary-color: #6c757d;
  --success-color: #28a745;
  --error-color: #dc3545;
  
  /* サイズ */
  --card-width: 320px;
  --card-height: 240px;
  --border-radius: 8px;
  
  /* アニメーション */
  --transition-duration: 0.3s;
  --flip-duration: 0.6s;
}
```

### レスポンシブデザイン
```css
/* モバイルファースト */
.card {
  width: 100%;
  max-width: 320px;
}

/* タブレット */
@media (min-width: 768px) {
  .card {
    width: 45%;
  }
}

/* デスクトップ */
@media (min-width: 1024px) {
  .card {
    width: 30%;
  }
}
```

## JavaScript規約

### ES6+機能の活用
```javascript
// アロー関数
const getCardById = (id) => {
  return cards.find(card => card.id === id);
};

// 分割代入
const { front_text, back_text } = card;

// テンプレートリテラル
const html = `
  <div class="card" data-id="${card.id}">
    <div class="card__front">${card.front_text}</div>
  </div>
`;

// Promise/async-await
async function fetchCards() {
  try {
    const response = await fetch('/api/cards');
    const cards = await response.json();
    return cards;
  } catch (error) {
    console.error('カード取得エラー:', error);
  }
}
```

### モジュール構成
```javascript
// card-manager.js
export class CardManager {
  constructor() {
    this.cards = [];
  }
  
  async loadCards() {
    // 実装
  }
  
  flipCard(cardId) {
    // 実装
  }
}

// main.js
import { CardManager } from './card-manager.js';

const cardManager = new CardManager();
```

### エラーハンドリング
```javascript
// API呼び出し時の統一的なエラーハンドリング
async function apiCall(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}
```

## PHP規約

### PSR-12準拠
```php
<?php

declare(strict_types=1);

namespace FlashCard\Models;

class Card
{
    private int $id;
    private string $frontText;
    private string $backText;
    
    public function __construct(int $id, string $frontText, string $backText)
    {
        $this->id = $id;
        $this->frontText = $frontText;
        $this->backText = $backText;
    }
    
    public function getId(): int
    {
        return $this->id;
    }
    
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'front_text' => $this->frontText,
            'back_text' => $this->backText,
        ];
    }
}
```

### データベース操作
```php
// PDOを使用した安全なクエリ
class CardRepository
{
    private PDO $pdo;
    
    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }
    
    public function findById(int $id): ?Card
    {
        $stmt = $this->pdo->prepare('SELECT * FROM cards WHERE id = :id');
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? Card::fromArray($row) : null;
    }
}
```

### APIレスポンス形式
```php
// 統一されたJSONレスポンス
function sendJsonResponse(array $data, int $statusCode = 200): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// 成功レスポンス
sendJsonResponse([
    'success' => true,
    'data' => $cards
]);

// エラーレスポンス
sendJsonResponse([
    'success' => false,
    'error' => 'カードが見つかりません'
], 404);
```

## SQL規約

### テーブル設計
```sql
-- 適切な型とNULL制約
CREATE TABLE cards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    front_text TEXT NULL,
    back_text TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_created_at (created_at),
    INDEX idx_title (title)
);
```

### クエリ記述
```sql
-- 読みやすい整形
SELECT 
    c.id,
    c.title,
    c.front_text,
    lp.next_review
FROM cards c
    LEFT JOIN learning_progress lp ON c.id = lp.card_id
WHERE lp.next_review <= NOW()
    OR lp.next_review IS NULL
ORDER BY 
    lp.next_review ASC,
    c.created_at DESC
LIMIT 20;
```

## セキュリティ規約

### 入力値検証
```php
// バリデーション関数
function validateCardData(array $data): array
{
    $errors = [];
    
    if (empty($data['title'])) {
        $errors[] = 'タイトルは必須です';
    }
    
    if (strlen($data['title']) > 255) {
        $errors[] = 'タイトルは255文字以内で入力してください';
    }
    
    return $errors;
}
```

### ファイルアップロード
```php
// 安全なファイルアップロード
function validateUploadedFile(array $file): bool
{
    $allowedTypes = ['image/jpeg', 'image/png', 'audio/mp3', 'audio/wav'];
    $maxSize = 5 * 1024 * 1024; // 5MB
    
    return in_array($file['type'], $allowedTypes) 
        && $file['size'] <= $maxSize
        && $file['error'] === UPLOAD_ERR_OK;
}
```

## テスト規約

### JavaScript テスト
```javascript
// Jest使用
describe('CardManager', () => {
  let cardManager;
  
  beforeEach(() => {
    cardManager = new CardManager();
  });
  
  test('should flip card correctly', () => {
    const card = { id: 1, isFlipped: false };
    cardManager.flipCard(card);
    
    expect(card.isFlipped).toBe(true);
  });
});
```

### PHP テスト
```php
// PHPUnit使用
class CardTest extends PHPUnit\Framework\TestCase
{
    public function testCardCreation(): void
    {
        $card = new Card(1, 'Front', 'Back');
        
        $this->assertEquals(1, $card->getId());
        $this->assertEquals('Front', $card->getFrontText());
    }
}
```

## コメント規約

### JavaScript JSDoc
```javascript
/**
 * カードを裏返す
 * @param {number} cardId - カードID
 * @param {boolean} animate - アニメーション有無
 * @returns {Promise<void>}
 */
async function flipCard(cardId, animate = true) {
  // 実装
}
```

### PHP PHPDoc
```php
/**
 * カードを取得する
 * 
 * @param int $id カードID
 * @return Card|null 見つからない場合はnull
 * @throws CardNotFoundException
 */
public function findById(int $id): ?Card
{
    // 実装
}
```

## Git規約

### コミットメッセージ
```
feat: カードの裏返し機能を追加
fix: 音声再生時のエラーを修正
docs: API仕様書を更新
style: CSS整理とコードフォーマット
refactor: CardManagerクラスを分割
test: カード管理機能のテストを追加
```

### ブランチ戦略
- `main`: 本番環境
- `develop`: 開発環境
- `feature/card-flip`: 機能ブランチ
- `hotfix/audio-bug`: 緊急修正