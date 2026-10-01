<?php

namespace App\Services;

final class SubscriptionPricing
{
    public function calculate(array $modules, array $modulePrices, ?int $customAmount): array
    {
        $complete = true;
        $moduleTotal = 0;
        $priceLines = array_map(static function (array $module) use ($modulePrices, &$complete, &$moduleTotal): array {
            $id = (string) ($module['id'] ?? '');
            $monthlyAmount = $modulePrices[$id] ?? null;
            if ($monthlyAmount === null) {
                $complete = false;
            } else {
                $moduleTotal += (int) $monthlyAmount;
            }

            return [
                'id' => $id,
                'name' => (string) ($module['name'] ?? $id),
                'monthlyAmount' => $monthlyAmount === null ? null : (int) $monthlyAmount,
            ];
        }, $modules);
        $calculatedAmount = $complete ? $moduleTotal : null;

        return [
            'modules' => $priceLines,
            'moduleTotal' => $calculatedAmount,
            'moduleTotalComplete' => $complete,
            'customAmount' => $customAmount,
            'payableAmount' => $customAmount ?? $calculatedAmount,
        ];
    }
}