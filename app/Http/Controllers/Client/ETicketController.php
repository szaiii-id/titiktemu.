<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Services\ETicket\ETicketService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ETicketController extends Controller
{
    public function __construct(protected ETicketService $eTicketService) {}

    public function download(Request $request, string $uuid): BinaryFileResponse
    {
        $ticket = $this->eTicketService->findByUuid($uuid);

        // abort_unless membutuhkan bool — pakai perbandingan eksplisit
        // agar PHPStan tidak komplain (ETicket|null → bool).
        abort_if($ticket === null, 404);

        // Setelah abort_if, PHPStan yakin $ticket bukan null.
        abort_unless(
            $ticket->booking !== null
            && $ticket->booking->user_id === $request->user()?->id,
            403,
        );

        // pdf_path dijamin string (NOT NULL di DB, non-nullable di docblock
        // model ETicket). Pengecekan null tidak perlu.

        $path = Storage::disk('public')->path($ticket->pdf_path);
        abort_unless(file_exists($path), 404);

        abort_if($ticket->trip === null, 404);

        return response()->download($path, "e-ticket-{$ticket->trip->kode}.pdf");
    }
}
