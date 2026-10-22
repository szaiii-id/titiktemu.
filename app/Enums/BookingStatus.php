<?php

namespace App\Enums;

/**
 * Status siklus hidup sebuah booking.
 *
 * Alur normal:
 *
 *     pending_payment → payment_verified → confirmed → in_progress → completed
 *
 * Alur pembatalan:
 *
 *     pending_payment → cancelled  (auto-expired 24 jam / client cancel)
 *     payment_verified → cancelled (admin cancel)
 *     confirmed → cancelled         (admin cancel, sebelum trip)
 *
 * Catatan:
 * - `payment_verified` dan `confirmed` sengaja dipisah supaya admin bisa
 *   verifikasi pembayaran dulu, baru konfirmasi booking (misal sambil
 *   koordinasi dengan mitra).
 * - `in_progress` dan `completed` di-set otomatis oleh scheduler trip
 *   (Fase 3), bukan manual.
 */
enum BookingStatus: string
{
    case PENDING_PAYMENT = 'pending_payment';
    case PAYMENT_VERIFIED = 'payment_verified';
    case CONFIRMED = 'confirmed';
    case IN_PROGRESS = 'in_progress';
    case COMPLETED = 'completed';
    case CANCELLED = 'cancelled';

    /**
     * Label Bahasa Indonesia untuk tampilan UI.
     */
    public function label(): string
    {
        return match ($this) {
            self::PENDING_PAYMENT => 'Menunggu Pembayaran',
            self::PAYMENT_VERIFIED => 'Pembayaran Diverifikasi',
            self::CONFIRMED => 'Terkonfirmasi',
            self::IN_PROGRESS => 'Sedang Berjalan',
            self::COMPLETED => 'Selesai',
            self::CANCELLED => 'Dibatalkan',
        };
    }

    /**
     * Warna badge untuk tampilan UI (mengikuti design system Titiktemu).
     */
    public function badgeClass(): string
    {
        return match ($this) {
            self::PENDING_PAYMENT => 'bg-sun/10 text-sun-dark border border-sun/20',
            self::PAYMENT_VERIFIED => 'bg-blue/10 text-blue-dark border border-blue/20',
            self::CONFIRMED => 'bg-green/10 text-green-dark border border-green/20',
            self::IN_PROGRESS => 'bg-purple/10 text-purple-dark border border-purple/20',
            self::COMPLETED => 'bg-gray-100 text-gray-700 border border-gray-200',
            self::CANCELLED => 'bg-red-50 text-red-700 border border-red-200',
        };
    }

    /**
     * Apakah booking masih bisa di-cancel oleh client?
     *
     * Client hanya bisa cancel sebelum status `confirmed`.
     */
    public function canBeCancelledByClient(): bool
    {
        return in_array($this, [
            self::PENDING_PAYMENT,
            self::PAYMENT_VERIFIED,
        ], true);
    }

    /**
     * Apakah booking sudah final (tidak bisa diubah)?
     */
    public function isFinal(): bool
    {
        return in_array($this, [
            self::COMPLETED,
            self::CANCELLED,
        ], true);
    }

    /**
     * Apakah booking masih aktif (bisa lanjut ke status berikutnya)?
     */
    public function isActive(): bool
    {
        return ! $this->isFinal();
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
