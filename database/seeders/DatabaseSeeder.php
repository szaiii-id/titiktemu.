<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Panggil seeder user di sini
        $this->call([
            UserSeeder::class,
            PackageSeeder::class,
            BookingSeeder::class,
            WalletSeeder::class,
            TripMitraSeeder::class,
        ]);

         // ✅ Hanya jalankan DemoDataSeeder jika BUKAN testing
        if (! app()->environment('testing')) {
            $this->call(DemoDataSeeder::class);
        }
    }
}
