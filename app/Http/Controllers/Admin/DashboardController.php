<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use App\Models\User;
use App\Services\Booking\BookingService;
use App\Services\Package\PackageService;
use App\Services\Trip\DailyReportService;
use App\Services\Trip\TripService;
use App\Services\Wallet\PayoutService;
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
        ];

        return Inertia::render('Admin/Dashboard', ['stats' => $stats]);
    }
}
