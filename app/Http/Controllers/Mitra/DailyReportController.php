<?php

namespace App\Http\Controllers\Mitra;

use App\Http\Controllers\Controller;
use App\Http\Requests\Mitra\StoreDailyReportRequest;
use App\Models\DailyReport;
use App\Models\Trip;
use App\Models\TripDay;
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

    public function index(Request $request): InertiaResponse
    {
        $mitra = $request->user();

        $filters = [
            'search' => $request->input('search'),
            'status' => $request->input('status'),
            'sort' => $request->input('sort', 'submitted_at'),
            'direction' => $request->input('direction', 'desc'),
        ];

        $perPage = (int) $request->input('per_page', 10);
        $reports = $this->dailyReportService->paginateForMitra($mitra, $filters, $perPage);

        return Inertia::render('Mitra/DailyReports/Index', [
            'reports' => $reports,
            'filters' => $filters,
            'statusCounts' => $this->dailyReportService->countByStatusForMitra($mitra),
        ]);
    }

    public function create(Request $request, Trip $trip, TripDay $tripDay): InertiaResponse
    {
        abort_unless($tripDay->trip_id === $trip->id, 404);

        $mitra = $request->user();
        $isAssigned = $trip->mitras()
            ->where('mitra_id', $mitra->id)
            ->exists();

        abort_unless($isAssigned, 403, 'Anda tidak di-assign ke trip ini.');

        $existing = DailyReport::where('trip_day_id', $tripDay->id)
            ->where('mitra_id', $mitra->id)
            ->with('media')
            ->first();

        $trip->load(['package:id,nama,kode,timezone', 'days']);
        $tripDay->load(['dailyReports.media']);

        return Inertia::render('Mitra/DailyReports/Create', [
            'trip' => $trip,
            'tripDay' => $tripDay,
            'existingReport' => $existing,
        ]);
    }

    public function store(StoreDailyReportRequest $request, Trip $trip, TripDay $tripDay): RedirectResponse
    {
        abort_unless($tripDay->trip_id === $trip->id, 404);

        $this->dailyReportService->submit(
            trip: $trip,
            tripDay: $tripDay,
            mitra: $request->user(),
            data: [
                'catatan' => $request->validated('catatan'),
                'media' => $request->file('media') ?? [],
            ],
        );

        return redirect()
            ->route('mitra.trips.show', $trip->id)
            ->with('status', 'Laporan harian berhasil dikirim. Menunggu verifikasi admin.');
    }
}
