<?php

namespace Database\Seeders;

use App\Enums\BookingStatus;
use App\Enums\PaymentMetode;
use App\Models\Booking;
use App\Models\BookingParticipant;
use App\Models\Package;
use App\Models\Payment;
use App\Models\Trip;
use App\Models\User;
use App\Services\ETicket\ETicketService;
use App\Services\Trip\TripService;
use App\Support\Timezone;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class BookingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * Booking #1-#5 = data demo (pending, payment_verified, cancelled).
     * Booking #6 = data E2E khusus, status CONFIRMED, tanggal hari ini (WITA).
     *
     * ⚠️ FIX RACE #1: Pakai advisory lock global `booking_creation_global`
     * SAMA dengan `BookingRepository::generateKode()`. Ini mencegah
     * race antara seeder dan `BookingService::create()` yang bisa
     * menyebabkan duplicate `BKG-2026-001`.
     *
     * ⚠️ FIX RACE #2: Skip jika booking sudah ada (`firstOrCreate`-style)
     * — jangan pakai `updateOrCreate` yang bisa race.
     */
    public function run(): void
    {
        $admin = User::where('email', 'admin@titiktemu.test')->first();
        $client = User::where('email', 'client@titiktemu.test')->first();

        if (! $admin || ! $client) {
            $this->command->warn('⚠️  Admin atau client tidak ditemukan. Jalankan UserSeeder dulu.');

            return;
        }

        $paketPasarTerapung = Package::where('kode', 'PKG-'.now()->year.'-001')->first();
        $paketHutanKalimantan = Package::where('kode', 'PKG-'.now()->year.'-002')->first();

        if (! $paketPasarTerapung || ! $paketHutanKalimantan) {
            $this->command->warn('⚠️  Paket tidak ditemukan. Jalankan PackageSeeder dulu.');

            return;
        }

        // ==========================================
        // 0. HAPUS TRIP LAMA (STALE DATA)
        // ------------------------------------------------------------
        // Trip yang existing dihapus dulu supaya tidak ada "stale trip"
        // dari test run sebelumnya.
        //
        // Deleting trips cascade ke: trip_mitras, trip_days,
        // daily_reports, daily_report_media, e_tickets.
        // ==========================================
        $staleTripCount = Trip::query()->count();
        if ($staleTripCount > 0) {
            Trip::query()->forceDelete();
            $this->command->info("🗑️  Menghapus {$staleTripCount} trip lama (stale).");
        }

        // ==========================================
        // 1. BOOKING PENDING PAYMENT
        // ==========================================
        $this->seedBooking([
            'kode' => 'BKG-'.now()->year.'-001',
            'package' => $paketPasarTerapung,
            'client' => $client,
            'tanggal_keberangkatan' => now()->addDays(14)->format('Y-m-d'),
            'jumlah_peserta' => 2,
            'status' => BookingStatus::PENDING_PAYMENT,
            'catatan' => null,
            'participants' => [
                ['nama' => 'Budi Client', 'umur' => 30, 'no_hp' => '081234567890', 'catatan' => null],
                ['nama' => 'Ani Client', 'umur' => 28, 'no_hp' => '081234567891', 'catatan' => 'Alergi seafood'],
            ],
            'payment' => null,
        ]);

        // ==========================================
        // 2. BOOKING PAYMENT VERIFIED
        // ==========================================
        $this->seedBooking([
            'kode' => 'BKG-'.now()->year.'-002',
            'package' => $paketHutanKalimantan,
            'client' => $client,
            'tanggal_keberangkatan' => now()->addDays(21)->format('Y-m-d'),
            'jumlah_peserta' => 4,
            'status' => BookingStatus::PAYMENT_VERIFIED,
            'catatan' => 'Mohon disiapkan tenda tambahan.',
            'participants' => [
                ['nama' => 'Budi Client', 'umur' => 30, 'no_hp' => '081234567890', 'catatan' => null],
                ['nama' => 'Ani Client', 'umur' => 28, 'no_hp' => '081234567891', 'catatan' => null],
                ['nama' => 'Citra Client', 'umur' => 25, 'no_hp' => '081234567892', 'catatan' => 'Vegetarian'],
                ['nama' => 'Dani Client', 'umur' => 35, 'no_hp' => '081234567893', 'catatan' => null],
            ],
            'payment' => [
                'jumlah' => null,
                'metode' => PaymentMetode::TRANSFER_BANK,
                'bank_pengirim' => 'BCA',
                'nama_pengirim' => 'Budi Client',
                'bukti_transfer' => null,
                'verified_by' => $admin,
                'verified_at' => now()->subHours(6),
                'catatan' => 'Transfer sudah masuk, sesuai nominal.',
            ],
        ]);

        // ==========================================
        // 3. BOOKING PAYMENT VERIFIED
        // ==========================================
        $this->seedBooking([
            'kode' => 'BKG-'.now()->year.'-003',
            'package' => $paketPasarTerapung,
            'client' => $client,
            'tanggal_keberangkatan' => now()->addDays(30)->format('Y-m-d'),
            'jumlah_peserta' => 3,
            'status' => BookingStatus::PAYMENT_VERIFIED,
            'catatan' => null,
            'participants' => [
                ['nama' => 'Budi Client', 'umur' => 30, 'no_hp' => '081234567890', 'catatan' => null],
                ['nama' => 'Ani Client', 'umur' => 28, 'no_hp' => '081234567891', 'catatan' => null],
                ['nama' => 'Eka Client', 'umur' => 22, 'no_hp' => '081234567894', 'catatan' => null],
            ],
            'payment' => [
                'jumlah' => null,
                'metode' => PaymentMetode::TRANSFER_BANK,
                'bank_pengirim' => 'Mandiri',
                'nama_pengirim' => 'Budi Client',
                'bukti_transfer' => null,
                'verified_by' => $admin,
                'verified_at' => now()->subDays(2),
                'catatan' => 'Sudah diverifikasi.',
            ],
        ]);

        // ==========================================
        // 4. BOOKING PAYMENT VERIFIED (tanggal dekat)
        // ==========================================
        $this->seedBooking([
            'kode' => 'BKG-'.now()->year.'-004',
            'package' => $paketHutanKalimantan,
            'client' => $client,
            'tanggal_keberangkatan' => now()->addDays(5)->format('Y-m-d'),
            'jumlah_peserta' => 2,
            'status' => BookingStatus::PAYMENT_VERIFIED,
            'catatan' => null,
            'participants' => [
                ['nama' => 'Budi Client', 'umur' => 30, 'no_hp' => '081234567890', 'catatan' => null],
                ['nama' => 'Ani Client', 'umur' => 28, 'no_hp' => '081234567891', 'catatan' => null],
            ],
            'payment' => [
                'jumlah' => null,
                'metode' => PaymentMetode::TRANSFER_BANK,
                'bank_pengirim' => 'BRI',
                'nama_pengirim' => 'Budi Client',
                'bukti_transfer' => null,
                'verified_by' => $admin,
                'verified_at' => now()->subDays(1),
                'catatan' => 'Sudah diverifikasi.',
            ],
        ]);

        // ==========================================
        // 5. BOOKING CANCELLED
        // ==========================================
        $this->seedBooking([
            'kode' => 'BKG-'.now()->year.'-005',
            'package' => $paketPasarTerapung,
            'client' => $client,
            'tanggal_keberangkatan' => now()->addDays(10)->format('Y-m-d'),
            'jumlah_peserta' => 2,
            'status' => BookingStatus::CANCELLED,
            'catatan' => '['.now()->subDays(3)->format('Y-m-d H:i').'] Client minta pembatalan karena perubahan jadwal.',
            'participants' => [
                ['nama' => 'Budi Client', 'umur' => 30, 'no_hp' => '081234567890', 'catatan' => null],
                ['nama' => 'Ani Client', 'umur' => 28, 'no_hp' => '081234567891', 'catatan' => null],
            ],
            'payment' => null,
        ]);

        // ==========================================
        // 6. BOOKING E2E CONFIRMED (khusus test)
        // ------------------------------------------------------------
        // Booking ini dibuat CONFIRMED dengan tanggal hari ini (WITA)
        // supaya E2E Trip & Daily Report punya data deterministik.
        // Trip akan otomatis dibuat oleh backfillMissingTrips() di akhir.
        //
        // ⚠️ JANGAN ubah statusnya di test lain.
        // ==========================================
        $this->seedBooking([
            'kode' => 'BKG-'.now()->year.'-E2E-CONFIRMED',
            'package' => $paketPasarTerapung,
            'client' => $client,
            'tanggal_keberangkatan' => Timezone::today('Asia/Makassar')->toDateString(),
            'jumlah_peserta' => 2,
            'status' => BookingStatus::CONFIRMED,
            'catatan' => 'Booking seed untuk E2E — jangan diubah.',
            'participants' => [
                ['nama' => 'E2E Client 1', 'umur' => 30, 'no_hp' => '081111111111', 'catatan' => null],
                ['nama' => 'E2E Client 2', 'umur' => 28, 'no_hp' => '082222222222', 'catatan' => null],
            ],
            'payment' => [
                'jumlah' => null,
                'metode' => PaymentMetode::TRANSFER_BANK,
                'bank_pengirim' => 'BCA',
                'nama_pengirim' => 'E2E Client 1',
                'bukti_transfer' => null,
                'verified_by' => $admin,
                'verified_at' => now()->subDays(1),
                'catatan' => 'Pembayaran E2E sudah diverifikasi.',
            ],
        ]);

        $this->command->info('✅ BookingSeeder selesai: 5 booking demo + 1 booking E2E CONFIRMED.');
        $this->command->info('   Booking #3 & #4 berstatus PAYMENT_VERIFIED.');
        $this->command->info('   Booking #6 (E2E) berstatus CONFIRMED — trip otomatis dibuat.');

        // Backfill Trip untuk booking confirmed yang belum punya trip
        $this->backfillMissingTrips();
    }

    /**
     * Helper: seed satu booking lengkap (dengan participants & payment).
     *
     * ✅ FIX RACE:
     * 1. Pakai advisory lock global `booking_creation_global` — SAMA
     *    dengan `BookingRepository::generateKode()`. Ini mencegah
     *    seeder dan `BookingService::create()` insert kode yang sama.
     * 2. Cek existing dulu — kalau sudah ada, skip (jangan updateOrCreate
     *    yang bisa race).
     *
     * @param  array{
     *     kode: string,
     *     package: Package,
     *     client: User,
     *     tanggal_keberangkatan: string,
     *     jumlah_peserta: int,
     *     status: BookingStatus,
     *     catatan?: string|null,
     *     participants: array<int, array{nama: string, umur?: int|null, no_hp?: string|null, catatan?: string|null}>,
     *     payment: array{
     *         jumlah?: float|int|null,
     *         metode: PaymentMetode,
     *         bank_pengirim?: string|null,
     *         nama_pengirim?: string|null,
     *         bukti_transfer?: string|null,
     *         verified_by?: User|null,
     *         verified_at?: Carbon|null,
     *         catatan?: string|null,
     *     }|null,
     * }  $data
     */
    protected function seedBooking(array $data): void
    {
        /** @var Package $package */
        $package = $data['package'];

        /** @var User $client */
        $client = $data['client'];

        $totalHarga = $package->harga_per_rombongan && (float) $package->harga_per_rombongan > 0
            ? (float) $package->harga_per_rombongan
            : (float) $package->harga_per_orang * $data['jumlah_peserta'];

        $expiredAt = $data['status'] === BookingStatus::PENDING_PAYMENT
            ? now()->addHours(24)
            : null;

        // ✅ FIX RACE: Advisory lock global — sama dengan generateKode()
        $isPgsql = DB::connection()->getDriverName() === 'pgsql';
        $lockKey = crc32('booking_creation_global');
        $hasLock = false;

        if ($isPgsql) {
            DB::selectOne('SELECT pg_advisory_lock(?)', [$lockKey]);
            $hasLock = true;
        }

        try {
            // ✅ Skip jika sudah ada (idempotent)
            $booking = Booking::where('kode', $data['kode'])->first();

            if ($booking === null) {
                $booking = Booking::create([
                    'kode' => $data['kode'],
                    'package_id' => $package->id,
                    'user_id' => $client->id,
                    'tanggal_keberangkatan' => $data['tanggal_keberangkatan'],
                    'jumlah_peserta' => $data['jumlah_peserta'],
                    'total_harga' => $totalHarga,
                    'status' => $data['status']->value,
                    'expired_at' => $expiredAt,
                    'catatan' => $data['catatan'] ?? null,
                ]);
            } else {
                // Update field selain kode — tidak perlu re-insert
                $booking->update([
                    'package_id' => $package->id,
                    'user_id' => $client->id,
                    'tanggal_keberangkatan' => $data['tanggal_keberangkatan'],
                    'jumlah_peserta' => $data['jumlah_peserta'],
                    'total_harga' => $totalHarga,
                    'status' => $data['status']->value,
                    'expired_at' => $expiredAt,
                    'catatan' => $data['catatan'] ?? null,
                ]);
            }

            // Participants: delete + insert (aman karena dalam lock)
            BookingParticipant::where('booking_id', $booking->id)->delete();

            foreach ($data['participants'] as $p) {
                BookingParticipant::create([
                    'booking_id' => $booking->id,
                    'nama' => $p['nama'],
                    'umur' => $p['umur'] ?? null,
                    'no_hp' => $p['no_hp'] ?? null,
                    'catatan' => $p['catatan'] ?? null,
                ]);
            }

            if ($data['payment'] !== null) {
                $paymentData = $data['payment'];

                Payment::updateOrCreate(
                    ['booking_id' => $booking->id],
                    [
                        'jumlah' => $paymentData['jumlah'] ?? $totalHarga,
                        'metode' => $paymentData['metode']->value,
                        'bank_pengirim' => $paymentData['bank_pengirim'] ?? null,
                        'nama_pengirim' => $paymentData['nama_pengirim'] ?? null,
                        'bukti_transfer' => $paymentData['bukti_transfer'] ?? null,
                        'verified_by' => $paymentData['verified_by']?->id,
                        'verified_at' => $paymentData['verified_at'] ?? null,
                        'catatan' => $paymentData['catatan'] ?? null,
                    ]
                );
            }
        } finally {
            // ✅ Release lock
            if ($hasLock) {
                DB::selectOne('SELECT pg_advisory_unlock(?)', [$lockKey]);
            }
        }
    }

    /**
     * Backfill Trip untuk booking confirmed yang belum punya trip.
     *
     * ✅ FIX: hanya backfill `BKG-*-E2E-CONFIRMED` (bukan semua
     * booking confirmed lain). Ini supaya trip yang dibuat untuk
     * E2E deterministik — tanggal_mulai = hari ini (WITA).
     */
    protected function backfillMissingTrips(): void
    {
        $tripService = app(TripService::class);
        $eTicketService = app(ETicketService::class);

        // ✅ FIX: hanya backfill BKG-*-E2E-CONFIRMED
        $missing = Booking::where('status', BookingStatus::CONFIRMED->value)
            ->where('kode', 'like', 'BKG-%-E2E-CONFIRMED')
            ->whereDoesntHave('trip')
            ->get();

        if ($missing->isEmpty()) {
            return;
        }

        $this->command->info("🔧 Menemukan {$missing->count()} booking E2E confirmed tanpa trip. Membuat trip...");

        foreach ($missing as $booking) {
            try {
                $trip = $tripService->createFromBooking($booking);
                try {
                    $eTicketService->generateForTrip($trip);
                } catch (\Throwable $e) {
                    $this->command->warn("   ⚠️ E-Ticket gagal untuk {$booking->kode}: {$e->getMessage()}");
                }
                $this->command->info("   ✅ Trip {$trip->kode} dibuat untuk booking {$booking->kode} (mulai: {$trip->tanggal_mulai->format('Y-m-d')})");
            } catch (\Throwable $e) {
                $this->command->error("   ❌ Gagal membuat trip untuk {$booking->kode}: {$e->getMessage()}");
            }
        }
    }
}
