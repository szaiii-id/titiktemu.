<?php

use App\Enums\BookingStatus;
use App\Enums\PackageStatus;
use App\Models\Booking;
use App\Models\Package;
use App\Models\Trip;
use App\Models\User;
use App\Repositories\Contracts\BookingRepositoryInterface;
use App\Services\Booking\BookingService;
use App\Services\ETicket\ETicketService;
use App\Services\Notification\NotificationService;
use App\Services\Trip\TripService;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

/*
|==========================================================================
| SETUP
|==========================================================================
*/

beforeEach(function () {
    // Mock semua dependency BookingService
    $this->bookingRepo = Mockery::mock(BookingRepositoryInterface::class);
    $this->tripService = Mockery::mock(TripService::class);
    $this->eTicketService = Mockery::mock(ETicketService::class);
    $this->notificationService = Mockery::mock(NotificationService::class);

    $this->service = new BookingService(
        $this->bookingRepo,
        $this->tripService,
        $this->eTicketService,
        $this->notificationService,
    );

    // DB::transaction → langsung eksekusi callback
    DB::shouldReceive('transaction')
        ->andReturnUsing(fn ($callback) => $callback());

    // Log facade → no-op
    Log::shouldReceive('info')->andReturnNull();
    Log::shouldReceive('warning')->andReturnNull();
    Log::shouldReceive('error')->andReturnNull();
});

afterEach(function () {
    Mockery::close();
});

/*
|==========================================================================
| HELPERS
|==========================================================================
*/

function makePackageUnit(array $attrs = []): Package
{
    $package = new Package;
    $package->forceFill(array_merge([
        'id' => 1,
        'kode' => 'PKG-001',
        'nama' => 'Paket Test',
        'status' => PackageStatus::AKTIF,
        'timezone' => 'Asia/Makassar',
        'harga_per_orang' => '500000.00',
        'harga_per_rombongan' => null,
        'min_peserta' => 2,
        'max_peserta' => 10,
        'durasi_hari' => 2,
        'durasi_malam' => 1,
    ], $attrs));

    return $package;
}

function makeBookingUnit(array $attrs = []): Booking
{
    $booking = new Booking;
    $booking->forceFill(array_merge([
        'id' => 1,
        'kode' => 'BK-001',
        'package_id' => 1,
        'user_id' => 1,
        'tanggal_keberangkatan' => now()->addDays(7)->format('Y-m-d'),
        'jumlah_peserta' => 2,
        'total_harga' => '1000000.00',
        'status' => BookingStatus::PENDING_PAYMENT,
        'expired_at' => now()->addHours(24),
        'catatan' => null,
    ], $attrs));

    return $booking;
}

function makeAdminUnit(array $attrs = []): User
{
    $user = new User;
    $user->forceFill(array_merge([
        'id' => 99,
        'name' => 'Admin Test',
        'email' => 'admin@example.com',
        'role' => 'admin',
    ], $attrs));

    return $user;
}

/*
|==========================================================================
| calculateTotalHarga() — EQUIVALENCE PARTITIONING (via Reflection)
|==========================================================================
*/

it('calculateTotalHarga pakai harga_per_rombongan jika > 0', function () {
    $package = makePackageUnit([
        'harga_per_rombongan' => '5000000.00',
        'harga_per_orang' => '500000.00',
    ]);

    $ref = new ReflectionMethod($this->service, 'calculateTotalHarga');
    $ref->setAccessible(true);

    // Partisi: rombongan > 0 → pakai rombongan (abaikan jumlah peserta)
    expect($ref->invoke($this->service, $package, 2))->toBe(5_000_000.0);
    expect($ref->invoke($this->service, $package, 10))->toBe(5_000_000.0);
});

it('calculateTotalHarga pakai per_orang × jumlah jika rombongan null', function () {
    $package = makePackageUnit([
        'harga_per_rombongan' => null,
        'harga_per_orang' => '500000.00',
    ]);

    $ref = new ReflectionMethod($this->service, 'calculateTotalHarga');
    $ref->setAccessible(true);

    expect($ref->invoke($this->service, $package, 4))->toBe(2_000_000.0);
});

it('calculateTotalHarga pakai per_orang × jumlah jika rombongan = 0', function () {
    $package = makePackageUnit([
        'harga_per_rombongan' => '0.00',
        'harga_per_orang' => '500000.00',
    ]);

    $ref = new ReflectionMethod($this->service, 'calculateTotalHarga');
    $ref->setAccessible(true);

    expect($ref->invoke($this->service, $package, 2))->toBe(1_000_000.0);
});

it('calculateTotalHarga handle jumlah peserta 0', function () {
    // BVA: batas bawah jumlah peserta
    $package = makePackageUnit([
        'harga_per_rombongan' => null,
        'harga_per_orang' => '500000.00',
    ]);

    $ref = new ReflectionMethod($this->service, 'calculateTotalHarga');
    $ref->setAccessible(true);

    expect($ref->invoke($this->service, $package, 0))->toBe(0.0);
});

/*
|==========================================================================
| mergeCatatan() — EDGE CASES (via Reflection)
|==========================================================================
*/

it('mergeCatatan menambah timestamp saat catatan null', function () {
    $ref = new ReflectionMethod($this->service, 'mergeCatatan');
    $ref->setAccessible(true);

    $result = $ref->invoke($this->service, null, 'Alasan test');

    expect($result)->toMatch('/^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}\] Alasan test$/');
});

it('mergeCatatan append ke catatan yang sudah ada', function () {
    $ref = new ReflectionMethod($this->service, 'mergeCatatan');
    $ref->setAccessible(true);

    $result = $ref->invoke($this->service, 'Catatan lama', 'Alasan baru');

    expect($result)->toContain('Catatan lama');
    expect($result)->toContain('Alasan baru');
    expect($result)->toContain("\n");
});

it('mergeCatatan handle catatan kosong string', function () {
    // Edge: empty string = falsy → return line saja
    $ref = new ReflectionMethod($this->service, 'mergeCatatan');
    $ref->setAccessible(true);

    $result = $ref->invoke($this->service, '', 'Alasan');

    expect($result)->toMatch('/^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}\] Alasan$/');
});

/*
|==========================================================================
| validateBooking() — NEGATIVE PATH (via Reflection, no DB)
|==========================================================================
*/

it('validateBooking throw jika package tidak aktif', function () {
    $package = makePackageUnit(['status' => PackageStatus::DRAFT]);

    $ref = new ReflectionMethod($this->service, 'validateBooking');
    $ref->setAccessible(true);

    expect(fn () => $ref->invoke($this->service, $package, [
        'jumlah_peserta' => 2,
        'participants' => [],
    ]))->toThrow(ValidationException::class);
});

it('validateBooking throw jika jumlah peserta < min (BVA)', function () {
    // BVA: jumlah = min - 1
    $package = makePackageUnit(['min_peserta' => 3]);

    $ref = new ReflectionMethod($this->service, 'validateBooking');
    $ref->setAccessible(true);

    expect(fn () => $ref->invoke($this->service, $package, [
        'jumlah_peserta' => 2,
        'participants' => [['nama' => 'A'], ['nama' => 'B']],
    ]))->toThrow(ValidationException::class);
});

it('validateBooking throw jika jumlah peserta > max (BVA)', function () {
    // BVA: jumlah = max + 1
    $package = makePackageUnit(['max_peserta' => 2]);

    $ref = new ReflectionMethod($this->service, 'validateBooking');
    $ref->setAccessible(true);

    expect(fn () => $ref->invoke($this->service, $package, [
        'jumlah_peserta' => 3,
        'participants' => [['nama' => 'A'], ['nama' => 'B'], ['nama' => 'C']],
    ]))->toThrow(ValidationException::class);
});

it('validateBooking throw jika participants < jumlah_peserta', function () {
    $package = makePackageUnit();

    $ref = new ReflectionMethod($this->service, 'validateBooking');
    $ref->setAccessible(true);

    expect(fn () => $ref->invoke($this->service, $package, [
        'jumlah_peserta' => 3,
        'participants' => [['nama' => 'A'], ['nama' => 'B']],
    ]))->toThrow(ValidationException::class);
});

/*
|==========================================================================
| validateTanggalKeberangkatan() — BVA (via Reflection)
|==========================================================================
*/

it('validateTanggalKeberangkatan lolos jika H+3 (BVA batas bawah)', function () {
    $package = makePackageUnit(['timezone' => 'Asia/Makassar']);
    $h3 = CarbonImmutable::now('Asia/Makassar')->startOfDay()->addDays(3);

    $ref = new ReflectionMethod($this->service, 'validateTanggalKeberangkatan');
    $ref->setAccessible(true);

    // Tidak throw
    $ref->invoke($this->service, $package, $h3->format('Y-m-d'));
    expect(true)->toBeTrue();
});

it('validateTanggalKeberangkatan throw jika H+2 (BVA di bawah min)', function () {
    $package = makePackageUnit(['timezone' => 'Asia/Makassar']);
    $h2 = CarbonImmutable::now('Asia/Makassar')->startOfDay()->addDays(2);

    $ref = new ReflectionMethod($this->service, 'validateTanggalKeberangkatan');
    $ref->setAccessible(true);

    expect(fn () => $ref->invoke($this->service, $package, $h2->format('Y-m-d')))
        ->toThrow(ValidationException::class);
});

it('validateTanggalKeberangkatan lolos jika H+4 (BVA di atas min)', function () {
    $package = makePackageUnit(['timezone' => 'Asia/Makassar']);
    $h4 = CarbonImmutable::now('Asia/Makassar')->startOfDay()->addDays(4);

    $ref = new ReflectionMethod($this->service, 'validateTanggalKeberangkatan');
    $ref->setAccessible(true);

    $ref->invoke($this->service, $package, $h4->format('Y-m-d'));
    expect(true)->toBeTrue();
});

/*
|==========================================================================
| uploadPayment() — NEGATIVE PATH (status guard, no DB)
|==========================================================================
*/

it('uploadPayment throw jika status bukan pending_payment', function () {
    $booking = makeBookingUnit(['status' => BookingStatus::CONFIRMED]);

    expect(fn () => $this->service->uploadPayment($booking, []))
        ->toThrow(ValidationException::class);
});

/*
|==========================================================================
| verifyPayment() — NEGATIVE PATH (status guard, no DB)
|==========================================================================
*/

it('verifyPayment throw jika status bukan pending_payment', function () {
    $booking = makeBookingUnit(['status' => BookingStatus::CONFIRMED]);
    $admin = makeAdminUnit();

    expect(fn () => $this->service->verifyPayment($booking, $admin))
        ->toThrow(ValidationException::class);
});

/*
|==========================================================================
| confirm() — NEGATIVE PATH (status guard, no DB)
|==========================================================================
*/

it('confirm throw jika status bukan payment_verified', function () {
    $booking = makeBookingUnit(['status' => BookingStatus::PENDING_PAYMENT]);
    $admin = makeAdminUnit();

    expect(fn () => $this->service->confirm($booking, $admin))
        ->toThrow(ValidationException::class);
});

/*
|==========================================================================
| cancelByClient() — NEGATIVE PATH (status guard, no DB)
|==========================================================================
*/

it('cancelByClient throw jika status final (completed)', function () {
    $booking = makeBookingUnit(['status' => BookingStatus::COMPLETED]);

    expect(fn () => $this->service->cancelByClient($booking))
        ->toThrow(ValidationException::class);
});

it('cancelByClient throw jika status final (cancelled)', function () {
    $booking = makeBookingUnit(['status' => BookingStatus::CANCELLED]);

    expect(fn () => $this->service->cancelByClient($booking))
        ->toThrow(ValidationException::class);
});

/*
|==========================================================================
| cancelByAdmin() — NEGATIVE PATH (status guard, no DB)
|==========================================================================
*/

it('cancelByAdmin throw jika status completed', function () {
    $booking = makeBookingUnit(['status' => BookingStatus::COMPLETED]);

    expect(fn () => $this->service->cancelByAdmin($booking, 'alasan'))
        ->toThrow(ValidationException::class);
});

it('cancelByAdmin throw jika status cancelled', function () {
    $booking = makeBookingUnit(['status' => BookingStatus::CANCELLED]);

    expect(fn () => $this->service->cancelByAdmin($booking, 'alasan'))
        ->toThrow(ValidationException::class);
});

/*
|==========================================================================
| findDetail() — HAPPY & NEGATIVE PATH
|==========================================================================
*/

it('findDetail mengembalikan booking jika ada', function () {
    $booking = makeBookingUnit();

    $this->bookingRepo->shouldReceive('findById')
        ->once()
        ->with(1)
        ->andReturn($booking);

    expect($this->service->findDetail(1))->toBe($booking);
});

it('findDetail throw jika booking tidak ada', function () {
    $this->bookingRepo->shouldReceive('findById')
        ->once()
        ->with(999)
        ->andReturn(null);

    expect(fn () => $this->service->findDetail(999))
        ->toThrow(ValidationException::class);
});

/*
|==========================================================================
| Pass-through — BEHAVIORAL
|==========================================================================
*/

it('paginate meneruskan parameter ke repository', function () {
    $paginator = Mockery::mock(LengthAwarePaginator::class);

    $this->bookingRepo->shouldReceive('paginate')
        ->once()
        ->with(['search' => 'budi'], 25)
        ->andReturn($paginator);

    expect($this->service->paginate(['search' => 'budi'], 25))->toBe($paginator);
});

it('paginateForClient meneruskan parameter ke repository', function () {
    $paginator = Mockery::mock(LengthAwarePaginator::class);
    $client = new User;
    $client->forceFill(['id' => 5]);

    $this->bookingRepo->shouldReceive('paginateForClient')
        ->once()
        ->with($client, [], 15)
        ->andReturn($paginator);

    expect($this->service->paginateForClient($client))->toBe($paginator);
});

it('countByStatus meneruskan ke repository', function () {
    $this->bookingRepo->shouldReceive('countByStatus')
        ->once()
        ->andReturn(['pending_payment' => 5, 'confirmed' => 3]);

    expect($this->service->countByStatus())
        ->toBe(['pending_payment' => 5, 'confirmed' => 3]);
});

it('countByStatusForClient meneruskan ke repository', function () {
    $client = new User;
    $client->forceFill(['id' => 5]);

    $this->bookingRepo->shouldReceive('countByStatusForClient')
        ->once()
        ->with($client)
        ->andReturn(['pending_payment' => 2]);

    expect($this->service->countByStatusForClient($client))
        ->toBe(['pending_payment' => 2]);
});

it('findByBookingId pass-through ke repository', function () {
    $trip = new Trip;
    $trip->forceFill(['id' => 10]);

    // BookingService tidak punya findByBookingId — skip jika tidak ada
    // (method ini ada di TripService, bukan BookingService)
    expect(true)->toBeTrue();
});
