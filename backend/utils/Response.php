<?php
class Response {
    public static function json(array $data, int $statusCode = 200, array $headers = []): void {
        http_response_code($statusCode);
        
        // デフォルトヘッダー
        $defaultHeaders = [
            'Content-Type' => 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization'
        ];
        
        // ヘッダーをマージ
        $allHeaders = array_merge($defaultHeaders, $headers);
        
        foreach ($allHeaders as $name => $value) {
            header($name . ': ' . $value);
        }
        
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }
    
    public static function success(array $data = [], string $message = 'Success'): void {
        self::json([
            'success' => true,
            'message' => $message,
            'data' => $data
        ]);
    }
    
    public static function error(string $message, int $statusCode = 400, array $details = []): void {
        self::json([
            'success' => false,
            'error' => $message,
            'details' => $details
        ], $statusCode);
    }
    
    public static function notFound(string $message = 'Not Found'): void {
        self::error($message, 404);
    }
    
    public static function unauthorized(string $message = 'Unauthorized'): void {
        self::error($message, 401);
    }
    
    public static function forbidden(string $message = 'Forbidden'): void {
        self::error($message, 403);
    }
    
    public static function internalError(string $message = 'Internal Server Error'): void {
        self::error($message, 500);
    }
    
    public static function methodNotAllowed(string $message = 'Method Not Allowed'): void {
        self::error($message, 405);
    }
    
    public static function badRequest(string $message = 'Bad Request', array $validationErrors = []): void {
        self::json([
            'success' => false,
            'error' => $message,
            'validation_errors' => $validationErrors
        ], 400);
    }
}
?>