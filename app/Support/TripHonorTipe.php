<?php

namespace App\Support;

/**
 * Konstanta tipe honor mitra.
 *
 * Bukan enum karena hanya 2 nilai & tidak butuh label khusus.
 * Helper ini menyediakan label & validasi untuk dropdown.
 */
class TripHonorTipe
{
    public const FLAT = 'flat';

    public const PER_HARI = 'per_hari';

    /**
     * Label Bahasa Indonesia.
     */
    public static function label(string $tipe): string
    {
        return match ($tipe) {
            self::FLAT => 'Flat (Total)',
            self::PER_HARI => 'Per Hari',
            default => $tipe,
        };
    }

    /**
     * Daftar semua value.
     *
     * @return array<int, string>
     */
    public static function values(): array
    {
        return [self::FLAT, self::PER_HARI];
    }

    /**
     * Daftar [value => label] untuk dropdown di form.
     *
     * @return array<string, string>
     */
    public static function options(): array
    {
        return [
            self::FLAT => self::label(self::FLAT),
            self::PER_HARI => self::label(self::PER_HARI),
        ];
    }

    /**
     * Apakah tipe valid?
     */
    public static function isValid(string $tipe): bool
    {
        return in_array($tipe, self::values(), true);
    }
}
