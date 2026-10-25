<?php

namespace Database\Seeders;

use App\Enums\PaymentMetode;
use App\Models\Booking;
use App\Models\BookingParticipant;
use App\Models\Package;
use App\Models\Payment;
use App\Models\Payout;
use App\Models\User;
use App\Services\Trip\TripService;
use App\Services\Wallet\WalletService;
use Carbon\CarbonImmutable;
use Faker\Factory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        // ✅ SKIP DI TESTING
        if (app()->environment('testing')) {
            $this->command->warn('⚠️ DemoDataSeeder di-skip di environment testing.');

            return;
        }

        $admin = User::where('role', 'admin')->first();
        if (! $admin) {
            $this->command->error('Admin tidak ditemukan. Jalankan UserSeeder dulu.');

            return;
        }

        $faker = Factory::create('id_ID');
        $packages = Package::where('status', 'aktif')->get();
        if ($packages->isEmpty()) {
            $this->command->error('Tidak ada paket aktif.');

            return;
        }

        // ==========================================
        // 1. BUAT MITRA & CLIENT TAMBAHAN
        // ==========================================
        $mitras = User::where('role', 'mitra')->get();
        if ($mitras->count() < 10) {
            for ($i = 0; $i < 10; $i++) {
                $mitra = User::create([
                    'name' => $faker->name,
                    'email' => $faker->unique()->safeEmail,
                    'username' => 'mitra'.$i.time().rand(10, 99),
                    'password' => 'password123',
                    'role' => 'mitra',
                    'timezone' => 'Asia/Makassar',
                    'must_change_password' => false,
                ]);
                $mitra->profile()->create([
                    'tipe' => 'mitra',
                    'nama_penyedia_usaha' => $faker->company,
                    'alamat' => $faker->address,
                    'telepon' => $faker->phoneNumber,
                    'kota' => $faker->city,
                ]);
                $mitra->mitraWallet()->create(['saldo' => 0, 'total_pendapatan' => 0]);
                $mitras->push($mitra);
            }
        }

        $clients = User::where('role', 'client')->get();
        if ($clients->count() < 5) {
            for ($i = 0; $i < 5; $i++) {
                $client = User::create([
                    'name' => $faker->name,
                    'email' => $faker->unique()->safeEmail,
                    'username' => 'client'.$i.time().rand(10, 99),
                    'password' => 'password123',
                    'role' => 'client',
                    'timezone' => 'Asia/Makassar',
                    'must_change_password' => false,
                ]);
                $client->profile()->create(['tipe' => 'client']);
                $clients->push($client);
            }
        }

        // ==========================================
        // 2. BUAT BOOKING REALISTIS
        // ==========================================
        $this->command->info('🔄 Membuat 30 booking demo (6 bulan terakhir)...');

        $tripService = app(TripService::class);
        $walletService = app(WalletService::class);

        for ($i = 0; $i < 30; $i++) {
            $package = $packages->random();
            $client = $clients->random();
            $jumlahPeserta = rand(2, 6);

            $daysAgo = rand(-150, 30);
            $tanggalBerangkat = now()->addDays($daysAgo);

            // Tentukan status akhir
            if ($daysAgo < -7) {
                $finalStatus = $faker->randomElement(['completed', 'completed', 'completed', 'cancelled']);
            } elseif ($daysAgo < 0) {
                $finalStatus = $faker->randomElement(['confirmed', 'completed']);
            } else {
                $finalStatus = $faker->randomElement(['pending_payment', 'payment_verified', 'confirmed']);
            }

            // ✅ FIX: Buat booking dengan status CONFIRMED dulu agar createFromBooking berhasil
            $statusForCreate = in_array($finalStatus, ['confirmed', 'completed'])
                ? 'confirmed'
                : $finalStatus;

            $createdAt = Carbon::parse($tanggalBerangkat)->subDays(rand(7, 30));

            $booking = new Booking;
            $booking->kode = 'BKG-'.now()->year.'-'.str_pad((string) ($i + 100), 3, '0', STR_PAD_LEFT);
            $booking->package_id = $package->id;
            $booking->user_id = $client->id;

            // ✅ FIX: Cast ke Carbon/string sesuai tipe properti model
            $booking->tanggal_keberangkatan = $tanggalBerangkat;
            $booking->jumlah_peserta = $jumlahPeserta;

            // ✅ FIX: Cast ke string karena model mendefinisikan total_harga sebagai string (decimal)
            $booking->total_harga = (string) ($package->harga_per_orang * $jumlahPeserta);

            $booking->status = $statusForCreate;
            $booking->catatan = $faker->optional()->sentence;
            $booking->expired_at = $statusForCreate === 'pending_payment' ? now()->addHours(24) : null;

            // ✅ FIX: Booking pakai CarbonImmutable
            $booking->created_at = CarbonImmutable::parse($createdAt);
            $booking->save();

            // Participants
            for ($j = 0; $j < $jumlahPeserta; $j++) {
                BookingParticipant::create([
                    'booking_id' => $booking->id,
                    'nama' => $faker->name,
                    'umur' => rand(18, 60),
                    'no_hp' => '08'.rand(1111111111, 9999999999),
                    'catatan' => $faker->optional()->sentence,
                ]);
            }

            // Payment (jika status bukan pending & bukan cancelled)
            if (! in_array($statusForCreate, ['pending_payment', 'cancelled'])) {
                Payment::create([
                    'booking_id' => $booking->id,
                    'jumlah' => $booking->total_harga,
                    'metode' => PaymentMetode::TRANSFER_BANK->value,
                    'bank_pengirim' => $faker->randomElement(['BCA', 'Mandiri', 'BRI', 'BNI']),
                    'nama_pengirim' => $client->name,
                    'verified_by' => $admin->id,
                    'verified_at' => Carbon::parse($tanggalBerangkat)->subDays(rand(1, 5)),
                ]);
            }

            // Trip (jika confirmed atau completed)
            if (in_array($finalStatus, ['confirmed', 'completed'])) {
                try {
                    $trip = $tripService->createFromBooking($booking);

                    // Assign mitra
                    $mitra = $mitras->random();
                    $honor = rand(500000, 1500000);
                    $trip->mitras()->create([
                        'mitra_id' => $mitra->id,
                        'role' => 'lead',
                        'honor' => $honor,
                        'honor_tipe' => 'flat',
                        'assigned_by' => $admin->id,
                        'assigned_at' => Carbon::parse($tanggalBerangkat)->subDays(7),
                    ]);

                    // ✅ Setelah trip dibuat, baru ubah status booking & trip
                    if ($finalStatus === 'completed') {
                        $booking->update(['status' => 'completed']);
                        $trip->update(['status' => 'completed']);
                        $trip->refresh(); // refresh agar honor terbaca dengan status completed
                        $walletService->creditHonorForTrip($trip);
                    } else {
                        $trip->update(['status' => $tanggalBerangkat->isToday() ? 'active' : 'scheduled']);
                    }
                } catch (\Throwable $e) {
                    $this->command->error("❌ Gagal buat trip untuk {$booking->kode}: {$e->getMessage()}");
                }
            }
        }

        // ==========================================
        // 3. BUAT PAYOUT REALISTIS
        // ==========================================
        $this->command->info('🔄 Membuat 15 payout demo...');

        for ($i = 0; $i < 15; $i++) {
            $mitra = $mitras->random();
            $daysAgo = rand(0, 90);
            $tanggalRequest = now()->subDays($daysAgo);

            if ($daysAgo > 14) {
                $status = $faker->randomElement(['paid', 'paid', 'rejected']);
            } elseif ($daysAgo > 3) {
                $status = $faker->randomElement(['approved', 'paid']);
            } else {
                $status = 'pending';
            }

            $payout = new Payout;
            $payout->kode = 'PAY-'.now()->year.'-'.str_pad((string) ($i + 1), 3, '0', STR_PAD_LEFT);
            $payout->mitra_id = $mitra->id;

            // ✅ FIX: Cast ke string karena model mendefinisikan jumlah sebagai string (decimal)
            $payout->jumlah = (string) rand(500000, 3000000);

            $payout->status = $status;
            $payout->bank_tujuan = $faker->randomElement(['BCA', 'Mandiri', 'BRI', 'BNI']);

            // ✅ FIX: Faker Indonesia tidak punya bankAccountNumber, gunakan angka random
            $payout->no_rekening = (string) rand(1000000000, 9999999999);

            $payout->nama_pemilik = $mitra->name;
            $payout->catatan = $faker->optional()->sentence;

            // ✅ FIX: Payout pakai Carbon biasa (bukan CarbonImmutable)
            $payout->created_at = Carbon::parse($tanggalRequest);

            $payout->save();
        }

        // ==========================================
        // 4. ISI SALDO WALLET (agar tampilan wallet terisi)
        // ==========================================
        $this->command->info('🔄 Mengisi saldo wallet demo...');

        foreach ($mitras as $mitra) {
            $wallet = $mitra->mitraWallet;
            if (! $wallet) {
                continue;
            }

            $wallet->update([
                'saldo' => rand(200000, 2000000),
                'total_pendapatan' => rand(1000000, 5000000),
            ]);
        }

        $this->command->info('✅ DemoDataSeeder selesai!');
        $this->command->info('   - 30 booking (tersebar 6 bulan terakhir)');
        $this->command->info('   - 15 payout (3 bulan terakhir)');
        $this->command->info('   - '.$mitras->count().' mitra + '.$clients->count().' client');
    }
}
