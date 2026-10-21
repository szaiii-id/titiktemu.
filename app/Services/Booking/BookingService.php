<?php

namespace App\Services\Booking;

use App\Enums\BookingStatus;
use App\Enums\PaymentMetode;
use App\Models\Booking;
use App\Models\BookingParticipant;
use App\Models\ETicket;
use App\Models\Package;
use App\Models\Payment;
use App\Models\User;
use App\Repositories\Contracts\BookingRepositoryInterface;
use App\Services\ETicket\ETicketService;
use App\Services\Notification\NotificationService;
use App\Services\Trip\TripService;
use App\Support\Timezone;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class BookingService
{
    public function __construct(
        protected BookingRepositoryInterface $bookingRepository,
        protected TripService $tripService,
        protected ETicketService $eTicketService,
        protected NotificationService $notificationService,
    ) {}

    // ==========================================
    // READ
    // ==========================================

    /**
     * @param  array<string, mixed>  $filters
     * @return LengthAwarePaginator<int, Booking>
     */
    public function paginate(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        return $this->bookingRepository->paginate($filters, $perPage);
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return LengthAwarePaginator<int, Booking>
     */
    public function paginateForClient(User $client, array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        return $this->bookingRepository->paginateForClient($client, $filters, $perPage);
    }

    public function findDetail(int $id): Booking
    {
        $booking = $this->bookingRepository->findById($id);

        if (! $booking) {
            throw ValidationException::withMessages([
                'booking' => ['Booking tidak ditemukan.'],
            ]);
        }

        return $booking;
    }

    /** @return array<string, int> */
    public function countByStatus(): array
    {
        return $this->bookingRepository->countByStatus();
    }

    /** @return array<string, int> */
    public function countByStatusForClient(User $client): array
    {
        return $this->bookingRepository->countByStatusForClient($client);
    }

    public function getETicketForBooking(Booking $booking): ?ETicket
    {
        return ETicket::where('booking_id', $booking->id)->first();
    }

    // ==========================================
    // CREATE
    // ==========================================

    /** @param array<string, mixed> $data */
    public function create(Package $package, User $client, array $data): Booking
    {
        $this->validateBooking($package, $data);

        return DB::transaction(function () use ($package, $client, $data) {
            $totalHarga = $this->calculateTotalHarga($package, (int) $data['jumlah_peserta']);
            $kode = $this->bookingRepository->generateKode((int) now()->year);
            $expiredAt = now()->addHours(24);

            $booking = $this->bookingRepository->create([
                'kode' => $kode,
                'package_id' => $package->id,
                'user_id' => $client->id,
                'tanggal_keberangkatan' => $data['tanggal_keberangkatan'],
                'jumlah_peserta' => $data['jumlah_peserta'],
                'total_harga' => $totalHarga,
                'status' => BookingStatus::PENDING_PAYMENT->value,
                'expired_at' => $expiredAt,
                'catatan' => $data['catatan'] ?? null,
            ]);

            foreach ($data['participants'] as $participantData) {
                BookingParticipant::create([
                    'booking_id' => $booking->id,
                    'nama' => $participantData['nama'],
                    'umur' => $participantData['umur'] ?? null,
                    'no_hp' => $participantData['no_hp'] ?? null,
                    'catatan' => $participantData['catatan'] ?? null,
                ]);
            }

            Log::info('Booking baru dibuat', [
                'booking_id' => $booking->id,
                'kode' => $booking->kode,
                'package_id' => $package->id,
                'client_id' => $client->id,
                'total_harga' => $totalHarga,
            ]);

            return $booking->load(['package', 'participants']);
        });
    }

    // ==========================================
    // CLIENT ACTIONS
    // ==========================================

    /** @param array<string, mixed> $data */
    public function uploadPayment(Booking $booking, array $data): Payment
    {
        if ($booking->status !== BookingStatus::PENDING_PAYMENT) {
            throw ValidationException::withMessages([
                'status' => ['Booking sudah tidak bisa upload bukti transfer.'],
            ]);
        }

        return DB::transaction(function () use ($booking, $data) {
            $payment = Payment::updateOrCreate(
                ['booking_id' => $booking->id],
                [
                    'jumlah' => $data['jumlah'] ?? $booking->total_harga,
                    'metode' => $data['metode'] ?? PaymentMetode::TRANSFER_BANK->value,
                    'bank_pengirim' => $data['bank_pengirim'] ?? null,
                    'nama_pengirim' => $data['nama_pengirim'] ?? null,
                    'bukti_transfer' => $data['bukti_transfer'] ?? null,
                    'catatan' => $data['catatan'] ?? null,
                ]
            );

            Log::info('Payment diupload client', [
                'booking_id' => $booking->id,
                'payment_id' => $payment->id,
                'kode' => $booking->kode,
            ]);

            return $payment;
        });
    }

    public function cancelByClient(Booking $booking): Booking
    {
        if (! $booking->canBeCancelledByClient()) {
            throw ValidationException::withMessages([
                'status' => ['Booking sudah tidak bisa dibatalkan. Hubungi admin untuk pembatalan.'],
            ]);
        }

        return $this->cancel($booking, 'Dibatalkan oleh client');
    }

    // ==========================================
    // ADMIN ACTIONS
    // ==========================================

    public function verifyPayment(Booking $booking, User $admin, ?string $catatan = null): Booking
    {
        if ($booking->status !== BookingStatus::PENDING_PAYMENT) {
            throw ValidationException::withMessages([
                'status' => ['Booking ini tidak dalam status menunggu pembayaran.'],
            ]);
        }

        return DB::transaction(function () use ($booking, $admin, $catatan) {
            $payment = $booking->payments()->first();

            if ($payment) {
                $payment->update([
                    'verified_by' => $admin->id,
                    'verified_at' => now(),
                    'catatan' => $catatan ?? $payment->catatan,
                ]);
            } else {
                Payment::create([
                    'booking_id' => $booking->id,
                    'jumlah' => $booking->total_harga,
                    'metode' => PaymentMetode::TRANSFER_BANK->value,
                    'verified_by' => $admin->id,
                    'verified_at' => now(),
                    'catatan' => $catatan ?? 'Diverifikasi manual oleh admin.',
                ]);
            }

            $booking = $this->bookingRepository->update($booking, [
                'status' => BookingStatus::PAYMENT_VERIFIED->value,
                'expired_at' => null,
            ]);

            Log::info('Pembayaran diverifikasi admin', [
                'booking_id' => $booking->id,
                'kode' => $booking->kode,
                'admin_id' => $admin->id,
            ]);

            return $booking->load('payments.verifier');
        });
    }

    public function confirm(Booking $booking, User $admin): Booking
    {
        if ($booking->status !== BookingStatus::PAYMENT_VERIFIED) {
            throw ValidationException::withMessages([
                'status' => ['Booking harus dalam status "Pembayaran Diverifikasi" sebelum dikonfirmasi.'],
            ]);
        }

        return DB::transaction(function () use ($booking, $admin) {
            $booking = $this->bookingRepository->update($booking, [
                'status' => BookingStatus::CONFIRMED->value,
            ]);

            Log::info('Booking dikonfirmasi admin', [
                'booking_id' => $booking->id,
                'kode' => $booking->kode,
                'admin_id' => $admin->id,
            ]);

            $trip = $this->tripService->createFromBooking($booking);

            Log::info('Trip auto-created dari booking confirm', [
                'booking_id' => $booking->id,
                'booking_kode' => $booking->kode,
                'trip_id' => $trip->id,
                'trip_kode' => $trip->kode,
            ]);

            $ticket = null;
            try {
                $ticket = $this->eTicketService->generateForTrip($trip);
            } catch (\Throwable $e) {
                Log::error('Gagal generate e-ticket', [
                    'trip_id' => $trip->id,
                    'booking_id' => $booking->id,
                    'error' => $e->getMessage(),
                ]);
            }

            if ($booking->client) {
                try {
                    $this->notificationService->create(
                        $booking->client,
                        'booking_confirmed',
                        'Booking Dikonfirmasi',
                        "Booking {$booking->kode} sudah dikonfirmasi. E-ticket siap diunduh.",
                        [
                            'booking_id' => $booking->id,
                            'booking_kode' => $booking->kode,
                            'trip_id' => $trip->id,
                            'ticket_uuid' => $ticket?->uuid,
                        ],
                    );
                } catch (\Throwable $e) {
                    Log::error('Gagal kirim notifikasi booking confirm', [
                        'booking_id' => $booking->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            return $booking->load('payments.verifier');
        });
    }

    public function cancelByAdmin(Booking $booking, string $alasan): Booking
    {
        if ($booking->status === BookingStatus::COMPLETED) {
            throw ValidationException::withMessages([
                'status' => ['Booking yang sudah selesai tidak bisa dibatalkan.'],
            ]);
        }

        if ($booking->status === BookingStatus::CANCELLED) {
            throw ValidationException::withMessages([
                'status' => ['Booking sudah dibatalkan.'],
            ]);
        }

        return DB::transaction(function () use ($booking, $alasan) {
            $trip = $this->tripService->findByBookingId($booking->id);

            if ($trip && $trip->canBeCancelled()) {
                $this->tripService->cancel($trip, "Booking dibatalkan: {$alasan}");

                Log::info('Trip di-cancel karena booking dibatalkan', [
                    'booking_id' => $booking->id,
                    'booking_kode' => $booking->kode,
                    'trip_id' => $trip->id,
                    'trip_kode' => $trip->kode,
                ]);
            }

            return $this->cancel($booking, $alasan);
        });
    }

    // ==========================================
    // SCHEDULER
    // ==========================================

    public function expirePendingBookings(): int
    {
        $expired = $this->bookingRepository->findExpired();
        $count = 0;

        foreach ($expired as $booking) {
            try {
                $this->cancel($booking, 'Auto-cancel: pembayaran melebihi 24 jam');
                $count++;
            } catch (\Throwable $e) {
                Log::error('Gagal auto-cancel booking', [
                    'booking_id' => $booking->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        if ($count > 0) {
            Log::info("Auto-cancel: {$count} booking expired.");
        }

        return $count;
    }

    // ==========================================
    // HELPERS
    // ==========================================

    protected function calculateTotalHarga(Package $package, int $jumlahPeserta): float
    {
        if ($package->harga_per_rombongan !== null && (float) $package->harga_per_rombongan > 0) {
            return (float) $package->harga_per_rombongan;
        }

        return (float) $package->harga_per_orang * $jumlahPeserta;
    }

    protected function cancel(Booking $booking, string $alasan): Booking
    {
        return DB::transaction(function () use ($booking, $alasan) {
            $booking = $this->bookingRepository->update($booking, [
                'status' => BookingStatus::CANCELLED->value,
                'catatan' => $this->mergeCatatan($booking->catatan, $alasan),
            ]);

            Log::warning('Booking dibatalkan', [
                'booking_id' => $booking->id,
                'kode' => $booking->kode,
                'alasan' => $alasan,
            ]);

            return $booking;
        });
    }

    protected function mergeCatatan(?string $existing, string $new): string
    {
        $timestamp = now()->format('Y-m-d H:i');
        $line = "[{$timestamp}] {$new}";

        return $existing ? "{$existing}\n{$line}" : $line;
    }

    /** @param array<string, mixed> $data */
    protected function validateBooking(Package $package, array $data): void
    {
        if (! $package->isAktif()) {
            throw ValidationException::withMessages([
                'package' => ['Paket ini sedang tidak tersedia untuk dipesan.'],
            ]);
        }

        $jumlahPeserta = (int) ($data['jumlah_peserta'] ?? 0);
        if ($jumlahPeserta < $package->min_peserta) {
            throw ValidationException::withMessages([
                'jumlah_peserta' => ["Jumlah peserta minimal {$package->min_peserta} orang."],
            ]);
        }
        if ($jumlahPeserta > $package->max_peserta) {
            throw ValidationException::withMessages([
                'jumlah_peserta' => ["Jumlah peserta maksimal {$package->max_peserta} orang."],
            ]);
        }

        $tanggalBerangkat = $data['tanggal_keberangkatan'] ?? null;
        if ($tanggalBerangkat) {
            $this->validateTanggalKeberangkatan($package, (string) $tanggalBerangkat);
        }

        $participants = $data['participants'] ?? [];
        if (count($participants) < $jumlahPeserta) {
            throw ValidationException::withMessages([
                'participants' => [
                    "Data peserta kurang. Anda mengisi {$jumlahPeserta} peserta, ".
                    'tapi hanya mengisi '.count($participants).' data.',
                ],
            ]);
        }
    }

    protected function validateTanggalKeberangkatan(Package $package, string $tanggal): void
    {
        $today = Timezone::today($package->timezone);
        $minDate = $today->addDays(3);
        $tanggalCarbon = CarbonImmutable::parse($tanggal, $package->timezone);

        if ($tanggalCarbon->lessThan($minDate)) {
            throw ValidationException::withMessages([
                'tanggal_keberangkatan' => [
                    'Tanggal keberangkatan minimal H+3 dari hari ini. '.
                    "Tanggal paling awal: {$minDate->format('d M Y')}.",
                ],
            ]);
        }
    }
}
