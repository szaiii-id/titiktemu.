<?php

namespace Database\Seeders;

use App\Enums\WalletTransactionCategory;
use App\Enums\WalletTransactionType;
use App\Models\MitraWallet;
use App\Models\User;
use App\Repositories\Contracts\WalletRepositoryInterface;
use App\Services\Wallet\WalletService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class WalletSeeder extends Seeder
{
    /**
     * Seed wallet mitra.
     *
     * Di PRODUCTION / DEMO:
     *   Hanya memastikan wallet record ada (saldo 0). Saldo asli
     *   masuk dari honor trip completed via WalletService::creditHonorForTrip().
     *
     * Di TESTING:
     *   Seed saldo awal Rp 500.000 per mitra via repository
     *   (bukan via WalletService, karena WalletService tidak punya
     *   method credit() generik — hanya creditHonorForTrip() untuk
     *   honor dari Trip completed).
     *
     *   Tujuannya agar E2E Wallet/Payout bisa langsung test flow
     *   tarik dana tanpa setup manual.
     */
    public function run(): void
    {
        /** @var WalletService $walletService */
        $walletService = app(WalletService::class);

        /** @var WalletRepositoryInterface $walletRepo */
        $walletRepo = app(WalletRepositoryInterface::class);

        /** @var Collection<int, User> $mitras */
        $mitras = User::where('role', 'mitra')->get();

        $isTesting = app()->environment('testing');
        $initialSaldo = $isTesting ? 500_000.0 : 0.0;

        foreach ($mitras as $mitra) {
            /** @var User $mitra */
            $wallet = $walletService->findByMitra($mitra);

            // Seed saldo hanya di testing, dan hanya jika saldo masih 0
            // (idempotent — tidak menambah dua kali kalau seeder re-run)
            if ($isTesting && $initialSaldo > 0 && (float) $wallet->saldo === 0.0) {
                $this->creditDirect(
                    $walletRepo,
                    $wallet,
                    $initialSaldo,
                    "Seed: saldo awal untuk testing E2E ({$mitra->name})",
                );
                $wallet->refresh();

                $this->command->info(
                    "💰 Wallet {$mitra->name}: +Rp ".
                    number_format($initialSaldo, 0, ',', '.').
                    ' (testing seed)'
                );
            }

            $this->command->info("Wallet mitra {$mitra->name}: {$wallet->saldoRupiah()}");
        }
    }

    /**
     * Credit saldo wallet langsung via repository (atomic, dengan lock).
     *
     * Ini adalah helper internal seeder — BUKAN business logic.
     * Di production, saldo masuk lewat WalletService::creditHonorForTrip().
     *
     * @param  float  $jumlah  Jumlah kredit (> 0).
     * @param  string  $deskripsi  Deskripsi transaksi.
     */
    protected function creditDirect(
        WalletRepositoryInterface $repo,
        MitraWallet $wallet,
        float $jumlah,
        string $deskripsi,
    ): void {
        if ($jumlah <= 0) {
            throw new \InvalidArgumentException('Jumlah credit harus > 0.');
        }

        DB::transaction(function () use ($repo, $wallet, $jumlah, $deskripsi): void {
            /** @var MitraWallet|null $locked */
            $locked = MitraWallet::lockForUpdate()->find($wallet->id);
            if ($locked === null) {
                return;
            }

            $saldoBaru = (float) $locked->saldo + $jumlah;
            $pendapatanBaru = (float) $locked->total_pendapatan + $jumlah;

            $repo->update($locked, [
                'saldo' => $saldoBaru,
                'total_pendapatan' => $pendapatanBaru,
            ]);

            $repo->createTransaction([
                'wallet_id' => $locked->id,
                'tipe' => WalletTransactionType::CREDIT->value,
                'jumlah' => $jumlah,
                'saldo_setelah' => $saldoBaru,
                'kategori' => WalletTransactionCategory::ADJUSTMENT->value,
                'referensi_type' => null,
                'referensi_id' => null,
                'deskripsi' => $deskripsi,
            ]);
        });
    }
}
