<?php

namespace App\Enums;

/**
 * Status siklus hidup sebuah trip.
 *
 * Alur normal:
 *
 *     scheduled → active → completed
 *
 * Alur pembatalan:
 *
 *     scheduled → cancelled  (admin cancel sebelum trip jalan)
 *     active    → cancelled  (admin cancel saat trip jalan — jarang)
 *
 * Transisi otomatis:
 * - `scheduled` → `active`    : saat tanggal_mulai <= Timezone::today(trip.timezone)
 *                               DAN trip sudah punya minimal 1 mitra
 * - `active`    → `completed` : saat semua daily report verified (Fase 4)
 *
 * Catatan:
 * - Trip tidak pernah dihapus — hanya `cancelled`.
 * - Perubahan status di-handle oleh Service (bukan otomatis di DB).
 */
enum TripStatus: string
{
    case SCHEDULED = 'scheduled';
    case ACTIVE = 'active';
    case COMPLETED = 'completed';
    case CANCELLED = 'cancelled';

    /**
     * Label Bahasa Indonesia untuk tampilan UI.
     */
    public function label(): string
    {
        return match ($this) {
            self::SCHEDULED => 'Terjadwal',
            self::ACTIVE => 'Sedang Berjalan',
            self::COMPLETED => 'Selesai',
            self::CANCELLED => 'Dibatalkan',
        };
    }

    /**
     * Warna badge untuk tampilan UI.
     */
    public function badgeClass(): string
    {
        return match ($this) {
            self::SCHEDULED => 'bg-blue/10 text-blue-dark border border-blue/20',
            self::ACTIVE => 'bg-purple/10 text-purple-dark border border-purple/20',
            self::COMPLETED => 'bg-green/10 text-green-dark border border-green/20',
            self::CANCELLED => 'bg-red-50 text-red-700 border border-red-200',
        };
    }

    /**
     * Apakah trip masih aktif (belum selesai/dibatalkan)?
     */
    public function isActive(): bool
    {
        return in_array($this, [self::SCHEDULED, self::ACTIVE], true);
    }

    /**
     * Apakah trip sudah final (tidak bisa diubah)?
     */
    public function isFinal(): bool
    {
        return in_array($this, [self::COMPLETED, self::CANCELLED], true);
    }

    /**
     * Apakah trip bisa di-cancel?
     *
     * Trip bisa cancel selama belum `completed`/`cancelled`.
     */
    public function canBeCancelled(): bool
    {
        return in_array($this, [self::SCHEDULED, self::ACTIVE], true);
    }

    /**
     * Apakah trip bisa di-assign mitra?
     *
     * Mitra hanya bisa di-assign sebelum trip `completed`/`cancelled`.
     */
    public function canAssignMitra(): bool
    {
        return in_array($this, [self::SCHEDULED, self::ACTIVE], true);
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
