<?php

namespace Database\Factories;

use App\Models\Booking;
use App\Models\ETicket;
use App\Models\Trip;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ETicket>
 */
class ETicketFactory extends Factory
{
    protected $model = ETicket::class;

    public function definition(): array
    {
        $uuid = (string) Str::uuid();

        return [
            'uuid' => $uuid,
            'booking_id' => Booking::factory(),
            'trip_id' => Trip::factory(),
            'qr_code' => "e-tickets/qr-{$uuid}.png",
            'pdf_path' => "e-tickets/ticket-{$uuid}.pdf",
            'generated_at' => now(),
        ];
    }
}
