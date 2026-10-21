<?php

namespace Database\Seeders;

use App\Models\Trip;
use App\Models\User;
use Illuminate\Database\Seeder;

class TripMitraSeeder extends Seeder
{
    /**
     * Assign mitra ke trip yang sudah dibuat oleh BookingSeeder.
     *
     * Dipisah dari TripSeeder karena:
     * - Trip dibuat otomatis oleh TripService::createFromBooking()
     *   (business logic di BookingSeeder).
     * - Assign mitra adalah aksi manual admin (PRD §6.3), jadi
     *   seeder ini mensimulasikan "admin sudah assign mitra".
     *
     * Idempotent: hanya assign kalau trip belum punya mitra.
     */
    public function run(): void
    {
        $admin = User::where('role', 'admin')->first();
        $mitra1 = User::where('email', 'budi@ptabc.com')->first();
        $mitra2 = User::where('email', 'ani@gmail.com')->first();

        if (! $admin || ! $mitra1) {
            $this->command->warn('⚠️  Admin atau mitra tidak ditemukan. Skip TripMitraSeeder.');

            return;
        }

        $tripsWithoutMitra = Trip::whereDoesntHave('mitras')
            ->orderBy('kode')
            ->get();

        if ($tripsWithoutMitra->isEmpty()) {
            $this->command->info('ℹ️  Semua trip sudah punya mitra.');

            return;
        }

        foreach ($tripsWithoutMitra as $index => $trip) {
            /** @var Trip $trip */
            // Trip pertama: assign 2 mitra (lead + asisten) — untuk test multi-mitra
            // Trip berikutnya: 1 mitra (lead)
            $trip->mitras()->create([
                'mitra_id' => $mitra1->id,
                'role' => 'lead',
                'honor' => 1_000_000,
                'honor_tipe' => 'flat',
                'instruksi' => 'Jaga kebersihan area, koordinasi dengan guide lokal.',
                'assigned_by' => $admin->id,
                'assigned_at' => now(),
            ]);

            if ($index === 0 && $mitra2) {
                $trip->mitras()->create([
                    'mitra_id' => $mitra2->id,
                    'role' => 'asisten',
                    'honor' => 500_000,
                    'honor_tipe' => 'flat',
                    'instruksi' => 'Bantu lead, dokumentasi kegiatan.',
                    'assigned_by' => $admin->id,
                    'assigned_at' => now(),
                ]);
            }

            $count = $index === 0 ? 2 : 1;
            $this->command->info("✅ {$trip->kode}: {$count} mitra assigned");
        }
    }
}
