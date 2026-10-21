<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePackageFacilityRequest;
use App\Http\Requests\Admin\UpdatePackageFacilityRequest;
use App\Models\Package;
use App\Models\PackageFacility;
use App\Services\Package\PackageFacilityService;
use Illuminate\Http\RedirectResponse;

class PackageFacilityController extends Controller
{
    public function __construct(
        protected PackageFacilityService $packageFacilityService,
    ) {}

    /**
     * Simpan fasilitas baru ke sebuah paket.
     *
     * Route: POST /admin/packages/{package}/facilities
     *
     * Menggunakan StorePackageFacilityRequest (validasi terpusat)
     */
    public function store(StorePackageFacilityRequest $request, Package $package): RedirectResponse
    {
        $this->packageFacilityService->create($package, $request->validated());

        return redirect()
            ->route('admin.packages.show', $package->id)
            ->with('status', 'Fasilitas berhasil ditambahkan.');
    }

    /**
     * Update fasilitas.
     *
     * Route: PUT /admin/package-facilities/{facility}
     *
     * Menggunakan UpdatePackageFacilityRequest (validasi terpusat)
     */
    public function update(UpdatePackageFacilityRequest $request, PackageFacility $facility): RedirectResponse
    {
        $this->packageFacilityService->update($facility, $request->validated());

        return redirect()
            ->route('admin.packages.show', $facility->package_id)
            ->with('status', 'Fasilitas berhasil diperbarui.');
    }

    /**
     * Hapus fasilitas.
     *
     * Route: DELETE /admin/package-facilities/{facility}
     */
    public function destroy(PackageFacility $facility): RedirectResponse
    {
        $packageId = $facility->package_id;

        $this->packageFacilityService->delete($facility);

        return redirect()
            ->route('admin.packages.show', $packageId)
            ->with('status', 'Fasilitas berhasil dihapus.');
    }
}
