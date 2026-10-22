<?php

namespace App\Console\Commands;

use App\Models\Trip;
use App\Services\Trip\TripService;
use App\Support\Timezone;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class ActivateTripsCommand extends Command
{
    /**
     * Nama & signature command.
     *
     * @var string
     */
    protected $signature = 'trips:activate
                            {--dry-run : Tampilkan trip yang akan diaktifkan tanpa eksekusi}';

    /**
     * Deskripsi command.
     *
     * @var string
     */
    protected $description = 'Auto-activate trip yang sudah waktunya (tanggal_mulai <= today, punya mitra)';

    /**
     * Execute the console command.
     */
    public function handle(TripService $tripService): int
    {
        $this->info('🔍 Mencari trip yang siap diaktifkan...');

        if ($this->option('dry-run')) {
            return $this->dryRun($tripService);
        }

        $result = $tripService->activateDueTrips();

        // Output
        if ($result['activated'] === 0 && $result['skipped_no_mitra'] === 0) {
            $this->info('✅ Tidak ada trip yang perlu diaktifkan.');

            return self::SUCCESS;
        }

        if ($result['activated'] > 0) {
            $this->info("✅ {$result['activated']} trip berhasil diaktifkan.");
        }

        if ($result['skipped_no_mitra'] > 0) {
            $this->warn("⚠️  {$result['skipped_no_mitra']} trip dilewati karena belum punya mitra.");
        }

        return self::SUCCESS;
    }

    /**
     * Dry-run: tampilkan trip yang akan diaktifkan tanpa eksekusi.
     */
    protected function dryRun(TripService $tripService): int
    {
        $today = now()->format('Y-m-d');
        $candidates = Trip::scheduled()
            ->where('tanggal_mulai', '<=', $today)
            ->with(['mitras', 'package'])
            ->get();

        $willActivate = 0;
        $skippedNoMitra = 0;

        foreach ($candidates as $trip) {
            // Cek timezone-aware
            $tripToday = Timezone::today($trip->timezoneOrDefault());
            $tanggalMulai = Carbon::parse($trip->tanggal_mulai);

            if ($tanggalMulai->greaterThan($tripToday)) {
                continue; // belum waktunya di timezone trip
            }

            if (! $trip->hasMitra()) {
                $skippedNoMitra++;
                $this->line("⏭️  <fg=yellow>{$trip->kode}</> — belum punya mitra ({$trip->package?->nama})");

                continue;
            }

            $willActivate++;
            $mitraCount = $trip->mitras->count();
            $this->line("✅ <fg=green>{$trip->kode}</> — {$trip->package?->nama} ({$mitraCount} mitra)");
        }

        $this->newLine();
        $this->warn("⚠️  DRY RUN: {$willActivate} akan diaktifkan, {$skippedNoMitra} dilewati (tidak dieksekusi).");

        return self::SUCCESS;
    }
}
