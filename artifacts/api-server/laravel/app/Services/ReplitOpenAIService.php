<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

final class ReplitOpenAIService
{
    /**
     * @param array<int, array{role: string, content: string}> $messages
     * @return array{text: string, model: string}
     */
    public function complete(array $messages, int $maxCompletionTokens = 2048, bool $json = false): array
    {
        $apiKey = trim((string) config('services.replit_ai.key'));
        $baseUrl = rtrim(trim((string) config('services.replit_ai.base_url')), '/');
        $model = (string) config('services.replit_ai.model', 'gpt-5.6-terra');

        if ($apiKey === '' || $baseUrl === '') {
            throw new RuntimeException('L’intégration IA Replit n’est pas configurée sur le serveur.');
        }

        $payload = [
            'model' => $model,
            'messages' => $messages,
            'max_completion_tokens' => $maxCompletionTokens,
        ];

        if ($json) {
            $payload['response_format'] = ['type' => 'json_object'];
        }

        try {
            $response = Http::withToken($apiKey)
                ->acceptJson()
                ->timeout(35)
                ->post($this->completionUrl($baseUrl), $payload);
        } catch (\Throwable $exception) {
            report($exception);
            throw new RuntimeException('L’IA Replit est momentanément indisponible.', 0, $exception);
        }

        if ($response->failed()) {
            report(new RuntimeException(
                'Replit AI request failed with HTTP '.$response->status().'.',
            ));

            throw match (true) {
                in_array($response->status(), [401, 403], true)
                    => new RuntimeException('L’intégration IA Replit n’est pas autorisée sur le serveur.'),
                $response->status() === 429
                    => new RuntimeException('L’IA Replit a atteint une limite temporaire. Réessayez dans quelques instants.'),
                default
                    => new RuntimeException('L’IA Replit n’a pas pu répondre pour le moment.'),
            };
        }

        $text = $response->json('choices.0.message.content');
        if (! is_string($text) || trim($text) === '') {
            throw new RuntimeException('L’IA Replit a retourné une réponse vide.');
        }

        return [
            'text' => trim($text),
            'model' => $model,
        ];
    }

    private function completionUrl(string $baseUrl): string
    {
        return str_ends_with($baseUrl, '/chat/completions')
            ? $baseUrl
            : $baseUrl.'/chat/completions';
    }
}