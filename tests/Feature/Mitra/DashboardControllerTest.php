<?php

use App\Enums\BookingStatus;
use App\Enums\PackageKategori;
use App\Enums\PackageStatus;
use App\Enums\PayoutStatus;
use App\Enums\TripStatus;
use App\Models\Booking;
use App\Models\DailyReport;
use App\Models\MitraWallet;
use App\Models\Package;
use App\Models\Payout;
use App\Models\Trip;
use App\Models\TripDay;
use App\Models\TripMitra;
use App\Models\User;
use Carbon\Carbon;
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

    // ✅ FIX: Carbon::setTestNow (bukan CarbonImmutable) agar `now()` sinkron
    Carbon::setTestNow(Carbon::create(2026, 1, 15, 10, 0, 0, 'Asia/Makassar'));

    $this->admin = User::factory()->admin()->create([
        'must_change_password' => false,
    ]);

    $this->mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
        'timezone' => 'Asia/Makassar',
    ]);

    $this->otherMitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    $this->client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    // Wallet mitra
    $this->wallet = MitraWallet::factory()->create([
        'mitra_id' => $this->mitra->id,
        'saldo' => '500000.00',
        'total_pendapatan' => '1500000.00',
        'total_dicairkan' => '1000000.00',
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
        'tanggal_keberangkatan' => '2026-01-15',
    ]);

    // Trip ACTIVE hari ini
    $this->trip = Trip::factory()->create([
        'booking_id' => $this->booking->id,
        'package_id' => $this->package->id,
        'kode' => 'TRP-2026-001',
        'tanggal_mulai' => '2026-01-15',
        'tanggal_selesai' => '2026-01-16',
        'status' => TripStatus::ACTIVE,
        'timezone' => 'Asia/Makassar',
    ]);

    // Assign mitra
    $this->tripMitra = TripMitra::factory()->create([
        'trip_id' => $this->trip->id,
        'mitra_id' => $this->mitra->id,
        'role' => 'lead',
        'honor' => '500000.00',
        'honor_tipe' => 'flat',
    ]);

    // Trip Day hari ini
    $this->tripDay = TripDay::factory()->create([
        'trip_id' => $this->trip->id,
        'hari_ke' => 1,
        'tanggal' => '2026-01-15',
        'status' => TripDay::STATUS_IN_PROGRESS,
    ]);
});

afterEach(function () {
    Carbon::setTestNow();
});

/*
|==========================================================================
| KATEGORI 1 — CONTRACT / API SCHEMA
|==========================================================================
*/

it('GET /mitra/dashboard merender Inertia component Mitra/Dashboard', function () {
    $response = $this->actingAs($this->mitra)->get(route('mitra.dashboard'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Mitra/Dashboard')
        ->has('stats')
        ->has('todayTrips')
        ->has('pendingReports')
    );
});

it('stats memiliki struktur yang benar', function () {
    $response = $this->actingAs($this->mitra)->get(route('mitra.dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->has('stats.trips')
        ->has('stats.trips.scheduled')
        ->has('stats.trips.active')
        ->has('stats.trips.completed')
        ->has('stats.trips.total')
        ->has('stats.daily_reports')
        ->has('stats.wallet')
        ->has('stats.wallet.saldo')
        ->has('stats.wallet.total_pendapatan')
        ->has('stats.wallet.total_dicairkan')
        ->has('stats.pending_payouts')
    );
});

/*
|==========================================================================
| KATEGORI 2 — SECURITY & AUTHORIZATION
|==========================================================================
*/

it('guest di-redirect ke login saat akses /mitra/dashboard', function () {
    $this->get(route('mitra.dashboard'))->assertRedirect(route('login'));
});

it('admin tidak bisa akses /mitra/dashboard (redirect ke dashboard admin)', function () {
    $this->actingAs($this->admin)
        ->get(route('mitra.dashboard'))
        ->assertRedirect(route('admin.dashboard'));
});

it('client tidak bisa akses /mitra/dashboard (redirect ke dashboard client)', function () {
    $this->actingAs($this->client)
        ->get(route('mitra.dashboard'))
        ->assertRedirect(route('client.dashboard'));
});

it('mitra dengan must_change_password = true di-redirect ke change-password', function () {
    $mitra = User::factory()->mitra()->create(['must_change_password' => true]);

    $this->actingAs($mitra)
        ->get(route('mitra.dashboard'))
        ->assertRedirect(route('password.change'));
});

/*
|==========================================================================
| KATEGORI 3 — DATA INTEGRITY: Stats
|==========================================================================
*/

it('stats trips menghitung per status milik mitra saja', function () {
    // Trip scheduled milik mitra (booking berbeda)
    $booking2 = Booking::factory()->create([
        'user_id' => $this->client->id,
        'package_id' => $this->package->id,
        'status' => BookingStatus::CONFIRMED,
        'tanggal_keberangkatan' => '2026-02-15',
    ]);
    $scheduledTrip = Trip::factory()->create([
        'booking_id' => $booking2->id,
        'package_id' => $this->package->id,
        'tanggal_mulai' => '2026-02-15',
        'tanggal_selesai' => '2026-02-16',
        'status' => TripStatus::SCHEDULED,
    ]);
    TripMitra::factory()->create([
        'trip_id' => $scheduledTrip->id,
        'mitra_id' => $this->mitra->id,
    ]);

    // Trip milik otherMitra (tidak boleh masuk hitungan)
    $otherBooking = Booking::factory()->create([
        'user_id' => $this->client->id,
        'package_id' => $this->package->id,
        'status' => BookingStatus::CONFIRMED,
        'tanggal_keberangkatan' => '2026-03-15',
    ]);
    $otherTrip = Trip::factory()->create([
        'booking_id' => $otherBooking->id,
        'package_id' => $this->package->id,
        'tanggal_mulai' => '2026-03-15',
        'tanggal_selesai' => '2026-03-16',
        'status' => TripStatus::SCHEDULED,
    ]);
    TripMitra::factory()->create([
        'trip_id' => $otherTrip->id,
        'mitra_id' => $this->otherMitra->id,
    ]);

    $response = $this->actingAs($this->mitra)->get(route('mitra.dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->where('stats.trips.scheduled', 1)
        ->where('stats.trips.active', 1)
        ->where('stats.trips.total', 2)
    );
});

it('stats wallet menampilkan saldo mitra', function () {
    $response = $this->actingAs($this->mitra)->get(route('mitra.dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->where('stats.wallet.saldo', 500000)          // int, bukan 500000.0
        ->where('stats.wallet.total_pendapatan', 1500000)
        ->where('stats.wallet.total_dicairkan', 1000000)
    );
});

it('stats pending_payouts menghitung pending + approved', function () {
    // 2 pending + 1 approved = 3
    Payout::factory()->create([
        'mitra_id' => $this->mitra->id,
        'status' => PayoutStatus::PENDING,
    ]);
    Payout::factory()->create([
        'mitra_id' => $this->mitra->id,
        'status' => PayoutStatus::PENDING,
    ]);
    Payout::factory()->create([
        'mitra_id' => $this->mitra->id,
        'status' => PayoutStatus::APPROVED,
    ]);

    // Payout milik mitra lain (tidak boleh masuk)
    Payout::factory()->create([
        'mitra_id' => $this->otherMitra->id,
        'status' => PayoutStatus::PENDING,
    ]);

    $response = $this->actingAs($this->mitra)->get(route('mitra.dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->where('stats.pending_payouts', 3)
    );
});

/*
|==========================================================================
| KATEGORI 4 — DATA INTEGRITY: Today Trips
|==========================================================================
*/

it('todayTrips menampilkan trip aktif hari ini', function () {
    $response = $this->actingAs($this->mitra)->get(route('mitra.dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->has('todayTrips', 1)
        ->where('todayTrips.0.id', $this->trip->id)
        ->where('todayTrips.0.kode', 'TRP-2026-001')
        ->where('todayTrips.0.status', 'active')
    );
});

it('todayTrips tidak menampilkan trip yang bukan hari ini', function () {
    // Trip besok
    $booking2 = Booking::factory()->create([
        'user_id' => $this->client->id,
        'package_id' => $this->package->id,
        'status' => BookingStatus::CONFIRMED,
        'tanggal_keberangkatan' => '2026-01-16',
    ]);
    $tripBesok = Trip::factory()->create([
        'booking_id' => $booking2->id,
        'package_id' => $this->package->id,
        'tanggal_mulai' => '2026-01-16',
        'tanggal_selesai' => '2026-01-17',
        'status' => TripStatus::ACTIVE,
    ]);
    TripMitra::factory()->create([
        'trip_id' => $tripBesok->id,
        'mitra_id' => $this->mitra->id,
    ]);

    $response = $this->actingAs($this->mitra)->get(route('mitra.dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->has('todayTrips', 1) // hanya trip hari ini
        ->where('todayTrips.0.id', $this->trip->id)
    );
});

it('todayTrips menampilkan today_day jika ada trip day hari ini', function () {
    $response = $this->actingAs($this->mitra)->get(route('mitra.dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->has('todayTrips.0.today_day')
        ->where('todayTrips.0.today_day.id', $this->tripDay->id)
        ->where('todayTrips.0.today_day.hari_ke', 1)
        ->where('todayTrips.0.today_day.has_report', false)
    );
});

it('todayTrips menampilkan report_status jika sudah submit', function () {
    DailyReport::factory()->create([
        'trip_day_id' => $this->tripDay->id,
        'mitra_id' => $this->mitra->id,
        'status' => DailyReport::STATUS_SUBMITTED,
    ]);

    $response = $this->actingAs($this->mitra)->get(route('mitra.dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->where('todayTrips.0.today_day.has_report', true)
        ->where('todayTrips.0.today_day.report_status', 'submitted')
    );
});

it('todayTrips tidak menampilkan trip milik mitra lain', function () {
    $response = $this->actingAs($this->otherMitra)->get(route('mitra.dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->has('todayTrips', 0)
    );
});

/*
|==========================================================================
| KATEGORI 5 — DATA INTEGRITY: Pending Reports
|==========================================================================
*/

it('pendingReports menampilkan report submitted milik mitra', function () {
    DailyReport::factory()->create([
        'trip_day_id' => $this->tripDay->id,
        'mitra_id' => $this->mitra->id,
        'status' => DailyReport::STATUS_SUBMITTED,
    ]);

    $response = $this->actingAs($this->mitra)->get(route('mitra.dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->has('pendingReports', 1)
        ->where('pendingReports.0.status', 'submitted')
    );
});

it('pendingReports tidak menampilkan report verified', function () {
    DailyReport::factory()->create([
        'trip_day_id' => $this->tripDay->id,
        'mitra_id' => $this->mitra->id,
        'status' => DailyReport::STATUS_VERIFIED,
    ]);

    $response = $this->actingAs($this->mitra)->get(route('mitra.dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->has('pendingReports', 0)
    );
});

it('pendingReports tidak menampilkan report mitra lain', function () {
    DailyReport::factory()->create([
        'trip_day_id' => $this->tripDay->id,
        'mitra_id' => $this->otherMitra->id,
        'status' => DailyReport::STATUS_SUBMITTED,
    ]);

    $response = $this->actingAs($this->mitra)->get(route('mitra.dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->has('pendingReports', 0)
    );
});

/*
|==========================================================================
| KATEGORI 6 — ROUTE MIDDLEWARE
|==========================================================================
*/

it('route mitra.dashboard pakai middleware auth, password.changed, role:mitra', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'mitra.dashboard');

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

it('dashboard tidak error jika mitra belum punya wallet', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($mitra)->get(route('mitra.dashboard'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('stats.wallet.saldo', 0)               // int, bukan 0.0
    );
});

it('dashboard tidak error jika tidak ada trip sama sekali', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($mitra)->get(route('mitra.dashboard'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('todayTrips', 0)
        ->has('pendingReports', 0)
    );
});
