<?php

namespace App\Services\Wallet;

use App\Enums\PayoutStatus;
use App\Models\Payout;
use App\Models\User;
use App\Repositories\Contracts\PayoutRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class PayoutService
{
    public const MINIMUM_PAYOUT = 100000;

    public function __construct(
        protected PayoutRepositoryInterface $payoutRepository,
        protected WalletService $walletService,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     * @return LengthAwarePaginator<int, Payout>
     */
    public function paginate(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        return $this->payoutRepository->paginate($filters, $perPage);
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return LengthAwarePaginator<int, Payout>
     */
    public function paginateForMitra(User $mitra, array $filters = [], int $perPage = 10): LengthAwarePaginator
    {
        return $this->payoutRepository->paginateForMitra($mitra, $filters, $perPage);
    }

    /** @return array<string, int> */
    public function countByStatus(): array
    {
        return $this->payoutRepository->countByStatus();
    }

    /** @return array<string, int> */
    public function countByStatusForMitra(User $mitra): array
    {
        return $this->payoutRepository->countByStatusForMitra($mitra);
    }

    /**
     * @param  array{
     *     jumlah: float|int,
     *     bank_tujuan: string,
     *     no_rekening: string,
     *     nama_pemilik: string,
     *     catatan?: string|null
     * }  $data
     */
    public function request(User $mitra, array $data): Payout
    {
        $wallet = $this->walletService->findByMitra($mitra);

        $jumlah = (float) $data['jumlah'];

        if ((float) $wallet->saldo < $jumlah) {
            throw ValidationException::withMessages(['jumlah' => ['Saldo tidak cukup.']]);
        }

        if ($jumlah < self::MINIMUM_PAYOUT) {
            throw ValidationException::withMessages([
                'jumlah' => ['Minimum pencairan Rp '.number_format(self::MINIMUM_PAYOUT, 0, ',', '.')],
            ]);
        }

        $pending = $this->payoutRepository->findPendingForMitraToday($mitra);
        if ($pending->isNotEmpty()) {
            throw ValidationException::withMessages([
                'payout' => ['Anda sudah memiliki pengajuan hari ini. Tunggu review admin.'],
            ]);
        }

        return DB::transaction(function () use ($mitra, $data, $jumlah) {
            $kode = $this->payoutRepository->generateKode((int) now()->year);

            $payout = $this->payoutRepository->create([
                'kode' => $kode,
                'mitra_id' => $mitra->id,
                'jumlah' => $jumlah,
                'bank_tujuan' => $data['bank_tujuan'],
                'no_rekening' => $data['no_rekening'],
                'nama_pemilik' => $data['nama_pemilik'],
                'status' => PayoutStatus::PENDING->value,
                'requested_at' => now(),
                'catatan' => $data['catatan'] ?? null,
            ]);

            Log::info('Payout requested', [
                'payout_id' => $payout->id,
                'mitra_id' => $mitra->id,
                'jumlah' => $jumlah,
            ]);

            return $payout;
        });
    }

    public function approve(Payout $payout, User $admin): Payout
    {
        if ($payout->status !== PayoutStatus::PENDING) {
            throw ValidationException::withMessages([
                'status' => ['Hanya pengajuan pending yang bisa disetujui.'],
            ]);
        }

        $mitra = $payout->mitra;
        if (! $mitra) {
            throw ValidationException::withMessages([
                'mitra' => ['Mitra tidak ditemukan untuk payout ini.'],
            ]);
        }

        return DB::transaction(function () use ($payout, $admin, $mitra) {
            $this->walletService->debitForPayout(
                $mitra,
                (float) $payout->jumlah,
                "Pencairan {$payout->kode}",
                $payout->id,
            );

            $payout = $this->payoutRepository->update($payout, [
                'status' => PayoutStatus::APPROVED->value,
                'reviewed_by' => $admin->id,
                'reviewed_at' => now(),
            ]);

            Log::info('Payout approved', [
                'payout_id' => $payout->id,
                'admin_id' => $admin->id,
            ]);

            return $payout;
        });
    }

    public function reject(Payout $payout, User $admin, string $reason): Payout
    {
        if ($payout->status !== PayoutStatus::PENDING) {
            throw ValidationException::withMessages([
                'status' => ['Hanya pengajuan pending yang bisa ditolak.'],
            ]);
        }

        return DB::transaction(function () use ($payout, $admin, $reason) {
            $payout = $this->payoutRepository->update($payout, [
                'status' => PayoutStatus::REJECTED->value,
                'reviewed_by' => $admin->id,
                'reviewed_at' => now(),
                'rejection_reason' => $reason,
            ]);

            Log::warning('Payout rejected', [
                'payout_id' => $payout->id,
                'reason' => $reason,
            ]);

            return $payout;
        });
    }

    public function markPaid(Payout $payout, User $admin): Payout
    {
        if ($payout->status !== PayoutStatus::APPROVED) {
            throw ValidationException::withMessages([
                'status' => ['Hanya pengajuan approved yang bisa ditandai sudah ditransfer.'],
            ]);
        }

        return DB::transaction(function () use ($payout) {
            $payout = $this->payoutRepository->update($payout, [
                'status' => PayoutStatus::PAID->value,
                'paid_at' => now(),
            ]);

            Log::info('Payout paid', [
                'payout_id' => $payout->id,
            ]);

            return $payout;
        });
    }
}
