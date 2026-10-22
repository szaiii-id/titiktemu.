<?php

namespace App\Enums;

/**
 * Tipe fasilitas paket wisata.
 *
 * - include : fasilitas yang termasuk dalam harga paket.
 * - exclude : fasilitas yang TIDAK termasuk (biaya tambahan client).
 */
enum PackageFacilityTipe: string
{
    case INCLUDE = 'include';
    case EXCLUDE = 'exclude';

    /**
     * Label Bahasa Indonesia untuk tampilan UI.
     */
    public function label(): string
    {
        return match ($this) {
            self::INCLUDE => 'Termasuk',
            self::EXCLUDE => 'Tidak Termasuk',
        };
    }

    /**
     * Warna badge untuk tampilan UI.
     */
    public function badgeClass(): string
    {
        return match ($this) {
            self::INCLUDE => 'bg-green/10 text-green-dark border border-green/20',
            self::EXCLUDE => 'bg-red-50 text-red-700 border border-red-200',
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
