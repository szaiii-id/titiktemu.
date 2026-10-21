<?php

namespace App\Services\Wallet;

use App\Enums\WalletTransactionCategory;
use App\Enums\WalletTransactionType;
use App\Models\MitraWallet;
use App\Models\Payout;
use App\Models\Trip;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Repositories\Contracts\WalletRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class WalletService
{
    public function __construct(
        protected WalletRepositoryInterface $walletRepository,
    ) {}

    public function findByMitra(User $mitra): MitraWallet
    {
        // NOTE: `findByMitra` di interface HARUS dideklarasikan `?MitraWallet`
        // agar pengecekan null di sini valid secara tipe. Setelah interface
        // diperbaiki, error `booleanNot.alwaysFalse` di PHPStan akan hilang.
        $wallet = $this->walletRepository->findByMitra($mitra);

        if ($wallet === null) {
            $wallet = $this->walletRepository->createForMitra($mitra);
        }

        return $wallet;
    }

    /**
     * @return LengthAwarePaginator<int, WalletTransaction>
     */
    public function paginateTransactions(User $mitra, int $perPage = 15): LengthAwarePaginator
    {
        $wallet = $this->findByMitra($mitra);

        return $this->walletRepository->paginateTransactions($wallet, $perPage);
    }

    public function creditHonorForTrip(Trip $trip): void
    {
        DB::transaction(function () use ($trip): void {
            $trip->loadMissing('mitras.mitra');

            foreach ($trip->mitras as $tm) {
                $mitra = $tm->mitra;

                if ($mitra === null) {
                    continue;
                }

                $honor = $tm->hitungHonorTotal($trip->durasiHari());
                if ($honor <= 0) {
                    continue;
                }

                $wallet = $this->walletRepository->findByMitra($mitra);
                if ($wallet === null) {
                    $wallet = $this->walletRepository->createForMitra($mitra);
                }

                /** @var MitraWallet|null $lockedWallet */
                $lockedWallet = MitraWallet::lockForUpdate()->find($wallet->id);
                if ($lockedWallet === null) {
                    continue;
                }

                $newSaldo = (float) $lockedWallet->saldo + $honor;
                $newPendapatan = (float) $lockedWallet->total_pendapatan + $honor;

                $this->walletRepository->update($lockedWallet, [
                    'saldo' => $newSaldo,
                    'total_pendapatan' => $newPendapatan,
                ]);

                $this->walletRepository->createTransaction([
                    'wallet_id' => $lockedWallet->id,
                    'tipe' => WalletTransactionType::CREDIT->value,
                    'jumlah' => $honor,
                    'saldo_setelah' => $newSaldo,
                    'kategori' => WalletTransactionCategory::HONOR_TRIP->value,
                    'referensi_type' => Trip::class,
                    'referensi_id' => $trip->id,
                    'deskripsi' => "Honor trip {$trip->kode}",
                ]);

                Log::info('Honor dicreditkan', [
                    'mitra_id' => $mitra->id,
                    'trip_id' => $trip->id,
                    'honor' => $honor,
                ]);
            }
        });
    }

    public function debitForPayout(User $mitra, float $jumlah, string $deskripsi, int $payoutId): void
    {
        DB::transaction(function () use ($mitra, $jumlah, $deskripsi, $payoutId): void {
            $wallet = $this->walletRepository->findByMitra($mitra);
            if ($wallet === null) {
                throw ValidationException::withMessages(['wallet' => ['Wallet tidak ditemukan.']]);
            }

            /** @var MitraWallet|null $lockedWallet */
            $lockedWallet = MitraWallet::lockForUpdate()->find($wallet->id);
            if ($lockedWallet === null) {
                throw ValidationException::withMessages(['wallet' => ['Wallet tidak ditemukan.']]);
            }

            if ((float) $lockedWallet->saldo < $jumlah) {
                throw ValidationException::withMessages(['jumlah' => ['Saldo tidak cukup.']]);
            }

            $newSaldo = (float) $lockedWallet->saldo - $jumlah;
            $newDicairkan = (float) $lockedWallet->total_dicairkan + $jumlah;

            $this->walletRepository->update($lockedWallet, [
                'saldo' => $newSaldo,
                'total_dicairkan' => $newDicairkan,
            ]);

            $this->walletRepository->createTransaction([
                'wallet_id' => $lockedWallet->id,
                'tipe' => WalletTransactionType::DEBIT->value,
                'jumlah' => $jumlah,
                'saldo_setelah' => $newSaldo,
                'kategori' => WalletTransactionCategory::PAYOUT->value,
                'referensi_type' => Payout::class,
                'referensi_id' => $payoutId,
                'deskripsi' => $deskripsi,
            ]);

            Log::info('Wallet didebit untuk payout', [
                'mitra_id' => $mitra->id,
                'jumlah' => $jumlah,
                'payout_id' => $payoutId,
            ]);
        });
    }
}
