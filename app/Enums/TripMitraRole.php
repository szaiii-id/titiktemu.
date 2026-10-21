<?php

namespace App\Enums;

/**
 * Peran mitra dalam sebuah trip.
 *
 * - lead    : pemimpin trip, biasanya 1 per trip, honor lebih tinggi.
 * - asisten : pendamping, bisa lebih dari 1, honor lebih rendah.
 */
enum TripMitraRole: string
{
    case LEAD = 'lead';
    case ASISTEN = 'asisten';

    /**
     * Label Bahasa Indonesia untuk tampilan UI.
     */
    public function label(): string
    {
        return match ($this) {
            self::LEAD => 'Lead',
            self::ASISTEN => 'Asisten',
        };
    }

    /**
     * Warna badge untuk tampilan UI.
     */
    public function badgeClass(): string
    {
        return match ($this) {
            self::LEAD => 'bg-pink/10 text-pink-dark border border-pink/20',
            self::ASISTEN => 'bg-blue/10 text-blue-dark border border-blue/20',
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
