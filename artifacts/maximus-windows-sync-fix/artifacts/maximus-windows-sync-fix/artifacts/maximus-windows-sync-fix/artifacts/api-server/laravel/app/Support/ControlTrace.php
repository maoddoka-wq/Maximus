<?php

namespace App\Support;

use Illuminate\Support\Str;

final class ControlTrace
{
    public static function created(array $input, string $taskId, array $actor, string $now): array
    {
        return [
            'event' => [
                'id' => 'event-'.Str::uuid(),
                'type' => 'TASK_CREATED',
                'label' => 'Tâche créée',
                'summary' => $input['title'],
                'company_id' => $input['companyId'],
                'module_id' => $input['moduleId'] ?? null,
                'actor_name' => $actor['displayName'],
                'entity_type' => 'task',
                'entity_id' => $taskId,
                'severity' => 'info',
                'created_at' => $now,
            ],
            'audit' => [
                'id' => 'audit-'.Str::uuid(),
                'action' => 'TÂCHE_CRÉÉE',
                'summary' => $input['title'].' a été créée.',
                'company_id' => $input['companyId'],
                'module_id' => $input['moduleId'] ?? null,
                'actor_name' => $actor['displayName'],
                'entity_type' => 'task',
                'entity_id' => $taskId,
                'created_at' => $now,
            ],
        ];
    }

    public static function status(array $task, string $nextStatus, array $actor, string $now): array
    {
        $granted = in_array($nextStatus, ['VALIDÉ', 'TERMINÉ'], true);
        $refused = $nextStatus === 'REFUSÉ';
        $type = $granted ? 'APPROVAL_GRANTED' : ($refused ? 'APPROVAL_REFUSED' : 'TASK_STATUS_CHANGED');
        $label = $granted ? 'Validation accordée' : ($refused ? 'Validation refusée' : 'Tâche mise à jour');

        return [
            'event' => [
                'id' => 'event-'.Str::uuid(),
                'type' => $type,
                'label' => $label,
                'summary' => $task['title'].' · '.$task['status'].' → '.$nextStatus,
                'company_id' => $task['companyId'],
                'module_id' => $task['moduleId'] ?? null,
                'actor_name' => $actor['displayName'],
                'entity_type' => 'task',
                'entity_id' => $task['id'],
                'severity' => $refused ? 'error' : ($granted ? 'success' : 'info'),
                'created_at' => $now,
            ],
            'audit' => [
                'id' => 'audit-'.Str::uuid(),
                'action' => 'TÂCHE_'.str_replace(' ', '_', $nextStatus),
                'summary' => $task['title'].' est passée de '.$task['status'].' à '.$nextStatus.'.',
                'company_id' => $task['companyId'],
                'module_id' => $task['moduleId'] ?? null,
                'actor_name' => $actor['displayName'],
                'entity_type' => 'task',
                'entity_id' => $task['id'],
                'created_at' => $now,
            ],
        ];
    }
}