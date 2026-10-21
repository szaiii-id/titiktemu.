<?php

namespace App\Http\Controllers\Mitra;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use App\Models\TripDay;
use App\Services\Trip\DailyReportService;
use App\Services\Trip\TripService;
use App\Services\Wallet\PayoutService;
use App\Services\Wallet\WalletService;
use App\Support\Timezone;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class DashboardController extends Controller
{
    public function __construct(
        protected TripService $tripService,
        protected DailyReportService $dailyReportService,
        protected WalletService $walletService,
        protected PayoutService $payoutService,
    ) {}

    public function index(Request $request): InertiaResponse
    {
        $mitra = $request->user();

        $tripCounts = $this->tripService->countByStatusForMitra($mitra);
        $reportCounts = $this->dailyReportService->countByStatusForMitra($mitra);
        $wallet = $this->walletService->findByMitra($mitra);
        $payoutCounts = $this->payoutService->countByStatusForMitra($mitra);

        $todayTrips = Trip::whereHas('mitras', fn ($q) => $q->where('mitra_id', $mitra->id))
            ->where('status', 'active')
            ->with([
                'package:id,nama,kode',
                'mitras' => fn ($q) => $q->where('mitra_id', $mitra->id),
            ])
            ->get()
            ->filter(function (Trip $trip) {
                $tz = $trip->timezoneOrDefault();
                $todayStr = Timezone::today($tz)->format('Y-m-d');
                $startStr = $trip->tanggal_mulai->format('Y-m-d');
                $endStr = $trip->tanggal_selesai->format('Y-m-d');

                return $startStr <= $todayStr && $endStr >= $todayStr;
            })
            ->map(function (Trip $trip) use ($mitra) {
                $tz = $trip->timezoneOrDefault();
                $todayStr = Timezone::today($tz)->format('Y-m-d');

                // ✅ FIX #1: Hitung hari_ke dari selisih tanggal_mulai
                $tanggalMulai = Carbon::parse($trip->tanggal_mulai);
                $hariKe = $tanggalMulai->diffInDays(Carbon::parse($todayStr)) + 1;

                $todayDay = TripDay::where('trip_id', $trip->id)
                    ->where('hari_ke', $hariKe)
                    ->with([
                        'dailyReports' => fn ($q) => $q
                            ->where('mitra_id', $mitra->id)
                            ->whereIn('status', ['submitted', 'verified']),
                    ])
                    ->first();

                $tripMitra = $trip->mitras->firstWhere('mitra_id', $mitra->id);
                $report = $todayDay?->dailyReports->first();

                return [
                    'id' => $trip->id,
                    'kode' => $trip->kode,
                    'status' => $trip->status->value,
                    'package' => $trip->package ? [
                        'id' => $trip->package->id,
                        'nama' => $trip->package->nama,
                        'kode' => $trip->package->kode,
                    ] : null,
                    'trip_mitra' => $tripMitra ? [
                        'role' => $tripMitra->role->value,
                        'honor' => (string) $tripMitra->honor,
                        'honor_tipe' => $tripMitra->honor_tipe,
                    ] : null,
                    'today_day' => $todayDay ? [
                        'id' => $todayDay->id,
                        'hari_ke' => $todayDay->hari_ke,
                        'tanggal' => $todayDay->tanggal->format('Y-m-d'),
                        'judul' => $todayDay->judul,
                        'status' => $todayDay->status,
                        'has_report' => $report !== null,
                        'report_status' => $report?->status,
                    ] : null,
                ];
            })
            ->values();

        $pendingReports = $this->dailyReportService
            ->paginateForMitra($mitra, ['status' => 'submitted'], 5)
            ->items();

        return Inertia::render('Mitra/Dashboard', [
            'stats' => [
                'trips' => [
                    'scheduled' => $tripCounts['scheduled'] ?? 0,
                    'active' => $tripCounts['active'] ?? 0,
                    'completed' => $tripCounts['completed'] ?? 0,
                    'total' => array_sum($tripCounts),
                ],
                'daily_reports' => [
                    'submitted' => $reportCounts['submitted'] ?? 0,
                    'verified' => $reportCounts['verified'] ?? 0,
                    'rejected' => $reportCounts['rejected'] ?? 0,
                    'total' => array_sum($reportCounts),
                ],
                'wallet' => [
                    'saldo' => (float) $wallet->saldo,
                    'total_pendapatan' => (float) $wallet->total_pendapatan,
                    'total_dicairkan' => (float) $wallet->total_dicairkan,
                ],
                'pending_payouts' => ($payoutCounts['pending'] ?? 0) + ($payoutCounts['approved'] ?? 0),
            ],
            'todayTrips' => $todayTrips,
            'pendingReports' => $pendingReports,
        ]);
    }
}
