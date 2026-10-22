<?php

namespace App\Repositories\Eloquent;

use App\Enums\TripStatus;
use App\Models\Trip;
use App\Models\User;
use App\Repositories\Contracts\TripRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class TripRepository implements TripRepositoryInterface
{
    /**
     * Driver-aware search operator.
     *
     * PostgreSQL → `ilike` (case-insensitive)
     * SQLite/MySQL → `like` (case-insensitive by default)
     */
    protected function searchOperator(): string
    {
        return DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
    }

    /**
     * {@inheritDoc}
     */
    public function paginate(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $search = $filters['search'] ?? null;
        $status = $filters['status'] ?? null;
        $packageId = $filters['package_id'] ?? null;
        $mitraId = $filters['mitra_id'] ?? null;
        $tanggalDari = $filters['tanggal_dari'] ?? null;
        $tanggalSampai = $filters['tanggal_sampai'] ?? null;
        $sort = $filters['sort'] ?? 'tanggal_mulai';
        $direction = $filters['direction'] ?? 'desc';

        // Whitelist kolom sort
        $allowedSorts = ['tanggal_mulai', 'tanggal_selesai', 'created_at', 'status', 'kode'];
        if (! in_array($sort, $allowedSorts, true)) {
            $sort = 'tanggal_mulai';
        }

        $direction = strtolower($direction) === 'asc' ? 'asc' : 'desc';

        $operator = $this->searchOperator();

        return Trip::query()
            ->with([
                'package:id,nama,kode,timezone',
                'booking:id,kode,user_id',
                'booking.client:id,name,email',
            ])
            ->withCount('mitras')
            ->when($search, function ($query, $search) use ($operator) {
                $query->where(function ($q) use ($search, $operator) {
                    $q->where('kode', $operator, "%{$search}%")
                        ->orWhereHas('booking', function ($q) use ($search, $operator) {
                            $q->where('kode', $operator, "%{$search}%");
                        })
                        ->orWhereHas('package', function ($q) use ($search, $operator) {
                            $q->where('nama', $operator, "%{$search}%")
                                ->orWhere('kode', $operator, "%{$search}%");
                        })
                        ->orWhereHas('booking.client', function ($q) use ($search, $operator) {
                            $q->where('name', $operator, "%{$search}%")
                                ->orWhere('email', $operator, "%{$search}%");
                        });
                });
            })
            ->when($status, fn ($query, $status) => $query->where('status', $status))
            ->when($packageId, fn ($query, $id) => $query->where('package_id', $id))
            ->when($mitraId, fn ($query, $id) => $query->whereHas(
                'mitras',
                fn ($q) => $q->where('mitra_id', $id)
            ))
            ->when($tanggalDari, fn ($query, $tgl) => $query->where('tanggal_mulai', '>=', $tgl))
            ->when($tanggalSampai, fn ($query, $tgl) => $query->where('tanggal_mulai', '<=', $tgl))
            ->orderBy($sort, $direction)
            ->paginate($perPage)
            ->withQueryString();
    }

    /**
     * {@inheritDoc}
     */
    public function paginateForMitra(User $mitra, array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        return $this->paginate(
            array_merge($filters, ['mitra_id' => $mitra->id]),
            $perPage
        );
    }

    /**
     * {@inheritDoc}
     */
    public function findById(int $id): ?Trip
    {
        return Trip::with([
            'package:id,nama,kode,slug,timezone,cover_image',
            'booking:id,kode,user_id,tanggal_keberangkatan,jumlah_peserta,total_harga,status',
            'booking.client:id,name,email,username',
            'mitras.mitra:id,name,email,username,timezone',
            'mitras.assigner:id,name,email',
            'days',
        ])->find($id);
    }

    /**
     * {@inheritDoc}
     */
    public function findByKode(string $kode): ?Trip
    {
        return Trip::with(['package', 'booking.client', 'mitras.mitra', 'days'])
            ->where('kode', $kode)
            ->first();
    }

    /**
     * {@inheritDoc}
     */
    public function findByBookingId(int $bookingId): ?Trip
    {
        return Trip::with(['package', 'mitras.mitra', 'days'])
            ->where('booking_id', $bookingId)
            ->first();
    }

    /**
     * {@inheritDoc}
     */
    public function create(array $data): Trip
    {
        return Trip::create($data);
    }

    /**
     * {@inheritDoc}
     */
    public function update(Trip $trip, array $data): Trip
    {
        $trip->update($data);

        return $trip->refresh();
    }

    /**
     * {@inheritDoc}
     */
    public function kodeExists(string $kode, ?int $exceptId = null): bool
    {
        return Trip::where('kode', $kode)
            ->when($exceptId, fn ($q) => $q->where('id', '!=', $exceptId))
            ->exists();
    }

    /**
     * {@inheritDoc}
     *
     * Ambil nomor urut terbesar untuk tahun ini, lalu +1.
     * Format: TRP-{tahun}-{3-digit-padded}
     */
    public function generateKode(int $tahun): string
    {
        $prefix = "TRP-{$tahun}-";
        $expectedLength = strlen($prefix) + 3;

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::selectOne(
                'SELECT pg_advisory_xact_lock(?)',
                [crc32("trip_kode_{$tahun}")]
            );
        }

        $lastKode = Trip::where('kode', 'like', "{$prefix}%")
            ->whereRaw('LENGTH(kode) = ?', [$expectedLength])
            ->orderByDesc('kode')
            ->value('kode');

        if ($lastKode === null) {
            return $prefix.'001';
        }

        $lastNumber = (int) substr((string) $lastKode, -3);
        $nextNumber = $lastNumber + 1;

        return $prefix.str_pad((string) $nextNumber, 3, '0', STR_PAD_LEFT);
    }

    /**
     * {@inheritDoc}
     *
     * Pre-filter kasar (SQL), timezone-aware di Service.
     *
     * @return Collection<int, Trip>
     */
    public function findScheduledDueToday(string $tanggal): Collection
    {
        return Trip::scheduled()
            ->where('tanggal_mulai', '<=', $tanggal)
            ->with(['mitras', 'booking', 'package'])
            ->get();
    }

    /**
     * {@inheritDoc}
     *
     * @return array<string, int>
     */
    public function countByStatus(): array
    {
        $counts = Trip::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->all();

        $result = [];
        foreach (TripStatus::cases() as $case) {
            $result[$case->value] = (int) ($counts[$case->value] ?? 0);
        }

        return $result;
    }

    /**
     * {@inheritDoc}
     *
     * @return array<string, int>
     */
    public function countByStatusForMitra(User $mitra): array
    {
        $counts = Trip::query()
            ->whereHas('mitras', fn ($q) => $q->where('mitra_id', $mitra->id))
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->all();

        $result = [];
        foreach (TripStatus::cases() as $case) {
            $result[$case->value] = (int) ($counts[$case->value] ?? 0);
        }

        return $result;
    }
}
