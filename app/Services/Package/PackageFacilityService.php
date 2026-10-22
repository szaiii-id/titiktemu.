<?php

namespace App\Services\Package;

use App\Models\Package;
use App\Models\PackageFacility;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PackageFacilityService
{
    /**
     * Tambah fasilitas baru ke paket.
     *
     * `urutan` auto-assign = max(urutan existing untuk tipe yang sama) + 1.
     *
     * @param  array<string, mixed>  $data
     */
    public function create(Package $package, array $data): PackageFacility
    {
        return DB::transaction(function () use ($package, $data) {
            $nextUrutan = ($package->facilities()
                ->where('tipe', $data['tipe'])
                ->max('urutan') ?? 0) + 1;

            $facility = PackageFacility::create([
                'package_id' => $package->id,
                'tipe' => $data['tipe'],
                'nama' => $data['nama'],
                'urutan' => $nextUrutan,
            ]);

            Log::info('Package facility ditambahkan', [
                'package_id' => $package->id,
                'facility_id' => $facility->id,
                'tipe' => $facility->tipe,
            ]);

            return $facility;
        });
    }

    /**
     * Update fasilitas.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(PackageFacility $facility, array $data): PackageFacility
    {
        return DB::transaction(function () use ($facility, $data) {
            $facility->update([
                'tipe' => $data['tipe'],
                'nama' => $data['nama'],
                // urutan tidak diubah
            ]);

            Log::info('Package facility diupdate', [
                'facility_id' => $facility->id,
            ]);

            return $facility->refresh();
        });
    }

    /**
     * Hapus fasilitas.
     */
    public function delete(PackageFacility $facility): void
    {
        DB::transaction(function () use ($facility) {
            Log::warning('Package facility dihapus', [
                'facility_id' => $facility->id,
                'nama' => $facility->nama,
            ]);

            $facility->delete();
        });
    }
}
