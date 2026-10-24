<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use App\Services\Report\ReportService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function __construct(
        protected ReportService $reportService,
    ) {}

    // ==========================================
    // 1. PENDAPATAN
    // ==========================================
    public function index(Request $request): Response
    {
        $startDate = $request->input('start_date', now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->input('end_date', now()->endOfMonth()->format('Y-m-d'));

        return Inertia::render('Admin/Reports/Index', [
            'data' => $this->reportService->getRevenueData($startDate, $endDate),
            'monthly_revenue' => $this->reportService->getMonthlyRevenue(),
            'filters' => ['start_date' => $startDate, 'end_date' => $endDate],
        ]);
    }

    public function exportPdf(Request $request)
    {
        $startDate = $request->input('start_date', now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->input('end_date', now()->endOfMonth()->format('Y-m-d'));

        return $this->reportService->exportRevenuePdf($startDate, $endDate);
    }

    public function exportExcel(Request $request)
    {
        $startDate = $request->input('start_date', now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->input('end_date', now()->endOfMonth()->format('Y-m-d'));

        return $this->reportService->exportRevenueExcel($startDate, $endDate);
    }

    // ==========================================
    // 2. KINERJA MITRA
    // ==========================================
    public function mitraPerformance(Request $request): Response
    {
        $startDate = $request->input('start_date', now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->input('end_date', now()->endOfMonth()->format('Y-m-d'));

        return Inertia::render('Admin/Reports/Mitra', [
            'data' => $this->reportService->getMitraPerformanceData($startDate, $endDate),
            'filters' => ['start_date' => $startDate, 'end_date' => $endDate],
        ]);
    }

    public function exportMitraPdf(Request $request)
    {
        $startDate = $request->input('start_date', now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->input('end_date', now()->endOfMonth()->format('Y-m-d'));

        return $this->reportService->exportMitraPdf($startDate, $endDate);
    }

    public function exportMitraExcel(Request $request)
    {
        $startDate = $request->input('start_date', now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->input('end_date', now()->endOfMonth()->format('Y-m-d'));

        return $this->reportService->exportMitraExcel($startDate, $endDate);
    }

    // ==========================================
    // 3. REKAP HARIAN
    // ==========================================
    public function dailyReports(Request $request): Response
    {
        $startDate = $request->input('start_date', now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->input('end_date', now()->endOfMonth()->format('Y-m-d'));

        return Inertia::render('Admin/Reports/Daily', [
            'data' => $this->reportService->getDailyReportData($startDate, $endDate),
            'filters' => ['start_date' => $startDate, 'end_date' => $endDate],
        ]);
    }

    public function exportDailyPdf(Request $request)
    {
        $startDate = $request->input('start_date', now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->input('end_date', now()->endOfMonth()->format('Y-m-d'));

        return $this->reportService->exportDailyPdf($startDate, $endDate);
    }

    public function exportDailyExcel(Request $request)
    {
        $startDate = $request->input('start_date', now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->input('end_date', now()->endOfMonth()->format('Y-m-d'));

        return $this->reportService->exportDailyExcel($startDate, $endDate);
    }

    // ==========================================
    // 4. PAYOUT
    // ==========================================
    public function payouts(Request $request): Response
    {
        $startDate = $request->input('start_date', now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->input('end_date', now()->endOfMonth()->format('Y-m-d'));

        return Inertia::render('Admin/Reports/Payout', [
            'data' => $this->reportService->getPayoutData($startDate, $endDate),
            'filters' => ['start_date' => $startDate, 'end_date' => $endDate],
        ]);
    }

    public function exportPayoutPdf(Request $request)
    {
        $startDate = $request->input('start_date', now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->input('end_date', now()->endOfMonth()->format('Y-m-d'));

        return $this->reportService->exportPayoutPdf($startDate, $endDate);
    }

    public function exportPayoutExcel(Request $request)
    {
        $startDate = $request->input('start_date', now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->input('end_date', now()->endOfMonth()->format('Y-m-d'));

        return $this->reportService->exportPayoutExcel($startDate, $endDate);
    }

    // ==========================================
    // 5. MANIFEST TRIP
    // ==========================================
    public function exportTripManifest(Trip $trip)
    {
        return $this->reportService->exportTripManifest($trip, auth()->user());
    }
}
