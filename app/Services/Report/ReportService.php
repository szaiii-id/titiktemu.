<?php

namespace App\Services\Report;

use App\Exports\DailyReportExport;
use App\Exports\MitraPerformanceExport;
use App\Exports\PayoutExport;
use App\Exports\RevenueExport;
use App\Models\Trip;
use App\Models\User;
use App\Repositories\Eloquent\ReportRepository;
use Barryvdh\DomPDF\Facade\Pdf;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class ReportService
{
    public function __construct(
        protected ReportRepository $reportRepository,
    ) {}

    // ==========================================
    // 1. PENDAPATAN
    // ==========================================

    /**
     * @return array<string, mixed>
     */
    public function getRevenueData(string $startDate, string $endDate): array
    {
        return $this->reportRepository->getRevenueData($startDate, $endDate);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getMonthlyRevenue(): array
    {
        return $this->reportRepository->getMonthlyRevenue();
    }

    public function exportRevenuePdf(string $startDate, string $endDate): HttpResponse
    {
        $data = $this->getRevenueData($startDate, $endDate);
        $pdf = Pdf::loadView('reports.revenue-pdf', compact('data', 'startDate', 'endDate'));
        $pdf->setPaper('a4', 'landscape');

        return $pdf->stream('Laporan-Pendapatan-'.now()->format('Y-m-d').'.pdf');
    }

    public function exportRevenueExcel(string $startDate, string $endDate): HttpResponse
    {
        return Excel::download(new RevenueExport($startDate, $endDate), 'Laporan-Pendapatan-'.now()->format('Y-m-d').'.xlsx');
    }

    // ==========================================
    // 2. KINERJA MITRA
    // ==========================================

    /**
     * @return array<string, mixed>
     */
    public function getMitraPerformanceData(string $startDate, string $endDate): array
    {
        return $this->reportRepository->getMitraPerformanceData($startDate, $endDate);
    }

    public function exportMitraPdf(string $startDate, string $endDate): HttpResponse
    {
        $data = $this->getMitraPerformanceData($startDate, $endDate);
        $pdf = Pdf::loadView('reports.mitra-performance-pdf', compact('data', 'startDate', 'endDate'));
        $pdf->setPaper('a4', 'portrait');

        return $pdf->stream('Laporan-Kinerja-Mitra-'.now()->format('Y-m-d').'.pdf');
    }

    public function exportMitraExcel(string $startDate, string $endDate): HttpResponse
    {
        return Excel::download(new MitraPerformanceExport($startDate, $endDate), 'Laporan-Kinerja-Mitra-'.now()->format('Y-m-d').'.xlsx');
    }

    // ==========================================
    // 3. REKAP HARIAN
    // ==========================================

    /**
     * @return array<string, mixed>
     */
    public function getDailyReportData(string $startDate, string $endDate): array
    {
        return $this->reportRepository->getDailyReportData($startDate, $endDate);
    }

    public function exportDailyPdf(string $startDate, string $endDate): HttpResponse
    {
        $data = $this->getDailyReportData($startDate, $endDate);
        $pdf = Pdf::loadView('reports.daily-reports-pdf', compact('data', 'startDate', 'endDate'));
        $pdf->setPaper('a4', 'landscape');

        return $pdf->stream('Laporan-Harian-'.now()->format('Y-m-d').'.pdf');
    }

    public function exportDailyExcel(string $startDate, string $endDate): HttpResponse
    {
        return Excel::download(new DailyReportExport($startDate, $endDate), 'Laporan-Harian-'.now()->format('Y-m-d').'.xlsx');
    }

    // ==========================================
    // 4. PAYOUT
    // ==========================================

    /**
     * @return array<string, mixed>
     */
    public function getPayoutData(string $startDate, string $endDate): array
    {
        return $this->reportRepository->getPayoutData($startDate, $endDate);
    }

    public function exportPayoutPdf(string $startDate, string $endDate): HttpResponse
    {
        $data = $this->getPayoutData($startDate, $endDate);
        $pdf = Pdf::loadView('reports.payout-pdf', compact('data', 'startDate', 'endDate'));
        $pdf->setPaper('a4', 'landscape');

        return $pdf->stream('Laporan-Payout-'.now()->format('Y-m-d').'.pdf');
    }

    public function exportPayoutExcel(string $startDate, string $endDate): HttpResponse
    {
        return Excel::download(new PayoutExport($startDate, $endDate), 'Laporan-Payout-'.now()->format('Y-m-d').'.xlsx');
    }

    // ==========================================
    // 5. MANIFEST TRIP
    // ==========================================

    public function exportTripManifest(Trip $trip, User $user): HttpResponse
    {
        // Cek akses
        if ($user->role === 'mitra') {
            $isAssigned = $trip->mitras()->where('mitra_id', $user->id)->exists();
            abort_unless($isAssigned, 403, 'Anda tidak memiliki akses.');
        } elseif ($user->role !== 'admin') {
            abort(403, 'Akses ditolak.');
        }

        $trip->load(['booking.client', 'booking.participants', 'package', 'mitras.mitra', 'days.dailyReports']);
        $pdf = Pdf::loadView('reports.trip-manifest', compact('trip'));
        $pdf->setPaper('a4', 'portrait');

        return $pdf->stream('Itinerary-dan-Peserta-'.$trip->kode.'.pdf');
    }
}
