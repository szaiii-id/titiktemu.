<?php

namespace App\Services\Package;

use App\Enums\PackageStatus;
use App\Models\Package;
use App\Models\User;
use App\Repositories\Contracts\PackageRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PackageService
{
    public function __construct(
        protected PackageRepositoryInterface $packageRepository,
    ) {}

    // ==========================================
    // READ
    // ==========================================

    /**
     * @param  array<string, mixed>  $filters
     * @return LengthAwarePaginator<int, Package>
     */
    public function paginate(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        return $this->packageRepository->paginate($filters, $perPage);
    }

    public function findDetail(int $id): Package
    {
        $package = $this->packageRepository->findById($id);

        if (! $package) {
            throw ValidationException::withMessages([
                'package' => ['Paket tidak ditemukan.'],
            ]);
        }

        return $package;
    }

    /**
     * @return Collection<int, Package>
     */
    public function allAktif(): Collection
    {
        return $this->packageRepository->allAktif();
    }

    /** @return array<string, int> */
    public function countByStatus(): array
    {
        return $this->packageRepository->countByStatus();
    }

    // ==========================================
    // CREATE
    // ==========================================

    /** @param array<string, mixed> $data */
    public function create(array $data, User $admin): Package
    {
        $this->validate($data);

        return DB::transaction(function () use ($data, $admin) {
            $kode = $this->packageRepository->generateKode((int) now()->year);
            $slug = $this->generateUniqueSlug((string) $data['nama']);

            $package = $this->packageRepository->create([
                'kode' => $kode,
                'nama' => $data['nama'],
                'slug' => $slug,
                'deskripsi' => $data['deskripsi'] ?? null,
                'kategori' => $data['kategori'],
                'durasi_hari' => $data['durasi_hari'],
                'durasi_malam' => $data['durasi_malam'],
                'harga_per_orang' => $data['harga_per_orang'],
                'harga_per_rombongan' => $data['harga_per_rombongan'] ?? null,
                'min_peserta' => $data['min_peserta'] ?? 1,
                'max_peserta' => $data['max_peserta'] ?? 20,
                'timezone' => $data['timezone'],
                'cover_image' => $data['cover_image'] ?? null,
                'status' => PackageStatus::DRAFT->value,
                'created_by' => $admin->id,
            ]);

            Log::info('Paket baru dibuat', [
                'package_id' => $package->id,
                'kode' => $package->kode,
                'created_by' => $admin->id,
            ]);

            return $package;
        });
    }

    // ==========================================
    // UPDATE
    // ==========================================

    /** @param array<string, mixed> $data */
    public function update(Package $package, array $data): Package
    {
        $this->validate($data, $package->id);

        return DB::transaction(function () use ($package, $data) {
            /** @var array<string, mixed> $updateData */
            $updateData = [
                'nama' => $data['nama'],
                'deskripsi' => $data['deskripsi'] ?? null,
                'kategori' => $data['kategori'],
                'durasi_hari' => $data['durasi_hari'],
                'durasi_malam' => $data['durasi_malam'],
                'harga_per_orang' => $data['harga_per_orang'],
                'harga_per_rombongan' => $data['harga_per_rombongan'] ?? null,
                'min_peserta' => $data['min_peserta'] ?? 1,
                'max_peserta' => $data['max_peserta'] ?? 20,
                'timezone' => $data['timezone'],
            ];

            if ($package->nama !== $data['nama']) {
                $updateData['slug'] = $this->generateUniqueSlug((string) $data['nama'], $package->id);
            }

            if (array_key_exists('cover_image', $data)) {
                $updateData['cover_image'] = $data['cover_image'];
            }

            $updated = $this->packageRepository->update($package, $updateData);

            Log::info('Paket diupdate', [
                'package_id' => $updated->id,
                'kode' => $updated->kode,
            ]);

            return $updated;
        });
    }

    // ==========================================
    // STATUS TRANSITIONS
    // ==========================================

    public function publish(Package $package): Package
    {
        if ($package->status === PackageStatus::AKTIF) {
            throw ValidationException::withMessages([
                'status' => ['Paket sudah aktif.'],
            ]);
        }

        if (! $package->hasDays()) {
            throw ValidationException::withMessages([
                'status' => ['Paket harus punya minimal 1 hari itinerary sebelum dipublish.'],
            ]);
        }

        $hasInclude = $package->facilities()->where('tipe', 'include')->exists();
        if (! $hasInclude) {
            throw ValidationException::withMessages([
                'status' => ['Paket harus punya minimal 1 fasilitas "include" sebelum dipublish.'],
            ]);
        }

        $package = $this->packageRepository->update($package, [
            'status' => PackageStatus::AKTIF->value,
        ]);

        Log::info('Paket dipublish', [
            'package_id' => $package->id,
            'kode' => $package->kode,
        ]);

        return $package;
    }

    public function archive(Package $package): Package
    {
        if ($package->status === PackageStatus::ARSIP) {
            throw ValidationException::withMessages([
                'status' => ['Paket sudah diarsipkan.'],
            ]);
        }

        $package = $this->packageRepository->update($package, [
            'status' => PackageStatus::ARSIP->value,
        ]);

        Log::info('Paket diarsipkan', [
            'package_id' => $package->id,
            'kode' => $package->kode,
        ]);

        return $package;
    }

    public function restore(Package $package): Package
    {
        if ($package->status !== PackageStatus::ARSIP) {
            throw ValidationException::withMessages([
                'status' => ['Hanya paket yang diarsipkan bisa direstore.'],
            ]);
        }

        $package = $this->packageRepository->update($package, [
            'status' => PackageStatus::DRAFT->value,
        ]);

        Log::info('Paket direstore dari arsip', [
            'package_id' => $package->id,
            'kode' => $package->kode,
        ]);

        return $package;
    }

    // ==========================================
    // DELETE
    // ==========================================

    public function delete(Package $package): void
    {
        if ($package->bookings()->exists()) {
            throw ValidationException::withMessages([
                'package' => ['Paket yang sudah punya booking tidak bisa dihapus. Arsipkan saja.'],
            ]);
        }

        Log::warning('Paket dihapus (soft delete)', [
            'package_id' => $package->id,
            'kode' => $package->kode,
        ]);

        $this->packageRepository->delete($package);
    }

    // ==========================================
    // HELPERS
    // ==========================================

    public function generateUniqueSlug(string $nama, ?int $exceptId = null): string
    {
        $base = Str::slug($nama);
        $slug = $base;
        $counter = 2;

        while ($this->packageRepository->slugExists($slug, $exceptId)) {
            $slug = "{$base}-{$counter}";
            $counter++;

            if ($counter > 1000) {
                // Fallback: coba random sampai unik
                do {
                    $slug = $base.'-'.Str::random(6);
                } while ($this->packageRepository->slugExists($slug, $exceptId));
                break;
            }
        }

        return $slug;
    }

    /**
     * @param  array<string, mixed>  $data
     *
     * @throws ValidationException
     */
    protected function validate(array $data, ?int $exceptId = null): void
    {
        $minPeserta = (int) ($data['min_peserta'] ?? 1);
        $maxPeserta = (int) ($data['max_peserta'] ?? 20);

        if ($minPeserta > $maxPeserta) {
            throw ValidationException::withMessages([
                'min_peserta' => ['Minimal peserta tidak boleh lebih besar dari maksimal peserta.'],
            ]);
        }

        $durasiHari = (int) ($data['durasi_hari'] ?? 1);
        $durasiMalam = (int) ($data['durasi_malam'] ?? 0);

        if ($durasiMalam >= $durasiHari && $durasiHari > 0) {
            throw ValidationException::withMessages([
                'durasi_malam' => ['Durasi malam harus kurang dari durasi hari (contoh: 2D1N, 3D2N).'],
            ]);
        }

        // ✅ FIX: guard null dulu, baru compare
        if (isset($data['harga_per_rombongan'])) {
            if ((float) $data['harga_per_rombongan'] <= 0) {
                throw ValidationException::withMessages([
                    'harga_per_rombongan' => ['Harga per rombongan harus lebih dari 0.'],
                ]);
            }
        }
    }
}
