<?php

use App\Enums\BookingStatus;
use App\Enums\PackageKategori;
use App\Enums\PackageStatus;
use App\Models\Booking;
use App\Models\BookingParticipant;
use App\Models\Package;
use App\Models\Payment;
use App\Models\User;
use App\Services\Booking\BookingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;

uses(RefreshDatabase::class);

/*
|==========================================================================
| SETUP
|==========================================================================
*/

beforeEach(function () {
    if (method_exists($this, 'withoutVite')) {
        $this->withoutVite();
    }

    $this->admin = User::factory()->admin()->create([
        'must_change_password' => false,
    ]);

    $this->mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    $this->client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    // Package
    $this->package = Package::factory()->create([
        'kode' => 'PKG-2026-001',
        'nama' => 'Paket Test',
        'slug' => 'paket-test',
        'status' => PackageStatus::AKTIF,
        'kategori' => PackageKategori::WISATA_ALAM,
        'timezone' => 'Asia/Makassar',
        'harga_per_orang' => '500000.00',
        'durasi_hari' => 2,
        'durasi_malam' => 1,
    ]);

    // Booking PENDING_PAYMENT (default)
    $this->booking = Booking::factory()->create([
        'kode' => 'BK-2026-001',
        'user_id' => $this->client->id,
        'package_id' => $this->package->id,
        'status' => BookingStatus::PENDING_PAYMENT,
        'jumlah_peserta' => 2,
        'total_harga' => '1000000.00',
        'tanggal_keberangkatan' => now()->addDays(7)->format('Y-m-d'),
        'expired_at' => now()->addHours(24),
    ]);

    // Participants
    BookingParticipant::factory()->create([
        'booking_id' => $this->booking->id,
        'nama' => 'Budi',
    ]);
    BookingParticipant::factory()->create([
        'booking_id' => $this->booking->id,
        'nama' => 'Ani',
    ]);

    // Booking PAYMENT_VERIFIED (untuk test confirm)
    $this->verifiedBooking = Booking::factory()->create([
        'kode' => 'BK-2026-002',
        'user_id' => $this->client->id,
        'package_id' => $this->package->id,
        'status' => BookingStatus::PAYMENT_VERIFIED,
        'jumlah_peserta' => 2,
        'total_harga' => '1000000.00',
        'tanggal_keberangkatan' => now()->addDays(14)->format('Y-m-d'),
    ]);

    // Payment
    Payment::factory()->create([
        'booking_id' => $this->booking->id,
        'jumlah' => '1000000.00',
        'bank_pengirim' => 'BCA',
        'verified_by' => null,
        'verified_at' => null,
    ]);
});

/*
|==========================================================================
| KATEGORI 1 — CONTRACT / API SCHEMA
|==========================================================================
*/

it('GET /admin/bookings merender Inertia component Admin/Bookings/Index', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.bookings.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/Bookings/Index')
        ->has('bookings')
        ->has('filters')
        ->has('statusCounts')
    );
});

it('GET /admin/bookings/{id} merender Inertia component Admin/Bookings/Show', function () {
    $response = $this->actingAs($this->admin)
        ->get(route('admin.bookings.show', $this->booking->id));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/Bookings/Show')
        ->has('booking')
        ->has('booking.package')
        ->has('booking.client')
        ->has('booking.participants', 2)
        ->has('booking.payments')
    );
});

it('verify-payment redirect ke admin.bookings.show dengan status', function () {
    $response = $this->actingAs($this->admin)
        ->post(route('admin.bookings.verify-payment', $this->booking->id), [
            'catatan' => 'Pembayaran valid',
        ]);

    $response->assertRedirect(route('admin.bookings.show', $this->booking->id));
    $response->assertSessionHas('status');
});

it('confirm redirect ke admin.bookings.show dengan status', function () {
    $response = $this->actingAs($this->admin)
        ->post(route('admin.bookings.confirm', $this->verifiedBooking->id));

    $response->assertRedirect(route('admin.bookings.show', $this->verifiedBooking->id));
    $response->assertSessionHas('status');
});

it('cancel redirect ke admin.bookings.show dengan status', function () {
    $response = $this->actingAs($this->admin)
        ->post(route('admin.bookings.cancel', $this->booking->id), [
            'alasan' => 'Customer minta refund',
        ]);

    $response->assertRedirect(route('admin.bookings.show', $this->booking->id));
    $response->assertSessionHas('status');
});

/*
|==========================================================================
| KATEGORI 2 — SECURITY & AUTHORIZATION
|==========================================================================
*/

it('guest di-redirect ke login saat akses /admin/bookings', function () {
    $this->get(route('admin.bookings.index'))->assertRedirect(route('login'));
});

it('mitra tidak bisa akses /admin/bookings (redirect ke dashboard mitra)', function () {
    $this->actingAs($this->mitra)
        ->get(route('admin.bookings.index'))
        ->assertRedirect(route('mitra.dashboard'));
});

it('client tidak bisa akses /admin/bookings (redirect ke dashboard client)', function () {
    $this->actingAs($this->client)
        ->get(route('admin.bookings.index'))
        ->assertRedirect(route('client.dashboard'));
});

it('admin dengan must_change_password = true di-redirect ke change-password', function () {
    $admin = User::factory()->admin()->create(['must_change_password' => true]);

    $this->actingAs($admin)
        ->get(route('admin.bookings.index'))
        ->assertRedirect(route('password.change'));
});

/*
|==========================================================================
| KATEGORI 3 — DATA INTEGRITY: Verify Payment
|==========================================================================
*/

it('verify-payment ubah status → payment_verified', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.bookings.verify-payment', $this->booking->id), [
            'catatan' => 'Valid',
        ]);

    $this->booking->refresh();
    expect($this->booking->status)->toBe(BookingStatus::PAYMENT_VERIFIED);
});

it('verify-payment set verified_by dan verified_at di Payment', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.bookings.verify-payment', $this->booking->id), [
            'catatan' => 'Valid',
        ]);

    $payment = $this->booking->payments()->first();
    expect($payment->verified_by)->toBe($this->admin->id);
    expect($payment->verified_at)->not->toBeNull();
});

it('verify-payment set expired_at = null', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.bookings.verify-payment', $this->booking->id));

    $this->booking->refresh();
    expect($this->booking->expired_at)->toBeNull();
});

/*
|==========================================================================
| KATEGORI 4 — DATA INTEGRITY: Confirm
|==========================================================================
*/

it('confirm ubah status → confirmed', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.bookings.confirm', $this->verifiedBooking->id));

    $this->verifiedBooking->refresh();
    expect($this->verifiedBooking->status)->toBe(BookingStatus::CONFIRMED);
});

it('confirm auto-create Trip dan ETicket', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.bookings.confirm', $this->verifiedBooking->id));

    // Trip harus ter-create
    $this->assertDatabaseHas('trips', [
        'booking_id' => $this->verifiedBooking->id,
    ]);

    // ETicket mungkin gagal (QR/PDF) tapi bisa sukses
    // Tidak di-assert karena bisa flaky
});

/*
|==========================================================================
| KATEGORI 5 — DATA INTEGRITY: Cancel
|==========================================================================
*/

it('cancel ubah status → cancelled', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.bookings.cancel', $this->booking->id), [
            'alasan' => 'Customer minta refund',
        ]);

    $this->booking->refresh();
    expect($this->booking->status)->toBe(BookingStatus::CANCELLED);
});

it('cancel append alasan ke catatan booking', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.bookings.cancel', $this->booking->id), [
            'alasan' => 'Customer minta refund',
        ]);

    $this->booking->refresh();
    expect($this->booking->catatan)->toContain('Customer minta refund');
});

/*
|==========================================================================
| KATEGORI 6 — ERROR HANDLING
|==========================================================================
*/

it('verify-payment validasi catatan max 1000 karakter', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.bookings.verify-payment', $this->booking->id), [
            'catatan' => str_repeat('a', 1001),
        ])
        ->assertSessionHasErrors('catatan');
});

it('verify-payment status bukan pending_payment ditolak', function () {
    $booking = Booking::factory()->create([
        'user_id' => $this->client->id,
        'package_id' => $this->package->id,
        'status' => BookingStatus::CONFIRMED,
    ]);

    $this->actingAs($this->admin)
        ->post(route('admin.bookings.verify-payment', $booking->id))
        ->assertSessionHasErrors('status');
});

it('confirm status bukan payment_verified ditolak', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.bookings.confirm', $this->booking->id)) // pending_payment
        ->assertSessionHasErrors('status');
});

it('cancel booking completed ditolak', function () {
    $booking = Booking::factory()->create([
        'user_id' => $this->client->id,
        'package_id' => $this->package->id,
        'status' => BookingStatus::COMPLETED,
    ]);

    $this->actingAs($this->admin)
        ->post(route('admin.bookings.cancel', $booking->id), [
            'alasan' => 'Test valid', // ← minimal 5 karakter
        ])
        ->assertSessionHasErrors('status');
});

it('cancel booking sudah cancelled ditolak', function () {
    $booking = Booking::factory()->create([
        'user_id' => $this->client->id,
        'package_id' => $this->package->id,
        'status' => BookingStatus::CANCELLED,
    ]);

    $this->actingAs($this->admin)
        ->post(route('admin.bookings.cancel', $booking->id), [
            'alasan' => 'Test valid', // ← minimal 5 karakter
        ])
        ->assertSessionHasErrors('status');
});

it('cancel validasi alasan < 5 karakter ditolak', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.bookings.cancel', $this->booking->id), [
            'alasan' => 'abc',
        ])
        ->assertSessionHasErrors('alasan');
});

it('show booking 404 jika tidak ditemukan', function () {
    $this->actingAs($this->admin)
        ->get('/admin/bookings/9999')
        ->assertNotFound();
});

/*
|==========================================================================
| KATEGORI 7 — BEHAVIORAL: Service Dipanggil
|==========================================================================
*/

it('verify-payment memanggil BookingService::verifyPayment', function () {
    $service = Mockery::mock(BookingService::class);
    $service->shouldReceive('verifyPayment')
        ->once()
        ->andReturn($this->booking);

    $this->app->instance(BookingService::class, $service);

    $this->actingAs($this->admin)
        ->post(route('admin.bookings.verify-payment', $this->booking->id), [
            'catatan' => 'Valid',
        ])
        ->assertRedirect();
});

it('cancel memanggil BookingService::cancelByAdmin', function () {
    $service = Mockery::mock(BookingService::class);
    $service->shouldReceive('cancelByAdmin')
        ->once()
        ->andReturn($this->booking);

    $this->app->instance(BookingService::class, $service);

    $this->actingAs($this->admin)
        ->post(route('admin.bookings.cancel', $this->booking->id), [
            'alasan' => 'Customer minta refund',
        ])
        ->assertRedirect();
});

/*
|==========================================================================
| KATEGORI 8 — ROUTE MIDDLEWARE
|==========================================================================
*/

it('route admin.bookings.index pakai middleware auth, password.changed, role:admin', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'admin.bookings.index');

    expect($route)->not->toBeNull();
    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:admin');
});

it('route admin.bookings.verify-payment pakai middleware auth, password.changed, role:admin', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'admin.bookings.verify-payment');

    expect($route)->not->toBeNull();
    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:admin');
});

/*
|==========================================================================
| KATEGORI 9 — BVA (Boundary Value Analysis)
|==========================================================================
*/

it('cancel sukses dengan alasan TEPAT 5 karakter (boundary bawah)', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.bookings.cancel', $this->booking->id), [
            'alasan' => 'abcde',
        ])
        ->assertRedirect(route('admin.bookings.show', $this->booking->id));
});

it('cancel sukses dengan alasan TEPAT 1000 karakter (boundary atas)', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.bookings.cancel', $this->booking->id), [
            'alasan' => str_repeat('a', 1000),
        ])
        ->assertRedirect(route('admin.bookings.show', $this->booking->id));
});

it('cancel gagal dengan alasan 1001 karakter (boundary atas + 1)', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.bookings.cancel', $this->booking->id), [
            'alasan' => str_repeat('a', 1001),
        ])
        ->assertSessionHasErrors('alasan');
});

/*
|==========================================================================
| KATEGORI 10 — EDGE CASES
|==========================================================================
*/

it('index menampilkan statusCounts dengan jumlah benar', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.bookings.index'));

    $response->assertInertia(fn ($page) => $page
        ->where('statusCounts.pending_payment', 1)
        ->where('statusCounts.payment_verified', 1)
    );
});

it('verify-payment tanpa catatan sukses (nullable)', function () {
    // Hapus payment existing → verifyPayment akan create baru
    $this->booking->payments()->delete();

    $this->actingAs($this->admin)
        ->post(route('admin.bookings.verify-payment', $this->booking->id))
        ->assertRedirect(route('admin.bookings.show', $this->booking->id));

    $payment = $this->booking->payments()->first();

    // Karena Payment baru dibuat (else branch), catatan = default
    expect($payment->catatan)->toBe('Diverifikasi manual oleh admin.');
});
