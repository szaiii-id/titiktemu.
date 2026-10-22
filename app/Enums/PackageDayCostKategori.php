<?php

namespace App\Enums;

/**
 * Kategori biaya HPP per hari dalam sebuah paket.
 *
 * Dipakai untuk grouping & analisis margin di dashboard admin.
 * Contoh breakdown: "Total transportasi Rp 2.500.000 (35% dari HPP)".
 */
enum PackageDayCostKategori: string
{
    case TRANSPORTASI = 'transportasi';
    case TIKET = 'tiket';
    case KONSUMSI = 'konsumsi';
    case AKOMODASI = 'akomodasi';
    case LAINNYA = 'lainnya';

    /**
     * Label Bahasa Indonesia untuk tampilan UI.
     */
    public function label(): string
    {
        return match ($this) {
            self::TRANSPORTASI => 'Transportasi',
            self::TIKET => 'Tiket',
            self::KONSUMSI => 'Konsumsi',
            self::AKOMODASI => 'Akomodasi',
            self::LAINNYA => 'Lainnya',
        };
    }

    /**
     * Warna badge untuk tampilan UI (mengikuti design system Titiktemu).
     */
    public function badgeClass(): string
    {
        return match ($this) {
            self::TRANSPORTASI => 'bg-blue/10 text-blue-dark border border-blue/20',
            self::TIKET => 'bg-purple/10 text-purple-dark border border-purple/20',
            self::KONSUMSI => 'bg-sun/10 text-sun-dark border border-sun/20',
            self::AKOMODASI => 'bg-pink/10 text-pink-dark border border-pink/20',
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
