<?php

namespace App\Console\Commands;

use App\Models\DailyReport;
use App\Models\User;
use App\Services\Trip\DailyReportService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class AutoVerifyReports extends Command
{
    // Nama perintah yang akan dipanggil di terminal
    protected $signature = 'reports:auto-verify {--days=3 : Batas hari laporan dianggap kadaluarsa}';

    protected $description = 'Otomatis verifikasi laporan harian yang sudah lewat batas waktu (SLA).';

    public function handle(DailyReportService $dailyReportService): int
    {
        $days = (int) $this->option('days');
        $batasWaktu = now()->subDays($days);

        // Cari laporan yang statusnya 'submitted' DAN lebih lama dari batas waktu
        $reports = DailyReport::where('status', 'submitted')
            ->where('created_at', '<=', $batasWaktu)
            ->get();

        if ($reports->isEmpty()) {
            $this->info('Tidak ada laporan yang perlu diverifikasi otomatis.');

            return Command::SUCCESS;
        }

        // Cari Admin (sebagai verifier formal)
        $admin = User::where('role', 'admin')->first();

        if (! $admin) {
            $this->error('Admin tidak ditemukan. Gagal auto-verifikasi.');

            return Command::FAILURE;
        }

        $verifiedCount = 0;

        foreach ($reports as $report) {
            try {
                // Panggil service yang sudah ada untuk memproses verifikasi
                // (Ini juga akan mencairkan honor ke wallet mitra)
                $dailyReportService->verify($report, $admin);

                // Catat di log bahwa ini diverifikasi otomatis
                $report->update(['rejection_reason' => null]); // pastikan null
                Log::info("Auto-Verify: Laporan {$report->id} diverifikasi otomatis oleh sistem.");

                $verifiedCount++;
            } catch (\Throwable $e) {
                Log::error("Auto-Verify Gagal untuk laporan {$report->id}: {$e->getMessage()}");
                $this->error("Gagal verifikasi laporan ID {$report->id}: {$e->getMessage()}");
            }
        }

        $this->info("Berhasil auto-verifikasi {$verifiedCount} laporan.");

        return Command::SUCCESS;
    }
}
