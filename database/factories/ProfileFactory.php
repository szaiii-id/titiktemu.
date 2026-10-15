<?php

namespace Database\Factories;

use App\Models\Profile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Profile>
 */
class ProfileFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'tipe' => 'mitra',  // default; bisa di-override
            'nama_penyedia_usaha' => fake()->company(),
            'nomor_identitas' => fake()->numerify('################'),
            'alamat' => fake()->address(),
            'telepon' => fake()->phoneNumber(),
            // ✅ FIX PHPStan: `Faker\Generator::state()` TIDAK ADA.
            // Gunakan `fake()->state()` (nama provinsi/negara bagian)
            // atau `fake()->city()` (fallback aman).
            'provinsi' => fake()->city(),
            'kota' => fake()->city(),
            'kode_pos' => fake()->postcode(),
            'logo' => null,
            'deskripsi' => fake()->sentence(),
            'meta' => [],
        ];
    }

    /*
    |----------------------------------------------------------------------
    | Factory States
    |----------------------------------------------------------------------
    */

    public function forAdmin(): static
    {
        return $this->state(fn () => ['tipe' => 'admin']);
    }

    public function forMitra(): static
    {
        return $this->state(fn () => ['tipe' => 'mitra']);
    }

    public function forClient(): static
    {
        return $this->state(fn () => ['tipe' => 'client']);
    }
}
