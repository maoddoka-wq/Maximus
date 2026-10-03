<?php

namespace App\Services;

use Illuminate\Support\Str;

/**
 * Explicit labelled instructions only. Missing or unrecognised input produces
 * questions, never guessed permissions, tools or partially persisted plans.
 */
final class MaximusLocalPlanner
{
    public function propose(string $goal, array $context): array
    {
        $clauses = preg_split('/\s+\b(?:puis|ensuite)\b\s+|\r?\n(?=\s*(?:\d+[.)]\s*)?(?:créer|creer|ajouter|configurer|préparer|preparer|monter)\b)/iu', $goal) ?: [];
        $steps = [];
        $questions = [];
        $moduleNames = [];
        foreach (array_merge($context['catalog']['modules'] ?? [], $context['catalog']['draft']['customModules'] ?? []) as $module) {
            $moduleNames[$this->key($module['name'] ?? '')] = $module['id'] ?? '';
            $moduleNames[$this->key($module['id'] ?? '')] = $module['id'] ?? '';
        }
        if (count($clauses) > 8) {
            $questions[] = 'Un plan peut contenir huit étapes au maximum. Réduisez votre objectif.';
        } else {
            foreach ($clauses as $index => $clause) {
                $parsed = $this->parse(preg_replace('/^\s*\d+[.)]\s*/', '', trim($clause)), $context);
                foreach ($parsed['questions'] as $question) {
                    $questions[] = 'Étape '.($index + 1).' : '.$question;
                }
                $action = $parsed['action'];
                if ($action === null) {
                    continue;
                }
                if (isset($action['moduleId'])) {
                    $action['moduleId'] = $moduleNames[$this->key($action['moduleId'])] ?? Str::slug($action['moduleId']);
                }
                if (isset($action['moduleIds'])) {
                    $action['moduleIds'] = array_map(
                        fn (string $name): string => $moduleNames[$this->key($name)] ?? Str::slug($name),
                        $action['moduleIds'],
                    );
                }
                if (isset($action['moduleFeatures'])) {
                    $selections = [];
                    foreach ($action['moduleFeatures'] as $reference => $features) {
                        $selections[$moduleNames[$this->key($reference)] ?? Str::slug($reference)] = $features;
                    }
                    $action['moduleFeatures'] = $selections;
                }
                if ($action['type'] === 'create_module') {
                    $action['id'] = Str::slug($action['name']);
                    $moduleNames[$this->key($action['name'])] = $action['id'];
                }
                $steps[] = ['title' => 'Préparer « '.$action['name'].' »', 'action' => $action];
            }
        }

        return [
            'title' => 'Plan local MAXI',
            'summary' => $questions !== []
                ? 'L’objectif est incomplet ou hors des règles reconnues. Aucune modification ni étape partielle n’a été enregistrée.'
                : count($steps).' étape(s) préparée(s) par les règles locales. Chaque étape exige votre aperçu et votre confirmation.',
            'steps' => $questions === [] ? $steps : [],
            'questions' => array_slice(array_values(array_unique($questions)), 0, 8),
        ];
    }

    private function parse(string $input, array $context): array
    {
        $key = $this->key($input);
        if (! preg_match('/\b(?:cree|creer|ajoute|ajouter|configurer|preparer|monter)\s+'
            .'(?:(?:le|la|les|un|une)\s+|l[\'’]\s*)?'
            .'(module|pack|fonctionnalite|secteur|entreprise|societe|unite|organisation)\b/u', $key, $intent)) {
            return $this->missing('Commencez chaque étape par Créer, Ajouter, Configurer ou Préparer. Les modifications, suppressions, publications et paiements ne sont pas pris en charge.');
        }
        $entity = $intent[1];

        $description = $this->field($input, 'description');
        $features = $this->values($this->field($input, 'fonctionnalit[eé]s?'));
        $moduleIds = $this->values($this->field($input, 'modules?'));
        $name = '';
        $action = null;
        $required = [];
        if (in_array($entity, ['unite', 'organisation'], true)) {
            $name = $this->name($input, '(?:unit[eé](?:\s+d[’\']organisation)?|organisation)');
            $company = $this->name($input, 'entreprise');
            $companies = [];
            foreach ($context['companies'] ?? [] as $record) {
                if ($company !== '' && in_array($this->key($company), [$this->key($record['id'] ?? ''), $this->key($record['name'] ?? '')], true)) {
                    $companies[] = $record['id'];
                }
            }
            $companyId = count($companies) === 1 ? $companies[0] : '';
            $code = $this->field($input, 'code');
            $required = ['nom de l’unité' => $name, 'entreprise existante et non ambiguë' => $companyId,
                'code' => $code, 'modules' => $moduleIds];
            $action = ['type' => 'create_organization_unit', 'name' => $name,
                'companyId' => $companyId, 'code' => $code, 'moduleIds' => $moduleIds];
        } elseif ($entity === 'fonctionnalite') {
            $name = $this->name($input, 'fonctionnalit[eé]');
            $module = $this->name($input, '(?:dans\s+(?:le\s+)?module)');
            $required = ['nom de la fonctionnalité' => $name, 'module cible' => $module];
            $action = ['type' => 'create_feature', 'name' => $name, 'moduleId' => $module,
                'description' => $description, 'dependencies' => $this->values($this->field($input, 'd[eé]pendances?'))];
        } elseif (in_array($entity, ['entreprise', 'societe'], true)) {
            $name = $this->name($input, '(?:entreprise|soci[eé]t[eé])');
            $sector = $this->field($input, 'secteur');
            $required = ['nom de l’entreprise' => $name, 'secteur' => $sector, 'modules' => $moduleIds];
            $action = ['type' => 'create_company_plan', 'name' => $name, 'sector' => $sector,
                'moduleIds' => $moduleIds, 'requirements' => $this->values($this->field($input, 'besoins?'))];
            $email = $this->field($input, 'contact');
            if ($email !== '') {
                $action['companyEmail'] = $email;
            }
        } elseif ($entity === 'secteur') {
            $name = $this->name($input, 'secteur');
            $required = ['nom du secteur' => $name, 'modules' => $moduleIds];
            $action = ['type' => 'create_sector', 'name' => $name, 'moduleIds' => $moduleIds];
            if ($features !== []) {
                $action['moduleFeatures'] = array_fill_keys($moduleIds, $features);
            }
        } elseif ($entity === 'pack') {
            $name = $this->name($input, 'pack');
            $module = $this->name($input, '(?:pour|dans)\s+(?:le\s+)?module');
            $required = ['nom du pack' => $name, 'module cible' => $module,
                'description' => $description, 'fonctionnalités' => $features];
            $action = ['type' => 'create_pack', 'name' => $name, 'moduleId' => $module,
                'description' => $description, 'featureIds' => array_map(fn (string $value): string => Str::slug($value), $features)];
        } elseif ($entity === 'module') {
            $name = $this->name($input, 'module');
            $required = ['nom du module' => $name, 'description' => $description, 'fonctionnalités' => $features];
            $action = ['type' => 'create_module', 'name' => $name, 'description' => $description, 'features' => $features];
        } else {
            return $this->missing('Précisez une création de module, pack, fonctionnalité, secteur, plan entreprise ou unité d’organisation.');
        }
        $questions = [];
        $allowed = match ($action['type']) {
            'create_module', 'create_pack' => ['description', 'fonctionnalite', 'fonctionnalites'],
            'create_feature' => ['description', 'dependance', 'dependances'],
            'create_sector' => ['module', 'modules', 'fonctionnalite', 'fonctionnalites'],
            'create_company_plan' => ['secteur', 'module', 'modules', 'besoin', 'besoins', 'contact'],
            'create_organization_unit' => ['code', 'module', 'modules'],
        };
        preg_match_all('/\b(description|fonctionnalit[eé]s?|modules?|secteur|besoins?|contact|code|'
            .'d[eé]pendances?|packs?|parent|permissions?|autorisations?|activation|identifiant)\s*:/iu', $input, $labels);
        foreach ($labels[1] as $label) {
            if (! in_array($this->key($label), $allowed, true)) {
                $questions[] = 'Le champ « '.$label.' » n’est pas reconnu pour cette création. Aucun droit ni choix implicite ne sera ajouté.';
            }
        }
        foreach ($required as $label => $value) {
            if ($value === '' || $value === []) {
                $questions[] = 'Précisez '.$label.'.';
            }
        }
        if ($name === '' || preg_match('/(?:a preciser|nom du |nom de la )/', $this->key($name))) {
            $questions[] = 'Indiquez un vrai nom, pas le texte d’exemple.';
        }

        return ['action' => $questions === [] ? $action : null, 'questions' => $questions];
    }

    private function missing(string $question): array
    {
        return ['action' => null, 'questions' => [$question]];
    }

    private function name(string $input, string $entity): string
    {
        $stops = 'avec|dans|pour|description|fonctionnalit[eé]s?|modules?|secteur|besoins?|contact|code|d[eé]pendances?';
        $pattern = '/\b'.$entity.'\s+(?:(?:nomm[eé]e?|appel[eé]e?|intitul[eé]e?)\s+)?'
            .'(?:«([^»]+)»|"([^"]+)"|“([^”]+)”|(.+?)(?=\s+(?:'.$stops.')\b|[.!?](?:\s|$)|$))/iu';
        if (! preg_match($pattern, $input, $matches)) {
            return '';
        }
        foreach (array_slice($matches, 1) as $value) {
            if (trim($value) !== '') {
                return trim($value);
            }
        }

        return '';
    }

    private function field(string $input, string $label): string
    {
        $labels = 'description|fonctionnalit[eé]s?|modules?|secteur|besoins?|contact|code|d[eé]pendances?|packs?|parent|permissions?|autorisations?|activation|identifiant';
        if (! preg_match('/\b'.$label.'\s*:\s*(.*?)(?=\s+(?:'.$labels.')\s*:|$)/isu', $input, $match)) {
            return '';
        }

        return trim(trim($match[1]), " \t\n\r\0\x0B.;«»\"");
    }

    private function values(string $input): array
    {
        return array_values(array_unique(array_filter(array_map(
            fn (string $value): string => trim(trim($value), " \t\n\r«»\"."),
            preg_split('/[,;]/u', $input) ?: [],
        ))));
    }

    private function key(string $value): string
    {
        return mb_strtolower(Str::ascii(trim($value)));
    }
}
