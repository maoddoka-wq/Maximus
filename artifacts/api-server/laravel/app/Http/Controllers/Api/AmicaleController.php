<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AmicaleRecord;
use App\Support\ModuleAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class AmicaleController extends Controller
{
    private const RECORD_FEATURES = [
        'member' => 'membres',
        'contribution' => 'cotisations',
        'expense' => 'depenses',
        'activity' => 'activites',
        'announcement' => 'annonces',
    ];

    public function bootstrap(Request $request): JsonResponse
    {
        if (! $this->allows($request, 'view')) {
            return $this->forbidden();
        }

        $companyId = $this->company($request);
        $visibleTypes = collect(self::RECORD_FEATURES)
            ->filter(fn (string $feature): bool => $this->allows($request, 'view', $feature))
            ->keys()
            ->all();

        $records = AmicaleRecord::query()
            ->where('company_id', $companyId)
            ->whereIn('type', $visibleTypes)
            ->orderByDesc('updated_at')
            ->get();

        $memberNames = AmicaleRecord::query()
            ->where('company_id', $companyId)
            ->where('type', 'member')
            ->whereIn('id', $records->where('type', 'contribution')->pluck('member_id')->unique())
            ->get(['id', 'title'])
            ->keyBy('id');

        return response()->json([
            'members' => $records->where('type', 'member')
                ->map(fn (AmicaleRecord $record): array => $this->member($record))
                ->values(),
            'contributions' => $records->where('type', 'contribution')
                ->map(fn (AmicaleRecord $record): array => $this->contribution(
                    $record,
                    $memberNames->get($record->member_id)?->title,
                ))
                ->values(),
            'expenses' => $records->where('type', 'expense')
                ->map(fn (AmicaleRecord $record): array => $this->expense($record))
                ->values(),
            'activities' => $records->where('type', 'activity')
                ->map(fn (AmicaleRecord $record): array => $this->activity($record))
                ->values(),
            'announcements' => $records->where('type', 'announcement')
                ->map(fn (AmicaleRecord $record): array => $this->announcement($record))
                ->values(),
        ]);
    }

    public function createMember(Request $request): JsonResponse
    {
        if (! $this->allows($request, 'create', 'membres')) {
            return $this->forbidden();
        }

        $input = Validator::make($request->all(), $this->memberRules())->validate();
        $studentIdentifier = $this->normalizeStudentIdentifier($input['studentIdentifier'] ?? null);

        if ($this->studentIdentifierExists($request, $studentIdentifier)) {
            return $this->duplicateStudentIdentifier();
        }

        $payload = $this->memberPayload($input);
        $record = $this->storeRecord($request, 'member', $input['name'], 'ACTIVE', [
            'student_identifier' => $studentIdentifier,
            'payload' => $payload,
        ]);

        return response()->json(['member' => $this->member($record)], 201);
    }

    public function updateMember(Request $request, string $id): JsonResponse
    {
        if (! $this->allows($request, 'edit', 'membres')) {
            return $this->forbidden();
        }

        $record = $this->record($request, $id, 'member');
        if (! $record) {
            return $this->notFound();
        }

        $input = Validator::make($request->all(), $this->memberRules(true))->validate();
        $studentIdentifier = array_key_exists('studentIdentifier', $input)
            ? $this->normalizeStudentIdentifier($input['studentIdentifier'])
            : $record->student_identifier;

        if ($this->studentIdentifierExists($request, $studentIdentifier, $id)) {
            return $this->duplicateStudentIdentifier();
        }

        $oldFields = array_keys($input);
        $payload = array_merge($record->payload ?? [], $this->memberPayload($input));
        $changes = [
            'payload' => $payload,
            'student_identifier' => $studentIdentifier,
            'updated_by' => $this->actorName($request),
            'updated_by_user_id' => $this->actorId($request),
        ];
        if (array_key_exists('name', $input)) {
            $changes['title'] = trim($input['name']);
        }

        $record->update($changes);
        $this->audit($request, $record, 'member.update', ['fields' => $oldFields]);

        return response()->json(['member' => $this->member($record->fresh())]);
    }

    public function archiveMember(Request $request, string $id): JsonResponse
    {
        if (! $this->allows($request, 'edit', 'membres')) {
            return $this->forbidden();
        }

        $record = $this->record($request, $id, 'member');
        if (! $record) {
            return $this->notFound();
        }

        if ($record->status !== 'ARCHIVED') {
            $record->update([
                'status' => 'ARCHIVED',
                'updated_by' => $this->actorName($request),
                'updated_by_user_id' => $this->actorId($request),
            ]);
            $this->audit($request, $record, 'member.archive', []);
        }

        return response()->json(['member' => $this->member($record->fresh())]);
    }

    public function createContribution(Request $request): JsonResponse
    {
        if (! $this->allows($request, 'create', 'cotisations')) {
            return $this->forbidden();
        }

        $input = Validator::make($request->all(), [
            'memberId' => ['required', 'string', 'max:100'],
            'period' => ['required', 'string', 'max:40'],
            'amount' => ['required', 'integer', 'min:1', 'max:999999999999999'],
            'paidOn' => ['required', 'date'],
            'method' => ['required', 'in:CASH,MOBILE_MONEY,BANK_TRANSFER,OTHER'],
            'note' => ['nullable', 'string', 'max:1000'],
        ])->validate();

        $member = $this->record($request, $input['memberId'], 'member');
        if (! $member || $member->status !== 'ACTIVE') {
            return response()->json(['error' => 'Choisissez un membre actif de cette amicale.'], 422);
        }

        $record = $this->storeRecord($request, 'contribution', 'Cotisation '.$input['period'], 'PAID', [
            'member_id' => $member->id,
            'amount' => (int) $input['amount'],
            'occurred_on' => $input['paidOn'],
            'payload' => [
                'member_name' => $member->title,
                'period' => trim($input['period']),
                'method' => $input['method'],
                'note' => trim((string) ($input['note'] ?? '')),
            ],
        ]);

        return response()->json([
            'contribution' => $this->contribution($record, $member->title),
        ], 201);
    }

    public function createExpense(Request $request): JsonResponse
    {
        if (! $this->allows($request, 'create', 'depenses')) {
            return $this->forbidden();
        }

        $input = Validator::make($request->all(), [
            'title' => ['required', 'string', 'max:180'],
            'category' => ['required', 'string', 'max:80'],
            'amount' => ['required', 'integer', 'min:1', 'max:999999999999999'],
            'expenseDate' => ['required', 'date'],
            'description' => ['nullable', 'string', 'max:3000'],
            'vendor' => ['nullable', 'string', 'max:180'],
        ])->validate();

        $record = $this->storeRecord($request, 'expense', $input['title'], 'PENDING', [
            'amount' => (int) $input['amount'],
            'occurred_on' => $input['expenseDate'],
            'payload' => [
                'category' => trim($input['category']),
                'description' => trim((string) ($input['description'] ?? '')),
                'vendor' => trim((string) ($input['vendor'] ?? '')),
                'decisionNote' => '',
                'approvedBy' => '',
            ],
        ]);

        return response()->json(['expense' => $this->expense($record)], 201);
    }

    public function decideExpense(Request $request, string $id): JsonResponse
    {
        if (! $this->allows($request, 'edit', 'depenses')) {
            return $this->forbidden();
        }

        $input = Validator::make($request->all(), [
            'status' => ['required', 'in:APPROVED,REJECTED'],
            'decisionNote' => ['nullable', 'string', 'max:1000'],
        ])->validate();
        $record = $this->record($request, $id, 'expense');
        if (! $record) {
            return $this->notFound();
        }
        if ($record->status !== 'PENDING') {
            return response()->json(['error' => 'Seule une dépense en attente peut être décidée.'], 409);
        }
        if ($record->created_by_user_id !== null && $record->created_by_user_id === $this->actorId($request)) {
            return response()->json(['error' => 'Une dépense ne peut pas être approuvée par son créateur.'], 403);
        }

        $payload = $record->payload ?? [];
        $payload['decisionNote'] = trim((string) ($input['decisionNote'] ?? ''));
        $payload['approvedBy'] = $this->actorName($request);
        $record->update([
            'status' => $input['status'],
            'payload' => $payload,
            'updated_by' => $this->actorName($request),
            'updated_by_user_id' => $this->actorId($request),
        ]);
        $this->audit($request, $record, 'expense.decision', [
            'from' => 'PENDING',
            'to' => $input['status'],
            'amount' => $record->amount,
        ]);

        return response()->json(['expense' => $this->expense($record->fresh())]);
    }

    public function markExpensePaid(Request $request, string $id): JsonResponse
    {
        if (! $this->allows($request, 'edit', 'depenses')) {
            return $this->forbidden();
        }

        $record = $this->record($request, $id, 'expense');
        if (! $record) {
            return $this->notFound();
        }
        if ($record->status !== 'APPROVED') {
            return response()->json(['error' => 'Seule une dépense approuvée peut être marquée comme payée.'], 409);
        }

        $record->update([
            'status' => 'PAID',
            'updated_by' => $this->actorName($request),
            'updated_by_user_id' => $this->actorId($request),
        ]);
        $this->audit($request, $record, 'expense.paid', [
            'from' => 'APPROVED',
            'to' => 'PAID',
            'amount' => $record->amount,
        ]);

        return response()->json(['expense' => $this->expense($record->fresh())]);
    }

    public function createActivity(Request $request): JsonResponse
    {
        if (! $this->allows($request, 'create', 'activites')) {
            return $this->forbidden();
        }

        $input = Validator::make($request->all(), $this->activityRules())->validate();
        if (($input['attendeeCount'] ?? 0) > ($input['participantCount'] ?? 0)) {
            return response()->json(['error' => 'Le nombre de présents ne peut pas dépasser les inscriptions.'], 422);
        }

        $status = $input['status'] ?? 'PLANNED';
        $record = $this->storeRecord($request, 'activity', $input['title'], $status, [
            'occurred_on' => $input['eventDate'],
            'payload' => $this->activityPayload($input),
        ]);

        return response()->json(['activity' => $this->activity($record)], 201);
    }

    public function updateActivity(Request $request, string $id): JsonResponse
    {
        if (! $this->allows($request, 'edit', 'activites')) {
            return $this->forbidden();
        }

        $record = $this->record($request, $id, 'activity');
        if (! $record) {
            return $this->notFound();
        }

        $input = Validator::make($request->all(), $this->activityRules(true))->validate();
        $payload = array_merge($record->payload ?? [], $this->activityPayload($input));
        $participants = (int) ($payload['participantCount'] ?? 0);
        $attendees = (int) ($payload['attendeeCount'] ?? 0);
        if ($attendees > $participants) {
            return response()->json(['error' => 'Le nombre de présents ne peut pas dépasser les inscriptions.'], 422);
        }

        $changes = [
            'payload' => $payload,
            'updated_by' => $this->actorName($request),
            'updated_by_user_id' => $this->actorId($request),
        ];
        if (array_key_exists('title', $input)) {
            $changes['title'] = trim($input['title']);
        }
        if (array_key_exists('eventDate', $input)) {
            $changes['occurred_on'] = $input['eventDate'];
        }
        if (array_key_exists('status', $input)) {
            $changes['status'] = $input['status'];
        }
        $record->update($changes);
        $this->audit($request, $record, 'activity.update', ['fields' => array_keys($input)]);

        return response()->json(['activity' => $this->activity($record->fresh())]);
    }

    public function createAnnouncement(Request $request): JsonResponse
    {
        if (! $this->allows($request, 'create', 'annonces')) {
            return $this->forbidden();
        }

        $input = Validator::make($request->all(), $this->announcementRules())->validate();
        $status = $input['status'] ?? 'DRAFT';
        $record = $this->storeRecord($request, 'announcement', $input['title'], $status, [
            'payload' => [
                'body' => trim($input['body']),
                'publishedAt' => $status === 'PUBLISHED' ? now()->toISOString() : null,
            ],
        ]);

        return response()->json(['announcement' => $this->announcement($record)], 201);
    }

    public function updateAnnouncement(Request $request, string $id): JsonResponse
    {
        if (! $this->allows($request, 'edit', 'annonces')) {
            return $this->forbidden();
        }

        $record = $this->record($request, $id, 'announcement');
        if (! $record) {
            return $this->notFound();
        }

        $input = Validator::make($request->all(), $this->announcementRules(true))->validate();
        $payload = array_merge($record->payload ?? [], []);
        if (array_key_exists('body', $input)) {
            $payload['body'] = trim($input['body']);
        }
        $status = $input['status'] ?? $record->status;
        if ($status === 'PUBLISHED' && empty($payload['publishedAt'])) {
            $payload['publishedAt'] = now()->toISOString();
        } elseif ($status === 'DRAFT') {
            $payload['publishedAt'] = null;
        }

        $changes = [
            'status' => $status,
            'payload' => $payload,
            'updated_by' => $this->actorName($request),
            'updated_by_user_id' => $this->actorId($request),
        ];
        if (array_key_exists('title', $input)) {
            $changes['title'] = trim($input['title']);
        }
        $record->update($changes);
        $this->audit($request, $record, 'announcement.update', ['fields' => array_keys($input)]);

        return response()->json(['announcement' => $this->announcement($record->fresh())]);
    }

    private function memberRules(bool $partial = false): array
    {
        $required = $partial ? ['sometimes'] : ['required'];
        $optional = $partial ? ['sometimes', 'nullable'] : ['nullable'];

        return [
            'name' => [...$required, 'string', 'max:180'],
            'studentIdentifier' => [...$optional, 'string', 'max:80'],
            'email' => [...$optional, 'email', 'max:180'],
            'phone' => [...$optional, 'string', 'max:60'],
            'faculty' => [...$optional, 'string', 'max:160'],
            'studyYear' => [...$optional, 'string', 'max:80'],
            'joinedAt' => [...$optional, 'date'],
            'office' => [...$optional, 'string', 'max:100'],
            'mandateStart' => [...$optional, 'date'],
            'mandateEnd' => [...$optional, 'date'],
            'notes' => [...$optional, 'string', 'max:2000'],
        ];
    }

    private function activityRules(bool $partial = false): array
    {
        $required = $partial ? ['sometimes'] : ['required'];

        return [
            'title' => [...$required, 'string', 'max:180'],
            'description' => ['sometimes', 'nullable', 'string', 'max:3000'],
            'location' => ['sometimes', 'nullable', 'string', 'max:180'],
            'eventDate' => [...$required, 'date'],
            'participantCount' => ['sometimes', 'integer', 'min:0', 'max:1000000'],
            'attendeeCount' => ['sometimes', 'integer', 'min:0', 'max:1000000'],
            'status' => ['sometimes', 'in:PLANNED,COMPLETED,CANCELLED'],
        ];
    }

    private function announcementRules(bool $partial = false): array
    {
        $required = $partial ? ['sometimes'] : ['required'];

        return [
            'title' => [...$required, 'string', 'max:180'],
            'body' => [...$required, 'string', 'max:10000'],
            'status' => ['sometimes', 'in:DRAFT,PUBLISHED'],
        ];
    }

    private function memberPayload(array $input): array
    {
        $fields = ['email', 'phone', 'faculty', 'studyYear', 'joinedAt', 'office', 'mandateStart', 'mandateEnd', 'notes'];
        $payload = [];
        foreach ($fields as $field) {
            if (array_key_exists($field, $input)) {
                $payload[$field] = trim((string) ($input[$field] ?? ''));
            }
        }

        return $payload;
    }

    private function activityPayload(array $input): array
    {
        $fields = ['description', 'location', 'participantCount', 'attendeeCount'];
        $payload = [];
        foreach ($fields as $field) {
            if (array_key_exists($field, $input)) {
                $payload[$field] = in_array($field, ['participantCount', 'attendeeCount'], true)
                    ? (int) $input[$field]
                    : trim((string) ($input[$field] ?? ''));
            }
        }

        return $payload;
    }

    private function storeRecord(Request $request, string $type, string $title, string $status, array $values): AmicaleRecord
    {
        $companyId = $this->company($request);
        $actorName = $this->actorName($request);
        $actorId = $this->actorId($request);
        $referencePrefix = match ($type) {
            'member' => 'MEM',
            'contribution' => 'REC',
            'expense' => 'EXP',
            'activity' => 'ACT',
            default => 'ANN',
        };
        $record = AmicaleRecord::query()->create([
            'id' => 'amicale-'.$type.'-'.Str::uuid(),
            'company_id' => $companyId,
            'type' => $type,
            'reference' => $referencePrefix.'-'.Str::upper(Str::random(8)),
            'title' => trim($title),
            'member_id' => $values['member_id'] ?? null,
            'student_identifier' => $values['student_identifier'] ?? null,
            'amount' => $values['amount'] ?? null,
            'occurred_on' => $values['occurred_on'] ?? null,
            'status' => $status,
            'payload' => $values['payload'] ?? [],
            'created_by_user_id' => $actorId,
            'updated_by_user_id' => $actorId,
            'created_by' => $actorName,
            'updated_by' => $actorName,
        ]);
        $this->audit($request, $record, $type.'.create', [
            'status' => $status,
            'amount' => $record->amount,
        ]);

        return $record;
    }

    private function audit(Request $request, AmicaleRecord $record, string $action, array $details): void
    {
        DB::table('amicale_record_history')->insert([
            'id' => 'amicale-history-'.Str::uuid(),
            'company_id' => $record->company_id,
            'record_id' => $record->id,
            'record_type' => $record->type,
            'action' => $action,
            'actor_user_id' => $this->actorId($request),
            'actor_name' => $this->actorName($request),
            'details' => json_encode($details, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
            'created_at' => now(),
        ]);
    }

    private function record(Request $request, string $id, string $type): ?AmicaleRecord
    {
        return AmicaleRecord::query()
            ->where('company_id', $this->company($request))
            ->where('id', $id)
            ->where('type', $type)
            ->first();
    }

    private function studentIdentifierExists(Request $request, ?string $studentIdentifier, ?string $exceptId = null): bool
    {
        if ($studentIdentifier === null) {
            return false;
        }

        return AmicaleRecord::query()
            ->where('company_id', $this->company($request))
            ->where('type', 'member')
            ->where('student_identifier', $studentIdentifier)
            ->when($exceptId !== null, fn ($query) => $query->where('id', '!=', $exceptId))
            ->exists();
    }

    private function normalizeStudentIdentifier(?string $value): ?string
    {
        $normalized = Str::upper(trim((string) $value));

        return $normalized === '' ? null : $normalized;
    }

    private function member(AmicaleRecord $record): array
    {
        $payload = $record->payload ?? [];

        return [
            'id' => $record->id,
            'companyId' => $record->company_id,
            'reference' => $record->reference,
            'name' => $record->title,
            'studentIdentifier' => $record->student_identifier ?? '',
            'email' => $payload['email'] ?? '',
            'phone' => $payload['phone'] ?? '',
            'faculty' => $payload['faculty'] ?? '',
            'studyYear' => $payload['studyYear'] ?? '',
            'joinedAt' => $payload['joinedAt'] ?? '',
            'office' => $payload['office'] ?? '',
            'mandateStart' => $payload['mandateStart'] ?? '',
            'mandateEnd' => $payload['mandateEnd'] ?? '',
            'notes' => $payload['notes'] ?? '',
            'status' => $record->status,
            'createdAt' => $record->created_at?->toISOString(),
            'updatedAt' => $record->updated_at?->toISOString(),
        ];
    }

    private function contribution(AmicaleRecord $record, ?string $memberName): array
    {
        $payload = $record->payload ?? [];

        return [
            'id' => $record->id,
            'companyId' => $record->company_id,
            'reference' => $record->reference,
            'memberId' => $record->member_id ?? '',
            'memberName' => $payload['member_name'] ?? $memberName ?? 'Membre archivé',
            'period' => $payload['period'] ?? '',
            'amount' => (int) ($record->amount ?? 0),
            'paidOn' => (string) ($record->occurred_on ?? ''),
            'method' => $payload['method'] ?? 'OTHER',
            'note' => $payload['note'] ?? '',
            'createdBy' => $record->created_by,
            'createdAt' => $record->created_at?->toISOString(),
        ];
    }

    private function expense(AmicaleRecord $record): array
    {
        $payload = $record->payload ?? [];

        return [
            'id' => $record->id,
            'companyId' => $record->company_id,
            'reference' => $record->reference,
            'title' => $record->title,
            'category' => $payload['category'] ?? '',
            'amount' => (int) ($record->amount ?? 0),
            'expenseDate' => (string) ($record->occurred_on ?? ''),
            'description' => $payload['description'] ?? '',
            'vendor' => $payload['vendor'] ?? '',
            'status' => $record->status,
            'decisionNote' => $payload['decisionNote'] ?? '',
            'createdBy' => $record->created_by,
            'approvedBy' => $payload['approvedBy'] ?? '',
            'createdAt' => $record->created_at?->toISOString(),
            'updatedAt' => $record->updated_at?->toISOString(),
        ];
    }

    private function activity(AmicaleRecord $record): array
    {
        $payload = $record->payload ?? [];

        return [
            'id' => $record->id,
            'companyId' => $record->company_id,
            'reference' => $record->reference,
            'title' => $record->title,
            'description' => $payload['description'] ?? '',
            'location' => $payload['location'] ?? '',
            'eventDate' => (string) ($record->occurred_on ?? ''),
            'participantCount' => (int) ($payload['participantCount'] ?? 0),
            'attendeeCount' => (int) ($payload['attendeeCount'] ?? 0),
            'status' => $record->status,
            'createdAt' => $record->created_at?->toISOString(),
            'updatedAt' => $record->updated_at?->toISOString(),
        ];
    }

    private function announcement(AmicaleRecord $record): array
    {
        $payload = $record->payload ?? [];

        return [
            'id' => $record->id,
            'companyId' => $record->company_id,
            'reference' => $record->reference,
            'title' => $record->title,
            'body' => $payload['body'] ?? '',
            'status' => $record->status,
            'publishedAt' => $payload['publishedAt'] ?? null,
            'createdAt' => $record->created_at?->toISOString(),
            'updatedAt' => $record->updated_at?->toISOString(),
        ];
    }

    private function allows(Request $request, string $action, ?string $feature = null): bool
    {
        return ModuleAuthorization::allows(
            (array) $request->attributes->get('authActor', []),
            'amicales',
            $action,
            $feature,
        );
    }

    private function company(Request $request): string
    {
        return (string) $request->attributes->get('companyId');
    }

    private function actorName(Request $request): string
    {
        $actor = (array) $request->attributes->get('authActor', []);

        return trim((string) ($actor['displayName'] ?? '')) ?: 'Utilisateur MAXIMUS';
    }

    private function actorId(Request $request): ?string
    {
        $actor = (array) $request->attributes->get('authActor', []);
        $id = $request->attributes->get('authUserId') ?? ($actor['employeeId'] ?? null);

        return is_string($id) && trim($id) !== '' ? $id : null;
    }

    private function forbidden(): JsonResponse
    {
        return response()->json(['error' => 'Accès interdit à cette fonctionnalité.'], 403);
    }

    private function notFound(): JsonResponse
    {
        return response()->json(['error' => 'Enregistrement introuvable dans cette amicale.'], 404);
    }

    private function duplicateStudentIdentifier(): JsonResponse
    {
        return response()->json([
            'message' => 'Ce numéro étudiant existe déjà dans cette amicale.',
            'errors' => ['studentIdentifier' => ['Ce numéro étudiant existe déjà dans cette amicale.']],
        ], 422);
    }
}
