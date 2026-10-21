<?php

namespace App\Console\Commands;

use App\Enums\TripStatus;
use App\Models\Trip;
use App\Repositories\Contracts\DailyReportRepositoryInterface;
use App\Services\Trip\TripService;
use Illuminate\Console\Command;

class CompleteTripsCommand extends Command
{
    /**
     * Nama & signature command.
     *
     * @var string
     */
    protected $signature = 'trips:complete
                            {--dry-run : Tampilkan trip yang akan diselesaikan tanpa eksekusi}';

    /**
     * Deskripsi command.
     *
     * @var string
     */
    protected $description = 'Auto-complete trip active yang semua daily report-nya sudah verified';

    /**
     * Execute the console command.
     */
    public function handle(
        TripService $tripService,
        DailyReportRepositoryInterface $dailyReportRepository,
    ): int {
        $this->info('🔍 Mencari trip yang siap diselesaikan...');

        // Ambil trip active yang tanggal_selesai <= today
        $today = now()->format('Y-m-d');
        $candidates = Trip::where('status', TripStatus::ACTIVE->value)
            ->where('tanggal_selesai', '<=', $today)
            ->with(['days', 'package', 'mitras'])
            ->get();

        if ($candidates->isEmpty()) {
            $this->info('✅ Tidak ada trip active yang tanggal selesainya sudah lewat.');

            return self::SUCCESS;
        }

        $willComplete = 0;
        $skippedUnverified = 0;

        foreach ($candidates as $trip) {
            // Cek apakah semua hari sudah punya report verified
            if (! $dailyReportRepository->allDaysVerifiedForTrip($trip)) {
                $skippedUnverified++;

                $unverifiedDays = $dailyReportRepository->findUnverifiedDaysForTrip($trip);
                $hariList = $unverifiedDays
                    ->map(fn ($d) => "Hari {$d->hari_ke}")
                    ->implode(', ');

                if ($this->option('dry-run')) {
                    $this->line("⏭️  <fg=yellow>{$trip->kode}</> — belum verified: {$hariList}");
                }

                continue;
            }

            if ($this->option('dry-run')) {
                $this->line("✅ <fg=green>{$trip->kode}</> — {$trip->package?->nama} (semua hari verified)");
                $willComplete++;

                continue;
            }

            try {
                $tripService->complete($trip);
                $willComplete++;

                $this->line("✅ {$trip->kode} diselesaikan.");
            } catch (\Throwable $e) {
                $this->error("❌ {$trip->kode}: {$e->getMessage()}");
            }
        }

        $this->newLine();

        if ($this->option('dry-run')) {
            $this->warn("⚠️  DRY RUN: {$willComplete} akan diselesaikan, {$skippedUnverified} dilewati (tidak dieksekusi).");

            return self::SUCCESS;
        }

        if ($willComplete > 0) {
            $this->info("✅ {$willComplete} trip diselesaikan.");
        }

        if ($skippedUnverified > 0) {
            $this->warn("⚠️  {$skippedUnverified} trip dilewati karena belum semua hari verified.");
        }

        if ($willComplete === 0 && $skippedUnverified === 0) {
            $this->info('✅ Tidak ada trip yang perlu diselesaikan.');
        }

        return self::SUCCESS;
    }
}
