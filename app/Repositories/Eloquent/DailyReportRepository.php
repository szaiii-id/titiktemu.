<?php

namespace App\Repositories\Eloquent;

use App\Models\DailyReport;
use App\Models\Trip;
use App\Models\TripDay;
use App\Models\User;
use App\Repositories\Contracts\DailyReportRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class DailyReportRepository implements DailyReportRepositoryInterface
{
    /**
     * {@inheritDoc}
     */
    public function paginate(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $search = $filters['search'] ?? null;
        $status = $filters['status'] ?? null;
        $mitraId = $filters['mitra_id'] ?? null;
        $tripId = $filters['trip_id'] ?? null;
        $sort = $filters['sort'] ?? 'submitted_at';
        $direction = $filters['direction'] ?? 'desc';

        // Whitelist sort
        $allowedSorts = ['submitted_at', 'verified_at', 'created_at', 'status'];
        if (! in_array($sort, $allowedSorts, true)) {
            $sort = 'submitted_at';
        }

        $direction = strtolower($direction) === 'asc' ? 'asc' : 'desc';

        return DailyReport::query()
            ->with([
                'tripDay:id,trip_id,hari_ke,tanggal,judul',
                'tripDay.trip:id,kode,package_id,timezone',
                'tripDay.trip.package:id,nama,kode',
                'mitra:id,name,email,username',
                'verifier:id,name,email',
                'media',
            ])
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->whereHas('tripDay.trip', function ($q) use ($search) {
                        $q->where('kode', 'ilike', "%{$search}%");
                    })
                        ->orWhereHas('tripDay.trip.package', function ($q) use ($search) {
                            $q->where('nama', 'ilike', "%{$search}%");
                        })
                        ->orWhereHas('mitra', function ($q) use ($search) {
                            $q->where('name', 'ilike', "%{$search}%")
                                ->orWhere('email', 'ilike', "%{$search}%");
                        });
                });
            })
            ->when($status, fn ($query, $status) => $query->where('status', $status))
            ->when($mitraId, fn ($query, $id) => $query->where('mitra_id', $id))
            ->when($tripId, fn ($query, $id) => $query->whereHas(
                'tripDay',
                fn ($q) => $q->where('trip_id', $id)
            ))
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
    public function findById(int $id): ?DailyReport
    {
        return DailyReport::with([
            'tripDay.trip.package:id,nama,kode,timezone',
            'tripDay.trip.booking.client:id,name,email',
            'mitra:id,name,email,username',
            'verifier:id,name,email',
            'media',
        ])->find($id);
    }

    /**
     * {@inheritDoc}
     */
    public function findByTripDayAndMitra(TripDay $tripDay, User $mitra): ?DailyReport
    {
        return DailyReport::with(['media'])
            ->where('trip_day_id', $tripDay->id)
            ->where('mitra_id', $mitra->id)
            ->first();
    }

    /**
     * {@inheritDoc}
     */
    public function create(array $data): DailyReport
    {
        return DailyReport::create($data);
    }

    /**
     * {@inheritDoc}
     */
    public function update(DailyReport $report, array $data): DailyReport
    {
        $report->update($data);

        return $report->refresh();
    }

    /**
     * {@inheritDoc}
     */
    public function delete(DailyReport $report): bool
    {
        return (bool) $report->delete();
    }

    /**
     * {@inheritDoc}
     *
     * @return array<string, int>
     */
    public function countByStatus(): array
    {
        $counts = DailyReport::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->all();

        return [
            DailyReport::STATUS_SUBMITTED => (int) ($counts[DailyReport::STATUS_SUBMITTED] ?? 0),
            DailyReport::STATUS_VERIFIED => (int) ($counts[DailyReport::STATUS_VERIFIED] ?? 0),
            DailyReport::STATUS_REJECTED => (int) ($counts[DailyReport::STATUS_REJECTED] ?? 0),
        ];
    }

    /**
     * {@inheritDoc}
     *
     * @return array<string, int>
     */
    public function countByStatusForMitra(User $mitra): array
    {
        $counts = DailyReport::query()
            ->where('mitra_id', $mitra->id)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->all();

        return [
            DailyReport::STATUS_SUBMITTED => (int) ($counts[DailyReport::STATUS_SUBMITTED] ?? 0),
            DailyReport::STATUS_VERIFIED => (int) ($counts[DailyReport::STATUS_VERIFIED] ?? 0),
            DailyReport::STATUS_REJECTED => (int) ($counts[DailyReport::STATUS_REJECTED] ?? 0),
        ];
    }

    /**
     * {@inheritDoc}
     *
     * @return Collection<int, TripDay>
     */
    public function findUnverifiedDaysForTrip(Trip $trip): Collection
    {
        return TripDay::where('trip_id', $trip->id)
            ->whereDoesntHave('dailyReports', function ($q) {
                $q->where('status', DailyReport::STATUS_VERIFIED);
            })
            ->with(['dailyReports.media'])
            ->orderBy('hari_ke')
            ->get();
    }

    /**
     * {@inheritDoc}
     *
     * Return true kalau semua trip_day sudah punya minimal 1 report verified.
     */
    public function allDaysVerifiedForTrip(Trip $trip): bool
    {
        return $this->findUnverifiedDaysForTrip($trip)->isEmpty();
    }

    /**
     * {@inheritDoc}
     *
     * @return Collection<int, DailyReport>
     */
    public function findSubmittedForTrip(Trip $trip): Collection
    {
        return DailyReport::whereHas('tripDay', fn ($q) => $q->where('trip_id', $trip->id))
            ->where('status', DailyReport::STATUS_SUBMITTED)
            ->with(['tripDay:id,trip_id,hari_ke,tanggal,judul', 'mitra:id,name,email', 'media'])
            ->orderBy('submitted_at', 'asc')
            ->get();
    }
}
