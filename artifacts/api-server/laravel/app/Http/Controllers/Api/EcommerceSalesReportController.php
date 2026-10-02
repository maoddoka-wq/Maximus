<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\ModuleAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

final class EcommerceSalesReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $actor = $request->attributes->get('authActor', []);
        $companyId = (string) $request->attributes->get('companyId');
        if ($companyId === '') {
            return response()->json(['error' => 'Entreprise requise.'], 400);
        }

        $canViewOnline = is_array($actor)
            && ModuleAuthorization::allows($actor, 'ecommerce', 'view', 'commandes');
        $canViewCounter = is_array($actor)
            && ModuleAuthorization::allows($actor, 'ecommerce', 'view', 'vente-comptoir');
        if (! $canViewOnline && ! $canViewCounter) {
            return response()->json(['error' => 'Aucune vente n’est autorisée pour ce compte.'], 403);
        }

        $query = $request->query();
        $input = Validator::make([
            'dateFrom' => $query['dateFrom'] ?? now()->startOfMonth()->toDateString(),
            'dateTo' => $query['dateTo'] ?? now()->toDateString(),
            'source' => $query['source'] ?? 'ALL',
            'page' => $query['page'] ?? 1,
            'perPage' => $query['perPage'] ?? 100,
        ], [
            'dateFrom' => ['required', 'date_format:Y-m-d'],
            'dateTo' => ['required', 'date_format:Y-m-d', 'after_or_equal:dateFrom'],
            'source' => ['required', 'in:ALL,ONLINE,COUNTER'],
            'page' => ['required', 'integer', 'min:1'],
            'perPage' => ['required', 'integer', 'min:1', 'max:500'],
        ])->validate();

        $source = (string) $input['source'];
        if (($source === 'ONLINE' && ! $canViewOnline) || ($source === 'COUNTER' && ! $canViewCounter)) {
            return response()->json(['error' => 'Cette source de vente n’est pas autorisée pour ce compte.'], 403);
        }

        $includeOnline = $canViewOnline && $source !== 'COUNTER';
        $includeCounter = $canViewCounter && $source !== 'ONLINE';
        $availableSources = array_values(array_filter([
            $canViewOnline ? 'ONLINE' : null,
            $canViewCounter ? 'COUNTER' : null,
        ]));

        $timezone = (string) config('app.timezone', 'UTC');
        $dateFrom = Carbon::parse((string) $input['dateFrom'], $timezone)->startOfDay();
        $dateToExclusive = Carbon::parse((string) $input['dateTo'], $timezone)->addDay()->startOfDay();
        $baseQuery = static fn (string $table) => DB::table($table)
            ->where('company_id', $companyId)
            ->where('created_at', '>=', $dateFrom)
            ->where('created_at', '<', $dateToExclusive);

        $queries = [];
        if ($includeOnline) {
            $queries[] = $baseQuery('ecommerce_orders')
                ->select('id', 'reference', 'customer_name', 'total', 'status', 'created_at')
                ->selectRaw("CAST('ONLINE' AS VARCHAR(20)) AS source")
                ->selectRaw('total AS amount')
                ->selectRaw('status AS order_status')
                ->selectRaw("COALESCE(payment_status, 'UNPAID') AS payment_status")
                ->selectRaw('CAST(NULL AS VARCHAR(20)) AS payment_method')
                ->selectRaw("COALESCE(currency, 'INCONNUE') AS currency");
        }

        if ($includeCounter) {
            $queries[] = $baseQuery('ecommerce_pos_sales')
                ->select('id', 'reference', 'customer_name', 'total', 'status', 'created_at')
                ->selectRaw("CAST('COUNTER' AS VARCHAR(20)) AS source")
                ->selectRaw('total AS amount')
                ->selectRaw('status AS order_status')
                ->selectRaw('status AS payment_status')
                ->selectRaw('payment_method')
                ->selectRaw('currency');
        }

        $union = array_shift($queries);
        foreach ($queries as $nextQuery) {
            $union->unionAll($nextQuery);
        }

        $reportQuery = DB::query()->fromSub($union, 'sales_report');
        $totalRows = (clone $reportQuery)->count();
        $page = (int) $input['page'];
        $perPage = (int) $input['perPage'];
        $sales = (clone $reportQuery)
            ->orderByDesc('created_at')
            ->orderBy('source')
            ->orderByDesc('reference')
            ->forPage($page, $perPage)
            ->get()
            ->map(static fn (object $sale): array => [
                'id' => (string) $sale->id,
                'reference' => (string) $sale->reference,
                'source' => (string) $sale->source,
                'customerName' => (string) ($sale->customer_name ?? ''),
                'amount' => (int) $sale->amount,
                'currency' => (string) $sale->currency,
                'orderStatus' => (string) $sale->order_status,
                'paymentStatus' => (string) $sale->payment_status,
                'paymentMethod' => $sale->payment_method !== null ? (string) $sale->payment_method : null,
                'createdAt' => (string) $sale->created_at,
            ])
            ->values()
            ->all();

        $onlineBase = $includeOnline ? $baseQuery('ecommerce_orders') : null;
        $counterBase = $includeCounter ? $baseQuery('ecommerce_pos_sales') : null;
        $onlineCount = $onlineBase ? (clone $onlineBase)->count() : 0;
        $counterCount = $counterBase ? (clone $counterBase)->count() : 0;
        $onlinePaid = $onlineBase
            ? (clone $onlineBase)->where('status', '!=', 'ANNULÉE')->where('payment_status', 'PAID')
            : null;
        $counterPaid = $counterBase ? (clone $counterBase)->where('status', 'PAID') : null;
        $onlineRefunded = $onlineBase
            ? (clone $onlineBase)->where('payment_status', 'REFUNDED')
            : null;
        $counterRefunded = $counterBase ? (clone $counterBase)->where('status', 'REFUNDED') : null;

        $revenueByCurrency = [];
        if ($onlinePaid) {
            $onlineRevenue = (clone $onlinePaid)
                ->selectRaw("COALESCE(currency, 'INCONNUE') AS report_currency")
                ->selectRaw('SUM(total) AS amount')
                ->groupByRaw("COALESCE(currency, 'INCONNUE')")
                ->get();
            foreach ($onlineRevenue as $revenue) {
                $currency = (string) $revenue->report_currency;
                $revenueByCurrency[$currency] = ($revenueByCurrency[$currency] ?? 0) + (int) $revenue->amount;
            }
        }
        if ($counterPaid) {
            $counterRevenue = (clone $counterPaid)
                ->select('currency')
                ->selectRaw('SUM(total) AS amount')
                ->groupBy('currency')
                ->get();
            foreach ($counterRevenue as $revenue) {
                $currency = (string) $revenue->currency;
                $revenueByCurrency[$currency] = ($revenueByCurrency[$currency] ?? 0) + (int) $revenue->amount;
            }
        }

        $lastPage = max(1, (int) ceil($totalRows / $perPage));

        return response()->json([
            'sales' => $sales,
            'availableSources' => $availableSources,
            'summary' => [
                'totalSales' => $onlineCount + $counterCount,
                'onlineSales' => $onlineCount,
                'counterSales' => $counterCount,
                'paidSales' => ($onlinePaid ? (clone $onlinePaid)->count() : 0)
                    + ($counterPaid ? (clone $counterPaid)->count() : 0),
                'refundedSales' => ($onlineRefunded ? (clone $onlineRefunded)->count() : 0)
                    + ($counterRefunded ? (clone $counterRefunded)->count() : 0),
                'revenueByCurrency' => array_map(
                    static fn (string $currency, int $amount): array => ['currency' => $currency, 'amount' => $amount],
                    array_keys($revenueByCurrency),
                    array_values($revenueByCurrency),
                ),
            ],
            'pagination' => [
                'page' => $page,
                'perPage' => $perPage,
                'total' => $totalRows,
                'lastPage' => $lastPage,
            ],
            'filters' => [
                'dateFrom' => (string) $input['dateFrom'],
                'dateTo' => (string) $input['dateTo'],
                'source' => $source,
            ],
        ]);
    }
}