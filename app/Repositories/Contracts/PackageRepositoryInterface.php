<?php

namespace App\Repositories\Contracts;

use App\Models\Package;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

interface PackageRepositoryInterface
{
    /**
     * Ambil daftar paket dengan pagination, search, dan filter.
     *
     * @param  array{
     *     search?: string|null,
     *     status?: string|null,
     *     kategori?: string|null,
     *     per_page?: int,
     *     sort?: string,
     *     direction?: string
     * }  $filters
     * @return LengthAwarePaginator<int, Package>
     */
    public function paginate(array $filters = [], int $perPage = 15): LengthAwarePaginator;

    /**
     * Cari paket berdasarkan ID.
     */
    public function findById(int $id): ?Package;

    /**
     * Cari paket berdasarkan slug.
     */
    public function findBySlug(string $slug): ?Package;

    /**
     * Cari paket berdasarkan kode (PKG-2026-001).
     */
    public function findByKode(string $kode): ?Package;

    /**
     * Buat paket baru.
     *
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Package;

    /**
     * Update paket.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(Package $package, array $data): Package;

    /**
     * Hapus paket (soft delete).
     */
    public function delete(Package $package): bool;

    /**
     * Cek apakah slug sudah dipakai.
     *
     * @param  int|null  $exceptId  Kecualikan ID tertentu (untuk update).
     */
    public function slugExists(string $slug, ?int $exceptId = null): bool;

    /**
     * Cek apakah kode sudah dipakai.
     */
    public function kodeExists(string $kode, ?int $exceptId = null): bool;

    /**
     * Generate kode paket berikutnya untuk tahun tertentu.
     *
     * Format: PKG-{tahun}-{3-digit-sequence}
     * Contoh: PKG-2026-001, PKG-2026-002
     */
    public function generateKode(int $tahun): string;

    /**
     * Ambil semua paket dengan status 'aktif' (untuk katalog client).
     *
     * @return Collection<int, Package>
     */
    public function allAktif(): Collection;

    /**
     * Hitung jumlah paket per status (untuk dashboard).
     *
     * @return array<string, int>
     */
    public function countByStatus(): array;
}
