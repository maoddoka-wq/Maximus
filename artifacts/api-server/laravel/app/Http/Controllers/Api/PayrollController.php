<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PayrollService;
use App\Support\ModuleAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;
use Illuminate\Validation\ValidationException;

final class PayrollController extends Controller
{
    public function __construct(private readonly PayrollService $payroll) {}

    public function bootstrap(Request $request): JsonResponse
    {
        if (! $this->allowed($request, 'view')) {
            return $this->forbidden();
        }

        return response()->json($this->payroll->bootstrap($this->company($request)));
    }

    public function createBeneficiary(Request $request): JsonResponse
    {
        if (! $this->allowed($request, 'create', 'bénéficiaires')) {
            return $this->forbidden();
        }
        $input = $this->validateBeneficiary($request);
        $company = $this->company($request);
        $this->assertEmployeeBelongsToCompany($input['employeeId'] ?? null, $company);
        $row = [
            'id' => 'payroll-beneficiary-'.Str::uuid(),
            'company_id' => $company,
            'employee_id' => $input['employeeId'] ?? null,
            'full_name' => trim($input['fullName']),
            'mobile' => trim($input['mobile']),
            'account_number' => Crypt::encryptString(trim($input['accountNumber'])),
            'provider' => $input['provider'],
            'monthly_salary' => (int) $input['monthlySalary'],
            'payment_day' => (int) $input['paymentDay'],
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ];
        DB::table('payroll_beneficiaries')->insert($row);

        return response()->json($this->findBeneficiary($row['id'], $company), 201);
    }

    public function updateBeneficiary(Request $request, string $id): JsonResponse
    {
        if (! $this->allowed($request, 'modify', 'bénéficiaires')) {
            return $this->forbidden();
        }
        $input = $this->validateBeneficiary($request, true);
        $this->assertEmployeeBelongsToCompany($input['employeeId'] ?? null, $this->company($request));
        $query = DB::table('payroll_beneficiaries')->where('id', $id)->where('company_id', $this->company($request));
        if (! $query->exists()) {
            return response()->json(['error' => 'Bénéficiaire introuvable.'], 404);
        }
        $changes = [];
        foreach ([
            'employeeId' => 'employee_id',
            'fullName' => 'full_name',
            'mobile' => 'mobile',
            'accountNumber' => 'account_number',
            'provider' => 'provider',
            'monthlySalary' => 'monthly_salary',
            'paymentDay' => 'payment_day',
        ] as $from => $to) {
            if (array_key_exists($from, $input)) {
                if ($from === 'accountNumber') {
                    $changes[$to] = Crypt::encryptString(trim((string) $input[$from]));
                } elseif (in_array($from, ['fullName', 'mobile'], true)) {
                    $changes[$to] = trim((string) $input[$from]);
                } else {
                    $changes[$to] = $input[$from];
                }
            }
        }
        $changes['updated_at'] = now();
        $query->update($changes);

        return response()->json($this->findBeneficiary($id, $this->company($request)));
    }

    public function archiveBeneficiary(Request $request, string $id): JsonResponse
    {
        if (! $this->allowed($request, 'modify', 'bénéficiaires')) {
            return $this->forbidden();
        }
        $updated = DB::table('payroll_beneficiaries')
            ->where('id', $id)
            ->where('company_id', $this->company($request))
            ->update(['active' => false, 'updated_at' => now()]);
        if (! $updated) {
            return response()->json(['error' => 'Bénéficiaire introuvable.'], 404);
        }

        return response()->json(['ok' => true]);
    }

    public function createBatch(Request $request): JsonResponse
    {
        if (! $this->allowed($request, 'create', 'préparer-une-paie')) {
            return $this->forbidden();
        }
        $input = Validator::make($request->all(), [
            'period' => ['required', 'string', 'min:2', 'max:32'],
            'paymentDate' => ['required', 'date'],
            'beneficiaryIds' => ['required', 'array', 'min:1', 'max:1000'],
            'beneficiaryIds.*' => ['required', 'string'],
            'amounts' => ['sometimes', 'array'],
            'amounts.*' => ['required', 'integer', 'min:1', 'max:100000000'],
        ])->validate();
        $company = $this->company($request);
        $beneficiaries = DB::table('payroll_beneficiaries')
            ->where('company_id', $company)
            ->where('active', true)
            ->whereIn('id', $input['beneficiaryIds'])
            ->get();
        if ($beneficiaries->count() !== count(array_unique($input['beneficiaryIds']))) {
            return response()->json(['error' => 'Un ou plusieurs bénéficiaires sont introuvables ou inactifs.'], 422);
        }
        $amounts = collect($input['amounts'] ?? [])
            ->mapWithKeys(fn ($amount, $beneficiaryId): array => [(string) $beneficiaryId => (int) $amount])
            ->all();
        if (array_diff(array_keys($amounts), array_map('strval', array_unique($input['beneficiaryIds'])))) {
            return response()->json(['error' => 'Un montant de paie référence un bénéficiaire qui n’est pas sélectionné.'], 422);
        }
        $batchId = 'payroll-batch-'.Str::uuid();
        DB::transaction(function () use ($batchId, $company, $input, $beneficiaries, $amounts, $request): void {
            $totalAmount = $beneficiaries->sum(
                fn (object $beneficiary): int => $amounts[$beneficiary->id] ?? (int) $beneficiary->monthly_salary,
            );
            DB::table('payroll_batches')->insert([
                'id' => $batchId,
                'company_id' => $company,
                'period' => trim($input['period']),
                'payment_date' => $input['paymentDate'],
                'total_amount' => $totalAmount,
                'status' => 'DRAFT',
                'created_by' => $this->actorName($request),
                'approved_by' => null,
                'approved_at' => null,
                'processed_at' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            foreach ($beneficiaries as $beneficiary) {
                DB::table('payroll_batch_items')->insert([
                    'id' => 'payroll-item-'.Str::uuid(),
                    'batch_id' => $batchId,
                    'company_id' => $company,
                    'beneficiary_id' => $beneficiary->id,
                    'beneficiary_name' => $beneficiary->full_name,
                    'mobile' => $beneficiary->mobile,
                    'account_number' => Crypt::encryptString($this->decryptAccount($beneficiary->account_number)),
                    'provider' => $beneficiary->provider,
                    'amount' => $amounts[$beneficiary->id] ?? (int) $beneficiary->monthly_salary,
                    'status' => 'PENDING',
                    'provider_payout_id' => null,
                    'idempotency_key' => 'payroll-payout:'.$batchId.':'.$beneficiary->id,
                    'failure_reason' => '',
                    'processed_at' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        });

        $result = $this->payroll->bootstrap($company);
        $batch = collect($result['batches'])->firstWhere('id', $batchId);

        return response()->json(['batch' => $batch], 201);
    }

    public function submitBatch(Request $request, string $id): JsonResponse
    {
        return $this->transition($request, $id, 'submit', 'préparer-une-paie');
    }

    public function approveBatch(Request $request, string $id): JsonResponse
    {
        return $this->transition($request, $id, 'approve', 'validation');
    }

    public function payoutBatch(Request $request, string $id): JsonResponse
    {
        if (! $this->allowed($request, 'modify', 'virements')) {
            return $this->forbidden();
        }
        if (! app(\App\Services\DiamanoPayService::class)->isConfigured()) {
            return response()->json(['error' => 'DiamanoPay n’est pas encore configuré pour les virements.'], 503);
        }
        try {
            $batch = $this->payroll->payoutBatch($this->company($request), $id);
        } catch (Throwable $error) {
            $status = match ($error->getMessage()) {
                'PAYROLL_SOLDE_INSUFFISANT' => 422,
                'PAYROLL_BATCH_NOT_FOUND' => 404,
                default => 409,
            };

            return response()->json(['error' => match ($error->getMessage()) {
                'PAYROLL_SOLDE_INSUFFISANT' => 'Le solde du portefeuille de paie ne couvre pas cette paie.',
                'PAYROLL_BATCH_NOT_FOUND' => 'Paie introuvable.',
                default => 'Cette paie ne peut pas encore être virée.',
            }], $status);
        }

        return response()->json(['batch' => $this->batchRow($batch)]);
    }

    public function topup(Request $request): JsonResponse
    {
        if (! $this->allowed($request, 'modify', 'solde-de-paie')) {
            return $this->forbidden();
        }
        $input = Validator::make($request->all(), [
            'amount' => ['required', 'integer', 'min:1000', 'max:100000000'],
            'idempotencyKey' => ['nullable', 'string', 'max:120'],
        ])->validate();
        $url = trim((string) config('services.diamanopay.webhook_url', ''));
        if ($url === '') {
            $url = rtrim((string) config('app.url', ''), '/');
            if ($url === '' || str_contains($url, 'localhost')) {
                $url = rtrim($request->getSchemeAndHttpHost(), '/');
            }
        }
        $url .= '/api/payments/diamanopay/webhook';

        try {
            $topup = $this->payroll->createTopup(
                $this->company($request),
                (int) $input['amount'],
                trim((string) ($request->header('Idempotency-Key') ?: ($input['idempotencyKey'] ?? ''))),
                $url,
            );
        } catch (Throwable $error) {
            report($error);

            return response()->json(['error' => 'La recharge du portefeuille de paie n’a pas pu être créée.'], 503);
        }

        return response()->json(['topup' => $topup], 201);
    }

    public function applyWebhook(Request $request, string $providerId, array $data): bool
    {
        return $this->payroll->applyTopupStatus($providerId, $data);
    }

    private function transition(Request $request, string $id, string $transition, string $feature): JsonResponse
    {
        if (! $this->allowed($request, 'modify', $feature)) {
            return $this->forbidden();
        }
        try {
            $batch = $this->payroll->updateBatchStatus($this->company($request), $id, $transition, $this->actorName($request));
        } catch (RuntimeException $error) {
            return response()->json(['error' => $error->getMessage() === 'PAYROLL_BATCH_NOT_FOUND' ? 'Paie introuvable.' : 'Transition de paie invalide.'], $error->getMessage() === 'PAYROLL_BATCH_NOT_FOUND' ? 404 : 409);
        }

        return response()->json(['batch' => $this->batchRow($batch)]);
    }

    private function validateBeneficiary(Request $request, bool $sometimes = false): array
    {
        return Validator::make($request->all(), [
            'employeeId' => [$sometimes ? 'sometimes' : 'nullable', 'nullable', 'string', 'max:120'],
            'fullName' => [$sometimes ? 'sometimes' : 'required', 'string', 'min:2', 'max:160'],
            'mobile' => [$sometimes ? 'sometimes' : 'required', 'string', 'min:8', 'max:40'],
            'accountNumber' => [$sometimes ? 'sometimes' : 'required', 'string', 'min:4', 'max:120'],
            'provider' => [$sometimes ? 'sometimes' : 'required', 'in:WAVE'],
            'monthlySalary' => [$sometimes ? 'sometimes' : 'required', 'integer', 'min:1', 'max:100000000'],
            'paymentDay' => [$sometimes ? 'sometimes' : 'required', 'integer', 'min:1', 'max:31'],
        ])->validate();
    }

    private function findBeneficiary(string $id, string $company): array
    {
        $row = DB::table('payroll_beneficiaries')->where('id', $id)->where('company_id', $company)->first();
        return [
            'id' => $row->id,
            'companyId' => $row->company_id,
            'employeeId' => $row->employee_id,
            'fullName' => $row->full_name,
            'mobile' => $row->mobile,
            'accountNumberMasked' => strlen($this->decryptAccount($row->account_number)) > 4 ? str_repeat('•', strlen($this->decryptAccount($row->account_number)) - 4).substr($this->decryptAccount($row->account_number), -4) : str_repeat('•', strlen($this->decryptAccount($row->account_number))),
            'provider' => $row->provider,
            'monthlySalary' => (int) $row->monthly_salary,
            'paymentDay' => (int) $row->payment_day,
            'active' => (bool) $row->active,
        ];
    }

    private function batchRow(object $row): array
    {
        return [
            'id' => $row->id,
            'companyId' => $row->company_id,
            'period' => $row->period,
            'paymentDate' => $row->payment_date,
            'totalAmount' => (int) $row->total_amount,
            'status' => $row->status,
            'createdBy' => $row->created_by,
            'approvedBy' => $row->approved_by,
            'approvedAt' => $row->approved_at,
            'processedAt' => $row->processed_at,
            'createdAt' => $row->created_at,
        ];
    }

    private function allowed(Request $request, string $action, ?string $feature = null): bool
    {
        $actor = $request->attributes->get('authActor');
        if (! is_array($actor)) {
            return false;
        }
        if (ModuleAuthorization::allows($actor, 'paie', $action, $feature)) {
            return true;
        }

        // Keep the previous balance feature readable for companies migrated
        // before the canonical "solde-de-paie" identifier was published.
        return $feature === 'solde-de-paie'
            && ModuleAuthorization::allows($actor, 'paie', $action, 'solde');
    }

    private function company(Request $request): string
    {
        return (string) $request->attributes->get('companyId');
    }

    private function actorName(Request $request): string
    {
        return trim((string) ($request->attributes->get('authActor')['displayName'] ?? 'Utilisateur MAXIMUS'));
    }

    private function forbidden(): JsonResponse
    {
        return response()->json(['error' => 'Cette action n’est pas autorisée pour votre rôle.'], 403);
    }

    private function assertEmployeeBelongsToCompany(?string $employeeId, string $companyId): void
    {
        if (! $employeeId) {
            return;
        }

        $belongsToCompany = DB::table('auth_users')
            ->where('employee_id', $employeeId)
            ->where('company_id', $companyId)
            ->exists();

        if (! $belongsToCompany) {
            throw ValidationException::withMessages([
                'employeeId' => 'Cet employé n’appartient pas à cette entreprise.',
            ]);
        }
    }

    private function decryptAccount(string $value): string
    {
        try {
            return Crypt::decryptString($value);
        } catch (Throwable) {
            return $value;
        }
    }
}