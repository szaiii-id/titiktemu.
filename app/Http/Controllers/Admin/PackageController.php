<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePackageRequest;
use App\Http\Requests\Admin\UpdatePackageRequest;
use App\Models\Package;
use App\Services\Package\PackageService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class PackageController extends Controller
{
    public function __construct(
        protected PackageService $packageService,
    ) {}

    /**
     * Daftar paket dengan search, filter, dan pagination.
     */
    public function index(Request $request): InertiaResponse
    {
        $filters = [
            'search' => $request->input('search'),
            'status' => $request->input('status'),
            'kategori' => $request->input('kategori'),
            'sort' => $request->input('sort', 'created_at'),
            'direction' => $request->input('direction', 'desc'),
        ];

        $perPage = (int) $request->input('per_page', 15);

        $packages = $this->packageService->paginate($filters, $perPage);

        return Inertia::render('Admin/Packages/Index', [
            'packages' => $packages,
            'filters' => $filters,
            'statusCounts' => $this->packageService->countByStatus(),
        ]);
    }

    /**
     * Form buat paket baru.
     */
    public function create(): InertiaResponse
    {
        return Inertia::render('Admin/Packages/Create');
    }

    /**
     * Simpan paket baru.
     */
    public function store(StorePackageRequest $request): RedirectResponse
    {
        $package = $this->packageService->create(
            $request->validated(),
            $request->user(),
        );

        return redirect()
            ->route('admin.packages.show', $package->id)
            ->with('status', 'Paket berhasil dibuat. Silakan lengkapi itinerary & fasilitas sebelum dipublish.');
    }

    /**
     * Detail paket (dengan itinerary, HPP, fasilitas).
     */
    public function show(Package $package): InertiaResponse
    {
        // Load semua relasi
        $package->load([
            'creator:id,name,email',
            'days.costs',
            'facilities',
        ]);

        // Hitung HPP & margin
        $hpp = $package->calculateHpp();
        $margin = $package->calculateMargin();

        return Inertia::render('Admin/Packages/Show', [
            'package' => $package,
            'hpp' => $hpp,
            'margin' => $margin,
        ]);
    }

    /**
     * Form edit paket.
     */
    public function edit(Package $package): InertiaResponse
    {
        $package->load('creator:id,name,email');

        return Inertia::render('Admin/Packages/Edit', [
            'package' => $package,
        ]);
    }

    /**
     * Update paket.
     */
    public function update(UpdatePackageRequest $request, Package $package): RedirectResponse
    {
        $this->packageService->update($package, $request->validated());

        return redirect()
            ->route('admin.packages.show', $package->id)
            ->with('status', 'Paket berhasil diperbarui.');
    }

    /**
     * Hapus paket (soft delete).
     *
     * Jika paket masih punya booking, PackageService::delete() akan throw
     * ValidationException. Kita tangkap dan kirim sebagai flash.error
     * (bukan withErrors) agar dirender DashboardLayout sebagai banner merah.
     */
    public function destroy(Package $package): RedirectResponse
    {
        try {
            $this->packageService->delete($package);

            return redirect()
                ->route('admin.packages.index')
                ->with('status', 'Paket berhasil dihapus.');
        } catch (ValidationException $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Publish paket: draft → aktif.
     */
    public function publish(Package $package): RedirectResponse
    {
        $this->packageService->publish($package);

        return redirect()
            ->route('admin.packages.show', $package->id)
            ->with('status', 'Paket berhasil dipublish.');
    }

    /**
     * Arsipkan paket: aktif → arsip.
     */
    public function archive(Package $package): RedirectResponse
    {
        $this->packageService->archive($package);

        return redirect()
            ->route('admin.packages.show', $package->id)
            ->with('status', 'Paket berhasil diarsipkan.');
    }

    /**
     * Restore paket dari arsip → draft.
     */
    public function restore(Package $package): RedirectResponse
    {
        $this->packageService->restore($package);

        return redirect()
            ->route('admin.packages.show', $package->id)
            ->with('status', 'Paket berhasil direstore. Silakan edit sebelum dipublish ulang.');
    }
}
