<?php

namespace Database\Factories;

use App\Enums\PackageFacilityTipe;
use App\Models\Package;
use App\Models\PackageFacility;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PackageFacility>
 */
class PackageFacilityFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'package_id' => Package::factory(),
            'tipe' => PackageFacilityTipe::INCLUDE->value,
            'nama' => fake()->randomElement([
                'Transportasi PP',
                'Pemandu Wisata',
                'Makan 3x',
                'Tiket Masuk Objek Wisata',
                'Asuransi Perjalanan',
                'Air Mineral',
                'Dokumentasi',
            ]),
            'urutan' => fake()->numberBetween(1, 10),
        ];
    }

    /**
     * State: tipe = include.
     */
    public function include(): static
    {
        return $this->state(fn (array $attributes) => [
            'tipe' => PackageFacilityTipe::INCLUDE->value,
            'nama' => fake()->randomElement([
                'Transportasi PP',
                'Pemandu Wisata',
                'Makan 3x',
                'Tiket Masuk',
                'Asuransi',
            ]),
        ]);
    }

    /**
     * State: tipe = exclude.
     */
    public function exclude(): static
    {
        return $this->state(fn (array $attributes) => [
            'tipe' => PackageFacilityTipe::EXCLUDE->value,
            'nama' => fake()->randomElement([
                'Tiket Pesawat',
                'Pengeluaran Pribadi',
                'Tipping Guide',
                'Laundry',
                'Minuman Beralkohol',
            ]),
        ]);
    }

    /**
     * State: urutan spesifik.
     */
    public function urutan(int $n): static
    {
        return $this->state(fn (array $attributes) => [
            'urutan' => $n,
        ]);
    }
}
