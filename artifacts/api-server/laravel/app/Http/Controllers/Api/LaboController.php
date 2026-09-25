<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\ModuleAuthorization;
use App\Support\ModuleCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class LaboController extends Controller
{
    public function bootstrap(Request $request, string $moduleId, string $featureId): JsonResponse
    {
        [$companyId, $definition] = $this->context($request, $moduleId, $featureId, 'view');
        if (($definition['kind'] ?? null) !== 'records') {
            return response()->json(['error' => 'Cette fonctionnalité réutilise un module source.'], 422);
        }
        $records = DB::table('labo_records')->where('company_id', $companyId)
            ->where('module_id', $moduleId)->where('feature_id', $featureId)
            ->orderByDesc('created_at')->get()->map(fn ($record) => $this->record($record))->all();
        return response()->json(['moduleId' => $moduleId, 'featureId' => $featureId, 'definition' => $definition, 'records' => $records, 'count' => count($records)]);
    }

    public function store(Request $request, string $moduleId, string $featureId): JsonResponse
    {
        [$companyId, $definition] = $this->context($request, $moduleId, $featureId, 'create');
        if (($definition['kind'] ?? null) !== 'records') return response()->json(['error' => 'Fonctionnalité non persistante.'], 422);
        $data = $request->validate(['data' => ['required', 'array']])['data'];
        $this->validateData($definition, $data);
        $id = (string) Str::uuid();
        $status = $definition['workflow']['stages'][0]['id'] ?? null;
        DB::transaction(function () use ($id, $companyId, $moduleId, $featureId, $data, $status): void {
            DB::table('labo_records')->insert(['id' => $id, 'company_id' => $companyId, 'module_id' => $moduleId, 'feature_id' => $featureId, 'data' => json_encode($data, JSON_THROW_ON_ERROR), 'status' => $status, 'version' => 1, 'created_at' => now(), 'updated_at' => now()]);
            DB::table('labo_record_events')->insert(['record_id' => $id, 'company_id' => $companyId, 'event' => 'created', 'payload' => json_encode(['data' => $data], JSON_THROW_ON_ERROR), 'created_at' => now()]);
        });
        return response()->json(['record' => $this->record(DB::table('labo_records')->where('id', $id)->first())], 201);
    }

    public function update(Request $request, string $moduleId, string $featureId, string $recordId): JsonResponse
    {
        [$companyId, $definition] = $this->context($request, $moduleId, $featureId, 'modify');
        $input = $request->validate(['data' => ['required', 'array'], 'version' => ['required', 'integer', 'min:1']]);
        $this->validateData($definition, $input['data']);
        return DB::transaction(function () use ($companyId, $moduleId, $featureId, $recordId, $input): JsonResponse {
            $row = DB::table('labo_records')->where('id', $recordId)->where('company_id', $companyId)->where('module_id', $moduleId)->where('feature_id', $featureId)->whereNull('deleted_at')->lockForUpdate()->first();
            if (!$row) return response()->json(['error' => 'Fiche introuvable.'], 404);
            if ((int) $row->version !== (int) $input['version']) return response()->json(['error' => 'Cette fiche a été modifiée par un autre utilisateur.'], 409);
            DB::table('labo_records')->where('id', $recordId)->update(['data' => json_encode($input['data'], JSON_THROW_ON_ERROR), 'version' => $row->version + 1, 'updated_at' => now()]);
            DB::table('labo_record_events')->insert(['record_id' => $recordId, 'company_id' => $companyId, 'event' => 'updated', 'payload' => json_encode(['data' => $input['data']], JSON_THROW_ON_ERROR), 'created_at' => now()]);
            return response()->json(['record' => $this->record(DB::table('labo_records')->where('id', $recordId)->first())]);
        });
    }

    public function destroy(Request $request, string $moduleId, string $featureId, string $recordId): JsonResponse
    {
        [$companyId] = $this->context($request, $moduleId, $featureId, 'delete');
        $version = $request->validate(['version' => ['required', 'integer', 'min:1']])['version'];
        return DB::transaction(function () use ($companyId, $moduleId, $featureId, $recordId, $version): JsonResponse {
            $row = DB::table('labo_records')->where('id', $recordId)->where('company_id', $companyId)->where('module_id', $moduleId)->where('feature_id', $featureId)->whereNull('deleted_at')->lockForUpdate()->first();
            if (!$row) return response()->json(['error' => 'Fiche introuvable.'], 404);
            if ((int) $row->version !== (int) $version) return response()->json(['error' => 'Cette fiche a été modifiée par un autre utilisateur.'], 409);
            DB::table('labo_records')->where('id', $recordId)->update(['deleted_at' => now(), 'version' => $row->version + 1, 'updated_at' => now()]);
            DB::table('labo_record_events')->insert(['record_id' => $recordId, 'company_id' => $companyId, 'event' => 'deleted', 'payload' => null, 'created_at' => now()]);
            return response()->json(['ok' => true]);
        });
    }

    public function transition(Request $request, string $moduleId, string $featureId, string $recordId): JsonResponse
    {
        [$companyId, $definition] = $this->context($request, $moduleId, $featureId, 'modify');
        $input = $request->validate(['targetStageId' => ['required', 'string'], 'version' => ['required', 'integer', 'min:1']]);
        $stages = $definition['workflow']['stages'] ?? [];
        return DB::transaction(function () use ($companyId, $moduleId, $featureId, $recordId, $input, $stages): JsonResponse {
            $row = DB::table('labo_records')->where('id', $recordId)->where('company_id', $companyId)->where('module_id', $moduleId)->where('feature_id', $featureId)->whereNull('deleted_at')->lockForUpdate()->first();
            if (!$row) return response()->json(['error' => 'Fiche introuvable.'], 404);
            if ((int) $row->version !== (int) $input['version']) return response()->json(['error' => 'Cette fiche a été modifiée par un autre utilisateur.'], 409);
            $current = array_search($row->status, array_column($stages, 'id'), true);
            $target = array_search($input['targetStageId'], array_column($stages, 'id'), true);
            if ($current === false || $target === false || $target !== $current + 1) return response()->json(['error' => 'La transition demandée n’est pas autorisée.'], 422);
            $data = json_decode($row->data, true) ?: [];
            foreach (($stages[$target]['requiredFieldIds'] ?? []) as $fieldId) if (!array_key_exists($fieldId, $data) || $data[$fieldId] === '' || $data[$fieldId] === null) return response()->json(['error' => 'Les champs requis doivent être complétés avant cette transition.'], 422);
            DB::table('labo_records')->where('id', $recordId)->update(['status' => $input['targetStageId'], 'version' => $row->version + 1, 'updated_at' => now()]);
            DB::table('labo_record_events')->insert(['record_id' => $recordId, 'company_id' => $companyId, 'event' => 'transitioned', 'payload' => json_encode(['status' => $input['targetStageId']], JSON_THROW_ON_ERROR), 'created_at' => now()]);
            return response()->json(['record' => $this->record(DB::table('labo_records')->where('id', $recordId)->first())]);
        });
    }

    private function context(Request $request, string $moduleId, string $featureId, string $action): array
    {
        $actor = $request->attributes->get('authActor');
        $companyId = (string) $request->attributes->get('companyId');
        $definition = collect(ModuleCatalog::definitionsWithCustom())->firstWhere('id', $moduleId);
        $feature = is_array($definition) ? collect($definition['laboFeatures'] ?? [])->firstWhere('id', $featureId) : null;
        if (!$definition || !$feature || $companyId === '' || !ModuleAuthorization::allows($actor, $moduleId, $action, $featureId)) abort(403, 'Fonctionnalité LABO non autorisée.');
        return [$companyId, $feature];
    }

    private function validateData(array $definition, array $data): void
    {
        $fields = $definition['fields'] ?? [];
        $allowedFieldIds = [];
        foreach ($fields as $field) {
            if (isset($field['id']) && is_string($field['id'])) {
                $allowedFieldIds[$field['id']] = true;
            }
        }
        foreach (array_keys($data) as $fieldId) {
            if (! isset($allowedFieldIds[(string) $fieldId])) {
                abort(422, 'La fiche contient un champ qui n’est pas prévu.');
            }
        }

        foreach ($fields as $field) {
            $value = $data[$field['id']] ?? null;
            if (($field['required'] ?? false) && ($value === null || $value === '')) abort(422, 'Le champ « '.($field['label'] ?? $field['id']).' » est requis.');
            if ($value === null || $value === '') continue;
            $valid = match ($field['type'] ?? 'text') {
                'number' => is_int($value) || is_float($value) || (is_string($value) && is_numeric($value)),
                'boolean' => is_bool($value),
                'date' => is_string($value) && (bool) preg_match('/^\d{4}-\d{2}-\d{2}$/', $value),
                'select' => in_array((string) $value, array_map('strval', $field['options'] ?? []), true),
                default => is_string($value),
            };
            if (!$valid) abort(422, 'La valeur du champ « '.($field['label'] ?? $field['id']).' » est invalide.');
        }
    }

    private function record(object $row): array
    {
        return ['id' => $row->id, 'moduleId' => $row->module_id, 'featureId' => $row->feature_id, 'data' => json_decode($row->data, true) ?: [], 'status' => $row->status, 'version' => (int) $row->version, 'createdAt' => (string) $row->created_at, 'updatedAt' => (string) $row->updated_at];
    }
}