<?php

namespace App\Services\Trip;

use App\Enums\BookingStatus;
use App\Enums\PackageFacilityTipe;
use App\Enums\TripStatus;
use App\Models\Booking;
use App\Models\Package;
use App\Models\PackageDay;
use App\Models\Trip;
use App\Models\TripDay;
use App\Models\User;
use App\Repositories\Contracts\DailyReportRepositoryInterface;
use App\Repositories\Contracts\TripRepositoryInterface;
use App\Services\Wallet\WalletService;
use App\Support\Timezone;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Throwable;

class TripService
{
    public function __construct(
        protected TripRepositoryInterface $tripRepository,
        protected DailyReportRepositoryInterface $dailyReportRepository,
        protected WalletService $walletService,
    ) {}

    // ==========================================
    // READ
    // ==========================================

    /**
     * @param  array<string, mixed>  $filters
     * @return LengthAwarePaginator<int, Trip>
     */
    public function paginate(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        return $this->tripRepository->paginate($filters, $perPage);
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return LengthAwarePaginator<int, Trip>
     */
    public function paginateForMitra(User $mitra, array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        return $this->tripRepository->paginateForMitra($mitra, $filters, $perPage);
    }

    public function findDetail(int $id): Trip
    {
        $trip = $this->tripRepository->findById($id);
        if ($trip === null) {
            throw ValidationException::withMessages(['trip' => ['Trip tidak ditemukan.']]);
        }

        return $trip;
    }

    public function findByBookingId(int $bookingId): ?Trip
    {
        return $this->tripRepository->findByBookingId($bookingId);
    }

    /** @return array<string, int> */
    public function countByStatus(): array
    {
        return $this->tripRepository->countByStatus();
    }

    /** @return array<string, int> */
    public function countByStatusForMitra(User $mitra): array
    {
        return $this->tripRepository->countByStatusForMitra($mitra);
    }

    // ==========================================
    // CREATE FROM BOOKING
    // ==========================================

    public function createFromBooking(Booking $booking): Trip
    {
        if ($booking->status !== BookingStatus::CONFIRMED) {
            throw ValidationException::withMessages([
                'booking' => ['Hanya booking yang sudah dikonfirmasi bisa membuat trip.'],
            ]);
        }

        if ($this->tripRepository->findByBookingId($booking->id) !== null) {
            throw ValidationException::withMessages([
                'booking' => ['Booking ini sudah memiliki trip.'],
            ]);
        }

        return DB::transaction(function () use ($booking): Trip {
            // `$booking->package` dijamin ada (relasi belongsTo non-null
            // untuk booking yang valid — sudah confirmed).
            /** @var Package $package */
            $package = $booking->package;

            $package->loadMissing(['days.costs', 'facilities']);
            $snapshot = $this->buildSnapshot($package);

            $tanggalMulai = Carbon::parse($booking->tanggal_keberangkatan);
            $tanggalSelesai = $tanggalMulai->copy()->addDays($package->durasi_hari - 1);
            $kode = $this->tripRepository->generateKode((int) now()->year);

            $trip = $this->tripRepository->create([
                'kode' => $kode,
                'booking_id' => $booking->id,
                'package_id' => $package->id,
                'snapshot_package' => $snapshot,
                'tanggal_mulai' => $tanggalMulai->format('Y-m-d'),
                'tanggal_selesai' => $tanggalSelesai->format('Y-m-d'),
                'jumlah_peserta' => $booking->jumlah_peserta,
                'timezone' => $package->timezone,
                'status' => TripStatus::SCHEDULED->value,
            ]);

            $this->generateTripDays($trip, $package);

            Log::info('Trip dibuat dari booking', [
                'trip_id' => $trip->id,
                'trip_kode' => $trip->kode,
                'booking_id' => $booking->id,
                'booking_kode' => $booking->kode,
                'package_id' => $package->id,
            ]);

            return $trip->load(['package', 'booking.client', 'days']);
        });
    }

    /**
     * @return array<string, mixed>
     */
    protected function buildSnapshot(Package $package): array
    {
        return [
            'nama' => $package->nama,
            'kode' => $package->kode,
            'slug' => $package->slug,
            'deskripsi' => $package->deskripsi,
            'kategori' => $package->kategori->value,
            'durasi_hari' => $package->durasi_hari,
            'durasi_malam' => $package->durasi_malam,
            'timezone' => $package->timezone,
            'days' => $package->days->map(fn (PackageDay $day): array => [
                'hari_ke' => $day->hari_ke,
                'judul' => $day->judul,
                'deskripsi' => $day->deskripsi,
                'jam_mulai' => $day->jam_mulai,
                'jam_selesai' => $day->jam_selesai,
                'lokasi' => $day->lokasi,
            ])->values()->all(),
            'facilities' => [
                'include' => $package->facilities
                    ->where('tipe', PackageFacilityTipe::INCLUDE)
                    ->pluck('nama')->values()->all(),
                'exclude' => $package->facilities
                    ->where('tipe', PackageFacilityTipe::EXCLUDE)
                    ->pluck('nama')->values()->all(),
            ],
        ];
    }

    protected function generateTripDays(Trip $trip, Package $package): void
    {
        $package->loadMissing('days');

        foreach ($package->days as $packageDay) {
            TripDay::create([
                'trip_id' => $trip->id,
                'hari_ke' => $packageDay->hari_ke,
                'tanggal' => Carbon::parse($trip->tanggal_mulai)
                    ->addDays($packageDay->hari_ke - 1)
                    ->format('Y-m-d'),
                'judul' => $packageDay->judul,
                'deskripsi' => $packageDay->deskripsi,
                'status' => TripDay::STATUS_PENDING,
            ]);
        }
    }

    // ==========================================
    // STATUS TRANSITIONS
    // ==========================================

    public function activate(Trip $trip): Trip
    {
        if ($trip->status !== TripStatus::SCHEDULED) {
            throw ValidationException::withMessages([
                'status' => ['Trip harus berstatus "Terjadwal" untuk diaktifkan.'],
            ]);
        }

        $today = Timezone::today($trip->timezoneOrDefault());

        if ($trip->tanggal_mulai->format('Y-m-d') > $today->format('Y-m-d')) {
            throw ValidationException::withMessages([
                'status' => ['Trip belum waktunya dimulai.'],
            ]);
        }

        if (! $trip->hasMitra()) {
            throw ValidationException::withMessages([
                'status' => ['Trip harus punya minimal 1 mitra sebelum diaktifkan.'],
            ]);
        }

        return DB::transaction(function () use ($trip): Trip {
            $trip = $this->tripRepository->update($trip, [
                'status' => TripStatus::ACTIVE->value,
            ]);

            TripDay::query()
                ->where('trip_id', $trip->id)
                ->where('status', TripDay::STATUS_PENDING)
                ->update(['status' => TripDay::STATUS_IN_PROGRESS]);

            Log::info('Trip diaktifkan', [
                'trip_id' => $trip->id,
                'kode' => $trip->kode,
            ]);

            return $trip;
        });
    }

    public function complete(Trip $trip): Trip
    {
        if ($trip->status !== TripStatus::ACTIVE) {
            throw ValidationException::withMessages([
                'status' => ['Trip harus berstatus "Sedang Berjalan" untuk diselesaikan.'],
            ]);
        }

        if (! $this->dailyReportRepository->allDaysVerifiedForTrip($trip)) {
            $unverifiedDays = $this->dailyReportRepository->findUnverifiedDaysForTrip($trip);
            $hariList = $unverifiedDays
                ->map(fn (TripDay $day): string => "Hari {$day->hari_ke}")
                ->implode(', ');

            throw ValidationException::withMessages([
                'status' => [
                    'Trip belum bisa diselesaikan. Hari berikut belum punya laporan terverifikasi: '.$hariList,
                ],
            ]);
        }

        return DB::transaction(function () use ($trip): Trip {
            $trip = $this->tripRepository->update($trip, [
                'status' => TripStatus::COMPLETED->value,
            ]);

            Log::info('Trip diselesaikan', [
                'trip_id' => $trip->id,
                'kode' => $trip->kode,
            ]);

            $this->walletService->creditHonorForTrip($trip);

            return $trip;
        });
    }

    public function cancel(Trip $trip, string $alasan = 'Dibatalkan'): Trip
    {
        if (! $trip->canBeCancelled()) {
            throw ValidationException::withMessages([
                'status' => ['Trip ini tidak bisa dibatalkan.'],
            ]);
        }

        return DB::transaction(function () use ($trip, $alasan): Trip {
            $trip = $this->tripRepository->update($trip, [
                'status' => TripStatus::CANCELLED->value,
            ]);

            Log::warning('Trip dibatalkan', [
                'trip_id' => $trip->id,
                'kode' => $trip->kode,
                'alasan' => $alasan,
            ]);

            return $trip;
        });
    }

    // ==========================================
    // SCHEDULER
    // ==========================================

    /**
     * @return array{activated: int, skipped_no_mitra: int}
     */
    public function activateDueTrips(): array
    {
        $today = now()->format('Y-m-d');
        $candidates = $this->tripRepository->findScheduledDueToday($today);

        $activated = 0;
        $skippedNoMitra = 0;

        foreach ($candidates as $trip) {
            try {
                $tripToday = Timezone::today($trip->timezoneOrDefault());

                if ($trip->tanggal_mulai->format('Y-m-d') > $tripToday->format('Y-m-d')) {
                    continue;
                }

                if (! $trip->hasMitra()) {
                    $skippedNoMitra++;
                    Log::warning('Trip due tapi belum punya mitra', [
                        'trip_id' => $trip->id,
                        'kode' => $trip->kode,
                    ]);

                    continue;
                }

                DB::transaction(function () use ($trip): void {
                    $this->tripRepository->update($trip, [
                        'status' => TripStatus::ACTIVE->value,
                    ]);
                    TripDay::query()
                        ->where('trip_id', $trip->id)
                        ->where('status', TripDay::STATUS_PENDING)
                        ->update(['status' => TripDay::STATUS_IN_PROGRESS]);
                });

                $activated++;

                Log::info('Trip auto-activated', [
                    'trip_id' => $trip->id,
                    'kode' => $trip->kode,
                ]);
            } catch (Throwable $e) {
                Log::error('Gagal auto-activate trip', [
                    'trip_id' => $trip->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return [
            'activated' => $activated,
            'skipped_no_mitra' => $skippedNoMitra,
        ];
    }
}
