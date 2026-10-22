<?php

namespace App\Services\Trip;

use App\Enums\TripStatus;
use App\Models\DailyReport;
use App\Models\DailyReportMedia;
use App\Models\Trip;
use App\Models\TripDay;
use App\Models\User;
use App\Repositories\Contracts\DailyReportRepositoryInterface;
use App\Services\Wallet\WalletService;
use App\Support\Timezone;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class DailyReportService
{
    public function __construct(
        protected DailyReportRepositoryInterface $dailyReportRepository,
        protected WalletService $walletService,
    ) {}

    // ==========================================
    // READ
    // ==========================================

    /**
     * @param  array<string, mixed>  $filters
     * @return LengthAwarePaginator<int, DailyReport>
     */
    public function paginate(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        return $this->dailyReportRepository->paginate($filters, $perPage);
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return LengthAwarePaginator<int, DailyReport>
     */
    public function paginateForMitra(User $mitra, array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        return $this->dailyReportRepository->paginateForMitra($mitra, $filters, $perPage);
    }

    public function findDetail(int $id): DailyReport
    {
        $report = $this->dailyReportRepository->findById($id);
        if ($report === null) {
            throw ValidationException::withMessages(['report' => ['Laporan tidak ditemukan.']]);
        }

        return $report;
    }

    /** @return array<string, int> */
    public function countByStatus(): array
    {
        return $this->dailyReportRepository->countByStatus();
    }

    /** @return array<string, int> */
    public function countByStatusForMitra(User $mitra): array
    {
        return $this->dailyReportRepository->countByStatusForMitra($mitra);
    }

    public function allDaysVerifiedForTrip(Trip $trip): bool
    {
        return $this->dailyReportRepository->allDaysVerifiedForTrip($trip);
    }

    /** @return Collection<int, TripDay> */
    public function findUnverifiedDaysForTrip(Trip $trip): Collection
    {
        return $this->dailyReportRepository->findUnverifiedDaysForTrip($trip);
    }

    // ==========================================
    // SUBMIT REPORT (MITRA)
    // ==========================================

    /**
     * @param  array{catatan?: string|null, media: array<int, UploadedFile>}  $data
     */
    public function submit(Trip $trip, TripDay $tripDay, User $mitra, array $data): DailyReport
    {
        $this->validateSubmit($trip, $tripDay, $mitra, $data);

        return DB::transaction(function () use ($trip, $tripDay, $mitra, $data): DailyReport {
            $existing = $this->dailyReportRepository->findByTripDayAndMitra($tripDay, $mitra);

            if ($existing !== null && ! $existing->isRejected()) {
                throw ValidationException::withMessages([
                    'report' => ['Laporan untuk hari ini sudah ada.'],
                ]);
            }

            $uploadedPaths = $this->uploadMedia($data['media']);

            if ($existing !== null) {
                $this->deleteOldMedia($existing);
                $report = $existing;
                $report->update([
                    'catatan' => $data['catatan'] ?? null,
                    'status' => DailyReport::STATUS_SUBMITTED,
                    'submitted_at' => now(),
                    'verified_by' => null,
                    'verified_at' => null,
                    'rejection_reason' => null,
                ]);
            } else {
                $report = $this->dailyReportRepository->create([
                    'trip_day_id' => $tripDay->id,
                    'mitra_id' => $mitra->id,
                    'catatan' => $data['catatan'] ?? null,
                    'status' => DailyReport::STATUS_SUBMITTED,
                    'submitted_at' => now(),
                ]);
            }

            $this->saveMedia($report, $uploadedPaths);

            if ($tripDay->isPending()) {
                $tripDay->update(['status' => TripDay::STATUS_IN_PROGRESS]);
            }

            Log::info('Daily report disubmit mitra', [
                'report_id' => $report->id,
                'trip_id' => $trip->id,
                'trip_kode' => $trip->kode,
                'trip_day_id' => $tripDay->id,
                'hari_ke' => $tripDay->hari_ke,
                'mitra_id' => $mitra->id,
                'mitra_name' => $mitra->name,
                'media_count' => count($uploadedPaths),
            ]);

            return $report->load(['media', 'tripDay']);
        });
    }

    // ==========================================
    // VERIFY / REJECT (ADMIN)
    // ==========================================

    public function verify(DailyReport $report, User $admin): DailyReport
    {
        if (! $report->isSubmitted()) {
            throw ValidationException::withMessages([
                'status' => ['Hanya laporan dengan status "Menunggu Verifikasi" yang bisa diverifikasi.'],
            ]);
        }

        return DB::transaction(function () use ($report, $admin): DailyReport {
            $report = $this->dailyReportRepository->update($report, [
                'status' => DailyReport::STATUS_VERIFIED,
                'verified_by' => $admin->id,
                'verified_at' => now(),
                'rejection_reason' => null,
            ]);

            Log::info('Daily report diverifikasi admin', [
                'report_id' => $report->id,
                'admin_id' => $admin->id,
                'trip_day_id' => $report->trip_day_id,
            ]);

            $tripDay = $report->tripDay;
            if ($tripDay !== null) {
                $this->maybeCompleteTripDay($tripDay);
                $trip = $tripDay->trip;
                if ($trip !== null) {
                    $this->maybeCompleteTrip($trip);
                }
            }

            return $report->load(['media', 'tripDay.trip']);
        });
    }

    public function reject(DailyReport $report, User $admin, string $reason): DailyReport
    {
        if (! $report->isSubmitted()) {
            throw ValidationException::withMessages([
                'status' => ['Hanya laporan dengan status "Menunggu Verifikasi" yang bisa ditolak.'],
            ]);
        }

        if (strlen(trim($reason)) < 5) {
            throw ValidationException::withMessages([
                'rejection_reason' => ['Alasan penolakan minimal 5 karakter.'],
            ]);
        }

        return DB::transaction(function () use ($report, $admin, $reason): DailyReport {
            $report = $this->dailyReportRepository->update($report, [
                'status' => DailyReport::STATUS_REJECTED,
                'verified_by' => $admin->id,
                'verified_at' => now(),
                'rejection_reason' => $reason,
            ]);

            Log::warning('Daily report ditolak admin', [
                'report_id' => $report->id,
                'admin_id' => $admin->id,
                'reason' => $reason,
            ]);

            return $report->load(['media', 'tripDay']);
        });
    }

    // ==========================================
    // INTERNAL — MEDIA
    // ==========================================

    /**
     * @param  array<int, UploadedFile>  $files
     * @return array<int, string>
     *
     * @throws RuntimeException Jika ada file yang gagal disimpan.
     */
    protected function uploadMedia(array $files): array
    {
        $paths = [];

        foreach ($files as $file) {
            $path = $file->store('daily-reports', 'public');

            if ($path === false) {
                throw new RuntimeException(
                    'Gagal menyimpan file bukti daily report. Cek permission storage.'
                );
            }

            $paths[] = $path;
        }

        return $paths;
    }

    /** @param array<int, string> $paths */
    protected function saveMedia(DailyReport $report, array $paths): void
    {
        foreach ($paths as $index => $path) {
            DailyReportMedia::create([
                'daily_report_id' => $report->id,
                'path' => $path,
                'urutan' => $index + 1,
            ]);
        }
    }

    protected function deleteOldMedia(DailyReport $report): void
    {
        foreach ($report->media as $media) {
            if (Storage::disk('public')->exists($media->path)) {
                Storage::disk('public')->delete($media->path);
            }
            $media->delete();
        }
    }

    // ==========================================
    // INTERNAL — AUTO-UPDATE STATUS
    // ==========================================

    protected function maybeCompleteTripDay(TripDay $tripDay): void
    {
        $tripDay->load('dailyReports');

        if (! $tripDay->allReportsVerified()) {
            return;
        }

        if ($tripDay->isCompleted()) {
            return;
        }

        $tripDay->update(['status' => TripDay::STATUS_COMPLETED]);

        Log::info('Trip day auto-completed', [
            'trip_day_id' => $tripDay->id,
            'trip_id' => $tripDay->trip_id,
            'hari_ke' => $tripDay->hari_ke,
        ]);
    }

    protected function maybeCompleteTrip(Trip $trip): void
    {
        if ($trip->status !== TripStatus::ACTIVE) {
            return;
        }

        if (! $this->dailyReportRepository->allDaysVerifiedForTrip($trip)) {
            return;
        }

        DB::transaction(function () use ($trip): void {
            $trip->update(['status' => TripStatus::COMPLETED]);

            Log::info('Trip auto-completed karena semua daily report verified', [
                'trip_id' => $trip->id,
                'trip_kode' => $trip->kode,
            ]);

            $this->walletService->creditHonorForTrip($trip);
        });
    }

    // ==========================================
    // VALIDATION
    // ==========================================

    /** @param array<string, mixed> $data */
    protected function validateSubmit(Trip $trip, TripDay $tripDay, User $mitra, array $data): void
    {
        if ($trip->status !== TripStatus::ACTIVE) {
            throw ValidationException::withMessages([
                'trip' => ['Trip harus dalam status "Sedang Berjalan" untuk lapor.'],
            ]);
        }

        if ($tripDay->trip_id !== $trip->id) {
            throw ValidationException::withMessages([
                'trip_day' => ['Hari ini bukan bagian dari trip ini.'],
            ]);
        }

        $today = Timezone::today($trip->timezoneOrDefault());
        $tripDayDate = Carbon::parse($tripDay->tanggal);

        if (! $tripDayDate->isSameDay($today)) {
            throw ValidationException::withMessages([
                'trip_day' => ['Anda hanya bisa lapor untuk kegiatan hari ini.'],
            ]);
        }

        $isAssigned = $trip->mitras()->where('mitra_id', $mitra->id)->exists();
        if (! $isAssigned) {
            throw ValidationException::withMessages([
                'mitra' => ['Anda tidak di-assign ke trip ini.'],
            ]);
        }

        $mediaCount = count($data['media'] ?? []);
        if ($mediaCount < 1) {
            throw ValidationException::withMessages(['media' => ['Minimal 1 foto bukti wajib diupload.']]);
        }
        if ($mediaCount > 2) {
            throw ValidationException::withMessages(['media' => ['Maksimal 2 foto bukti.']]);
        }
    }
}
