<?php

namespace Database\Factories;

use App\Enums\TripStatus;
use App\Models\Booking;
use App\Models\Package;
use App\Models\Trip;
use App\Models\TripDay;
use App\Models\TripMitra;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Trip>
 */
class TripFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $tanggalMulai = now()->addDays(fake()->numberBetween(3, 30));
        $durasiHari = fake()->numberBetween(1, 5);
        $tanggalSelesai = $tanggalMulai->copy()->addDays($durasiHari - 1);

        $snapshot = [
            'nama' => 'Paket Test '.Str::random(5),
            'kode' => 'PKG-'.now()->year.'-'.str_pad(
                (string) fake()->unique()->numberBetween(1, 999),
                3,
                '0',
                STR_PAD_LEFT,
            ),
            'durasi_hari' => $durasiHari,
            'durasi_malam' => max(0, $durasiHari - 1),
            'timezone' => 'Asia/Makassar',
            'days' => [],
            'facilities' => [
                'include' => [],
                'exclude' => [],
            ],
        ];

        return [
            'kode' => 'TRP-'.now()->year.'-'.str_pad(
                (string) fake()->unique()->numberBetween(1, 9999),
                3,
                '0',
                STR_PAD_LEFT,
            ),
            'booking_id' => Booking::factory()->confirmed(),
            'package_id' => Package::factory()->aktif(),
            'snapshot_package' => $snapshot,
            'tanggal_mulai' => $tanggalMulai->format('Y-m-d'),
            'tanggal_selesai' => $tanggalSelesai->format('Y-m-d'),
            'jumlah_peserta' => fake()->numberBetween(1, 10),
            'timezone' => 'Asia/Makassar',
            'status' => TripStatus::SCHEDULED->value,
        ];
    }

    public function scheduled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => TripStatus::SCHEDULED->value,
        ]);
    }

    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => TripStatus::ACTIVE->value,
            'tanggal_mulai' => now()->format('Y-m-d'),
            'tanggal_selesai' => now()->addDays(1)->format('Y-m-d'),
        ]);
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => TripStatus::COMPLETED->value,
            'tanggal_mulai' => now()->subDays(5)->format('Y-m-d'),
            'tanggal_selesai' => now()->subDays(3)->format('Y-m-d'),
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => TripStatus::CANCELLED->value,
        ]);
    }

    public function sudahTibaWaktunya(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => TripStatus::SCHEDULED->value,
            'tanggal_mulai' => now()->subDays(1)->format('Y-m-d'),
            'tanggal_selesai' => now()->addDays(2)->format('Y-m-d'),
        ]);
    }

    public function forPackage(Package $package): static
    {
        $durasiHari = $package->durasi_hari;
        $tanggalMulai = now()->addDays(7);
        $tanggalSelesai = $tanggalMulai->copy()->addDays($durasiHari - 1);

        $package->loadMissing(['days.costs', 'facilities']);

        $snapshot = [
            'nama' => $package->nama,
            'kode' => $package->kode,
            'slug' => $package->slug,
            'deskripsi' => $package->deskripsi,
            'kategori' => $package->kategori->value,
            'durasi_hari' => $package->durasi_hari,
            'durasi_malam' => $package->durasi_malam,
            'timezone' => $package->timezone,
            'days' => $package->days->map(fn ($day) => [
                'hari_ke' => $day->hari_ke,
                'judul' => $day->judul,
                'deskripsi' => $day->deskripsi,
                'jam_mulai' => $day->jam_mulai,
                'jam_selesai' => $day->jam_selesai,
                'lokasi' => $day->lokasi,
            ])->values()->all(),
            'facilities' => [
                'include' => $package->facilities
                    ->where('tipe', 'include')
                    ->pluck('nama')
                    ->values()
                    ->all(),
                'exclude' => $package->facilities
                    ->where('tipe', 'exclude')
                    ->pluck('nama')
                    ->values()
                    ->all(),
            ],
        ];

        return $this->state(fn (array $attributes) => [
            'package_id' => $package->id,
            'snapshot_package' => $snapshot,
            'tanggal_mulai' => $tanggalMulai->format('Y-m-d'),
            'tanggal_selesai' => $tanggalSelesai->format('Y-m-d'),
            'timezone' => $package->timezone,
        ]);
    }

    public function forBooking(Booking $booking): static
    {
        return $this->state(fn (array $attributes) => [
            'booking_id' => $booking->id,
            'package_id' => $booking->package_id,
            'jumlah_peserta' => $booking->jumlah_peserta,
        ]);
    }

    public function lengkap(): static
    {
        return $this->afterCreating(function (Trip $trip) {
            $durasiHari = $trip->snapshotDurasiHari();

            for ($i = 1; $i <= $durasiHari; $i++) {
                TripDay::factory()->create([
                    'trip_id' => $trip->id,
                    'hari_ke' => $i,
                    'tanggal' => $trip->tanggal_mulai->copy()->addDays($i - 1),
                ]);
            }

            TripMitra::factory()
                ->lead()
                ->forTrip($trip)
                ->create();

            TripMitra::factory()
                ->asisten()
                ->forTrip($trip)
                ->create();
        });
    }
}
