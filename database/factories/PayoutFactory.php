<?php

namespace Database\Factories;

use App\Enums\PayoutStatus;
use App\Models\Payout;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Payout> */
class PayoutFactory extends Factory
{
    public function definition(): array
    {
        return [
            'kode' => 'PAY-'.now()->year.'-'.str_pad(
                (string) fake()->unique()->numberBetween(1, 9999), 3, '0', STR_PAD_LEFT
            ),
            'mitra_id' => User::factory()->mitra(),
            'jumlah' => fake()->numberBetween(100_000, 5_000_000),
            'bank_tujuan' => 'BCA',
            'no_rekening' => '1234567890',
            'nama_pemilik' => fake()->name(),
            'status' => PayoutStatus::PENDING->value,
            'requested_at' => now(),
        ];
    }

    public function approved(): static
    {
        return $this->state(fn () => [
            'status' => PayoutStatus::APPROVED->value,
            'reviewed_by' => User::factory()->admin(),
            'reviewed_at' => now(),
        ]);
    }

    public function paid(): static
    {
        return $this->state(fn () => [
            'status' => PayoutStatus::PAID->value,
            'reviewed_by' => User::factory()->admin(),
            'reviewed_at' => now()->subHour(),
            'paid_at' => now(),
        ]);
    }

    public function rejected(string $reason = 'Data rekening tidak valid'): static
    {
        return $this->state(fn () => [
            'status' => PayoutStatus::REJECTED->value,
            'reviewed_by' => User::factory()->admin(),
            'reviewed_at' => now(),
            'rejection_reason' => $reason,
        ]);
    }
}
