<?php

use App\Enums\BookingStatus;
use App\Enums\PackageKategori;
use App\Enums\PackageStatus;
use App\Enums\TripStatus;
use App\Models\Booking;
use App\Models\ETicket;
use App\Models\Package;
use App\Models\Trip;
use App\Models\User;
use App\Services\ETicket\ETicketService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

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

    Storage::fake('public');

    // Client utama
    $this->client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    // Client lain (untuk test cross-access)
    $this->otherClient = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    // Package aktif
    $this->package = Package::factory()->create([
        'nama' => 'Paket Test',
        'slug' => 'paket-test',
        'kode' => 'PKG-001',
        'status' => PackageStatus::AKTIF,
        'kategori' => PackageKategori::WISATA_ALAM,
        'timezone' => 'Asia/Makassar',
        'durasi_hari' => 2,
        'durasi_malam' => 1,
    ]);

    // Booking milik client
    $this->booking = Booking::factory()->create([
        'user_id' => $this->client->id,
        'package_id' => $this->package->id,
        'status' => BookingStatus::CONFIRMED,
        'jumlah_peserta' => 2,
        'total_harga' => '1000000.00',
        'tanggal_keberangkatan' => now()->addDays(7)->format('Y-m-d'),
    ]);

    // Trip
    $this->trip = Trip::factory()->create([
        'booking_id' => $this->booking->id,
        'package_id' => $this->package->id,
        'kode' => 'TRP-2026-001',
        'tanggal_mulai' => now()->addDays(7)->format('Y-m-d'),
        'tanggal_selesai' => now()->addDays(8)->format('Y-m-d'),
        'status' => TripStatus::SCHEDULED,
    ]);

    // ETicket
    $this->eticket = ETicket::factory()->create([
        'booking_id' => $this->booking->id,
        'trip_id' => $this->trip->id,
        'uuid' => 'abc-123-uuid',
        'qr_code' => 'e-tickets/qr-abc-123.png',
        'pdf_path' => 'e-tickets/ticket-abc-123.pdf',
        'generated_at' => now(),
    ]);

    // Simulasi file PDF di storage
    Storage::disk('public')->put(
        $this->eticket->pdf_path,
        'PDF-DUMMY-CONTENT'
    );
});

/*
|==========================================================================
| KATEGORI 1 — CONTRACT / API SCHEMA
|==========================================================================
*/

it('download ETicket sukses return 200 dengan file PDF', function () {
    $response = $this->actingAs($this->client)
        ->get(route('client.e-tickets.download', $this->eticket->uuid));

    $response->assertOk();
    $response->assertDownload('e-ticket-TRP-2026-001.pdf');
});

it('nama file download = e-ticket-{kode-trip}.pdf', function () {
    $response = $this->actingAs($this->client)
        ->get(route('client.e-tickets.download', $this->eticket->uuid));

    $response->assertOk();
    $response->assertDownload('e-ticket-TRP-2026-001.pdf');
});

/*
|==========================================================================
| KATEGORI 2 — SECURITY & AUTHORIZATION
|==========================================================================
*/

it('guest di-redirect ke login saat akses ETicket', function () {
    $this->get(route('client.e-tickets.download', $this->eticket->uuid))
        ->assertRedirect(route('login'));
});

it('client tidak bisa download ETicket milik client lain (403)', function () {
    $this->actingAs($this->otherClient)
        ->get(route('client.e-tickets.download', $this->eticket->uuid))
        ->assertForbidden();
});

it('admin tidak bisa akses route e-ticket (redirect ke dashboard admin)', function () {
    $admin = User::factory()->admin()->create([
        'must_change_password' => false,
    ]);

    $this->actingAs($admin)
        ->get(route('client.e-tickets.download', $this->eticket->uuid))
        ->assertRedirect(route('admin.dashboard'));
});

it('mitra tidak bisa akses route e-ticket (redirect ke dashboard mitra)', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    $this->actingAs($mitra)
        ->get(route('client.e-tickets.download', $this->eticket->uuid))
        ->assertRedirect(route('mitra.dashboard'));
});

it('client dengan must_change_password = true di-redirect ke change-password', function () {
    $client = User::factory()->client()->create([
        'must_change_password' => true,
    ]);

    $this->actingAs($client)
        ->get(route('client.e-tickets.download', $this->eticket->uuid))
        ->assertRedirect(route('password.change'));
});

/*
|==========================================================================
| KATEGORI 3 — DATA INTEGRITY & STATE TRANSITION
|==========================================================================
*/

it('booking null di ETicket → 403 (tidak crash)', function () {
    // Soft delete booking
    $this->booking->delete();
    $this->eticket->refresh();

    $this->actingAs($this->client)
        ->get(route('client.e-tickets.download', $this->eticket->uuid))
        ->assertForbidden();
});

/*
|==========================================================================
| KATEGORI 4 — ERROR HANDLING & EDGE CASES
|==========================================================================
*/

it('download ETicket 404 jika UUID tidak ditemukan', function () {
    $this->actingAs($this->client)
        ->get(route('client.e-tickets.download', 'non-existent-uuid'))
        ->assertNotFound();
});

it('download ETicket 404 jika file PDF tidak ada di storage', function () {
    Storage::disk('public')->delete($this->eticket->pdf_path);

    $this->actingAs($this->client)
        ->get(route('client.e-tickets.download', $this->eticket->uuid))
        ->assertNotFound();
});

it('download ETicket 404 jika trip null', function () {
    $fakeEticket = Mockery::mock(ETicket::class)->makePartial();
    $fakeEticket->forceFill([
        'id' => $this->eticket->id,
        'uuid' => $this->eticket->uuid,
        'booking_id' => $this->booking->id,
        'trip_id' => $this->trip->id,
        'pdf_path' => $this->eticket->pdf_path,
    ]);

    // ✅ Mock booking (untuk lolos ownership)
    $fakeEticket->shouldReceive('getAttribute')
        ->with('booking')
        ->andReturn($this->booking);

    // ✅ Mock trip → null (untuk trigger 404)
    $fakeEticket->shouldReceive('getAttribute')
        ->with('trip')
        ->andReturn(null);

    $service = Mockery::mock(ETicketService::class);
    $service->shouldReceive('findByUuid')->andReturn($fakeEticket);

    $this->app->instance(ETicketService::class, $service);

    $this->actingAs($this->client)
        ->get(route('client.e-tickets.download', $this->eticket->uuid))
        ->assertNotFound();
});

it('download ETicket 404 jika UUID kosong (edge case)', function () {
    // URL tanpa UUID: /client/e-tickets//download
    $this->actingAs($this->client)
        ->get('/client/e-tickets//download')
        ->assertStatus(404);
});

it('download ETicket dengan UUID invalid format tidak crash', function () {
    $this->actingAs($this->client)
        ->get(route('client.e-tickets.download', 'invalid-format-xxx'))
        ->assertNotFound();
});

/*
|==========================================================================
| KATEGORI 5 — BEHAVIORAL: ETicketService Dipanggil
|==========================================================================
*/

it('ETicketService::findByUuid dipanggil dengan UUID benar', function () {
    $service = Mockery::mock(ETicketService::class);
    $service->shouldReceive('findByUuid')
        ->once()
        ->with('abc-123-uuid')
        ->andReturn($this->eticket);

    $this->app->instance(ETicketService::class, $service);

    $this->actingAs($this->client)
        ->get(route('client.e-tickets.download', $this->eticket->uuid))
        ->assertOk();
});

/*
|==========================================================================
| KATEGORI 6 — ROUTE MIDDLEWARE
|==========================================================================
*/

it('route client.e-tickets.download pakai middleware auth, password.changed, dan role:client', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'client.e-tickets.download');

    expect($route)->not->toBeNull();

    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:client');
});

/*
|==========================================================================
| KATEGORI 7 — BVA (Boundary Value Analysis)
|==========================================================================
*/

it('download dengan UUID panjang 100 karakter (boundary) tidak crash', function () {
    $longUuid = str_repeat('a', 100);

    $this->actingAs($this->client)
        ->get(route('client.e-tickets.download', $longUuid))
        ->assertNotFound();
});

/*
|==========================================================================
| KATEGORI 8 — EDGE CASES
|==========================================================================
*/

it('download ETicket 2x berurutan tetap sukses (idempotent)', function () {
    $this->actingAs($this->client)
        ->get(route('client.e-tickets.download', $this->eticket->uuid))
        ->assertOk();

    $this->actingAs($this->client)
        ->get(route('client.e-tickets.download', $this->eticket->uuid))
        ->assertOk();
});

it('download ETicket dengan client sama tapi uuid berbeda tetap jalan', function () {
    $eticket2 = ETicket::factory()->create([
        'booking_id' => $this->booking->id,
        'trip_id' => $this->trip->id,
        'uuid' => 'def-456-uuid',
        'qr_code' => 'e-tickets/qr-def-456.png',
        'pdf_path' => 'e-tickets/ticket-def-456.pdf',
        'generated_at' => now(),
    ]);

    Storage::disk('public')->put($eticket2->pdf_path, 'PDF-2-CONTENT');

    $this->actingAs($this->client)
        ->get(route('client.e-tickets.download', $eticket2->uuid))
        ->assertOk()
        ->assertDownload('e-ticket-TRP-2026-001.pdf');
});
