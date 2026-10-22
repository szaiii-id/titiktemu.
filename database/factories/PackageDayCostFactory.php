<?php

namespace Database\Factories;

use App\Enums\PackageDayCostKategori;
use App\Enums\PackageDayCostSatuan;
use App\Models\PackageDay;
use App\Models\PackageDayCost;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PackageDayCost>
 */
class PackageDayCostFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'package_day_id' => PackageDay::factory(),
            'nama_biaya' => fake()->randomElement([
                'Sewa Kelotok',
                'Tiket Masuk',
                'Makan Siang',
                'Makan Malam',
                'Sewa Bus',
                'Homestay',
                'Guide Fee',
                'Snack',
                'Air Mineral',
            ]),
            'kategori' => fake()->randomElement(PackageDayCostKategori::values()),
            'jumlah' => fake()->numberBetween(50_000, 1_500_000),
            'satuan' => fake()->randomElement(PackageDayCostSatuan::values()),
            'catatan' => fake()->optional(0.3)->sentence(),
        ];
    }

    /**
     * State: satuan = total.
     */
    public function satuanTotal(): static
    {
        return $this->state(fn (array $attributes) => [
            'satuan' => PackageDayCostSatuan::TOTAL->value,
        ]);
    }

    /**
     * State: satuan = per_orang.
     */
    public function satuanPerOrang(): static
    {
        return $this->state(fn (array $attributes) => [
            'satuan' => PackageDayCostSatuan::PER_ORANG->value,
        ]);
    }

    /**
     * State: satuan = per_hari.
     */
    public function satuanPerHari(): static
    {
        return $this->state(fn (array $attributes) => [
            'satuan' => PackageDayCostSatuan::PER_HARI->value,
        ]);
    }

    /**
     * State: kategori tertentu.
     */
    public function kategori(PackageDayCostKategori $kategori): static
    {
        return $this->state(fn (array $attributes) => [
            'kategori' => $kategori->value,
        ]);
    }

    /**
     * State: biaya dengan jumlah spesifik.
     */
    public function jumlah(float $jumlah): static
    {
        return $this->state(fn (array $attributes) => [
            'jumlah' => $jumlah,
        ]);
    }
}
