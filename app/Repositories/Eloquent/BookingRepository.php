<?php

namespace App\Repositories\Eloquent;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\User;
use App\Repositories\Contracts\BookingRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class BookingRepository implements BookingRepositoryInterface
{
    /**
     * {@inheritDoc}
     */
    public function paginate(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $search = $filters['search'] ?? null;
        $status = $filters['status'] ?? null;
        $packageId = $filters['package_id'] ?? null;
        $userId = $filters['user_id'] ?? null;
        $tanggalDari = $filters['tanggal_dari'] ?? null;
        $tanggalSampai = $filters['tanggal_sampai'] ?? null;
        $sort = $filters['sort'] ?? 'created_at';
        $direction = $filters['direction'] ?? 'desc';

        // Whitelist kolom sort
        $allowedSorts = ['created_at', 'tanggal_keberangkatan', 'total_harga', 'status', 'kode'];
        if (! in_array($sort, $allowedSorts, true)) {
            $sort = 'created_at';
        }

        $direction = strtolower($direction) === 'asc' ? 'asc' : 'desc';

        return Booking::query()
            ->with(['package:id,nama,kode,timezone', 'client:id,name,email'])
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('kode', 'ilike', "%{$search}%")
                        ->orWhereHas('client', function ($q) use ($search) {
                            $q->where('name', 'ilike', "%{$search}%")
                                ->orWhere('email', 'ilike', "%{$search}%");
                        })
                        ->orWhereHas('package', function ($q) use ($search) {
                            $q->where('nama', 'ilike', "%{$search}%")
                                ->orWhere('kode', 'ilike', "%{$search}%");
                        });
                });
            })
            ->when($status, fn ($query, $status) => $query->where('status', $status))
            ->when($packageId, fn ($query, $id) => $query->where('package_id', $id))
            ->when($userId, fn ($query, $id) => $query->where('user_id', $id))
            ->when($tanggalDari, fn ($query, $tgl) => $query->where('tanggal_keberangkatan', '>=', $tgl))
            ->when($tanggalSampai, fn ($query, $tgl) => $query->where('tanggal_keberangkatan', '<=', $tgl))
            ->orderBy($sort, $direction)
            ->paginate($perPage)
            ->withQueryString();
    }

    /**
     * {@inheritDoc}
     */
    public function paginateForClient(User $client, array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        return $this->paginate(
            array_merge($filters, ['user_id' => $client->id]),
            $perPage
        );
    }

    /**
     * {@inheritDoc}
     */
    public function findById(int $id): ?Booking
    {
        return Booking::with([
            'package:id,nama,kode,timezone,harga_per_orang,harga_per_rombongan,durasi_hari,durasi_malam',
            'client:id,name,email,username',
            'participants',
            'payments.verifier:id,name,email',
        ])->find($id);
    }

    /**
     * {@inheritDoc}
     */
    public function findByKode(string $kode): ?Booking
    {
        return Booking::with(['package', 'client', 'participants', 'payments'])
            ->where('kode', $kode)
            ->first();
    }

    /**
     * {@inheritDoc}
     */
    public function create(array $data): Booking
    {
        return Booking::create($data);
    }

    /**
     * {@inheritDoc}
     */
    public function update(Booking $booking, array $data): Booking
    {
        $booking->update($data);

        return $booking->refresh();
    }

    /**
     * {@inheritDoc}
     */
    public function delete(Booking $booking): bool
    {
        return (bool) $booking->delete();
    }

    /**
     * {@inheritDoc}
     */
    public function kodeExists(string $kode, ?int $exceptId = null): bool
    {
        return Booking::withTrashed()
            ->where('kode', $kode)
            ->when($exceptId, fn ($q) => $q->where('id', '!=', $exceptId))
            ->exists();
    }

    /**
     * {@inheritDoc}
     *
     * Ambil nomor urut terbesar untuk tahun ini, lalu +1.
     * Format: BKG-{tahun}-{3-digit-padded}
     *
     * ✅ FIX RACE: Lock key diubah dari `booking_kode_{tahun}` menjadi
     * `booking_creation_global` — SAMA dengan `BookingSeeder::seedBooking()`.
     *
     * Ini penting karena:
     * - `BookingSeeder` insert `BKG-2026-001` hardcode via `create()`.
     * - `generateKode()` dipanggil di `BookingService::create()`.
     * - Jika lock key BEDA, keduanya bisa jalan paralel → race →
     *   `generateKode()` return `BKG-2026-001` (tabel kosong) →
     *   `BookingSeeder` insert `BKG-2026-001` → duplicate.
     *
     * Dengan lock key SAMA (`booking_creation_global`), keduanya
     * tidak bisa insert paralel — `generateKode()` akan menunggu
     * sampai `BookingSeeder` selesai, lalu return `BKG-2026-002+`.
     */
    public function generateKode(int $tahun): string
    {
        $prefix = "BKG-{$tahun}-";
        $expectedLength = strlen($prefix) + 3;

        if (DB::connection()->getDriverName() === 'pgsql') {
            // ✅ FIX RACE: Lock key GLOBAL — sama dengan BookingSeeder
            DB::selectOne(
                'SELECT pg_advisory_xact_lock(?)',
                [crc32('booking_creation_global')]
            );
        }

        $lastKode = Booking::withTrashed()
            ->where('kode', 'like', "{$prefix}%")
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
     * @return Collection<int, Booking>
     */
    public function findExpired(): Collection
    {
        return Booking::expired()->get();
    }

    /**
     * {@inheritDoc}
     *
     * @return array<string, int>
     */
    public function countByStatus(): array
    {
        $counts = Booking::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->all();

        $result = [];
        foreach (BookingStatus::cases() as $case) {
            $result[$case->value] = (int) ($counts[$case->value] ?? 0);
        }

        return $result;
    }

    /**
     * {@inheritDoc}
     *
     * @return array<string, int>
     */
    public function countByStatusForClient(User $client): array
    {
        $counts = Booking::query()
            ->where('user_id', $client->id)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->all();

        $result = [];
        foreach (BookingStatus::cases() as $case) {
            $result[$case->value] = (int) ($counts[$case->value] ?? 0);
        }

        return $result;
    }
}
