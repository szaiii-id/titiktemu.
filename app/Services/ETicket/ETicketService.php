<?php

namespace App\Services\ETicket;

use App\Models\ETicket;
use App\Models\Trip;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class ETicketService
{
    public function generateForTrip(Trip $trip): ETicket
    {
        $trip->loadMissing(['booking.client', 'package', 'booking.participants']);

        $uuid = (string) Str::uuid();
        $qrUrl = url("/e-tickets/{$uuid}");

        // Generate QR code PNG.
        // Stub PHPStan menganggap QrCode::generate() return HtmlString|string,
        // padahal untuk format 'png' hasilnya SELALU binary string.
        // Type assertion @var string di sini aman & menghilangkan error class.notFound.
        /** @var string $qrContent */
        $qrContent = QrCode::format('png')->size(300)->generate($qrUrl);

        $qrPath = "e-tickets/qr-{$uuid}.png";
        Storage::disk('public')->put($qrPath, $qrContent);

        // Generate PDF
        $pdfPath = "e-tickets/ticket-{$uuid}.pdf";
        $pdf = Pdf::loadView('pdf.e-ticket', [
            'trip' => $trip,
            'booking' => $trip->booking,
            'qrPath' => Storage::disk('public')->path($qrPath),
            'qrContent' => $qrContent,
            'uuid' => $uuid,
        ])->setPaper('a4');

        Storage::disk('public')->put($pdfPath, $pdf->output());

        $ticket = ETicket::updateOrCreate(
            ['booking_id' => $trip->booking_id],
            [
                'uuid' => $uuid,
                'trip_id' => $trip->id,
                'qr_code' => $qrPath,
                'pdf_path' => $pdfPath,
                'generated_at' => now(),
            ]
        );

        Log::info('E-ticket generated', [
            'ticket_id' => $ticket->id,
            'trip_id' => $trip->id,
            'booking_id' => $trip->booking_id,
        ]);

        return $ticket;
    }

    public function findByUuid(string $uuid): ?ETicket
    {
        return ETicket::where('uuid', $uuid)
            ->with(['trip.package', 'booking.client', 'booking.participants'])
            ->first();
    }
}
