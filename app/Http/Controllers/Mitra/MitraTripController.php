<?php

namespace App\Http\Controllers\Mitra;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use App\Services\Trip\TripService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class TripController extends Controller
{
    public function __construct(
        protected TripService $tripService,
    ) {}

    /**
     * Daftar trip yang di-assign ke mitra.
     */
    public function index(Request $request): InertiaResponse
    {
        $mitra = $request->user();

        $filters = [
            'search' => $request->input('search'),
            'status' => $request->input('status'),
            'sort' => $request->input('sort', 'tanggal_mulai'),
            'direction' => $request->input('direction', 'desc'),
        ];

        $perPage = (int) $request->input('per_page', 10);
        $trips = $this->tripService->paginateForMitra($mitra, $filters, $perPage);

        return Inertia::render('Mitra/Trips/Index', [
            'trips' => $trips,
            'filters' => $filters,
            'statusCounts' => $this->tripService->countByStatusForMitra($mitra),
        ]);
    }

    /**
     * Detail trip (untuk mitra).
     */
    public function show(Request $request, Trip $trip): InertiaResponse
    {
        // Guard: mitra harus di-assign ke trip ini
        $mitra = $request->user();
        $isAssigned = $trip->mitras()
            ->where('mitra_id', $mitra->id)
            ->exists();

        abort_unless($isAssigned, 403, 'Anda tidak di-assign ke trip ini.');

        $trip->load([
            'package:id,nama,kode,slug,timezone,cover_image',
            'booking.client:id,name,email',
            'mitras.mitra:id,name,email,username',
            'days.dailyReports' => function ($q) use ($mitra) {
                $q->where('mitra_id', $mitra->id)
                    ->with('media');
            },
        ]);

        // Ambil assignment mitra ini
        $tripMitra = $trip->mitras->firstWhere('mitra_id', $mitra->id);

        return Inertia::render('Mitra/Trips/Show', [
            'trip' => $trip,
            'tripMitra' => $tripMitra,
        ]);
    }
}
