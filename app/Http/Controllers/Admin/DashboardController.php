<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Trip;
use App\Models\TripMitra;
use App\Models\User;
use App\Services\Booking\BookingService;
use App\Services\Package\PackageService;
use App\Services\Trip\DailyReportService;
use App\Services\Trip\TripService;
use App\Services\Wallet\PayoutService;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class DashboardController extends Controller
{
    public function __construct(
        protected PackageService $packageService,
        protected BookingService $bookingService,
        protected TripService $tripService,
        protected DailyReportService $dailyReportService,
        protected PayoutService $payoutService,
    ) {}

    public function index(): InertiaResponse
    {
        $packageCounts = $this->packageService->countByStatus();
        $bookingCounts = $this->bookingService->countByStatus();
        $tripCounts = $this->tripService->countByStatus();
        $reportCounts = $this->dailyReportService->countByStatus();
        $payoutCounts = $this->payoutService->countByStatus();

        $totalRevenue = Booking::whereIn('status', ['confirmed', 'completed'])->sum('total_harga');
        $totalHonor = TripMitra::whereHas('trip', function ($q) {
            $q->where('status', 'completed');
        })->sum('honor');

        $stats = [
            'totalAdmin' => User::where('role', 'admin')->count(),
            'totalMitra' => User::where('role', 'mitra')->count(),
            'totalClient' => User::where('role', 'client')->count(),
            'packages' => [
                'draft' => $packageCounts['draft'] ?? 0,
                'aktif' => $packageCounts['aktif'] ?? 0,
                'arsip' => $packageCounts['arsip'] ?? 0,
                'total' => array_sum($packageCounts),
            ],
            'bookings' => [
                'pending_payment' => $bookingCounts['pending_payment'] ?? 0,
                'payment_verified' => $bookingCounts['payment_verified'] ?? 0,
                'confirmed' => $bookingCounts['confirmed'] ?? 0,
                'in_progress' => $bookingCounts['in_progress'] ?? 0,
                'completed' => $bookingCounts['completed'] ?? 0,
                'cancelled' => $bookingCounts['cancelled'] ?? 0,
                'total' => array_sum($bookingCounts),
                'needs_attention' => ($bookingCounts['pending_payment'] ?? 0) + ($bookingCounts['payment_verified'] ?? 0),
            ],
            'trips' => [
                'scheduled' => $tripCounts['scheduled'] ?? 0,
                'active' => $tripCounts['active'] ?? 0,
                'completed' => $tripCounts['completed'] ?? 0,
                'cancelled' => $tripCounts['cancelled'] ?? 0,
                'total' => array_sum($tripCounts),
                'needs_mitra' => Trip::scheduled()->whereDoesntHave('mitras')->count(),
            ],
            'daily_reports' => [
                'submitted' => $reportCounts['submitted'] ?? 0,
                'verified' => $reportCounts['verified'] ?? 0,
                'rejected' => $reportCounts['rejected'] ?? 0,
                'total' => array_sum($reportCounts),
            ],
            'payouts' => [
                'pending' => $payoutCounts['pending'] ?? 0,
                'approved' => $payoutCounts['approved'] ?? 0,
                'paid' => $payoutCounts['paid'] ?? 0,
                'rejected' => $payoutCounts['rejected'] ?? 0,
                'total' => array_sum($payoutCounts),
            ],
            'total_revenue' => $totalRevenue,
            'total_honor' => $totalHonor,
        ];

        // 5 Booking terbaru
        $recentBookings = Booking::with(['client:id,name', 'package:id,nama'])
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(fn ($b) => [
                'id' => $b->id,
                'kode' => $b->kode,
                'client' => $b->client->name ?? '-',
                'paket' => $b->package->nama ?? '-',
                'total' => $b->total_harga,
                'status' => is_object($b->status) ? $b->status->value : $b->status,
                'tanggal' => $b->created_at->format('d M Y'),
            ]);

        $sixMonthsAgo = now()->subMonths(5)->startOfMonth();

        // ✅ FIX: Cek driver database untuk format tanggal
        $isSqlite = DB::connection()->getDriverName() === 'sqlite';
        $dateFormat = $isSqlite
            ? "strftime('%Y-%m', created_at)"
            : "TO_CHAR(created_at, 'YYYY-MM')";

        // Pendapatan 6 bulan terakhir
        $revenueData = Booking::selectRaw("$dateFormat as bulan, SUM(total_harga) as total")
            ->whereIn('status', ['confirmed', 'completed'])
            ->where('created_at', '>=', $sixMonthsAgo)
            ->groupBy('bulan')
            ->orderBy('bulan')
            ->pluck('total', 'bulan')
            ->toArray();

        $monthlyRevenue = [];
        for ($i = 5; $i >= 0; $i--) {
            $date = now()->subMonths($i);
            $key = $date->format('Y-m');
            $monthlyRevenue[] = [
                'bulan' => $date->translatedFormat('M'),
                'total' => (float) ($revenueData[$key] ?? 0),
            ];
        }

        // Booking 6 bulan terakhir
        $bookingData = Booking::selectRaw("$dateFormat as bulan, COUNT(*) as total")
            ->where('created_at', '>=', $sixMonthsAgo)
            ->groupBy('bulan')
            ->orderBy('bulan')
            ->pluck('total', 'bulan')
            ->toArray();

        $monthlyBookings = [];
        for ($i = 5; $i >= 0; $i--) {
            $date = now()->subMonths($i);
            $key = $date->format('Y-m');
            $monthlyBookings[] = [
                'bulan' => $date->translatedFormat('M'),
                'total' => (int) ($bookingData[$key] ?? 0),
            ];
        }

        return Inertia::render('Admin/Dashboard', [
            'stats' => $stats,
            'recent_bookings' => $recentBookings,
            'monthly_revenue' => $monthlyRevenue,
            'monthly_bookings' => $monthlyBookings,
        ]);
    }
}