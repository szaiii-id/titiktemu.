<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CancelBookingRequest;
use App\Http\Requests\Admin\VerifyBookingPaymentRequest;
use App\Models\Booking;
use App\Services\Booking\BookingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class BookingController extends Controller
{
    public function __construct(
        protected BookingService $bookingService,
    ) {}

    /**
     * Daftar semua booking.
     *
     * Route: GET /admin/bookings
     */
    public function index(Request $request): InertiaResponse
    {
        $filters = [
            'search' => $request->input('search'),
            'status' => $request->input('status'),
            'package_id' => $request->input('package_id'),
            'tanggal_dari' => $request->input('tanggal_dari'),
            'tanggal_sampai' => $request->input('tanggal_sampai'),
            'sort' => $request->input('sort', 'created_at'),
            'direction' => $request->input('direction', 'desc'),
        ];

        $perPage = (int) $request->input('per_page', 15);
        $bookings = $this->bookingService->paginate($filters, $perPage);

        return Inertia::render('Admin/Bookings/Index', [
            'bookings' => $bookings,
            'filters' => $filters,
            'statusCounts' => $this->bookingService->countByStatus(),
        ]);
    }

    /**
     * Detail booking.
     *
     * Route: GET /admin/bookings/{booking}
     */
    public function show(Booking $booking): InertiaResponse
    {
        $booking->load([
            'package:id,nama,kode,slug,timezone,harga_per_orang,harga_per_rombongan,durasi_hari,durasi_malam,cover_image',
            'client:id,name,email,username',
            'participants',
            'payments.verifier:id,name,email',
        ]);

        return Inertia::render('Admin/Bookings/Show', [
            'booking' => $booking,
        ]);
    }

    /**
     * Verifikasi pembayaran.
     *
     * Route: POST /admin/bookings/{booking}/verify-payment
     *
     * ✅ Menggunakan VerifyBookingPaymentRequest (validasi terpusat)
     */
    public function verifyPayment(VerifyBookingPaymentRequest $request, Booking $booking): RedirectResponse
    {
        $this->bookingService->verifyPayment(
            booking: $booking,
            admin: $request->user(),
            catatan: $request->validated('catatan'),
        );

        return redirect()
            ->route('admin.bookings.show', $booking->id)
            ->with('status', 'Pembayaran berhasil diverifikasi.');
    }

    /**
     * Konfirmasi booking (setelah payment verified).
     *
     * Route: POST /admin/bookings/{booking}/confirm
     */
    public function confirm(Booking $booking): RedirectResponse
    {
        $this->bookingService->confirm($booking, auth()->user());

        return redirect()
            ->route('admin.bookings.show', $booking->id)
            ->with('status', 'Booking berhasil dikonfirmasi.');
    }

    /**
     * Cancel booking oleh admin.
     *
     * Route: POST /admin/bookings/{booking}/cancel
     *
     * ✅ Menggunakan CancelBookingRequest (validasi terpusat)
     */
    public function cancel(CancelBookingRequest $request, Booking $booking): RedirectResponse
    {
        $this->bookingService->cancelByAdmin($booking, $request->validated('alasan'));

        return redirect()
            ->route('admin.bookings.show', $booking->id)
            ->with('status', 'Booking berhasil dibatalkan.');
    }
}
