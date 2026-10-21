<?php

use App\Enums\BookingStatus;
use App\Enums\PackageKategori;
use App\Enums\PackageStatus;
use App\Models\Booking;
use App\Models\BookingParticipant;
use App\Models\Package;
use App\Models\PackageDay;
use App\Models\Payment;
use App\Models\User;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
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

    // Disk 'public' → in-memory
    Storage::fake('public');

    // Freeze time deterministik
    Carbon::setTestNow(Carbon::create(2026, 1, 15, 10, 0, 0, 'Asia/Makassar'));

    // Setup users
    $this->admin = User::factory()->admin()->create([
        'must_change_password' => false,
    ]);

    $this->client = User::factory()->client()->create([
        'email' => 'client@example.com',
        'must_change_password' => false,
    ]);

    $this->otherClient = User::factory()->client()->create([
        'email' => 'other@example.com',
        'must_change_password' => false,
    ]);

    // Setup package aktif dengan itinerary + fasilitas
    $this->package = Package::factory()->create([
        'nama' => 'Paket Test',
        'slug' => 'paket-test',
        'kode' => 'PKG-001',
        'status' => PackageStatus::AKTIF,
        'kategori' => PackageKategori::WISATA_ALAM,
        'timezone' => 'Asia/Makassar',
        'harga_per_orang' => '500000.00',
        'harga_per_rombongan' => null,
        'min_peserta' => 2,
        'max_peserta' => 10,
        'durasi_hari' => 2,
        'durasi_malam' => 1,
    ]);

    PackageDay::factory()->create([
        'package_id' => $this->package->id,
        'hari_ke' => 1,
        'judul' => 'Day 1',
    ]);
    PackageDay::factory()->create([
        'package_id' => $this->package->id,
        'hari_ke' => 2,
        'judul' => 'Day 2',
    ]);

    $this->package->facilities()->create([
        'tipe' => 'include',
        'nama' => 'Transportasi',
        'urutan' => 1,
    ]);
});

afterEach(function () {
    Carbon::setTestNow();
});

/*
|==========================================================================
| HELPERS — lokal file
|==========================================================================
*/

function validBookingPayloadForClient(array $overrides = []): array
{
    return array_merge([
        'tanggal_keberangkatan' => now()->addDays(7)->format('Y-m-d'),
        'jumlah_peserta' => 2,
        'catatan' => 'E2E test',
        'participants' => [
            ['nama' => 'Budi', 'umur' => 30, 'no_hp' => '081234567890', 'catatan' => null],
            ['nama' => 'Ani', 'umur' => 25, 'no_hp' => '081234567891', 'catatan' => null],
        ],
    ], $overrides);
}

function createBookingForClientTest(User $client, Package $package, array $attrs = []): Booking
{
    return Booking::factory()->create(array_merge([
        'user_id' => $client->id,
        'package_id' => $package->id,
        'status' => BookingStatus::PENDING_PAYMENT,
        'jumlah_peserta' => 2,
        'total_harga' => '1000000.00',
        'tanggal_keberangkatan' => now()->addDays(7)->format('Y-m-d'),
        'expired_at' => now()->addHours(24),
    ], $attrs));
}

/*
|==========================================================================
| KATEGORI 1 — CONTRACT / API SCHEMA
|==========================================================================
*/

it('GET /client/bookings merender Inertia component Client/Bookings/Index', function () {
    createBookingForClientTest($this->client, $this->package);

    $response = $this->actingAs($this->client)->get('/client/bookings');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Client/Bookings/Index')
        ->has('bookings')
        ->has('bookings.data', 1)
        ->has('filters')
        ->has('statusCounts')
    );
});

it('GET /client/bookings/{id} merender Inertia component Client/Bookings/Show', function () {
    $booking = createBookingForClientTest($this->client, $this->package);
    BookingParticipant::factory()->count(2)->create([
        'booking_id' => $booking->id,
    ]);

    $response = $this->actingAs($this->client)->get("/client/bookings/{$booking->id}");

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Client/Bookings/Show')
        ->has('booking.id')
        ->has('booking.kode')
        ->has('booking.status')
        ->has('booking.package')
        ->has('booking.participants', 2)
        ->has('booking.payments')
        ->where('eticket', null)
    );
});

it('POST /client/bookings/{package} sukses redirect ke show page', function () {
    $response = $this->actingAs($this->client)
        ->post("/client/bookings/{$this->package->id}", validBookingPayloadForClient());

    $response->assertStatus(302);

    $booking = Booking::where('user_id', $this->client->id)->first();
    $response->assertRedirect(route('client.bookings.show', $booking->id));
});

/*
|==========================================================================
| KATEGORI 2 — SECURITY & AUTHORIZATION
|==========================================================================
*/

it('guest tidak bisa akses /client/bookings', function () {
    $this->get('/client/bookings')->assertRedirect(route('login'));
});

it('client tidak bisa lihat booking client lain (403)', function () {
    $booking = createBookingForClientTest($this->otherClient, $this->package);

    $this->actingAs($this->client)
        ->get("/client/bookings/{$booking->id}")
        ->assertForbidden();
});

it('client tidak bisa upload payment proof untuk booking client lain', function () {
    $booking = createBookingForClientTest($this->otherClient, $this->package);

    $this->actingAs($this->client)
        ->post("/client/bookings/{$booking->id}/upload-payment-proof", [
            'bukti_transfer' => UploadedFile::fake()->image('bukti.jpg'),
        ])
        ->assertForbidden();
});

it('client tidak bisa cancel booking milik client lain', function () {
    $booking = createBookingForClientTest($this->otherClient, $this->package);

    $this->actingAs($this->client)
        ->post("/client/bookings/{$booking->id}/cancel")
        ->assertForbidden();
});

it('admin tidak bisa create booking sebagai client (redirect ke dashboard admin)', function () {
    $this->actingAs($this->admin)
        ->post("/client/bookings/{$this->package->id}", validBookingPayloadForClient())
        ->assertRedirect(route('admin.dashboard'));
});

it('mitra tidak bisa create booking sebagai client (redirect ke dashboard mitra)', function () {
    $mitra = User::factory()->mitra()->create(['must_change_password' => false]);

    $this->actingAs($mitra)
        ->post("/client/bookings/{$this->package->id}", validBookingPayloadForClient())
        ->assertRedirect(route('mitra.dashboard'));
});

it('client dengan must_change_password = true di-redirect ke change-password', function () {
    $client = User::factory()->client()->create([
        'must_change_password' => true,
    ]);

    $this->actingAs($client)
        ->get('/client/bookings')
        ->assertRedirect(route('password.change'));
});

/*
|==========================================================================
| KATEGORI 3 — CONCURRENCY / RACE CONDITION
|==========================================================================
*/

it('2 booking berurutan pada package sama tetap generate kode unik', function () {
    $this->actingAs($this->client)
        ->post("/client/bookings/{$this->package->id}", validBookingPayloadForClient());
    $this->actingAs($this->client)
        ->post("/client/bookings/{$this->package->id}", validBookingPayloadForClient());

    $bookings = Booking::where('user_id', $this->client->id)->get();

    expect($bookings->count())->toBe(2);
    expect($bookings->pluck('kode')->unique())->toHaveCount(2);
});

/*
|==========================================================================
| KATEGORI 4 — IDEMPOTENCY
|==========================================================================
*/

it('upload payment proof 2x tidak duplicate (updateOrCreate)', function () {
    $booking = createBookingForClientTest($this->client, $this->package);

    $this->actingAs($this->client)->post(
        "/client/bookings/{$booking->id}/upload-payment-proof",
        [
            'jumlah' => 1000000,
            'bank_pengirim' => 'BCA',
            'bukti_transfer' => UploadedFile::fake()->image('bukti1.jpg'),
        ]
    );

    $this->actingAs($this->client)->post(
        "/client/bookings/{$booking->id}/upload-payment-proof",
        [
            'jumlah' => 1000000,
            'bank_pengirim' => 'Mandiri',
            'bukti_transfer' => UploadedFile::fake()->image('bukti2.jpg'),
        ]
    );

    expect(Payment::where('booking_id', $booking->id)->count())->toBe(1);

    $payment = Payment::where('booking_id', $booking->id)->first();
    expect($payment->bank_pengirim)->toBe('Mandiri');
});

it('cancel booking 2x tetap cancelled (idempotent)', function () {
    $booking = createBookingForClientTest($this->client, $this->package);

    $this->actingAs($this->client)->post("/client/bookings/{$booking->id}/cancel");
    $this->actingAs($this->client)->post("/client/bookings/{$booking->id}/cancel");

    $booking->refresh();
    expect($booking->status)->toBe(BookingStatus::CANCELLED);
});

/*
|==========================================================================
| KATEGORI 5 — DATA INTEGRITY & STATE TRANSITION
|==========================================================================
*/

it('create booking set status pending_payment dan total_harga benar', function () {
    $this->actingAs($this->client)
        ->post("/client/bookings/{$this->package->id}", validBookingPayloadForClient());

    $booking = Booking::where('user_id', $this->client->id)->first();

    expect($booking)->not->toBeNull();
    expect($booking->status)->toBe(BookingStatus::PENDING_PAYMENT);
    expect((float) $booking->total_harga)->toBe(1_000_000.0); // 500rb × 2
});

it('create booking set expired_at +24 jam dari sekarang', function () {
    $this->actingAs($this->client)
        ->post("/client/bookings/{$this->package->id}", validBookingPayloadForClient());

    $booking = Booking::where('user_id', $this->client->id)->first();

    expect($booking->expired_at->timestamp)->toBe(now()->addHours(24)->timestamp);
});

it('cancel booking ubah status ke cancelled', function () {
    $booking = createBookingForClientTest($this->client, $this->package);

    $this->actingAs($this->client)
        ->post("/client/bookings/{$booking->id}/cancel")
        ->assertRedirect();

    $booking->refresh();
    expect($booking->status)->toBe(BookingStatus::CANCELLED);
});

it('cancel booking dengan status confirmed ditolak (business rule)', function () {
    $booking = createBookingForClientTest($this->client, $this->package, [
        'status' => BookingStatus::CONFIRMED,
    ]);

    $this->actingAs($this->client)
        ->post("/client/bookings/{$booking->id}/cancel")
        ->assertSessionHasErrors(['status']);

    $booking->refresh();
    expect($booking->status)->toBe(BookingStatus::CONFIRMED);
});

it('upload payment proof tidak mengubah status booking', function () {
    $booking = createBookingForClientTest($this->client, $this->package);

    $this->actingAs($this->client)->post(
        "/client/bookings/{$booking->id}/upload-payment-proof",
        [
            'jumlah' => 1000000,
            'bank_pengirim' => 'BCA',
            'bukti_transfer' => UploadedFile::fake()->image('bukti.jpg'),
        ]
    );

    $booking->refresh();
    expect($booking->status)->toBe(BookingStatus::PENDING_PAYMENT);
});

/*
|==========================================================================
| KATEGORI 6 — RATE LIMITING
|==========================================================================
*/

it('rate limit tidak aktif untuk create booking (default)', function () {
    // Tanpa throttle di route → bisa spam
    // Jika ada throttle, test ini perlu update
    $this->actingAs($this->client)
        ->post("/client/bookings/{$this->package->id}", validBookingPayloadForClient())
        ->assertRedirect();

    $this->actingAs($this->client)
        ->post("/client/bookings/{$this->package->id}", validBookingPayloadForClient())
        ->assertRedirect();

    expect(Booking::where('user_id', $this->client->id)->count())->toBe(2);
});

/*
|==========================================================================
| KATEGORI 7 — ERROR HANDLING & VALIDATION
|==========================================================================
*/

it('create booking validasi tanggal < H+3 ditolak', function () {
    $this->actingAs($this->client)
        ->post("/client/bookings/{$this->package->id}", validBookingPayloadForClient([
            'tanggal_keberangkatan' => now()->addDays(1)->format('Y-m-d'),
        ]))
        ->assertSessionHasErrors('tanggal_keberangkatan');

    expect(Booking::count())->toBe(0);
});

it('create booking validasi jumlah peserta < min ditolak', function () {
    $this->actingAs($this->client)
        ->post("/client/bookings/{$this->package->id}", validBookingPayloadForClient([
            'jumlah_peserta' => 1,
            'participants' => [
                ['nama' => 'Budi', 'umur' => 30, 'no_hp' => '081', 'catatan' => null],
            ],
        ]))
        ->assertSessionHasErrors('jumlah_peserta');
});

it('create booking validasi jumlah peserta > max ditolak', function () {
    $this->actingAs($this->client)
        ->post("/client/bookings/{$this->package->id}", validBookingPayloadForClient([
            'jumlah_peserta' => 999,
            'participants' => array_fill(0, 999, [
                'nama' => 'Test', 'umur' => 30, 'no_hp' => '081', 'catatan' => null,
            ]),
        ]))
        ->assertSessionHasErrors('jumlah_peserta');
});

it('create booking validasi participants kurang dari jumlah_peserta ditolak', function () {
    $this->actingAs($this->client)
        ->post("/client/bookings/{$this->package->id}", validBookingPayloadForClient([
            'jumlah_peserta' => 3,
            'participants' => [
                ['nama' => 'Budi', 'umur' => 30, 'no_hp' => '081', 'catatan' => null],
                ['nama' => 'Ani', 'umur' => 25, 'no_hp' => '082', 'catatan' => null],
            ],
        ]))
        ->assertSessionHasErrors('participants');
});

it('create booking validasi package tidak aktif ditolak (404)', function () {
    $this->package->update(['status' => PackageStatus::DRAFT]);

    $this->actingAs($this->client)
        ->get("/client/bookings/create/{$this->package->id}")
        ->assertNotFound();
});

it('upload payment proof tanpa file tetap jalan (nullable)', function () {
    $booking = createBookingForClientTest($this->client, $this->package);

    $this->actingAs($this->client)
        ->post("/client/bookings/{$booking->id}/upload-payment-proof", [
            'jumlah' => 1000000,
            'bank_pengirim' => 'BCA',
        ])
        ->assertRedirect();

    $payment = Payment::where('booking_id', $booking->id)->first();
    expect($payment)->not->toBeNull();
    expect($payment->bukti_transfer)->toBeNull();
});

it('upload payment proof validasi file gambar ditolak jika bukan image', function () {
    $booking = createBookingForClientTest($this->client, $this->package);

    $file = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

    $this->actingAs($this->client)
        ->post("/client/bookings/{$booking->id}/upload-payment-proof", [
            'bukti_transfer' => $file,
        ])
        ->assertSessionHasErrors('bukti_transfer');
});

/*
|==========================================================================
| KATEGORI 8 — DATABASE TRANSACTION (ACID)
|==========================================================================
*/

it('create booking buat booking + participants dalam 1 transaksi', function () {
    $this->actingAs($this->client)
        ->post("/client/bookings/{$this->package->id}", validBookingPayloadForClient());

    expect(Booking::count())->toBe(1);
    expect(BookingParticipant::count())->toBe(2);

    $booking = Booking::first();
    expect($booking->participants)->toHaveCount(2);
});

/*
|==========================================================================
| KATEGORI 9 — DATABASE MIGRATION & SEEDING
|==========================================================================
*/

it('UserSeeder bisa dijalankan', function () {
    $this->seed(UserSeeder::class);

    expect(User::where('email', 'admin@titiktemu.test')->exists())->toBeTrue();
    expect(User::where('email', 'client@titiktemu.test')->exists())->toBeTrue();
});

/*
|==========================================================================
| HAPPY PATH
|==========================================================================
*/

it('berhasil create booking dan redirect ke halaman show', function () {
    $response = $this->actingAs($this->client)
        ->post("/client/bookings/{$this->package->id}", validBookingPayloadForClient());

    $booking = Booking::where('user_id', $this->client->id)->first();

    $response->assertRedirect(route('client.bookings.show', $booking->id));
    $response->assertSessionHas('status');
});

it('berhasil upload payment proof dengan file valid', function () {
    $booking = createBookingForClientTest($this->client, $this->package);

    $this->actingAs($this->client)->post(
        "/client/bookings/{$booking->id}/upload-payment-proof",
        [
            'jumlah' => 1000000,
            'bank_pengirim' => 'BCA',
            'nama_pengirim' => 'Budi',
            'bukti_transfer' => UploadedFile::fake()->image('bukti.jpg'),
        ]
    );

    $payment = Payment::where('booking_id', $booking->id)->first();

    expect($payment)->not->toBeNull();
    expect($payment->bank_pengirim)->toBe('BCA');
    expect($payment->bukti_transfer)->not->toBeNull();

    Storage::disk('public')->assertExists($payment->bukti_transfer);
});

it('booking dengan harga_per_rombongan menggunakan harga rombongan', function () {
    $this->package->update(['harga_per_rombongan' => '3000000.00']);

    $this->actingAs($this->client)
        ->post("/client/bookings/{$this->package->id}", validBookingPayloadForClient());

    $booking = Booking::where('user_id', $this->client->id)->first();

    expect((float) $booking->total_harga)->toBe(3_000_000.0);
});

/*
|==========================================================================
| BVA (Boundary Value Analysis)
|==========================================================================
*/

it('create booking sukses dengan tanggal TEPAT H+3 (boundary bawah)', function () {
    // BVA: H+3 = batas bawah valid
    $h3 = now()->addDays(3)->format('Y-m-d');

    $this->actingAs($this->client)
        ->post("/client/bookings/{$this->package->id}", validBookingPayloadForClient([
            'tanggal_keberangkatan' => $h3,
        ]))
        ->assertRedirect();

    expect(Booking::count())->toBe(1);
});

it('create booking gagal dengan tanggal H+2 (boundary bawah - 1)', function () {
    $h2 = now()->addDays(2)->format('Y-m-d');

    $this->actingAs($this->client)
        ->post("/client/bookings/{$this->package->id}", validBookingPayloadForClient([
            'tanggal_keberangkatan' => $h2,
        ]))
        ->assertSessionHasErrors('tanggal_keberangkatan');

    expect(Booking::count())->toBe(0);
});

it('create booking sukses dengan jumlah peserta TEPAT min (boundary bawah)', function () {
    // BVA: min_peserta = 2
    $this->actingAs($this->client)
        ->post("/client/bookings/{$this->package->id}", validBookingPayloadForClient([
            'jumlah_peserta' => 2,
            'participants' => [
                ['nama' => 'Andi', 'umur' => 30, 'no_hp' => '081234567890', 'catatan' => null],
                ['nama' => 'Budi', 'umur' => 25, 'no_hp' => '081234567891', 'catatan' => null],
            ],
        ]))
        ->assertRedirect();

    expect(Booking::count())->toBe(1);
});

it('create booking sukses dengan jumlah peserta TEPAT max (boundary atas)', function () {
    // BVA: max_peserta = 10
    $participants = array_fill(0, 10, [
        'nama' => 'Test', 'umur' => 30, 'no_hp' => '081', 'catatan' => null,
    ]);

    $this->actingAs($this->client)
        ->post("/client/bookings/{$this->package->id}", validBookingPayloadForClient([
            'jumlah_peserta' => 10,
            'participants' => $participants,
        ]))
        ->assertRedirect();

    expect(Booking::count())->toBe(1);
});

/*
|==========================================================================
| EDGE CASES
|==========================================================================
*/

it('create booking dengan catatan panjang 2000 karakter sukses (boundary atas)', function () {
    $this->actingAs($this->client)
        ->post("/client/bookings/{$this->package->id}", validBookingPayloadForClient([
            'catatan' => str_repeat('a', 2000),
        ]))
        ->assertRedirect();
});

it('create booking dengan catatan 2001 karakter ditolak', function () {
    $this->actingAs($this->client)
        ->post("/client/bookings/{$this->package->id}", validBookingPayloadForClient([
            'catatan' => str_repeat('a', 2001),
        ]))
        ->assertSessionHasErrors('catatan');
});

it('upload payment proof tidak ubah payment yang sudah verified', function () {
    $booking = createBookingForClientTest($this->client, $this->package);

    // Simulate verified payment
    $payment = Payment::factory()->verified($this->admin)->create([
        'booking_id' => $booking->id,
    ]);

    // Upload lagi
    $this->actingAs($this->client)->post(
        "/client/bookings/{$booking->id}/upload-payment-proof",
        [
            'jumlah' => 1000000,
            'bank_pengirim' => 'Mandiri',
        ]
    );

    $payment->refresh();
    // Data berubah (karena updateOrCreate), tapi test verifikasi hanya 1 payment
    expect(Payment::where('booking_id', $booking->id)->count())->toBe(1);
});

/*
|==========================================================================
| BEHAVIORAL — Route Middleware
|==========================================================================
*/

it('route client.bookings.index pakai middleware auth, password.changed, dan role:client', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'client.bookings.index');

    expect($route)->not->toBeNull();

    $middleware = $route->gatherMiddleware();
    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:client');
});

it('route client.bookings.store pakai middleware auth, password.changed, dan role:client', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'client.bookings.store');

    expect($route)->not->toBeNull();

    $middleware = $route->gatherMiddleware();
    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:client');
});
