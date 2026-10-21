<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePackageDayRequest;
use App\Http\Requests\Admin\UpdatePackageDayRequest;
use App\Models\Package;
use App\Models\PackageDay;
use App\Services\Package\PackageDayService;
use Illuminate\Http\RedirectResponse;

class PackageDayController extends Controller
{
    public function __construct(
        protected PackageDayService $packageDayService,
    ) {}

    /**
     * Simpan hari baru ke sebuah paket.
     *
     * Route: POST /admin/packages/{package}/days
     *
     * Menggunakan StorePackageDayRequest (validasi terpusat)
     */
    public function store(StorePackageDayRequest $request, Package $package): RedirectResponse
    {
        $this->packageDayService->create($package, $request->validated());

        return redirect()
            ->route('admin.packages.show', $package->id)
            ->with('status', 'Hari berhasil ditambahkan.');
    }

    /**
     * Update hari yang sudah ada.
     *
     * Route: PUT /admin/package-days/{day}
     *
     * Menggunakan UpdatePackageDayRequest (validasi terpusat)
     */
    public function update(UpdatePackageDayRequest $request, PackageDay $day): RedirectResponse
    {
        $this->packageDayService->update($day, $request->validated());

        return redirect()
            ->route('admin.packages.show', $day->package_id)
            ->with('status', 'Hari berhasil diperbarui.');
    }

    /**
     * Hapus hari + auto re-number hari setelahnya.
     *
     * Route: DELETE /admin/package-days/{day}
     */
    public function destroy(PackageDay $day): RedirectResponse
    {
        $packageId = $day->package_id;

        $this->packageDayService->delete($day);

        return redirect()
            ->route('admin.packages.show', $packageId)
            ->with('status', 'Hari berhasil dihapus.');
    }
}
