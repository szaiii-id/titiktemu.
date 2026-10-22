<?php

namespace Database\Factories;

use App\Enums\PaymentMetode;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Payment>
 */
class PaymentFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'booking_id' => Booking::factory()->pendingPayment(),
            'jumlah' => fake()->numberBetween(300_000, 5_000_000),
            'metode' => PaymentMetode::TRANSFER_BANK->value,
            'bank_pengirim' => fake()->randomElement(['BCA', 'Mandiri', 'BRI', 'BNI']),
            'nama_pengirim' => fake()->name(),
            'bukti_transfer' => null,
            'verified_by' => null,
            'verified_at' => null,
            'catatan' => null,
        ];
    }

    public function verified(?User $admin = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'verified_by' => $admin !== null
                ? $admin->id
                : User::factory()->admin(),
            'verified_at' => now(),
        ]);
    }

    public function denganBukti(): static
    {
        return $this->state(fn (array $attributes): array => [
            'bukti_transfer' => 'payment-proofs/'.fake()->uuid().'.jpg',
        ]);
    }
}
