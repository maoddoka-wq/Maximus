<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PresenceItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class PresenceController extends Controller
{
    private const TYPES = ['attendance', 'absence', 'schedule', 'planning', 'mission', 'leave', 'holiday', 'settings', 'history'];
    private const STATUSES = ['ACTIF', 'EN ATTENTE', 'APPROUVÉE', 'REFUSÉE', 'BROUILLON', 'VALIDÉE', 'ARCHIVÉE'];

    public function bootstrap(Request $request): JsonResponse
    {
        $companyId = $this->company($request);
        if (!$companyId) {
            return response()->json(['error' => 'companyId requis'], 400);
        }

        $items = PresenceItem::query()
            ->where('company_id', $companyId)
            ->orderByDesc('updated_at')
            ->orderBy('work_date')
            ->get()
            ->map(fn (PresenceItem $item) => $this->item($item))
            ->values();

        return response()->json(['items' => $items]);
    }

    public function create(Request $request): JsonResponse
    {
        $input = $this->validateItem($request);
        $actor = $input['actor'] ?? 'Utilisateur MAXIMUS';
        $now = now();
        $item = PresenceItem::query()->create([
            'id' => 'presence-'.$input['type'].'-'.Str::uuid(),
            'company_id' => $input['companyId'],
            'type' => $input['type'],
            'employee_id' => $input['employeeId'] ?? null,
            'work_date' => $input['workDate'] ?? null,
            'start_date' => $input['startDate'] ?? null,
            'end_date' => $input['endDate'] ?? null,
            'status' => $input['status'] ?? 'ACTIF',
            'payload' => $input['payload'] ?? [],
            'created_by' => $actor,
            'updated_by' => $actor,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $this->writeHistory($input['companyId'], $actor, $input['type'].'.create', [
            'itemId' => $item->id,
            'newValue' => $input['payload'] ?? [],
            'employeeId' => $input['employeeId'] ?? null,
            'workDate' => $input['workDate'] ?? null,
        ]);

        return response()->json($this->item($item), 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $input = $this->validateItem($request, true);
        $companyId = $this->company($request);
        $item = PresenceItem::query()->where('id', $id)->where('company_id', $companyId)->first();

        if (!$item) {
            return response()->json(['error' => 'Enregistrement introuvable'], 404);
        }

        $actor = $input['actor'] ?? 'Utilisateur MAXIMUS';
        $changes = [];
        foreach ([
            'type' => 'type',
            'employeeId' => 'employee_id',
            'workDate' => 'work_date',
            'startDate' => 'start_date',
            'endDate' => 'end_date',
            'status' => 'status',
            'payload' => 'payload',
        ] as $from => $to) {
            if (array_key_exists($from, $input)) {
                $changes[$to] = $input[$from];
            }
        }
        $changes['updated_by'] = $actor;
        $changes['updated_at'] = now();
        $oldPayload = $item->payload ?? [];
        $item->update($changes);

        $this->writeHistory($companyId, $actor, $item->type.'.update', [
            'itemId' => $item->id,
            'oldValue' => $oldPayload,
            'newValue' => $item->payload ?? ($input['payload'] ?? $oldPayload),
            'employeeId' => $item->employee_id,
            'workDate' => $item->work_date,
        ]);

        return response()->json($this->item($item->refresh()));
    }

    public function delete(Request $request, string $id): JsonResponse
    {
        $companyId = $this->company($request);
        $item = PresenceItem::query()->where('id', $id)->where('company_id', $companyId)->first();
        if (!$item) {
            return response()->json(['error' => 'Enregistrement introuvable'], 404);
        }

        $actor = is_string($request->input('actor')) ? $request->input('actor') : 'Utilisateur MAXIMUS';
        $item->delete();
        $this->writeHistory($companyId, $actor, $item->type.'.delete', [
            'itemId' => $item->id,
            'oldValue' => $item->payload ?? [],
            'employeeId' => $item->employee_id,
            'workDate' => $item->work_date,
        ]);

        return response()->json(['ok' => true]);
    }

    public function clock(Request $request): JsonResponse
    {
        $input = Validator::make($request->all(), [
            'companyId' => ['required', 'string', 'min:1'],
            'employeeId' => ['required', 'string', 'min:1'],
            'workDate' => ['required', 'regex:/^\d{4}-\d{2}-\d{2}$/'],
            'action' => ['required', 'in:arrival,exit,pauseStart,pauseEnd'],
            'actor' => ['nullable', 'string'],
            'now' => ['nullable', 'date'],
            'expectedStart' => ['nullable', 'regex:/^\d{2}:\d{2}$/'],
            'tolerance' => ['nullable', 'integer', 'min:0'],
        ])->validate();
        $actor = $input['actor'] ?? 'Utilisateur MAXIMUS';
        $tolerance = $input['tolerance'] ?? 10;

        $item = PresenceItem::query()
            ->where('company_id', $input['companyId'])
            ->where('type', 'attendance')
            ->where('employee_id', $input['employeeId'])
            ->where('work_date', $input['workDate'])
            ->orderByDesc('updated_at')
            ->first();
        $payload = $item?->payload ?? [];
        $clockTime = Carbon::parse($input['now'] ?? now())->format('H:i');

        if ($input['action'] === 'arrival' && !empty($payload['arrival'])) {
            return response()->json(['error' => 'Arrivée déjà enregistrée pour cette journée.'], 409);
        }
        if ($input['action'] === 'exit' && (empty($payload['arrival']) || !empty($payload['exit']))) {
            return response()->json(['error' => !empty($payload['exit']) ? 'Sortie déjà enregistrée pour cette journée.' : 'Pointez d’abord l’arrivée.'], 409);
        }
        if ($input['action'] === 'pauseStart' && (empty($payload['arrival']) || !empty($payload['exit']) || !empty($payload['pauseStart']))) {
            return response()->json(['error' => !empty($payload['pauseStart']) ? 'Pause déjà commencée.' : 'Action de pause incohérente.'], 409);
        }
        if ($input['action'] === 'pauseEnd' && (empty($payload['pauseStart']) || !empty($payload['pauseEnd']))) {
            return response()->json(['error' => !empty($payload['pauseEnd']) ? 'Pause déjà terminée.' : 'Commencez d’abord une pause.'], 409);
        }

        if ($input['action'] === 'arrival') {
            $payload['arrival'] = $clockTime;
            $payload['lateMinutes'] = isset($input['expectedStart'])
                ? max(0, $this->minutes($clockTime) - $this->minutes($input['expectedStart']) - $tolerance)
                : 0;
            $payload['status'] = 'Présent';
        } elseif ($input['action'] === 'exit') {
            $payload['exit'] = $clockTime;
            $payload['status'] = 'Présent';
        } elseif ($input['action'] === 'pauseStart') {
            $payload['pauseStart'] = $clockTime;
            $payload['status'] = 'En pause';
        } else {
            $payload['pauseEnd'] = $clockTime;
            $payload['status'] = 'Présent';
            $payload['pauseMinutes'] = isset($payload['pauseStart'])
                ? max(0, $this->minutes($clockTime) - $this->minutes((string) $payload['pauseStart']))
                : 0;
        }

        if ($item) {
            $item->update(['payload' => $payload, 'status' => 'ACTIF', 'updated_by' => $actor, 'updated_at' => now()]);
            $httpStatus = 200;
        } else {
            $item = PresenceItem::query()->create([
                'id' => 'presence-attendance-'.Str::uuid(),
                'company_id' => $input['companyId'],
                'type' => 'attendance',
                'employee_id' => $input['employeeId'],
                'work_date' => $input['workDate'],
                'status' => 'ACTIF',
                'payload' => $payload,
                'created_by' => $actor,
                'updated_by' => $actor,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $httpStatus = 201;
        }

        $this->writeHistory($input['companyId'], $actor, 'clock.'.$input['action'], [
            'itemId' => $item->id,
            'newValue' => [$input['action'] => $clockTime],
            'employeeId' => $input['employeeId'],
            'workDate' => $input['workDate'],
        ]);

        return response()->json($this->item($item->refresh()), $httpStatus);
    }

    private function validateItem(Request $request, bool $partial = false): array
    {
        $rules = [
            'companyId' => [$partial ? 'nullable' : 'required', 'string', 'min:1'],
            'type' => [$partial ? 'nullable' : 'required', 'in:'.implode(',', self::TYPES)],
            'employeeId' => ['nullable', 'string'],
            'workDate' => ['nullable', 'string'],
            'startDate' => ['nullable', 'string'],
            'endDate' => ['nullable', 'string'],
            'status' => ['nullable', 'in:'.implode(',', self::STATUSES)],
            'payload' => ['nullable', 'array'],
            'actor' => ['nullable', 'string'],
        ];

        return Validator::make($request->all(), $rules)->validate();
    }

    private function company(Request $request): ?string
    {
        $value = $request->query('companyId', $request->input('companyId'));
        return is_string($value) && $value !== '' ? $value : null;
    }

    private function writeHistory(string $companyId, string $actor, string $action, array $payload): void
    {
        PresenceItem::query()->create([
            'id' => 'presence-history-'.Str::uuid(),
            'company_id' => $companyId,
            'type' => 'history',
            'status' => 'ACTIF',
            'payload' => array_merge(['action' => $action], $payload),
            'created_by' => $actor,
            'updated_by' => $actor,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function minutes(string $value): int
    {
        [$hours, $minutes] = array_map('intval', explode(':', $value));
        return $hours * 60 + $minutes;
    }

    private function item(PresenceItem $item): array
    {
        return [
            'id' => $item->id,
            'companyId' => $item->company_id,
            'type' => $item->type,
            'employeeId' => $item->employee_id,
            'workDate' => $item->work_date,
            'startDate' => $item->start_date,
            'endDate' => $item->end_date,
            'status' => $item->status,
            'payload' => $item->payload ?? [],
            'createdBy' => $item->created_by,
            'updatedBy' => $item->updated_by,
            'createdAt' => $item->created_at?->toISOString(),
            'updatedAt' => $item->updated_at?->toISOString(),
        ];
    }
}