<?php

namespace App\Enums;

/**
 * Tipe transaksi wallet.
 *
 * - credit : saldo bertambah (honor trip, refund, adjustment positif)
 * - debit  : saldo berkurang (payout, adjustment negatif)
 */
enum WalletTransactionType: string
{
    case CREDIT = 'credit';
    case DEBIT = 'debit';

    /**
     * Label Bahasa Indonesia untuk tampilan UI.
     */
    public function label(): string
    {
        return match ($this) {
            self::CREDIT => 'Kredit (Masuk)',
            self::DEBIT => 'Debit (Keluar)',
        };
    }

    /**
     * Warna badge untuk tampilan UI.
     */
    public function badgeClass(): string
    {
        return match ($this) {
            self::CREDIT => 'bg-green/10 text-green-dark border border-green/20',
            self::DEBIT => 'bg-red-50 text-red-700 border border-red-200',
        };
    }

    /**
     * Apakah ini transaksi masuk (saldo bertambah)?
     */
    public function isCredit(): bool
    {
        return $this === self::CREDIT;
    }

    /**
     * Apakah ini transaksi keluar (saldo berkurang)?
     */
    public function isDebit(): bool
    {
        return $this === self::DEBIT;
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
