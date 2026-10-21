<?php

namespace Database\Factories;

use App\Enums\TripMitraRole;
use App\Models\Trip;
use App\Models\TripMitra;
use App\Models\User;
use App\Support\TripHonorTipe;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TripMitra>
 */
class TripMitraFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'trip_id' => Trip::factory(),
            'mitra_id' => User::factory()->mitra(),
            'role' => TripMitraRole::LEAD->value,
            'honor' => fake()->numberBetween(300_000, 1_000_000),
            'honor_tipe' => TripHonorTipe::FLAT,
            'instruksi' => null,
            'assigned_by' => User::factory()->admin(),
            'assigned_at' => now(),
        ];
    }

    /**
     * State: mitra sebagai lead.
     */
    public function lead(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => TripMitraRole::LEAD->value,
            'honor' => fake()->numberBetween(500_000, 1_000_000),
        ]);
    }

    /**
     * State: mitra sebagai asisten.
     */
    public function asisten(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => TripMitraRole::ASISTEN->value,
            'honor' => fake()->numberBetween(200_000, 500_000),
        ]);
    }

    /**
     * State: honor tipe flat.
     */
    public function honorFlat(float $honor = 500_000): static
    {
        return $this->state(fn (array $attributes) => [
            'honor' => $honor,
            'honor_tipe' => TripHonorTipe::FLAT,
        ]);
    }

    /**
     * State: honor tipe per_hari.
     */
    public function honorPerHari(float $honorPerHari = 250_000): static
    {
        return $this->state(fn (array $attributes) => [
            'honor' => $honorPerHari,
            'honor_tipe' => TripHonorTipe::PER_HARI,
        ]);
    }

    /**
     * State: untuk trip tertentu.
     */
    public function forTrip(Trip $trip): static
    {
        return $this->state(fn (array $attributes) => [
            'trip_id' => $trip->id,
        ]);
    }

    /**
     * State: untuk mitra tertentu.
     */
    public function forMitra(User $mitra): static
    {
        return $this->state(fn (array $attributes) => [
            'mitra_id' => $mitra->id,
        ]);
    }
}
