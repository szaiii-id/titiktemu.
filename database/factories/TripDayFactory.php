<?php

namespace Database\Factories;

use App\Models\Trip;
use App\Models\TripDay;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TripDay>
 */
class TripDayFactory extends Factory
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
            'hari_ke' => 1,
            'tanggal' => now()->format('Y-m-d'),
            'judul' => fake()->sentence(4),
            'deskripsi' => fake()->paragraph(),
            'status' => TripDay::STATUS_PENDING,
        ];
    }

    /**
     * State: hari ke-N dalam trip.
     */
    public function hariKe(int $n): static
    {
        return $this->state(fn (array $attributes) => [
            'hari_ke' => $n,
        ]);
    }

    /**
     * State: tanggal spesifik.
     */
    public function tanggal(string $tanggal): static
    {
        return $this->state(fn (array $attributes) => [
            'tanggal' => $tanggal,
        ]);
    }

    /**
     * State: status pending (belum dimulai).
     */
    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => TripDay::STATUS_PENDING,
        ]);
    }

    /**
     * State: status in_progress (sedang berjalan).
     */
    public function inProgress(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => TripDay::STATUS_IN_PROGRESS,
        ]);
    }

    /**
     * State: status completed (selesai).
     */
    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => TripDay::STATUS_COMPLETED,
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
}
