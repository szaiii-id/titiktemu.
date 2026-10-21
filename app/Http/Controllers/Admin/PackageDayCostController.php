<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePackageDayCostRequest;
use App\Http\Requests\Admin\UpdatePackageDayCostRequest;
use App\Models\PackageDay;
use App\Models\PackageDayCost;
use App\Services\Package\PackageDayCostService;
use Illuminate\Http\RedirectResponse;

class PackageDayCostController extends Controller
{
    public function __construct(
        protected PackageDayCostService $packageDayCostService,
    ) {}

    /**
     * Simpan biaya HPP baru ke sebuah hari.
     *
     * Route: POST /admin/package-days/{day}/costs
     *
     * Menggunakan StorePackageDayCostRequest (validasi terpusat)
     */
    public function store(StorePackageDayCostRequest $request, PackageDay $day): RedirectResponse
    {
        $this->packageDayCostService->create($day, $request->validated());

        return redirect()
            ->route('admin.packages.show', $day->package_id)
            ->with('status', 'Biaya HPP berhasil ditambahkan.');
    }

    /**
     * Update biaya HPP.
     *
     * Route: PUT /admin/package-day-costs/{cost}
     *
     * Menggunakan UpdatePackageDayCostRequest (validasi terpusat)
     */
    public function update(UpdatePackageDayCostRequest $request, PackageDayCost $cost): RedirectResponse
    {
        $this->packageDayCostService->update($cost, $request->validated());

        return redirect()
            ->route('admin.packages.show', $cost->day->package_id)
            ->with('status', 'Biaya HPP berhasil diperbarui.');
    }

    /**
     * Hapus biaya HPP.
     *
     * Route: DELETE /admin/package-day-costs/{cost}
     */
    public function destroy(PackageDayCost $cost): RedirectResponse
    {
        $packageId = $cost->day->package_id;

        $this->packageDayCostService->delete($cost);

        return redirect()
            ->route('admin.packages.show', $packageId)
            ->with('status', 'Biaya HPP berhasil dihapus.');
    }
}
