<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\RejectPayoutRequest;
use App\Models\Payout;
use App\Services\Wallet\PayoutService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class PayoutController extends Controller
{
    public function __construct(protected PayoutService $payoutService) {}

    public function index(Request $request): InertiaResponse
    {
        $filters = [
            'search' => $request->input('search'),
            'status' => $request->input('status'),
        ];
        $payouts = $this->payoutService->paginate($filters, 15);

        return Inertia::render('Admin/Payouts/Index', [
            'payouts' => $payouts,
            'filters' => $filters,
            'statusCounts' => $this->payoutService->countByStatus(),
        ]);
    }

    public function approve(Payout $payout): RedirectResponse
    {
        $this->payoutService->approve($payout, auth()->user());

        return redirect()->back()->with('status', 'Payout disetujui. Saldo mitra sudah didebit.');
    }

    /**
     * Reject payout.
     *
     * Menggunakan RejectPayoutRequest (validasi terpusat)
     */
    public function reject(RejectPayoutRequest $request, Payout $payout): RedirectResponse
    {
        $this->payoutService->reject($payout, auth()->user(), $request->validated('reason'));

        return redirect()->back()->with('status', 'Payout ditolak.');
    }

    public function markPaid(Payout $payout): RedirectResponse
    {
        $this->payoutService->markPaid($payout, auth()->user());

        return redirect()->back()->with('status', 'Payout ditandai sudah ditransfer.');
    }
}
