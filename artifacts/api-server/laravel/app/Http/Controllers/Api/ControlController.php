<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ControlAuditEntry;
use App\Models\ControlEvent;
use App\Models\ControlTask;
use App\Support\ControlAuthorization;
use App\Support\ControlTrace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ControlController extends Controller
{
    private const STATUSES = ['À FAIRE', 'EN COURS', 'VALIDÉ', 'REFUSÉ', 'TERMINÉ'];
    private const PRIORITIES = ['BASSE', 'NORMALE', 'HAUTE', 'CRITIQUE'];

    public function bootstrap(Request $request): JsonResponse
    {
        $query = Validator::make($request->query(), [
            'companyId' => ['nullable', 'string', 'min:1'],
            'scope' => ['nullable', 'in:admin,all,assigned,sector'],
        ])->validate();
        $scope = $query['scope'] ?? 'all';
        $actor = $request->attributes->get('authActor');
        $requestedCompany = $query['companyId'] ?? null;
        if ($actor['role'] !== 'maximus_admin') {
            if (empty($actor['companyId'])) {
                return response()->json(['error' => 'Aucune entreprise n’est associée à cet acteur.'], 403);
            }
            if ($requestedCompany && $requestedCompany !== $actor['companyId']) {
                return response()->json(['error' => 'Accès à cette entreprise non autorisé.'], 403);
            }
            $companyId = $actor['companyId'];
        } else {
            $companyId = $requestedCompany;
        }

        if ($scope !== 'admin' && !$companyId) {
            return response()->json(['error' => 'companyId requis pour ce périmètre'], 400);
        }
        if (!ControlAuthorization::canRead($actor, $companyId)) {
            return response()->json(['error' => 'Périmètre de contrôle non autorisé.'], 403);
        }

        $tasksQuery = ControlTask::query()->orderByDesc('updated_at');
        if ($companyId) {
            $tasksQuery->where('company_id', $companyId);
        }
        if ($actor['role'] === 'employee' && $actor['employeeId']) {
            $tasksQuery->where('assignee_employee_id', $actor['employeeId']);
        }
        if ($actor['role'] === 'sector_manager') {
            $sectorIds = $actor['sectorIds'] ?? [];
            $sectorIds ? $tasksQuery->whereIn('sector_id', $sectorIds) : $tasksQuery->where('sector_id', '__no_sector__');
        }

        $tasks = $tasksQuery->get();
        $taskIds = $tasks->pluck('id')->all();

        $eventsQuery = ControlEvent::query()->orderByDesc('created_at')->limit(200);
        $auditQuery = ControlAuditEntry::query()->orderByDesc('created_at')->limit(200);
        if ($companyId) {
            $eventsQuery->where('company_id', $companyId);
            $auditQuery->where('company_id', $companyId);
        }
        $events = $eventsQuery->get();
        $auditEntries = $auditQuery->get();

        if (!in_array($actor['role'], ['maximus_admin', 'company_admin'], true)) {
            $events = $events->filter(fn (ControlEvent $event) => $event->entity_id && in_array($event->entity_id, $taskIds, true))->values();
            $auditEntries = $auditEntries->filter(fn (ControlAuditEntry $audit) => $audit->entity_id && in_array($audit->entity_id, $taskIds, true))->values();
        }

        return response()->json([
            'tasks' => $tasks->map(fn (ControlTask $task) => $this->task($task))->values(),
            'events' => $events->map(fn (ControlEvent $event) => $this->event($event))->values(),
            'auditEntries' => $auditEntries->map(fn (ControlAuditEntry $audit) => $this->audit($audit))->values(),
        ]);
    }

    public function createTask(Request $request): JsonResponse
    {
        $input = $this->validateTask($request);
        $actor = $request->attributes->get('authActor');
        $input['companyId'] = (string) $request->attributes->get('companyId');
        $input['createdBy'] = $actor['displayName'];

        if (!ControlAuthorization::canCreate($actor, $input)) {
            return response()->json(['error' => 'Création hors périmètre autorisé.'], 403);
        }

        $taskId = $input['id'] ?? 'task-'.Str::uuid();
        $now = now();
        $taskValues = [
            'id' => $taskId,
            'company_id' => $input['companyId'],
            'sector_id' => $input['sectorId'] ?? null,
            'title' => $input['title'],
            'description' => $input['description'],
            'module_id' => $input['moduleId'] ?? null,
            'assignee_employee_id' => $input['assigneeEmployeeId'] ?? null,
            'assignee_name' => $input['assigneeName'] ?? null,
            'created_by' => $actor['displayName'],
            'status' => 'À FAIRE',
            'priority' => $input['priority'] ?? 'NORMALE',
            'requires_approval' => $input['requiresApproval'] ?? false,
            'due_date' => $input['dueDate'] ?? null,
            'related_object' => $input['relatedObject'] ?? null,
            'created_at' => $now,
            'updated_at' => $now,
        ];
        $trace = ControlTrace::created($input, $taskId, $actor, $now->toISOString());

        DB::transaction(function () use ($taskValues, $trace): void {
            ControlTask::query()->create($taskValues);
            ControlEvent::query()->create($trace['event']);
            ControlAuditEntry::query()->create($trace['audit']);
        });

        return response()->json($this->task(ControlTask::query()->findOrFail($taskId)), 201);
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $input = Validator::make($request->all(), [
            'status' => ['required', 'in:'.implode(',', self::STATUSES)],
        ])->validate();
        $actor = $request->attributes->get('authActor');
        $companyId = $request->attributes->get('companyId');
        $task = ControlTask::query()->find($id);

        if (!$task) {
            return response()->json(['error' => 'Tâche introuvable'], 404);
        }

        $before = $this->task($task);
        if ($task->company_id !== $companyId || !ControlAuthorization::canUpdate($actor, $before)) {
            return response()->json(['error' => 'Modification hors périmètre autorisé.'], 403);
        }

        $now = now();
        $trace = ControlTrace::status($before, $input['status'], $actor, $now->toISOString());

        DB::transaction(function () use ($task, $input, $trace, $now): void {
            $task->update(['status' => $input['status'], 'updated_at' => $now]);
            ControlEvent::query()->create($trace['event']);
            ControlAuditEntry::query()->create($trace['audit']);
        });

        return response()->json($this->task($task->refresh()));
    }

    private function validateTask(Request $request): array
    {
        return Validator::make($request->all(), [
            'id' => ['nullable', 'string', 'min:1'],
            'sectorId' => ['nullable', 'string', 'min:1'],
            'title' => ['required', 'string', 'min:1', 'max:180'],
            'description' => ['required', 'string', 'min:1', 'max:4000'],
            'moduleId' => ['nullable', 'string', 'min:1'],
            'assigneeEmployeeId' => ['nullable', 'string', 'min:1'],
            'assigneeName' => ['nullable', 'string', 'min:1'],
            'priority' => ['nullable', 'in:'.implode(',', self::PRIORITIES)],
            'requiresApproval' => ['nullable', 'boolean'],
            'dueDate' => ['nullable', 'string', 'max:80'],
            'relatedObject' => ['nullable', 'string', 'max:180'],
        ])->validate();
    }

    private function task(ControlTask $task): array
    {
        return [
            'id' => $task->id,
            'companyId' => $task->company_id,
            'sectorId' => $task->sector_id,
            'title' => $task->title,
            'description' => $task->description,
            'moduleId' => $task->module_id,
            'assigneeEmployeeId' => $task->assignee_employee_id,
            'assigneeName' => $task->assignee_name,
            'createdBy' => $task->created_by,
            'status' => $task->status,
            'priority' => $task->priority,
            'requiresApproval' => (bool) $task->requires_approval,
            'dueDate' => $task->due_date,
            'relatedObject' => $task->related_object,
            'createdAt' => $task->created_at?->toISOString(),
            'updatedAt' => $task->updated_at?->toISOString(),
        ];
    }

    private function event(ControlEvent $event): array
    {
        return [
            'id' => $event->id,
            'type' => $event->type,
            'label' => $event->label,
            'summary' => $event->summary,
            'companyId' => $event->company_id,
            'moduleId' => $event->module_id,
            'actorName' => $event->actor_name,
            'entityType' => $event->entity_type,
            'entityId' => $event->entity_id,
            'severity' => $event->severity,
            'createdAt' => $event->created_at?->toISOString(),
        ];
    }

    private function audit(ControlAuditEntry $audit): array
    {
        return [
            'id' => $audit->id,
            'action' => $audit->action,
            'summary' => $audit->summary,
            'companyId' => $audit->company_id,
            'moduleId' => $audit->module_id,
            'actorName' => $audit->actor_name,
            'entityType' => $audit->entity_type,
            'entityId' => $audit->entity_id,
            'createdAt' => $audit->created_at?->toISOString(),
        ];
    }
}