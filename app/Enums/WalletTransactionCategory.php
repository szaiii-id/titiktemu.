<?php

namespace App\Enums;

enum WalletTransactionCategory: string
{
    case HONOR_TRIP = 'honor_trip';
    case PAYOUT = 'payout';
    case ADJUSTMENT = 'adjustment';
    case REFUND = 'refund';

    public function label(): string
    {
        return match ($this) {
            self::HONOR_TRIP => 'Honor Trip',
            self::PAYOUT => 'Pencairan',
            self::ADJUSTMENT => 'Penyesuaian',
            self::REFUND => 'Refund',
        };
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
