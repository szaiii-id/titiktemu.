<?php

namespace Database\Factories;

use App\Models\Booking;
use App\Models\BookingParticipant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BookingParticipant>
 */
class BookingParticipantFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'booking_id' => Booking::factory(),
            'nama' => fake()->name(),
            'umur' => fake()->numberBetween(5, 70),
            'no_hp' => '08'.fake()->numerify('##########'),
            'catatan' => null,
        ];
    }

    /**
     * State: peserta dengan catatan khusus (alergi, permintaan khusus, dll).
     *
     * Contoh:
     *   BookingParticipant::factory()->denganCatatan('Alergi seafood')->create();
     */
    public function denganCatatan(string $catatan = 'Alergi seafood'): static
    {
        return $this->state(fn (array $attributes) => [
            'catatan' => $catatan,
        ]);
    }

    /**
     * State: peserta tanpa umur (client tidak tahu umur).
     */
    public function tanpaUmur(): static
    {
        return $this->state(fn (array $attributes) => [
            'umur' => null,
        ]);
    }

    /**
     * State: peserta tanpa no_hp.
     */
    public function tanpaNoHp(): static
    {
        return $this->state(fn (array $attributes) => [
            'no_hp' => null,
        ]);
    }

    /**
     * State: peserta anak-anak (umur < 12).
     */
    public function anak(): static
    {
        return $this->state(fn (array $attributes) => [
            'umur' => fake()->numberBetween(2, 11),
        ]);
    }

    /**
     * State: peserta dewasa (umur 18-60).
     */
    public function dewasa(): static
    {
        return $this->state(fn (array $attributes) => [
            'umur' => fake()->numberBetween(18, 60),
        ]);
    }

    /**
     * State: peserta lansia (umur > 60).
     */
    public function lansia(): static
    {
        return $this->state(fn (array $attributes) => [
            'umur' => fake()->numberBetween(61, 90),
        ]);
    }
}
