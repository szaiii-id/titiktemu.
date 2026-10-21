<?php

namespace App\Http\Controllers\Mitra;

use App\Http\Controllers\Controller;
use App\Http\Requests\Mitra\StorePayoutRequest;
use App\Models\User;
use App\Services\Wallet\PayoutService;
use App\Services\Wallet\WalletService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class PayoutController extends Controller
{
    public function __construct(
        protected PayoutService $payoutService,
        protected WalletService $walletService,
    ) {}

    public function index(Request $request): InertiaResponse
    {
        /** @var User $mitra */
        $mitra = $request->user();

        $payouts = $this->payoutService->paginateForMitra($mitra, [], 10);
        $counts = $this->payoutService->countByStatusForMitra($mitra);

        return Inertia::render('Mitra/Payouts/Index', [
            'payouts' => $payouts,
            'statusCounts' => $counts,
        ]);
    }

    public function create(Request $request): InertiaResponse
    {
        /** @var User $mitra */
        $mitra = $request->user();

        $wallet = $this->walletService->findByMitra($mitra);

        return Inertia::render('Mitra/Payouts/Create', [
            'wallet' => $wallet,
            'minimumPayout' => PayoutService::MINIMUM_PAYOUT,
        ]);
    }

    public function store(StorePayoutRequest $request): RedirectResponse
    {
        /** @var User $mitra */
        $mitra = $request->user();

        /** @var array{jumlah: float|int, bank_tujuan: string, no_rekening: string, nama_pemilik: string, catatan?: string|null} $data */
        $data = $request->validated();

        $this->payoutService->request($mitra, $data);

        return redirect()
            ->route('mitra.payouts.index')
            ->with('status', 'Pengajuan pencairan berhasil. Menunggu review admin.');
    }
}
