<?php

namespace App\Repositories\Contracts;

use App\Models\Payout;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

interface PayoutRepositoryInterface
{
    /**
     * @param  array<string, mixed>  $filters
     * @return LengthAwarePaginator<int, Payout>
     */
    public function paginate(array $filters = [], int $perPage = 15): LengthAwarePaginator;

    /**
     * @param  array<string, mixed>  $filters
     * @return LengthAwarePaginator<int, Payout>
     */
    public function paginateForMitra(User $mitra, array $filters = [], int $perPage = 10): LengthAwarePaginator;

    public function findById(int $id): ?Payout;

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Payout;

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Payout $payout, array $data): Payout;

    public function generateKode(int $tahun): string;

    /** @return Collection<int, Payout> */
    public function findPendingForMitraToday(User $mitra): Collection;

    /** @return array<string, int> */
    public function countByStatus(): array;

    /** @return array<string, int> */
    public function countByStatusForMitra(User $mitra): array;
}
