<?php

namespace App\Enums;

/**
 * Status siklus hidup sebuah paket wisata.
 *
 * Alur:
 *
 *     draft  →  aktif  →  arsip
 *       ↑                  │
 *       └──────────────────┘
 *         (bisa di-restore)
 *
 * - draft : paket baru dibuat, belum siap dijual.
 *           Tidak muncul di katalog client.
 * - aktif : paket siap dijual, muncul di katalog client.
 * - arsip : paket tidak dijual lagi (misal season lewat, atau diganti
 *           versi baru). Tidak muncul di katalog, tapi data tetap ada
 *           untuk audit & booking lama.
 *
 * Paket yang sudah punya booking TIDAK boleh dihapus — harus di-archive.
 */
enum PackageStatus: string
{
    case DRAFT = 'draft';
    case AKTIF = 'aktif';
    case ARSIP = 'arsip';

    /**
     * Label Bahasa Indonesia untuk tampilan UI.
     */
    public function label(): string
    {
        return match ($this) {
            self::DRAFT => 'Draft',
            self::AKTIF => 'Aktif',
            self::ARSIP => 'Arsip',
        };
    }

    /**
     * Warna badge untuk tampilan UI (mengikuti design system Titiktemu).
     *
     * Return string Tailwind class.
     */
    public function badgeClass(): string
    {
        return match ($this) {
            self::DRAFT => 'bg-gray-100 text-gray-700 border border-gray-200',
            self::AKTIF => 'bg-green/10 text-green-dark border border-green/20',
            self::ARSIP => 'bg-sun/10 text-sun-dark border border-sun/20',
        };
    }

    /**
     * Daftar semua value (untuk validasi Rule::in atau Rule::enum).
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
