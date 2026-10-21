<?php

namespace App\Repositories\Contracts;

use App\Models\Trip;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

interface TripRepositoryInterface
{
    /**
     * Ambil daftar trip dengan pagination, search, dan filter (admin).
     *
     * @param  array{
     *     search?: string|null,
     *     status?: string|null,
     *     package_id?: int|null,
     *     mitra_id?: int|null,
     *     tanggal_dari?: string|null,
     *     tanggal_sampai?: string|null,
     *     per_page?: int,
     *     sort?: string,
     *     direction?: string
     * }  $filters
     * @return LengthAwarePaginator<int, Trip>
     */
    public function paginate(array $filters = [], int $perPage = 15): LengthAwarePaginator;

    /**
     * Ambil daftar trip untuk mitra tertentu.
     *
     * @param  array<string, mixed>  $filters
     * @return LengthAwarePaginator<int, Trip>
     */
    public function paginateForMitra(User $mitra, array $filters = [], int $perPage = 15): LengthAwarePaginator;

    /**
     * Cari trip berdasarkan ID.
     */
    public function findById(int $id): ?Trip;

    /**
     * Cari trip berdasarkan kode (TRP-2026-001).
     */
    public function findByKode(string $kode): ?Trip;

    /**
     * Cari trip berdasarkan booking_id (1 booking = 1 trip).
     */
    public function findByBookingId(int $bookingId): ?Trip;

    /**
     * Buat trip baru.
     *
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Trip;

    /**
     * Update trip.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(Trip $trip, array $data): Trip;

    /**
     * Cek apakah kode trip sudah dipakai.
     */
    public function kodeExists(string $kode, ?int $exceptId = null): bool;

    /**
     * Generate kode trip berikutnya untuk tahun tertentu.
     *
     * Format: TRP-{tahun}-{3-digit-sequence}
     */
    public function generateKode(int $tahun): string;

    /**
     * Ambil trip scheduled yang tanggal_mulai <= tanggal tertentu.
     *
     * Untuk scheduler auto-active (pre-filter kasar; timezone-aware di Service).
     *
     * @return Collection<int, Trip>
     */
    public function findScheduledDueToday(string $tanggal): Collection;

    /**
     * Hitung jumlah trip per status (untuk dashboard admin).
     *
     * @return array<string, int>
     */
    public function countByStatus(): array;

    /**
     * Hitung jumlah trip per status untuk mitra tertentu.
     *
     * @return array<string, int>
     */
    public function countByStatusForMitra(User $mitra): array;
}
