<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Package;
use App\Services\Package\PackageService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class CatalogController extends Controller
{
    public function __construct(
        protected PackageService $packageService,
    ) {}

    /**
     * Halaman katalog paket wisata aktif.
     *
     * Filter:
     * - search: nama / deskripsi
     * - kategori: wisata_alam | budaya | kuliner | petualangan | lainnya
     * - sort: nama | harga_per_orang | durasi_hari
     * - direction: asc | desc
     */
    public function index(Request $request): InertiaResponse
    {
        $filters = [
            'search' => $request->input('search'),
            'status' => 'aktif', // hanya paket aktif
            'kategori' => $request->input('kategori'),
            'sort' => $request->input('sort', 'nama'),
            'direction' => $request->input('direction', 'asc'),
        ];

        $perPage = (int) $request->input('per_page', 12);
        $packages = $this->packageService->paginate($filters, $perPage);

        return Inertia::render('Client/Catalog/Index', [
            'packages' => $packages,
            'filters' => $filters,
        ]);
    }

    /**
     * Detail paket untuk client.
     *
     * Hanya paket dengan status aktif yang bisa dilihat.
     * Kalau paket tidak aktif → 404.
     */
    public function show(Package $package): InertiaResponse
    {
        // Guard: hanya paket aktif yang bisa dilihat client
        abort_unless($package->isAktif(), 404);

        $package->load([
            'creator:id,name,email',
            'days.costs',
            'facilities',
        ]);

        return Inertia::render('Client/Catalog/Show', [
            'package' => $package,
        ]);
    }
}
