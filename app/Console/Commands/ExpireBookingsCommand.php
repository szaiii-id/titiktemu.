<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Services\Booking\BookingService;
use Illuminate\Console\Command;

class ExpireBookingsCommand extends Command
{
    /**
     * Nama & signature command.
     *
     * @var string
     */
    protected $signature = 'bookings:expire
                            {--dry-run : Tampilkan berapa booking yang akan di-expire tanpa eksekusi}';

    /**
     * Deskripsi command.
     *
     * @var string
     */
    protected $description = 'Auto-cancel booking pending yang sudah melewati expired_at (24 jam)';

    /**
     * Execute the console command.
     */
    public function handle(BookingService $bookingService): int
    {
        $this->info('Mencari booking pending yang expired...');

        if ($this->option('dry-run')) {
            $count = Booking::expired()->count();
            $this->warn("  DRY RUN: {$count} booking akan di-cancel (tidak dieksekusi).");

            return self::SUCCESS;
        }

        $count = $bookingService->expirePendingBookings();

        if ($count === 0) {
            $this->info('Tidak ada booking yang perlu di-expire.');

            return self::SUCCESS;
        }

        $this->info("{$count} booking berhasil di-expire (status: cancelled).");

        return self::SUCCESS;
    }
}
