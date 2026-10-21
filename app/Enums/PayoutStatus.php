<?php

namespace App\Enums;

enum PayoutStatus: string
{
    case PENDING = 'pending';
    case APPROVED = 'approved';
    case REJECTED = 'rejected';
    case PAID = 'paid';

    public function label(): string
    {
        return match ($this) {
            self::PENDING => 'Menunggu Review',
            self::APPROVED => 'Disetujui',
            self::REJECTED => 'Ditolak',
            self::PAID => 'Sudah Ditransfer',
        };
    }

    public function badgeClass(): string
    {
        return match ($this) {
            self::PENDING => 'bg-sun/10 text-sun-dark border border-sun/20',
            self::APPROVED => 'bg-blue/10 text-blue-dark border border-blue/20',
            self::REJECTED => 'bg-red-50 text-red-700 border border-red-200',
            self::PAID => 'bg-green/10 text-green-dark border border-green/20',
        };
    }

    public function isFinal(): bool
    {
        return in_array($this, [self::REJECTED, self::PAID], true);
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
