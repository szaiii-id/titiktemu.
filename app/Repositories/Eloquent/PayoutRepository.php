<?php

namespace App\Repositories\Eloquent;

use App\Enums\PayoutStatus;
use App\Models\Payout;
use App\Models\User;
use App\Repositories\Contracts\PayoutRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

class PayoutRepository implements PayoutRepositoryInterface
{
    /**
     * Paginate global (admin) — mendukung filter mitra_id juga.
     *
     * @param  array<string, mixed>  $filters
     * @return LengthAwarePaginator<int, Payout>
     */
    public function paginate(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $search = $filters['search'] ?? null;
        $status = $filters['status'] ?? null;
        $mitraId = $filters['mitra_id'] ?? null;          // ✅ ambil mitra_id
        $sort = $filters['sort'] ?? 'created_at';
        $direction = $filters['direction'] ?? 'desc';

        return Payout::query()
            ->with(['mitra:id,name,email', 'reviewer:id,name'])
            ->when($mitraId, fn (Builder $q, $id) => $q->where('mitra_id', $id))   // ✅ filter scoped
            ->when($search, function (Builder $q, string $search): void {
                $q->where(function (Builder $q) use ($search): void {
                    $q->where('kode', 'ilike', "%{$search}%")
                        ->orWhere('nama_pemilik', 'ilike', "%{$search}%")
                        ->orWhereHas('mitra', fn (Builder $q) => $q->where('name', 'ilike', "%{$search}%"));
                });
            })
            ->when($status, fn (Builder $q, string $s) => $q->where('status', $s))
            ->orderBy((string) $sort, $direction === 'asc' ? 'asc' : 'desc')
            ->paginate($perPage)
            ->withQueryString();
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return LengthAwarePaginator<int, Payout>
     */
    public function paginateForMitra(User $mitra, array $filters = [], int $perPage = 10): LengthAwarePaginator
    {
        return $this->paginate(array_merge($filters, ['mitra_id' => $mitra->id]), $perPage);
    }

    public function findById(int $id): ?Payout
    {
        return Payout::with(['mitra:id,name,email', 'reviewer:id,name'])->find($id);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Payout
    {
        return Payout::create($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Payout $payout, array $data): Payout
    {
        $payout->update($data);

        return $payout->refresh();
    }

    public function generateKode(int $tahun): string
    {
        $prefix = "PAY-{$tahun}-";
        $last = Payout::where('kode', 'like', "{$prefix}%")->orderByDesc('kode')->value('kode');
        if (! $last) {
            return $prefix.'001';
        }
        $next = (int) substr((string) $last, -3) + 1;

        return $prefix.str_pad((string) $next, 3, '0', STR_PAD_LEFT);
    }

    /**
     * Payout pending milik mitra untuk hari ini.
     *
     * @return Collection<int, Payout>
     */
    public function findPendingForMitraToday(User $mitra): Collection
    {
        return Payout::where('mitra_id', $mitra->id)
            ->where('status', PayoutStatus::PENDING->value)   // ✅ hanya pending, bukan approved
            ->where(function (Builder $q) {
                // pakai requested_at kalau ada, fallback ke created_at
                $q->whereDate('requested_at', now()->toDateString())
                    ->orWhere(function (Builder $q) {
                        $q->whereNull('requested_at')
                            ->whereDate('created_at', now()->toDateString());
                    });
            })
            ->get();
    }

    /** @return array<string, int> */
    public function countByStatus(): array
    {
        $counts = Payout::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->all();

        $result = [];
        foreach (PayoutStatus::cases() as $case) {
            $result[$case->value] = (int) ($counts[$case->value] ?? 0);
        }

        return $result;
    }

    /** @return array<string, int> */
    public function countByStatusForMitra(User $mitra): array
    {
        $counts = Payout::query()
            ->where('mitra_id', $mitra->id)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->all();

        $result = [];
        foreach (PayoutStatus::cases() as $case) {
            $result[$case->value] = (int) ($counts[$case->value] ?? 0);
        }

        return $result;
    }
}
