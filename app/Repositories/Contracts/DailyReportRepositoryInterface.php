<?php

namespace App\Repositories\Contracts;

use App\Models\DailyReport;
use App\Models\Trip;
use App\Models\TripDay;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

interface DailyReportRepositoryInterface
{
    /**
     * Ambil daftar daily report dengan pagination & filter (admin).
     *
     * @param  array{
     *     search?: string|null,
     *     status?: string|null,
     *     mitra_id?: int|null,
     *     trip_id?: int|null,
     *     per_page?: int,
     *     sort?: string,
     *     direction?: string
     * }  $filters
     * @return LengthAwarePaginator<int, DailyReport>
     */
    public function paginate(array $filters = [], int $perPage = 15): LengthAwarePaginator;

    /**
     * Ambil daftar daily report untuk mitra tertentu.
     *
     * @param  array<string, mixed>  $filters
     * @return LengthAwarePaginator<int, DailyReport>
     */
    public function paginateForMitra(User $mitra, array $filters = [], int $perPage = 15): LengthAwarePaginator;

    /**
     * Cari report berdasarkan ID.
     */
    public function findById(int $id): ?DailyReport;

    /**
     * Cari report berdasarkan trip_day & mitra (unique).
     */
    public function findByTripDayAndMitra(TripDay $tripDay, User $mitra): ?DailyReport;

    /**
     * Buat report baru.
     *
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): DailyReport;

    /**
     * Update report.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(DailyReport $report, array $data): DailyReport;

    /**
     * Hapus report (hard delete).
     */
    public function delete(DailyReport $report): bool;

    /**
     * Hitung jumlah report per status (untuk dashboard admin).
     *
     * @return array<string, int>
     */
    public function countByStatus(): array;

    /**
     * Hitung jumlah report per status untuk mitra.
     *
     * @return array<string, int>
     */
    public function countByStatusForMitra(User $mitra): array;

    /**
     * Ambil semua trip_day dari sebuah trip yang belum punya report verified.
     *
     * @return Collection<int, TripDay>
     */
    public function findUnverifiedDaysForTrip(Trip $trip): Collection;

    /**
     * Cek apakah semua trip_day dari sebuah trip sudah punya report verified.
     */
    public function allDaysVerifiedForTrip(Trip $trip): bool;

    /**
     * Ambil semua report pending (submitted) untuk sebuah trip.
     *
     * @return Collection<int, DailyReport>
     */
    public function findSubmittedForTrip(Trip $trip): Collection;
}
