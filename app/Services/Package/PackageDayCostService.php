<?php

namespace App\Services\Package;

use App\Models\PackageDay;
use App\Models\PackageDayCost;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PackageDayCostService
{
    /**
     * Tambah biaya HPP baru ke sebuah hari.
     *
     * @param  array<string, mixed>  $data
     */
    public function create(PackageDay $day, array $data): PackageDayCost
    {
        return DB::transaction(function () use ($day, $data) {
            $cost = PackageDayCost::create([
                'package_day_id' => $day->id,
                'nama_biaya' => $data['nama_biaya'],
                'kategori' => $data['kategori'],
                'jumlah' => $data['jumlah'],
                'satuan' => $data['satuan'],
                'catatan' => $data['catatan'] ?? null,
            ]);

            Log::info('Package day cost ditambahkan', [
                'package_id' => $day->package_id,
                'day_id' => $day->id,
                'cost_id' => $cost->id,
                'nama_biaya' => $cost->nama_biaya,
            ]);

            return $cost;
        });
    }

    /**
     * Update biaya HPP.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(PackageDayCost $cost, array $data): PackageDayCost
    {
        return DB::transaction(function () use ($cost, $data) {
            $cost->update([
                'nama_biaya' => $data['nama_biaya'],
                'kategori' => $data['kategori'],
                'jumlah' => $data['jumlah'],
                'satuan' => $data['satuan'],
                'catatan' => $data['catatan'] ?? null,
            ]);

            Log::info('Package day cost diupdate', [
                'cost_id' => $cost->id,
                'nama_biaya' => $cost->nama_biaya,
            ]);

            return $cost->refresh();
        });
    }

    /**
     * Hapus biaya HPP.
     */
    public function delete(PackageDayCost $cost): void
    {
        DB::transaction(function () use ($cost) {
            Log::warning('Package day cost dihapus', [
                'cost_id' => $cost->id,
                'nama_biaya' => $cost->nama_biaya,
            ]);

            $cost->delete();
        });
    }
}
