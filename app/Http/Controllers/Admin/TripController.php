<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AssignMitraRequest;
use App\Http\Requests\Admin\CancelTripRequest;
use App\Http\Requests\Admin\UpdateTripMitraRequest;
use App\Models\DailyReport;
use App\Models\Trip;
use App\Models\TripMitra;
use App\Models\User;
use App\Services\Trip\DailyReportService;
use App\Services\Trip\DispatchService;
use App\Services\Trip\TripService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class TripController extends Controller
{
    public function __construct(
        protected TripService $tripService,
        protected DispatchService $dispatchService,
        protected DailyReportService $dailyReportService,
    ) {}

    /**
     * Daftar trip dengan filter.
     */
    public function index(Request $request): InertiaResponse
    {
        $filters = [
            'search' => $request->input('search'),
            'status' => $request->input('status'),
            'tanggal_dari' => $request->input('tanggal_dari'),
            'tanggal_sampai' => $request->input('tanggal_sampai'),
            'sort' => $request->input('sort', 'tanggal_mulai'),
            'direction' => $request->input('direction', 'desc'),
        ];

        $perPage = (int) $request->input('per_page', 15);
        $trips = $this->tripService->paginate($filters, $perPage);

        return Inertia::render('Admin/Trips/Index', [
            'trips' => $trips,
            'filters' => $filters,
            'statusCounts' => $this->tripService->countByStatus(),
        ]);
    }

    /**
     * Detail trip.
     */
    public function show(Trip $trip): InertiaResponse
    {
        $trip->load([
            'package:id,nama,kode,slug,timezone,cover_image',
            'booking:id,kode,user_id,tanggal_keberangkatan,jumlah_peserta,total_harga,status',
            'booking.client:id,name,email,username',
            'mitras.mitra:id,name,email,username,timezone',
            'mitras.assigner:id,name,email',
            'days.dailyReports.mitra:id,name,email,username',
            'days.dailyReports.verifier:id,name,email',
            'days.dailyReports.media',
        ]);

        $unverifiedDays = $this->dailyReportService->findUnverifiedDaysForTrip($trip);

        $submittedReports = $trip->days()
            ->with(['dailyReports' => function ($q): void {
                $q->where('status', DailyReport::STATUS_SUBMITTED)
                    ->with(['mitra:id,name,email', 'media']);
            }])
            ->get()
            ->pluck('dailyReports')
            ->flatten();

        $allMitras = User::where('role', 'mitra')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'username']);

        return Inertia::render('Admin/Trips/Show', [
            'trip' => $trip,
            'totalHonor' => $this->dispatchService->totalHonorForTrip($trip),
            'unverifiedDays' => $unverifiedDays,
            'submittedReports' => $submittedReports,
            'canComplete' => $trip->status->value === 'active'
                && $unverifiedDays->isEmpty(),
            'allMitras' => $allMitras,
        ]);
    }

    /**
     * Aktifkan trip (scheduled → active).
     */
    public function activate(Trip $trip): RedirectResponse
    {
        $this->tripService->activate($trip);

        return redirect()
            ->route('admin.trips.show', $trip->id)
            ->with('status', 'Trip berhasil diaktifkan.');
    }

    /**
     * Selesaikan trip (active → completed).
     */
    public function complete(Trip $trip): RedirectResponse
    {
        $this->tripService->complete($trip);

        return redirect()
            ->route('admin.trips.show', $trip->id)
            ->with('status', 'Trip berhasil diselesaikan.');
    }

    /**
     * Cancel trip.
     *
     * Menggunakan CancelTripRequest (validasi terpusat)
     */
    public function cancel(CancelTripRequest $request, Trip $trip): RedirectResponse
    {
        $this->tripService->cancel($trip, $request->validated('alasan'));

        return redirect()
            ->route('admin.trips.show', $trip->id)
            ->with('status', 'Trip berhasil dibatalkan.');
    }

    // ==========================================
    // DISPATCH — ASSIGN MITRA
    // ==========================================

    /**
     * Assign mitra ke trip.
     */
    public function assignMitra(AssignMitraRequest $request, Trip $trip): RedirectResponse
    {
        /** @var array{mitra_id: int, role?: string, honor: float|int, honor_tipe?: string, instruksi?: string|null} $data */
        $data = $request->validated();

        $this->dispatchService->assignMitra(
            trip: $trip,
            data: $data,
            admin: $request->user(),
        );

        return redirect()
            ->route('admin.trips.show', $trip->id)
            ->with('status', 'Mitra berhasil di-assign ke trip.');
    }

    /**
     * Update assignment mitra.
     *
     * Menggunakan UpdateTripMitraRequest (validasi terpusat)
     */
    public function updateMitra(UpdateTripMitraRequest $request, Trip $trip, TripMitra $tripMitra): RedirectResponse
    {
        abort_unless($tripMitra->trip_id === $trip->id, 404);

        $this->dispatchService->updateAssignment($tripMitra, $request->validated());

        return redirect()
            ->route('admin.trips.show', $trip->id)
            ->with('status', 'Assignment mitra berhasil diperbarui.');
    }

    /**
     * Unassign mitra dari trip.
     */
    public function unassignMitra(Trip $trip, TripMitra $tripMitra): RedirectResponse
    {
        abort_unless($tripMitra->trip_id === $trip->id, 404);

        try {
            $this->dispatchService->unassignMitra($tripMitra);

            return redirect()
                ->route('admin.trips.show', $trip->id)
                ->with('status', 'Mitra berhasil di-unassign dari trip.');
        } catch (ValidationException $e) {
            return back()->with('error', $e->getMessage());
        }
    }
}
