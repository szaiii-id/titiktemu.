<?php

namespace Database\Factories;

use App\Models\Package;
use App\Models\PackageDay;
use App\Models\PackageDayCost;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PackageDay>
 */
class PackageDayFactory extends Factory
{
    public function definition(): array
    {
        return [
            'package_id' => Package::factory(),
            'hari_ke' => 1,
            'judul' => fake()->sentence(4),
            'deskripsi' => fake()->paragraph(),
            'jam_mulai' => fake()->time('H:i:00', '08:00'),
            'jam_selesai' => fake()->time('H:i:00', '17:00'),
            'lokasi' => fake()->city(),
        ];
    }

    public function hariKe(int $n): static
    {
        return $this->state(fn (array $attributes) => [
            'hari_ke' => $n,
        ]);
    }

    public function tanpaJam(): static
    {
        return $this->state(fn (array $attributes) => [
            'jam_mulai' => null,
            'jam_selesai' => null,
        ]);
    }

    public function denganCosts(): static
    {
        return $this->afterCreating(function (PackageDay $day) {
            PackageDayCost::factory()
                ->count(fake()->numberBetween(2, 3))
                ->create(['package_day_id' => $day->id]);
        });
    }
}
