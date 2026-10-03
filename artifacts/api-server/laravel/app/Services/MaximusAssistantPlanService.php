<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

final class MaximusAssistantPlanService
{
    public function __construct(private MaximusAssistantActionService $actions) {}

    /**
     * Proposals use private scopes, separate from the business workspace.
     * They persist across reloads without introducing a parallel business store.
     */
    public function prepare(string $goal, array $proposal, array $actor): array
    {
        Validator::make($proposal, [
            'title' => ['required', 'string', 'max:200'],
            'summary' => ['required', 'string', 'max:4000'],
            'steps' => ['present', 'array', 'max:8'],
            'questions' => ['present', 'array', 'max:8'],
            'questions.*' => ['required', 'string', 'max:1000'],
            'steps.*.title' => ['required', 'string', 'max:200'],
            'steps.*.action' => ['required', 'array:type,id,name,description,sector,companyEmail,managerName,moduleId,companyId,companyName,code,parentId,features,featureIds,moduleIds,requirements,nextSteps,dependencies,modulePackIds,moduleFeatures,featurePacks'],
            'steps.*.action.type' => ['required', 'string'],
            'steps.*.action.name' => ['required', 'string', 'max:200'],
            'steps.*.action.description' => ['sometimes', 'string', 'max:2000'],
            'steps.*.action.id' => ['sometimes', 'string', 'max:120'],
            'steps.*.action.moduleId' => ['sometimes', 'string', 'max:120'],
            'steps.*.action.companyId' => ['sometimes', 'string', 'max:120'],
            'steps.*.action.code' => ['sometimes', 'string', 'max:120'],
            'steps.*.action.parentId' => ['sometimes', 'nullable', 'string', 'max:120'],
            'steps.*.action.sector' => ['sometimes', 'string', 'max:200'],
            'steps.*.action.companyEmail' => ['sometimes', 'string', 'max:255'],
            'steps.*.action.managerName' => ['sometimes', 'string', 'max:200'],
            'steps.*.action.features' => ['sometimes', 'array', 'max:40'],
            'steps.*.action.features.*' => ['string', 'max:200'],
            'steps.*.action.featureIds' => ['sometimes', 'array', 'max:40'],
            'steps.*.action.featureIds.*' => ['string', 'max:120'],
            'steps.*.action.moduleIds' => ['sometimes', 'array', 'max:40'],
            'steps.*.action.moduleIds.*' => ['string', 'max:120'],
            'steps.*.action.dependencies' => ['sometimes', 'array', 'max:40'],
            'steps.*.action.dependencies.*' => ['string', 'max:120'],
            'steps.*.action.requirements' => ['sometimes', 'array', 'max:40'],
            'steps.*.action.requirements.*' => ['string', 'max:1000'],
            'steps.*.action.modulePackIds' => ['sometimes', 'array'],
            'steps.*.action.modulePackIds.*' => ['array', 'max:40'],
            'steps.*.action.modulePackIds.*.*' => ['string', 'max:120'],
            'steps.*.action.moduleFeatures' => ['sometimes', 'array'],
            'steps.*.action.moduleFeatures.*' => ['array', 'max:40'],
            'steps.*.action.moduleFeatures.*.*' => ['string', 'max:200'],
            'steps.*.action.featurePacks' => ['sometimes', 'array', 'max:20'],
            'steps.*.action.featurePacks.*' => ['array:id,name,description,featureIds'],
            'steps.*.action.featurePacks.*.id' => ['sometimes', 'string', 'max:120'],
            'steps.*.action.featurePacks.*.name' => ['required', 'string', 'max:200'],
            'steps.*.action.featurePacks.*.description' => ['required', 'string', 'max:2000'],
            'steps.*.action.featurePacks.*.featureIds' => ['required', 'array', 'max:40'],
            'steps.*.action.featurePacks.*.featureIds.*' => ['string', 'max:120'],
        ])->validate();
        $questions = $proposal['questions'] ?? [];
        if (! is_array($questions) || count($questions) > 8) {
            throw new RuntimeException('MAXI a retourné des questions invalides.');
        }
        foreach ($questions as $question) {
            if (! is_string($question) || trim($question) === '' || mb_strlen($question) > 1000) {
                throw new RuntimeException('MAXI a retourné une question invalide.');
            }
        }
        $summary = trim((string) ($proposal['summary'] ?? ''));
        if ($questions !== []) {
            return ['plan' => null, 'questions' => $questions, 'answer' => $summary];
        }
        $steps = $proposal['steps'] ?? [];
        if (! is_array($steps) || ! array_is_list($steps) || count($steps) < 1 || count($steps) > 8) {
            throw new RuntimeException('MAXI doit proposer entre une et huit étapes autorisées.');
        }
        $plan = [
            'id' => (string) Str::uuid(),
            'goal' => $goal,
            'title' => mb_substr(trim((string) ($proposal['title'] ?? $goal)), 0, 200),
            'summary' => mb_substr($summary, 0, 4000),
            'status' => 'AWAITING_CONFIRMATION',
            'currentStep' => 0,
            'updatedAt' => now()->toISOString(),
            'error' => null,
            'steps' => $this->actions->validatePlan($steps),
        ];
        $this->save($plan, $actor);

        return ['plan' => $this->publicPlan($plan), 'questions' => [], 'answer' => $summary];
    }

    public function list(array $actor): array
    {
        return DB::table('maximus_app_states')
            ->where('scope', 'like', $this->prefix($actor).'%')
            ->orderByDesc('updated_at')->limit(20)->get()
            ->map(fn (object $row): array => $this->publicPlan($this->decode($row->payload)))
            ->all();
    }

    public function get(string $id, array $actor): array
    {
        return $this->publicPlan($this->load($id, $actor));
    }

    public function preview(string $id, int $step, array $actor): array
    {
        return DB::transaction(function () use ($id, $step, $actor): array {
            $plan = $this->load($id, $actor, true);
            $this->assertCurrent($plan, $step);
            $workspace = DB::table('maximus_app_states')->where('scope', 'workspace')->lockForUpdate()->first();
            $preview = $this->actions->preview($plan['steps'][$step]['action']);
            $token = Str::random(64);
            $plan['_confirmation'] = [
                'hash' => hash('sha256', $token),
                'workspaceVersion' => (int) ($workspace->version ?? 0),
                'expiresAt' => now()->addMinutes(15)->timestamp,
                'step' => $step,
            ];
            $plan['error'] = null;
            $this->save($plan, $actor);

            return [
                'plan' => $this->publicPlan($plan),
                'token' => $token,
                'workspaceVersion' => $plan['_confirmation']['workspaceVersion'],
                'answer' => $preview['answer'],
                'action' => $preview['action'],
            ];
        });
    }

    public function execute(string $id, int $step, string $token, array $actor): array
    {
        try {
            return DB::transaction(function () use ($id, $step, $token, $actor): array {
                $plan = $this->load($id, $actor, true);
                // A retry of an already committed step must never execute the next step.
                if (($plan['steps'][$step]['status'] ?? null) === 'EXECUTED') {
                    return $this->publicPlan($plan);
                }
                $this->assertCurrent($plan, $step);
                $confirmation = $plan['_confirmation'] ?? [];
                abort_unless(
                    ($confirmation['step'] ?? null) === $step
                    && ($confirmation['expiresAt'] ?? 0) > now()->timestamp
                    && hash_equals((string) ($confirmation['hash'] ?? ''), hash('sha256', $token)),
                    409, 'Cet aperçu a expiré ou ne correspond plus à cette étape. Préparez un nouvel aperçu.',
                );
                $workspace = DB::table('maximus_app_states')->where('scope', 'workspace')->lockForUpdate()->first();
                abort_unless(
                    (int) ($workspace->version ?? 0) === $confirmation['workspaceVersion'],
                    409, 'La configuration a changé depuis l’aperçu. Vérifiez un nouvel aperçu avant de confirmer.',
                );
                // Business mutation and progress commit together, under both locks.
                $result = $this->actions->execute($plan['steps'][$step]['action'], $actor);
                $plan['steps'][$step]['status'] = 'EXECUTED';
                $plan['steps'][$step]['result'] = $result;
                $plan['currentStep'] = $step + 1;
                $plan['status'] = $plan['currentStep'] === count($plan['steps'])
                    ? 'COMPLETED' : 'AWAITING_CONFIRMATION';
                $plan['error'] = null;
                unset($plan['_confirmation']);
                $this->save($plan, $actor);

                return $this->publicPlan($plan);
            });
        } catch (RuntimeException $exception) {
            if ($exception instanceof HttpExceptionInterface) {
                throw $exception;
            }
            // Record a useful failure without committing a partial business mutation.
            DB::transaction(function () use ($id, $step, $actor, $exception): void {
                $plan = $this->load($id, $actor, true);
                if ($plan['status'] === 'AWAITING_CONFIRMATION' && $plan['currentStep'] === $step) {
                    $plan['error'] = $exception->getMessage();
                    unset($plan['_confirmation']);
                    $this->save($plan, $actor);
                }
            });
            throw $exception;
        }
    }

    public function cancel(string $id, array $actor): array
    {
        return DB::transaction(function () use ($id, $actor): array {
            $plan = $this->load($id, $actor, true);
            abort_if($plan['status'] === 'COMPLETED', 409, 'Ce plan est déjà terminé.');
            $plan['status'] = 'CANCELLED';
            unset($plan['_confirmation']);
            $this->save($plan, $actor);

            return $this->publicPlan($plan);
        });
    }

    private function assertCurrent(array $plan, int $step): void
    {
        abort_unless(
            $plan['status'] === 'AWAITING_CONFIRMATION' && $plan['currentStep'] === $step
                && isset($plan['steps'][$step]),
            409, 'Cette étape n’est plus l’étape à valider.',
        );
    }

    private function prefix(array $actor): string
    {
        $id = (string) ($actor['id'] ?? '');
        abort_if($id === '' || ($actor['role'] ?? null) !== 'maximus_admin', 403);

        return 'maxi-plan:'.hash('sha256', $id).':';
    }

    private function load(string $id, array $actor, bool $lock = false): array
    {
        $query = DB::table('maximus_app_states')->where('scope', $this->prefix($actor).$id);
        $row = ($lock ? $query->lockForUpdate() : $query)->first();
        abort_if(! $row, 404, 'Plan introuvable.');

        return $this->decode($row->payload);
    }

    private function decode(mixed $payload): array
    {
        return is_string($payload) ? json_decode($payload, true, 512, JSON_THROW_ON_ERROR) : (array) $payload;
    }

    private function publicPlan(array $plan): array
    {
        unset($plan['_confirmation']);

        return $plan;
    }

    private function save(array &$plan, array $actor): void
    {
        $plan['updatedAt'] = now()->toISOString();
        DB::table('maximus_app_states')->updateOrInsert(
            ['scope' => $this->prefix($actor).$plan['id']],
            ['company_id' => null, 'payload' => json_encode($plan, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                'version' => 1, 'updated_at' => now(), 'created_at' => now()],
        );
    }
}
