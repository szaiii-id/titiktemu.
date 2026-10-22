<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\RejectDailyReportRequest;
use App\Models\DailyReport;
use App\Services\Trip\DailyReportService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class DailyReportController extends Controller
{
    public function __construct(
        protected DailyReportService $dailyReportService,
    ) {}

    /**
     * Daftar semua daily report.
     */
    public function index(Request $request): InertiaResponse
    {
        $filters = [
            'search' => $request->input('search'),
            'status' => $request->input('status'),
            'trip_id' => $request->input('trip_id'),
            'mitra_id' => $request->input('mitra_id'),
            'sort' => $request->input('sort', 'submitted_at'),
            'direction' => $request->input('direction', 'desc'),
        ];

        $perPage = (int) $request->input('per_page', 15);
        $reports = $this->dailyReportService->paginate($filters, $perPage);

        return Inertia::render('Admin/DailyReports/Index', [
            'reports' => $reports,
            'filters' => $filters,
            'statusCounts' => $this->dailyReportService->countByStatus(),
        ]);
    }

    /**
     * Verifikasi report.
     */
    public function verify(DailyReport $report): RedirectResponse
    {
        $this->dailyReportService->verify($report, auth()->user());

        return redirect()
            ->back()
            ->with('status', 'Laporan berhasil diverifikasi.');
    }

    /**
     * Reject report.
     *
     * ✅ Menggunakan RejectDailyReportRequest (validasi terpusat)
     */
    public function reject(RejectDailyReportRequest $request, DailyReport $report): RedirectResponse
    {
        $this->dailyReportService->reject($report, auth()->user(), $request->validated('reason'));

        return redirect()
            ->back()
            ->with('status', 'Laporan ditolak. Mitra harus resubmit.');
    }
}
