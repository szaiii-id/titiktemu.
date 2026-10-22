<?php

namespace App\Repositories\Contracts;

use App\Models\MitraWallet;
use App\Models\User;
use App\Models\WalletTransaction;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface WalletRepositoryInterface
{
    public function findByMitra(User $mitra): ?MitraWallet;

    public function findById(int $id): ?MitraWallet;

    public function createForMitra(User $mitra): MitraWallet;

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(MitraWallet $wallet, array $data): MitraWallet;

    /** @return LengthAwarePaginator<int, WalletTransaction> */
    public function paginateTransactions(MitraWallet $wallet, int $perPage = 15): LengthAwarePaginator;

    /**
     * @param  array<string, mixed>  $data
     */
    public function createTransaction(array $data): WalletTransaction;
}
