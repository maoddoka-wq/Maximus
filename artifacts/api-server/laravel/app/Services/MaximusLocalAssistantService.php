<?php

namespace App\Services;

use Illuminate\Support\Str;

/**
 * Lightweight, deterministic assistant. No inference server, network client,
 * external provider, credentials or automatic business writes.
 */
class MaximusLocalAssistantService
{
    public function __construct(
        private MaximusAssistantKnowledge $knowledge,
        private MaximusLocalPlanner $planner,
        private MaximusAssistantActionService $actions,
    ) {}

    public function ask(string $question, array $context, array $history = []): array
    {
        // Conversation and plan panel share the same server-side grammar.
        // Never let a browser parser silently substitute a different action.
        if (preg_match('/^(?:s[’\']il vous plait\s*,?\s*)?'
            .'(?:(?:peux[- ]tu|pouvez[- ]vous)\s+|je\s+(?:veux|souhaite)\s+)?'
            .'(?:cree|creer|ajoute|ajouter|configurer|preparer|monter)\b/u',
            mb_strtolower(Str::ascii(trim($question))))) {
            $proposal = $this->planner->propose($question, $context);
            if ($proposal['questions'] !== []) {
                return [
                    'answer' => $proposal['summary']."\n".implode("\n", $proposal['questions']),
                    'citations' => ['Règles locales MAXI · instructions explicites'],
                    'provider' => 'local', 'model' => 'maxi-regles-locales',
                ];
            }
            if (count($proposal['steps']) === 1) {
                return $this->actions->preview($proposal['steps'][0]['action']);
            }

            return [
                'answer' => 'Cet objectif comporte plusieurs créations. Copiez-le dans le panneau Plans supervisés pour préparer les étapes, puis confirmer chacune. Rien n’a été enregistré ou exécuté.',
                'citations' => ['Règles locales MAXI · confirmation par étape'],
                'provider' => 'local', 'model' => 'maxi-regles-locales',
            ];
        }
        $lookup = $question;
        if (preg_match('/^(?:et\b|ses\b|leurs\b|ce module\b|cette entreprise\b)/iu', $question)) {
            foreach (array_reverse($history) as $message) {
                if (($message['role'] ?? '') === 'user' && is_string($message['content'] ?? null)) {
                    $lookup = $message['content'].' '.$question;
                    break;
                }
            }
        }

        $result = $this->knowledge->answer($lookup, $context);

        return [...$result, 'provider' => 'local', 'model' => 'maxi-regles-locales'];
    }

    public function plan(string $goal, array $context): array
    {
        return $this->planner->propose($goal, $context);
    }
}
