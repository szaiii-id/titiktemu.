<?php

namespace Database\Factories;

use App\Models\DailyReport;
use App\Models\DailyReportMedia;
use App\Models\TripDay;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DailyReport>
 */
class DailyReportFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'trip_day_id' => TripDay::factory(),
            'mitra_id' => User::factory()->mitra(),
            'catatan' => fake()->optional(0.7)->sentence(),
            'status' => DailyReport::STATUS_SUBMITTED,
            'submitted_at' => now(),
            'verified_by' => null,
            'verified_at' => null,
            'rejection_reason' => null,
        ];
    }

    /**
     * State: report status submitted (default).
     */
    public function submitted(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => DailyReport::STATUS_SUBMITTED,
            'submitted_at' => now(),
            'verified_by' => null,
            'verified_at' => null,
            'rejection_reason' => null,
        ]);
    }

    /**
     * State: report status verified.
     */
    public function verified(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => DailyReport::STATUS_VERIFIED,
            'submitted_at' => now()->subHours(2),
            'verified_by' => User::factory()->admin(),
            'verified_at' => now(),
            'rejection_reason' => null,
        ]);
    }

    /**
     * State: report status rejected.
     */
    public function rejected(string $reason = 'Foto kurang jelas, mohon upload ulang.'): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => DailyReport::STATUS_REJECTED,
            'submitted_at' => now()->subHours(2),
            'verified_by' => User::factory()->admin(),
            'verified_at' => now(),
            'rejection_reason' => $reason,
        ]);
    }

    /**
     * State: report untuk trip_day tertentu.
     */
    public function forTripDay(TripDay $tripDay): static
    {
        return $this->state(fn (array $attributes) => [
            'trip_day_id' => $tripDay->id,
        ]);
    }

    /**
     * State: report dari mitra tertentu.
     */
    public function forMitra(User $mitra): static
    {
        return $this->state(fn (array $attributes) => [
            'mitra_id' => $mitra->id,
        ]);
    }

    /**
     * State: report lengkap dengan 2 media.
     *
     * Catatan: pakai `create(['daily_report_id' => ...])` karena
     * `->for($report)` konflik dengan parent Factory::for() di Svelte/PHP.
     */
    public function lengkap(): static
    {
        return $this->afterCreating(function (DailyReport $report) {
            DailyReportMedia::factory()
                ->count(2)
                ->create(['daily_report_id' => $report->id]);
        });
    }
}
