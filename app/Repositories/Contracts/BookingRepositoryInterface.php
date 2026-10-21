<?php

namespace App\Repositories\Contracts;

use App\Models\Booking;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

interface BookingRepositoryInterface
{
    /**
     * Ambil daftar booking dengan pagination, search, dan filter.
     *
     * @param  array{
     *     search?: string|null,
     *     status?: string|null,
     *     package_id?: int|null,
     *     user_id?: int|null,
     *     tanggal_dari?: string|null,
     *     tanggal_sampai?: string|null,
     *     per_page?: int,
     *     sort?: string,
     *     direction?: string
     * }  $filters
     * @return LengthAwarePaginator<int, Booking>
     */
    public function paginate(array $filters = [], int $perPage = 15): LengthAwarePaginator;

    /**
     * Ambil daftar booking untuk client tertentu.
     *
     * @param  array<string, mixed>  $filters
     * @return LengthAwarePaginator<int, Booking>
     */
    public function paginateForClient(User $client, array $filters = [], int $perPage = 15): LengthAwarePaginator;

    /**
     * Cari booking berdasarkan ID.
     */
    public function findById(int $id): ?Booking;

    /**
     * Cari booking berdasarkan kode (BKG-2026-001).
     */
    public function findByKode(string $kode): ?Booking;

    /**
     * Buat booking baru.
     *
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Booking;

    /**
     * Update booking.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(Booking $booking, array $data): Booking;

    /**
     * Hapus booking (soft delete).
     */
    public function delete(Booking $booking): bool;

    /**
     * Cek apakah kode booking sudah dipakai.
     */
    public function kodeExists(string $kode, ?int $exceptId = null): bool;

    /**
     * Generate kode booking berikutnya untuk tahun tertentu.
     *
     * Format: BKG-{tahun}-{3-digit-sequence}
     */
    public function generateKode(int $tahun): string;

    /**
     * Ambil booking pending yang sudah lewat expired_at.
     *
     * @return Collection<int, Booking>
     */
    public function findExpired(): Collection;

    /**
     * Hitung jumlah booking per status (untuk dashboard admin).
     *
     * @return array<string, int>
     */
    public function countByStatus(): array;

    /**
     * Hitung jumlah booking untuk client tertentu (per status).
     *
     * @return array<string, int>
     */
    public function countByStatusForClient(User $client): array;
}
