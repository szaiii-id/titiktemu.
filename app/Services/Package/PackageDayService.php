<?php

namespace App\Services\Package;

use App\Models\Package;
use App\Models\PackageDay;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class PackageDayService
{
    /**
     * Tambah hari baru ke paket.
     *
     * - `hari_ke` auto-assign = max(hari_ke existing) + 1
     * - Validasi: tidak boleh melebihi `durasi_hari` package
     *
     * @param  array<string, mixed>  $data
     */
    public function create(Package $package, array $data): PackageDay
    {
        $this->validateCanAddDay($package);

        return DB::transaction(function () use ($package, $data) {
            $nextHariKe = ($package->days()->max('hari_ke') ?? 0) + 1;

            $day = PackageDay::create([
                'package_id' => $package->id,
                'hari_ke' => $nextHariKe,
                'judul' => $data['judul'],
                'deskripsi' => $data['deskripsi'] ?? null,
                'jam_mulai' => $data['jam_mulai'] ?? null,
                'jam_selesai' => $data['jam_selesai'] ?? null,
                'lokasi' => $data['lokasi'] ?? null,
            ]);

            Log::info('Package day ditambahkan', [
                'package_id' => $package->id,
                'day_id' => $day->id,
                'hari_ke' => $day->hari_ke,
            ]);

            return $day;
        });
    }

    /**
     * Update hari.
     *
     * `hari_ke` TIDAK diubah — urutan tetap.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(PackageDay $day, array $data): PackageDay
    {
        return DB::transaction(function () use ($day, $data) {
            $day->update([
                'judul' => $data['judul'],
                'deskripsi' => $data['deskripsi'] ?? null,
                'jam_mulai' => $data['jam_mulai'] ?? null,
                'jam_selesai' => $data['jam_selesai'] ?? null,
                'lokasi' => $data['lokasi'] ?? null,
            ]);

            Log::info('Package day diupdate', [
                'package_id' => $day->package_id,
                'day_id' => $day->id,
                'hari_ke' => $day->hari_ke,
            ]);

            return $day->refresh();
        });
    }

    /**
     * Hapus hari + auto re-number hari setelahnya.
     *
     * Contoh: hapus hari ke-2 dari (1, 2, 3) → jadi (1, 2).
     * Hari yang tadinya ke-3 jadi ke-2.
     */
    public function delete(PackageDay $day): void
    {
        DB::transaction(function () use ($day) {
            $packageId = $day->package_id;
            $deletedHariKe = $day->hari_ke;

            Log::warning('Package day dihapus', [
                'package_id' => $packageId,
                'day_id' => $day->id,
                'hari_ke' => $deletedHariKe,
            ]);

            // Hapus day (cascade ke costs via FK)
            $day->delete();

            // Re-number hari setelahnya
            PackageDay::where('package_id', $packageId)
                ->where('hari_ke', '>', $deletedHariKe)
                ->orderBy('hari_ke')
                ->each(function (PackageDay $d) {
                    $d->update(['hari_ke' => $d->hari_ke - 1]);
                });
        });
    }

    /**
     * Validasi apakah paket masih boleh tambah hari.
     *
     * - Total hari existing harus < durasi_hari package
     *
     * @throws ValidationException
     */
    protected function validateCanAddDay(Package $package): void
    {
        $existingCount = $package->days()->count();

        if ($existingCount >= $package->durasi_hari) {
            throw ValidationException::withMessages([
                'judul' => [
                    "Paket ini hanya untuk {$package->durasi_hari} hari. ".
                    "Anda sudah punya {$existingCount} hari. ".
                    'Ubah durasi paket terlebih dahulu kalau ingin menambah hari.',
                ],
            ]);
        }
    }
}
