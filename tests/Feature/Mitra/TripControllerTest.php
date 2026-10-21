<?php

use App\Enums\BookingStatus;
use App\Enums\PackageKategori;
use App\Enums\PackageStatus;
use App\Enums\TripStatus;
use App\Models\Booking;
use App\Models\DailyReport;
use App\Models\Package;
use App\Models\Trip;
use App\Models\TripDay;
use App\Models\TripMitra;
use App\Models\User;
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

    $this->otherMitra = User::factory()->mitra()->create([
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
        'durasi_hari' => 2,
        'durasi_malam' => 1,
    ]);

    // Booking
    $this->booking = Booking::factory()->create([
        'kode' => 'BK-2026-001',
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

    // Assign mitra
    $this->tripMitra = TripMitra::factory()->create([
        'trip_id' => $this->trip->id,
        'mitra_id' => $this->mitra->id,
        'role' => 'lead',
        'honor' => '500000.00',
        'honor_tipe' => 'flat',
    ]);

    // Trip Day
    TripDay::factory()->create([
        'trip_id' => $this->trip->id,
        'hari_ke' => 1,
        'tanggal' => now()->addDays(7)->format('Y-m-d'),
        'status' => TripDay::STATUS_PENDING,
    ]);
    TripDay::factory()->create([
        'trip_id' => $this->trip->id,
        'hari_ke' => 2,
        'tanggal' => now()->addDays(8)->format('Y-m-d'),
        'status' => TripDay::STATUS_PENDING,
    ]);
});

/*
|==========================================================================
| KATEGORI 1 — CONTRACT / API SCHEMA
|==========================================================================
*/

it('GET /mitra/trips merender Inertia component Mitra/Trips/Index', function () {
    $response = $this->actingAs($this->mitra)->get(route('mitra.trips.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Mitra/Trips/Index')
        ->has('trips')
        ->has('filters')
        ->has('statusCounts')
    );
});

it('GET /mitra/trips/{id} merender Inertia component Mitra/Trips/Show', function () {
    $response = $this->actingAs($this->mitra)
        ->get(route('mitra.trips.show', $this->trip->id));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Mitra/Trips/Show')
        ->has('trip')
        ->has('tripMitra')
    );
});

/*
|==========================================================================
| KATEGORI 2 — SECURITY & AUTHORIZATION
|==========================================================================
*/

it('guest di-redirect ke login saat akses /mitra/trips', function () {
    $this->get(route('mitra.trips.index'))->assertRedirect(route('login'));
});

it('admin tidak bisa akses /mitra/trips (redirect ke dashboard admin)', function () {
    $this->actingAs($this->admin)
        ->get(route('mitra.trips.index'))
        ->assertRedirect(route('admin.dashboard'));
});

it('client tidak bisa akses /mitra/trips (redirect ke dashboard client)', function () {
    $this->actingAs($this->client)
        ->get(route('mitra.trips.index'))
        ->assertRedirect(route('client.dashboard'));
});

it('mitra tidak di-assign ke trip → 403 saat show trip', function () {
    $this->actingAs($this->otherMitra)
        ->get(route('mitra.trips.show', $this->trip->id))
        ->assertForbidden();
});

it('mitra dengan must_change_password = true di-redirect ke change-password', function () {
    $mitra = User::factory()->mitra()->create(['must_change_password' => true]);

    $this->actingAs($mitra)
        ->get(route('mitra.trips.index'))
        ->assertRedirect(route('password.change'));
});

/*
|==========================================================================
| KATEGORI 3 — DATA INTEGRITY: Index
|==========================================================================
*/

it('index hanya menampilkan trip milik mitra', function () {
    // Buat trip lain (bukan milik mitra)
    $otherBooking = Booking::factory()->create([
        'user_id' => $this->client->id,
        'package_id' => $this->package->id,
        'status' => BookingStatus::CONFIRMED,
        'tanggal_keberangkatan' => now()->addDays(14)->format('Y-m-d'),
    ]);
    $otherTrip = Trip::factory()->create([
        'booking_id' => $otherBooking->id,
        'package_id' => $this->package->id,
        'kode' => 'TRP-2026-OTHER',
        'tanggal_mulai' => now()->addDays(14)->format('Y-m-d'),
        'tanggal_selesai' => now()->addDays(15)->format('Y-m-d'),
    ]);
    TripMitra::factory()->create([
        'trip_id' => $otherTrip->id,
        'mitra_id' => $this->otherMitra->id,
    ]);

    $response = $this->actingAs($this->mitra)->get(route('mitra.trips.index'));

    $response->assertInertia(fn ($page) => $page
        ->has('trips.data', 1)
        ->where('trips.data.0.id', $this->trip->id)
    );
});

it('index menampilkan statusCounts dengan jumlah benar', function () {
    $response = $this->actingAs($this->mitra)->get(route('mitra.trips.index'));

    $response->assertInertia(fn ($page) => $page
        ->where('statusCounts.scheduled', 1)
    );
});

it('index bisa filter status', function () {
    $response = $this->actingAs($this->mitra)
        ->get(route('mitra.trips.index', ['status' => 'active']));

    $response->assertInertia(fn ($page) => $page
        ->has('trips.data', 0) // tidak ada trip active
    );
});

it('index bisa search by kode', function () {
    $response = $this->actingAs($this->mitra)
        ->get(route('mitra.trips.index', ['search' => 'TRP-2026-001']));

    $response->assertInertia(fn ($page) => $page
        ->has('trips.data', 1)
        ->where('trips.data.0.id', $this->trip->id)
    );
});

/*
|==========================================================================
| KATEGORI 4 — DATA INTEGRITY: Show
|==========================================================================
*/

it('show menampilkan trip yang di-assign', function () {
    $response = $this->actingAs($this->mitra)
        ->get(route('mitra.trips.show', $this->trip->id));

    $response->assertInertia(fn ($page) => $page
        ->where('trip.id', $this->trip->id)
        ->where('trip.kode', 'TRP-2026-001')
    );
});

it('show menampilkan tripMitra milik mitra', function () {
    $response = $this->actingAs($this->mitra)
        ->get(route('mitra.trips.show', $this->trip->id));

    $response->assertInertia(fn ($page) => $page
        ->has('tripMitra')
        ->where('tripMitra.id', $this->tripMitra->id)
        ->where('tripMitra.role', 'lead')
    );
});

it('show load relasi package, booking, mitras, days', function () {
    $response = $this->actingAs($this->mitra)
        ->get(route('mitra.trips.show', $this->trip->id));

    $response->assertInertia(fn ($page) => $page
        ->has('trip.package')
        ->has('trip.booking')
        ->has('trip.mitras')
        ->has('trip.days')
    );
});

it('show hanya load dailyReports milik mitra', function () {
    // Buat daily report untuk mitra
    DailyReport::factory()->create([
        'trip_day_id' => TripDay::where('trip_id', $this->trip->id)->first()->id,
        'mitra_id' => $this->mitra->id,
        'status' => DailyReport::STATUS_SUBMITTED,
    ]);

    // Buat daily report untuk mitra lain
    DailyReport::factory()->create([
        'trip_day_id' => TripDay::where('trip_id', $this->trip->id)->first()->id,
        'mitra_id' => $this->otherMitra->id,
        'status' => DailyReport::STATUS_SUBMITTED,
    ]);

    $response = $this->actingAs($this->mitra)
        ->get(route('mitra.trips.show', $this->trip->id));

    $response->assertInertia(fn ($page) => $page
        ->has('trip.days.0.daily_reports', 1)
        ->where('trip.days.0.daily_reports.0.mitra_id', $this->mitra->id)
    );
});

/*
|==========================================================================
| KATEGORI 5 — ERROR HANDLING
|==========================================================================
*/

it('show trip 404 jika tidak ditemukan', function () {
    $this->actingAs($this->mitra)
        ->get('/mitra/trips/9999')
        ->assertNotFound();
});

/*
|==========================================================================
| KATEGORI 6 — ROUTE MIDDLEWARE
|==========================================================================
*/

it('route mitra.trips.index pakai middleware auth, password.changed, role:mitra', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'mitra.trips.index');

    expect($route)->not->toBeNull();
    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:mitra');
});

it('route mitra.trips.show pakai middleware auth, password.changed, role:mitra', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'mitra.trips.show');

    expect($route)->not->toBeNull();
    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:mitra');
});

/*
|==========================================================================
| KATEGORI 7 — EDGE CASES
|==========================================================================
*/

it('index menampilkan 0 trip jika mitra belum di-assign', function () {
    $mitraBaru = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($mitraBaru)->get(route('mitra.trips.index'));

    $response->assertInertia(fn ($page) => $page
        ->has('trips.data', 0)
    );
});

it('show trip dengan 0 trip day tidak error', function () {
    TripDay::where('trip_id', $this->trip->id)->delete();

    $response = $this->actingAs($this->mitra)
        ->get(route('mitra.trips.show', $this->trip->id));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('trip.days', 0)
    );
});
