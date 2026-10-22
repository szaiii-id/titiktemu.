<?php

namespace App\Http\Controllers\Mitra;

use App\Http\Controllers\Controller;
use App\Services\Wallet\WalletService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class WalletController extends Controller
{
    public function __construct(protected WalletService $walletService) {}

    public function index(Request $request): InertiaResponse
    {
        $mitra = $request->user();
        $wallet = $this->walletService->findByMitra($mitra);
        $transactions = $this->walletService->paginateTransactions($mitra, 15);

        return Inertia::render('Mitra/Wallet/Index', [
            'wallet' => $wallet,
            'transactions' => $transactions,
        ]);
    }
}
