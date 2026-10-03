<?php

namespace App\Services;

use Illuminate\Support\Str;
use RuntimeException;

/**
 * Rebuilt from safe server context on each request, so catalogue and company
 * changes cannot leave a stale permanent training snapshot behind.
 */
final class MaximusAssistantKnowledge
{
    public function answer(string $question, array $context): array
    {
        $query = $this->normalize($question);
        $modules = $context['catalog']['modules'] ?? [];
        if (preg_match('/(?:quels?|liste|catalogue).*modules.*(?:publie|disponible)|catalogue publie/', $query)) {
            $lines = [];
            foreach ($modules as $module) {
                $packs = $this->strings(array_column($module['packs'] ?? [], 'name'));
                $lines[] = ($module['name'] ?? $module['id']).' : '
                    .count($module['features'] ?? []).' fonctionnalité(s). Packs : '
                    .($packs === [] ? 'aucun pack' : implode(', ', $packs)).'.';
            }

            return [
                'answer' => $lines === [] ? 'Le catalogue publié ne contient actuellement aucun module.'
                    : "Catalogue publié actuellement :\n".implode("\n", $lines)
                        ."\n\nLe brouillon est distinct : une création n’est pas une publication.",
                'citations' => ['Catalogue publié · données serveur actuelles'],
            ];
        }

        $terms = $this->terms($query);
        $matches = [];
        foreach ($this->documents($context) as $document) {
            $title = $this->normalize($document['title']);
            $body = $this->normalize($document['text']);
            $score = 0;
            foreach ($terms as $term) {
                $score += str_contains($title, $term) ? 5 : 0;
                $score += str_contains($body, $term) ? 1 : 0;
            }
            if ($score > 0) {
                $matches[] = [...$document, 'score' => $score];
            }
        }
        usort($matches, fn (array $a, array $b): int => $b['score'] <=> $a['score']);
        $matches = array_slice($matches, 0, 3);
        if ($matches === []) {
            return [
                'answer' => 'Je n’ai pas trouvé de réponse dans les connaissances locales MAXIMUS. '
                    .'Précisez le module, la fonctionnalité ou le nom de l’entreprise. '
                    .'Je n’invente pas de réponse et je ne consulte aucune API externe. '
                    .'Pour une création, utilisez les modèles explicites du panneau Plans supervisés.',
                'citations' => [],
            ];
        }

        return [
            'answer' => "Informations des sources locales :\n\n".implode("\n\n", array_map(
                fn (array $document): string => $document['title']."\n".mb_substr($document['text'], 0, 1800),
                $matches,
            )),
            'citations' => array_values(array_unique(array_column($matches, 'source'))),
        ];
    }

    private function documents(array $context): array
    {
        $path = resource_path('maxi/knowledge.md');
        if (! is_readable($path) || filesize($path) > 262144) {
            throw new RuntimeException('La documentation locale de MAXI est absente ou dépasse la taille autorisée.');
        }
        $contents = file_get_contents($path);
        if ($contents === false) {
            throw new RuntimeException('La documentation locale de MAXI ne peut pas être lue.');
        }
        $documents = [];
        foreach (preg_split('/^## /m', $contents) ?: [] as $section) {
            $parts = explode("\n", trim($section), 2);
            if (count($parts) === 2 && ! str_starts_with($parts[0], '#')) {
                $documents[] = [
                    'title' => trim($parts[0]), 'text' => trim($parts[1]),
                    'source' => 'Documentation MAXIMUS · '.trim($parts[0]),
                ];
            }
        }
        foreach ($context['catalog']['modules'] ?? [] as $module) {
            $documents[] = $this->moduleDocument($module, 'Catalogue publié');
        }
        foreach ($context['catalog']['draft']['customModules'] ?? [] as $module) {
            $documents[] = $this->moduleDocument($module, 'Brouillon non publié');
        }
        foreach ($context['catalog']['draft']['moduleOverrides'] ?? [] as $id => $override) {
            foreach ($context['catalog']['modules'] ?? [] as $module) {
                if (($module['id'] ?? '') === $id) {
                    $documents[] = $this->moduleDocument(array_merge($module, $override), 'Brouillon non publié');
                    break;
                }
            }
        }
        foreach ($context['catalog']['sectors'] ?? [] as $sector) {
            $name = $sector['name'] ?? $sector['id'] ?? '';
            $documents[] = [
                'title' => 'Secteur '.$name,
                'text' => 'Modules : '.implode(', ', $this->strings($sector['module_ids'] ?? $sector['moduleIds'] ?? [])).'.',
                'source' => 'Secteurs du catalogue · '.$name,
            ];
        }
        foreach ([
            'companies' => 'Entreprise', 'roles' => 'Rôle et permissions', 'employees' => 'Employé',
            'organization' => 'Unité organisation', 'subscriptions' => 'Abonnement',
            'companySetupPlans' => 'Plan entreprise',
        ] as $collection => $label) {
            // Only already-filtered metadata, never raw workspace or credentials.
            foreach ($context[$collection] ?? [] as $record) {
                $name = (string) ($record['name'] ?? $record['id'] ?? '');
                $lines = [];
                foreach (['status', 'sector', 'sectorId', 'companyId', 'parentId', 'type', 'role'] as $field) {
                    if (is_string($record[$field] ?? null) && $record[$field] !== '') {
                        $lines[] = $field.' : '.$record[$field];
                    }
                }
                foreach (['allowedModules', 'moduleIds', 'requirements', 'nextSteps'] as $field) {
                    if (is_array($record[$field] ?? null)) {
                        $lines[] = $field.' : '.implode(', ', $this->strings($record[$field]));
                    }
                }
                if (is_array($record['modulePermissions'] ?? null)) {
                    $lines[] = 'Permissions actuelles : '.json_encode(
                        $record['modulePermissions'], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR,
                    );
                }
                $documents[] = [
                    'title' => $label.' '.$name, 'text' => implode("\n", $lines),
                    'source' => 'État administratif actuel · '.$label.' '.$name,
                ];
            }
        }

        return $documents;
    }

    private function moduleDocument(array $module, string $scope): array
    {
        $name = (string) ($module['name'] ?? $module['id'] ?? '');
        $packs = [];
        foreach ($module['packs'] ?? [] as $pack) {
            $packs[] = ($pack['name'] ?? $pack['id'] ?? '').' : '
                .implode(', ', $this->strings($pack['featureIds'] ?? []));
        }

        return [
            'title' => $scope.' · Module '.$name,
            'text' => (string) ($module['description'] ?? '')."\nFonctionnalités : "
                .implode(', ', $this->strings($module['features'] ?? []))
                ."\nPacks : ".($packs === [] ? 'aucun' : implode('; ', $packs)),
            'source' => $scope.' · '.$name,
        ];
    }

    private function strings(mixed $values): array
    {
        return is_array($values) ? array_values(array_filter($values, 'is_string')) : [];
    }

    private function normalize(string $value): string
    {
        return mb_strtolower(Str::ascii($value));
    }

    private function terms(string $query): array
    {
        $stopWords = ['les', 'des', 'une', 'pour', 'avec', 'dans', 'sur', 'quel', 'quels', 'quelle',
            'quelles', 'comment', 'est', 'sont', 'peux', 'veux', 'faire', 'moi', 'donne', 'explique', 'maximus'];
        $terms = array_values(array_unique(array_filter(
            preg_split('/[^a-z0-9_-]+/', $query) ?: [],
            fn (string $term): bool => (strlen($term) >= 3 || in_array($term, ['qr', 'rh'], true))
                && ! in_array($term, $stopWords, true),
        )));
        foreach ($terms as $term) {
            if (strlen($term) > 4 && str_ends_with($term, 's')) {
                $terms[] = substr($term, 0, -1);
            }
        }
        foreach ([
            ['droits', 'permissions', 'autorisation', 'roles'],
            ['boutique', 'ecommerce', 'e-commerce', 'commerce'],
            ['chauffeur', 'taxi', 'gps', 'transport'],
            ['pointage', 'presences', 'presence', 'qr'],
            ['salaire', 'salaires', 'paie'],
            ['autonome', 'maxi', 'assistant'],
            ['societe', 'entreprise'],
        ] as $synonyms) {
            if (array_intersect($terms, $synonyms) !== []) {
                $terms = array_merge($terms, $synonyms);
            }
        }

        return array_slice(array_values(array_unique($terms)), 0, 60);
    }
}
