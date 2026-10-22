<?php

namespace App\Repositories\Eloquent;

use App\Enums\PackageStatus;
use App\Models\Package;
use App\Repositories\Contracts\PackageRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class PackageRepository implements PackageRepositoryInterface
{
    /**
     * {@inheritDoc}
     */
    public function paginate(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $search = $filters['search'] ?? null;
        $status = $filters['status'] ?? null;
        $kategori = $filters['kategori'] ?? null;
        $sort = $filters['sort'] ?? 'created_at';
        $direction = $filters['direction'] ?? 'desc';

        // Whitelist kolom sort untuk cegah SQL injection
        $allowedSorts = ['created_at', 'nama', 'harga_per_orang', 'durasi_hari', 'status'];
        if (! in_array($sort, $allowedSorts, true)) {
            $sort = 'created_at';
        }

        $direction = strtolower($direction) === 'asc' ? 'asc' : 'desc';

        $searchOperator = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        return Package::query()
            ->with(['creator:id,name,email'])
            ->when($search, function ($query, $search) use ($searchOperator) {
                $query->where(function ($q) use ($search, $searchOperator) {
                    $q->where('nama', $searchOperator, "%{$search}%")
                        ->orWhere('kode', $searchOperator, "%{$search}%")
                        ->orWhere('deskripsi', $searchOperator, "%{$search}%");
                });
            })
            ->when($status, fn ($query, $status) => $query->where('status', $status))
            ->when($kategori, fn ($query, $kategori) => $query->where('kategori', $kategori))
            ->orderBy($sort, $direction)
            ->paginate($perPage)
            ->withQueryString();
    }

    /**
     * {@inheritDoc}
     */
    public function findById(int $id): ?Package
    {
        return Package::with(['creator:id,name,email', 'days.costs', 'facilities'])->find($id);
    }

    /**
     * {@inheritDoc}
     */
    public function findBySlug(string $slug): ?Package
    {
        return Package::with(['days.costs', 'facilities'])
            ->where('slug', $slug)
            ->first();
    }

    /**
     * {@inheritDoc}
     */
    public function findByKode(string $kode): ?Package
    {
        return Package::where('kode', $kode)->first();
    }

    /**
     * {@inheritDoc}
     */
    public function create(array $data): Package
    {
        return Package::create($data);
    }

    /**
     * {@inheritDoc}
     */
    public function update(Package $package, array $data): Package
    {
        $package->update($data);

        return $package->refresh();
    }

    /**
     * {@inheritDoc}
     */
    public function delete(Package $package): bool
    {
        return (bool) $package->delete();
    }

    /**
     * {@inheritDoc}
     */
    public function slugExists(string $slug, ?int $exceptId = null): bool
    {
        return Package::where('slug', $slug)
            ->when($exceptId, fn ($q) => $q->where('id', '!=', $exceptId))
            ->exists();
    }

    /**
     * {@inheritDoc}
     */
    public function kodeExists(string $kode, ?int $exceptId = null): bool
    {
        return Package::where('kode', $kode)
            ->when($exceptId, fn ($q) => $q->where('id', '!=', $exceptId))
            ->exists();
    }

    /**
     * {@inheritDoc}
     *
     * Ambil nomor urut terbesar untuk tahun ini, lalu +1.
     * Contoh: kalau sudah ada PKG-2026-005, return PKG-2026-006.
     */
    public function generateKode(int $tahun): string
    {
        $prefix = "PKG-{$tahun}-";

        // Cari kode dengan prefix yang sama, urut descending
        $lastKode = Package::withTrashed()
            ->where('kode', 'like', "{$prefix}%")
            ->orderByDesc('kode')
            ->value('kode');

        if ($lastKode === null) {
            return $prefix.'001';
        }

        // Ambil 3 digit terakhir
        $lastNumber = (int) substr($lastKode, -3);
        $nextNumber = $lastNumber + 1;

        return $prefix.str_pad((string) $nextNumber, 3, '0', STR_PAD_LEFT);
    }

    /**
     * {@inheritDoc}
     *
     * @return Collection<int, Package>
     */
    public function allAktif(): Collection
    {
        return Package::aktif()
            ->orderBy('nama')
            ->get();
    }

    /**
     * {@inheritDoc}
     *
     * @return array<string, int>
     */
    public function countByStatus(): array
    {
        $counts = Package::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->all();

        // Pastikan semua status ada, default 0
        return [
            PackageStatus::DRAFT->value => (int) ($counts[PackageStatus::DRAFT->value] ?? 0),
            PackageStatus::AKTIF->value => (int) ($counts[PackageStatus::AKTIF->value] ?? 0),
            PackageStatus::ARSIP->value => (int) ($counts[PackageStatus::ARSIP->value] ?? 0),
        ];
    }
}
