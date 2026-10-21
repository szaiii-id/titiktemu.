<?php

namespace Database\Factories;

use App\Models\DailyReport;
use App\Models\DailyReportMedia;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DailyReportMedia>
 */
class DailyReportMediaFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'daily_report_id' => DailyReport::factory(),
            'path' => 'daily-reports/'.fake()->uuid().'.jpg',
            'urutan' => fake()->numberBetween(1, 2),
        ];
    }

    /**
     * State: urutan spesifik.
     */
    public function urutan(int $n): static
    {
        return $this->state(fn (array $attributes) => [
            'urutan' => $n,
        ]);
    }
}
