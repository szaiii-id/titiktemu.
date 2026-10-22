<?php

namespace App\Enums;

/**
 * Satuan kalkulasi biaya HPP.
 *
 * - total     : biaya langsung ditambahkan (misal sewa kelotok Rp 500.000).
 * - per_orang : biaya dikali max_peserta (misal makan Rp 50.000 × 20 = Rp 1.000.000).
 * - per_hari  : biaya dikali durasi_hari (misal sewa bus Rp 1.500.000 × 3 hari).
 */
enum PackageDayCostSatuan: string
{
    case TOTAL = 'total';
    case PER_ORANG = 'per_orang';
    case PER_HARI = 'per_hari';

    /**
     * Label Bahasa Indonesia untuk tampilan UI.
     */
    public function label(): string
    {
        return match ($this) {
            self::TOTAL => 'Total',
            self::PER_ORANG => 'Per Orang',
            self::PER_HARI => 'Per Hari',
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
