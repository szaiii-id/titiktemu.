<?php

namespace App\Enums;

/**
 * Metode pembayaran manual (tanpa payment gateway).
 *
 * - transfer_bank : client transfer ke rekening admin (default).
 * - tunai         : bayar langsung (jarang — untuk kasus khusus).
 * - lainnya       : metode lain (e-wallet, dll — konfirmasi manual).
 */
enum PaymentMetode: string
{
    case TRANSFER_BANK = 'transfer_bank';
    case TUNAI = 'tunai';
    case LAINNYA = 'lainnya';

    /**
     * Label Bahasa Indonesia untuk tampilan UI.
     */
    public function label(): string
    {
        return match ($this) {
            self::TRANSFER_BANK => 'Transfer Bank',
            self::TUNAI => 'Tunai',
            self::LAINNYA => 'Lainnya',
        };
    }

    /**
     * Warna badge untuk tampilan UI.
     */
    public function badgeClass(): string
    {
        return match ($this) {
            self::TRANSFER_BANK => 'bg-blue/10 text-blue-dark border border-blue/20',
            self::TUNAI => 'bg-green/10 text-green-dark border border-green/20',
            self::LAINNYA => 'bg-gray-100 text-gray-700 border border-gray-200',
        };
    }

    /**
     * Daftar semua value.
     *
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }

    /**
     * Daftar [value => label] untuk dropdown di form.
     *
     * @return array<string, string>
     */
    public static function options(): array
    {
        return collect(self::cases())
            ->mapWithKeys(fn (self $case) => [$case->value => $case->label()])
            ->all();
    }
}
