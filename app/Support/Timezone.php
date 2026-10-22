<?php

namespace App\Support;

use App\Models\User;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

/**
 * Helper terpusat untuk operasi timezone.
 *
 * Prinsip:
 * - Database menyimpan timestamp dalam UTC.
 * - Database menyimpan tanggal murni sebagai DATE (netral timezone).
 * - Logika bisnis yang butuh "hari ini" / "sekarang" WAJIB pakai helper ini
 *   dengan timezone eksplisit — DILARANG pakai now() langsung.
 * - Timezone disimpan sebagai IANA identifier (contoh: 'Asia/Makassar').
 *
 * Contoh penggunaan:
 *
 *     // Hari ini menurut timezone trip
 *     $today = Timezone::today($trip->timezone);
 *
 *     // Cek apakah trip day = hari ini
 *     if ($tripDay->tanggal->isSameDay($today)) { ... }
 *
 *     // Konversi timestamp UTC ke waktu lokal
 *     $local = Timezone::toLocal($report->submitted_at, $trip->timezone);
 */
class Timezone
{
    /**
     * Timezone default kalau tidak ada konteks yang lebih spesifik.
     *
     * Sinkron dengan User::DEFAULT_TIMEZONE.
     */
    public const DEFAULT = User::DEFAULT_TIMEZONE;

    /**
     * Ambil awal hari (00:00:00) untuk timezone tertentu.
     *
     * Dipakai untuk logika "hari ini" yang butuh perbandingan DATE.
     * Contoh: mitra hanya bisa submit report untuk trip hari ini.
     *
     * @param  string|null  $tz  IANA timezone identifier. Null → pakai DEFAULT.
     */
    public static function today(?string $tz = null): CarbonImmutable
    {
        return now()
            ->setTimezone(self::resolve($tz))
            ->startOfDay();
    }

    /**
     * Ambil waktu sekarang untuk timezone tertentu.
     *
     * @param  string|null  $tz  IANA timezone identifier. Null → pakai DEFAULT.
     */
    public static function now(?string $tz = null): CarbonImmutable
    {
        return now()->setTimezone(self::resolve($tz));
    }

    /**
     * Konversi timestamp (UTC) ke timezone lokal.
     *
     * @param  CarbonInterface  $utc  Timestamp yang akan dikonversi (biasanya dari DB, dalam UTC).
     * @param  string|null  $tz  Target timezone. Null → pakai DEFAULT.
     */
    public static function toLocal(CarbonInterface $utc, ?string $tz = null): CarbonImmutable
    {
        return CarbonImmutable::instance($utc)->setTimezone(self::resolve($tz));
    }

    /**
     * Validasi apakah string adalah IANA timezone yang valid.
     *
     * Contoh valid: 'Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'.
     * Contoh invalid: 'WIB', '+07:00', 'Asia/Makasar' (typo), ''.
     */
    public static function isValid(?string $tz): bool
    {
        if ($tz === null || $tz === '') {
            return false;
        }

        return in_array($tz, timezone_identifiers_list(), true);
    }

    /**
     * Daftar timezone Indonesia untuk dropdown UI.
     *
     * Format: [value => label]
     *
     * Dipakai di:
     * - Form create/edit user (admin pilih timezone mitra/admin)
     * - Form create/edit package (admin pilih timezone lokasi tour)
     * - Profile mitra/client
     *
     * @return array<string, string>
     */
    public static function options(): array
    {
        return [
            'Asia/Jakarta' => 'WIB (UTC+7)',
            'Asia/Makassar' => 'WITA (UTC+8)',
            'Asia/Jayapura' => 'WIT (UTC+9)',
        ];
    }

    /**
     * Ambil offset UTC dalam format '+07:00', '+08:00', dst.
     */
    public static function offset(?string $tz = null): string
    {
        return now()->setTimezone(self::resolve($tz))->format('P');
    }

    /**
     * Resolve timezone: pakai argumen kalau valid, fallback ke DEFAULT.
     *
     * Method internal — tidak perlu dipanggil langsung dari luar.
     */
    protected static function resolve(?string $tz): string
    {
        return self::isValid($tz) ? $tz : self::DEFAULT;
    }
}
