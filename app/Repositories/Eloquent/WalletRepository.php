<?php

namespace App\Repositories\Eloquent;

use App\Models\MitraWallet;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Repositories\Contracts\WalletRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class WalletRepository implements WalletRepositoryInterface
{
    public function findByMitra(User $mitra): ?MitraWallet
    {
        return MitraWallet::where('mitra_id', $mitra->id)->first();
    }

    public function findById(int $id): ?MitraWallet
    {
        return MitraWallet::find($id);
    }

    public function createForMitra(User $mitra): MitraWallet
    {
        return MitraWallet::create([
            'mitra_id' => $mitra->id,
            'saldo' => 0,
            'total_pendapatan' => 0,
            'total_dicairkan' => 0,
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(MitraWallet $wallet, array $data): MitraWallet
    {
        $wallet->update($data);

        return $wallet->refresh();
    }

    /** @return LengthAwarePaginator<int, WalletTransaction> */
    public function paginateTransactions(MitraWallet $wallet, int $perPage = 15): LengthAwarePaginator
    {
        return WalletTransaction::where('wallet_id', $wallet->id)
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function createTransaction(array $data): WalletTransaction
    {
        return WalletTransaction::create($data);
    }
}
