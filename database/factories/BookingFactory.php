<?php

namespace Database\Factories;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\BookingParticipant;
use App\Models\Package;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Booking>
 */
class BookingFactory extends Factory
{
    public function definition(): array
    {
        $jumlahPeserta = fake()->numberBetween(1, 10);

        return [
            'kode' => 'BKG-'.now()->year.'-'.str_pad(
                (string) fake()->unique()->numberBetween(1, 9999),
                3,
                '0',
                STR_PAD_LEFT
            ),
            'package_id' => Package::factory()->aktif(),
            'user_id' => User::factory()->client(),
            'tanggal_keberangkatan' => now()->addDays(fake()->numberBetween(3, 30))->format('Y-m-d'),
            'jumlah_peserta' => $jumlahPeserta,
            'total_harga' => 850000 * $jumlahPeserta,
            'status' => BookingStatus::PENDING_PAYMENT->value,
            'expired_at' => now()->addHours(24),
            'catatan' => null,
        ];
    }

    public function pendingPayment(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => BookingStatus::PENDING_PAYMENT->value,
            'expired_at' => now()->addHours(24),
        ]);
    }

    public function expired(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => BookingStatus::PENDING_PAYMENT->value,
            'expired_at' => now()->subHours(2),
        ]);
    }

    public function paymentVerified(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => BookingStatus::PAYMENT_VERIFIED->value,
            'expired_at' => null,
        ]);
    }

    public function confirmed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => BookingStatus::CONFIRMED->value,
            'expired_at' => null,
        ]);
    }

    public function inProgress(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => BookingStatus::IN_PROGRESS->value,
            'expired_at' => null,
        ]);
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => BookingStatus::COMPLETED->value,
            'expired_at' => null,
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => BookingStatus::CANCELLED->value,
            'expired_at' => null,
        ]);
    }

    public function forPackage(Package $package): static
    {
        return $this->state(fn (array $attributes) => [
            'package_id' => $package->id,
        ]);
    }

    public function forClient(User $client): static
    {
        return $this->state(fn (array $attributes) => [
            'user_id' => $client->id,
        ]);
    }

    public function withPeserta(int $jumlah): static
    {
        return $this->state(fn (array $attributes) => [
            'jumlah_peserta' => $jumlah,
            'total_harga' => 850000 * $jumlah,
        ]);
    }

    public function lengkap(): static
    {
        return $this->afterCreating(function (Booking $booking) {
            BookingParticipant::factory()
                ->count($booking->jumlah_peserta)
                ->create(['booking_id' => $booking->id]);
        });
    }
}
