<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * Password default yang di-cache agar tidak di-hash berulang kali.
     */
    protected static ?string $password = null;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'username' => fake()->unique()->userName(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'google_id' => null,
            'role' => 'client',
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * State: user belum verifikasi email.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    /**
     * State: user dengan role admin.
     */
    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'admin',
        ]);
    }

    /**
     * State: user dengan role mitra.
     */
    public function mitra(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'mitra',
        ]);
    }

    /**
     * State: user dengan role client.
     */
    public function client(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'client',
        ]);
    }

    /**
     * State: user yang login via Google (tanpa password).
     */
    public function googleUser(): static
    {
        return $this->state(fn (array $attributes) => [
            'google_id' => fake()->unique()->numerify('####################'),
            'password' => null,
        ]);
    }
}