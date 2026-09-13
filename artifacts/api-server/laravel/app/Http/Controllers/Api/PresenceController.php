<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PresenceItem;
use App\Support\ModuleAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class PresenceController extends Controller
{
    private const TYPES = ['attendance', 'absence', 'schedule', 'leave', 'history'];

    private const WRITABLE_TYPES = ['attendance', 'absence', 'schedule', 'leave'];

    private const STATUSES = ['ACTIF', 'EN ATTENTE', 'APPROUVÉE', 'REFUSÉE', 'BROUILLON', 'VALIDÉE', 'ARCHIVÉE'];

    public function bootstrap(Request $request): JsonResponse
    {
        $companyId = $this->company($request);
        if (! $companyId) {
            return response()->json(['error' => 'companyId requis'], 400);
        }
        $actor = $request->attributes->get('authActor');
        if (! is_array($actor) || ! ModuleAuthorization::allows($actor, 'presences', 'view')) {
            return $this->forbidden();
        }

        $query = PresenceItem::query()
            ->where('company_id', $companyId)
            ->when(($actor['role'] ?? null) === 'employee', fn ($query) => $query->where('employee_id', $actor['employeeId'] ?? '__no_employee__'))
            ->orderByDesc('updated_at')
            ->orderBy('work_date');
        $items = $query->get()
            ->map(fn (PresenceItem $item) => $this->item($item))
            ->values();

        return response()->json(['items' => $items]);
    }

    public function create(Request $request): JsonResponse
    {
        $input = $this->validateItem($request);
        $companyId = $this->company($request);
        if (! $companyId) {
            return response()->json(['error' => 'Contexte entreprise requis.'], 400);
        }
        $actorData = $request->attributes->get('authActor');
        if (! is_array($actorData) || ! ModuleAuthorization::allows($actorData, 'presences', 'create')) {
            return $this->forbidden();
        }
        if (($actorData['role'] ?? null) === 'employee'
            && ($input['employeeId'] ?? null) !== ($actorData['employeeId'] ?? null)) {
            return $this->forbidden();
        }
        $actor = $this->actorName($request);
        $now = now();
        $item = PresenceItem::query()->create([
            'id' => 'presence-'.$input['type'].'-'.Str::uuid(),
            'company_id' => $companyId,
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

        $this->writeHistory($companyId, $actor, $input['type'].'.create', [
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

        if (! $item) {
            return response()->json(['error' => 'Enregistrement introuvable'], 404);
        }

        if ($item->type === 'history') {
            return response()->json(['error' => 'L’historique est généré par le serveur.'], 403);
        }
        $actorData = $request->attributes->get('authActor');
        if (! is_array($actorData)
            || (($actorData['role'] ?? null) === 'employee' && $item->employee_id !== ($actorData['employeeId'] ?? null))
            || (! ModuleAuthorization::allows($actorData, 'presences', 'correct')
                && ! ModuleAuthorization::allows($actorData, 'presences', 'edit')
                && ! ModuleAuthorization::allows($actorData, 'presences', 'modify'))) {
            return $this->forbidden();
        }

        $actor = $this->actorName($request);
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
        if (! $item) {
            return response()->json(['error' => 'Enregistrement introuvable'], 404);
        }

        if ($item->type === 'history') {
            return response()->json(['error' => 'L’historique est généré par le serveur.'], 403);
        }
        $actorData = $request->attributes->get('authActor');
        if (! is_array($actorData)
            || (($actorData['role'] ?? null) === 'employee' && $item->employee_id !== ($actorData['employeeId'] ?? null))
            || (! ModuleAuthorization::allows($actorData, 'presences', 'delete')
                && ! ModuleAuthorization::allows($actorData, 'presences', 'manage'))) {
            return $this->forbidden();
        }

        $actor = $this->actorName($request);
        $item->delete();
        $this->writeHistory($companyId, $actor, $item->type.'.delete', [
            'itemId' => $item->id,
            'oldValue' => $item->payload ?? [],
            'employeeId' => $item->employee_id,
            'workDate' => $item->work_date,
        ]);

        return response()->json(['ok' => true]);
    }

    public function clockQr(Request $request): JsonResponse
    {
        $input = Validator::make($request->all(), [
            'workDate' => ['nullable', 'regex:/^\d{4}-\d{2}-\d{2}$/'],
        ])->validate();
        $companyId = $this->company($request);
        $actorData = $request->attributes->get('authActor');
        if (! $companyId || ! is_array($actorData) || ! ModuleAuthorization::allows($actorData, 'presences', 'manage')) {
            return $this->forbidden();
        }

        $workDate = $input['workDate'] ?? now()->format('Y-m-d');
        $expiresAt = Carbon::createFromFormat('Y-m-d H:i:s', $workDate.' 23:59:59');
        if ($expiresAt === false || $expiresAt->isPast()) {
            return response()->json(['error' => 'La date de pointage est déjà expirée.'], 422);
        }

        $encoded = $this->encodeClockQrPayload([
            'version' => 1,
            'companyId' => $companyId,
            'workDate' => $workDate,
            'expiresAt' => $expiresAt->timestamp,
        ]);
        $token = $encoded.'.'.hash_hmac('sha256', $encoded, $this->clockQrKey());

        return response()->json([
            'token' => $token,
            'workDate' => $workDate,
            'expiresAt' => $expiresAt->toISOString(),
        ]);
    }

    public function clock(Request $request): JsonResponse
    {
        $input = Validator::make($request->all(), [
            'employeeId' => ['required', 'string', 'min:1'],
            'workDate' => ['required', 'regex:/^\d{4}-\d{2}-\d{2}$/'],
            'action' => ['required', 'in:arrival,exit,pauseStart,pauseEnd'],
            'now' => ['nullable', 'date'],
            'expectedStart' => ['nullable', 'regex:/^\d{2}:\d{2}$/'],
            'tolerance' => ['nullable', 'integer', 'min:0'],
        ])->validate();
        $companyId = $this->company($request);
        $actorData = $request->attributes->get('authActor');
        if (! $companyId || ! is_array($actorData)
            || ! ModuleAuthorization::allowsPresenceClock($actorData, $input['employeeId'])) {
            return $this->forbidden();
        }

        return $this->recordClock($input, $companyId, $actorData);
    }

    public function clockScan(Request $request): JsonResponse
    {
        $input = Validator::make($request->all(), [
            'token' => ['required', 'string', 'min:20'],
            'action' => ['required', 'in:arrival,exit'],
        ])->validate();
        $companyId = $this->company($request);
        $actorData = $request->attributes->get('authActor');
        if (! $companyId || ! is_array($actorData) || ($actorData['role'] ?? null) !== 'employee') {
            return $this->forbidden();
        }
        $employeeId = (string) ($actorData['employeeId'] ?? '');
        $tokenPayload = $this->decodeClockQrPayload($input['token']);
        if ($employeeId === '' || ! is_array($tokenPayload)
            || ($tokenPayload['companyId'] ?? null) !== $companyId
            || ($tokenPayload['expiresAt'] ?? 0) < now()->timestamp) {
            return response()->json(['error' => 'QR code invalide ou expiré.'], 422);
        }

        $settings = PresenceItem::query()
            ->where('company_id', $companyId)
            ->where('type', 'settings')
            ->latest('updated_at')
            ->value('payload');
        $settings = is_array($settings) ? $settings : [];

        return $this->recordClock([
            'employeeId' => $employeeId,
            'workDate' => $tokenPayload['workDate'],
            'action' => $input['action'],
            'expectedStart' => $settings['expectedStart'] ?? null,
            'tolerance' => isset($settings['tolerance']) ? (int) $settings['tolerance'] : 10,
        ], $companyId, $actorData);
    }

    private function recordClock(array $input, string $companyId, array $actorData): JsonResponse
    {
        if (! ModuleAuthorization::allowsPresenceClock($actorData, $input['employeeId'])) {
            return $this->forbidden();
        }

        $actor = (string) ($actorData['displayName'] ?? 'Utilisateur MAXIMUS');
        $tolerance = $input['tolerance'] ?? 10;
        $item = PresenceItem::query()
            ->where('company_id', $companyId)
            ->where('type', 'attendance')
            ->where('employee_id', $input['employeeId'])
            ->where('work_date', $input['workDate'])
            ->orderByDesc('updated_at')
            ->first();
        $payload = $item?->payload ?? [];
        $clockMoment = Carbon::parse($input['now'] ?? now());
        $clockTime = $clockMoment->format('H:i');
        $clockAt = $clockMoment->toISOString();

        if ($input['action'] === 'arrival' && ! empty($payload['arrival'])) {
            return response()->json(['error' => 'Arrivée déjà enregistrée pour cette journée.'], 409);
        }
        if ($input['action'] === 'exit' && (empty($payload['arrival']) || ! empty($payload['exit']))) {
            return response()->json(['error' => ! empty($payload['exit']) ? 'Sortie déjà enregistrée pour cette journée.' : 'Pointez d’abord l’arrivée.'], 409);
        }
        if ($input['action'] === 'pauseStart' && (empty($payload['arrival']) || ! empty($payload['exit']) || ! empty($payload['pauseStart']))) {
            return response()->json(['error' => ! empty($payload['pauseStart']) ? 'Pause déjà commencée.' : 'Action de pause incohérente.'], 409);
        }
        if ($input['action'] === 'pauseEnd' && (empty($payload['pauseStart']) || ! empty($payload['pauseEnd']))) {
            return response()->json(['error' => ! empty($payload['pauseEnd']) ? 'Pause déjà terminée.' : 'Commencez d’abord une pause.'], 409);
        }

        if ($input['action'] === 'arrival') {
            $payload['arrival'] = $clockTime;
            $payload['arrivalAt'] = $clockAt;
            $payload['lateMinutes'] = isset($input['expectedStart']) && is_string($input['expectedStart'])
                ? max(0, $this->minutes($clockTime) - $this->minutes($input['expectedStart']) - $tolerance)
                : 0;
            $payload['status'] = 'Présent';
        } elseif ($input['action'] === 'exit') {
            $payload['exit'] = $clockTime;
            $payload['exitAt'] = $clockAt;
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
                'company_id' => $companyId,
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

        $this->writeHistory($companyId, $actor, 'clock.'.$input['action'], [
            'itemId' => $item->id,
            'newValue' => [$input['action'] => $clockTime, $input['action'].'At' => $clockAt],
            'employeeId' => $input['employeeId'],
            'workDate' => $input['workDate'],
        ]);

        return response()->json($this->item($item->refresh()), $httpStatus);
    }

    private function clockQrKey(): string
    {
        return (string) config('app.key');
    }

    private function encodeClockQrPayload(array $payload): string
    {
        $encoded = base64_encode(json_encode($payload, JSON_THROW_ON_ERROR));

        return rtrim(strtr($encoded, '+/', '-_'), '=');
    }

    private function decodeClockQrPayload(string $token): ?array
    {
        [$encoded, $signature] = array_pad(explode('.', $token, 2), 2, null);
        if (! is_string($encoded) || ! is_string($signature) || ! hash_equals(hash_hmac('sha256', $encoded, $this->clockQrKey()), $signature)) {
            return null;
        }

        $base64 = strtr($encoded, '-_', '+/');
        $base64 .= str_repeat('=', (4 - strlen($base64) % 4) % 4);
        $decoded = base64_decode($base64, true);
        $payload = is_string($decoded) ? json_decode($decoded, true) : null;

        return is_array($payload)
            && ($payload['version'] ?? null) === 1
            && is_string($payload['companyId'] ?? null)
            && is_string($payload['workDate'] ?? null)
            && is_numeric($payload['expiresAt'] ?? null)
            ? $payload
            : null;
    }

    private function validateItem(Request $request, bool $partial = false): array
    {
        $rules = [
            'type' => [$partial ? 'nullable' : 'required', 'in:'.implode(',', self::WRITABLE_TYPES)],
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
        $value = $request->attributes->get('companyId');

        return is_string($value) && $value !== '' ? $value : null;
    }

    private function actorName(Request $request): string
    {
        $actor = $request->attributes->get('authActor');

        return is_array($actor) && is_string($actor['displayName'] ?? null) && $actor['displayName'] !== ''
            ? $actor['displayName']
            : 'Utilisateur MAXIMUS';
    }

    private function forbidden(): JsonResponse
    {
        return response()->json(['error' => 'Permission Présences insuffisante.'], 403);
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
