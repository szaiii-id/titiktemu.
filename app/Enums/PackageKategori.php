<?php

namespace App\Enums;

/**
 * Kategori paket wisata.
 *
 * Dipakai untuk filter di katalog client & grouping di dashboard admin.
 */
enum PackageKategori: string
{
    case WISATA_ALAM = 'wisata_alam';
    case BUDAYA = 'budaya';
    case KULINER = 'kuliner';
    case PETUALANGAN = 'petualangan';
    case LAINNYA = 'lainnya';

    /**
     * Label Bahasa Indonesia untuk tampilan UI.
     */
    public function label(): string
    {
        return match ($this) {
            self::WISATA_ALAM => 'Wisata Alam',
            self::BUDAYA => 'Budaya',
            self::KULINER => 'Kuliner',
            self::PETUALANGAN => 'Petualangan',
            self::LAINNYA => 'Lainnya',
        };
    }

    /**
     * Warna badge untuk tampilan UI (mengikuti design system Titiktemu).
     */
    public function badgeClass(): string
    {
        return match ($this) {
            self::WISATA_ALAM => 'bg-green/10 text-green-dark border border-green/20',
            self::BUDAYA => 'bg-purple/10 text-purple-dark border border-purple/20',
            self::KULINER => 'bg-sun/10 text-sun-dark border border-sun/20',
            self::PETUALANGAN => 'bg-blue/10 text-blue-dark border border-blue/20',
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
