<?php

namespace App\Console\Commands;

use App\Enums\BookingStatus;
use App\Models\Booking;
use Illuminate\Console\Command;

class SimulateExpiredBookingsCommand extends Command
{
    /**
     * Nama & signature command.
     *
     * @var string
     */
    protected $signature = 'bookings:simulate-expired
                            {--count=1 : Jumlah booking yang akan di-set expired}';

    /**
     * Deskripsi command.
     *
     * @var string
     */
    protected $description = '[DEV ONLY] Set beberapa booking pending menjadi expired untuk testing';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        // Guard: hanya boleh di non-production
        if (app()->isProduction()) {
            $this->error('Command ini tidak boleh dijalankan di production!');

            return self::FAILURE;
        }

        $count = (int) $this->option('count');

        // Ambil booking pending terbaru
        $bookings = Booking::pendingPayment()
            ->orderByDesc('id')
            ->limit($count)
            ->get();

        if ($bookings->isEmpty()) {
            $this->warn('Tidak ada booking pending untuk di-expire.');

            return self::SUCCESS;
        }

        foreach ($bookings as $booking) {
            $booking->update([
                'expired_at' => now()->subHours(2),
                'status' => BookingStatus::PENDING_PAYMENT->value,
            ]);

            $this->line("Booking {$booking->kode} di-set expired 2 jam lalu.");
        }

        $this->info("{$bookings->count()} booking di-set expired.");
        $this->comment('Sekarang jalankan: php artisan bookings:expire');

        return self::SUCCESS;
    }
}
