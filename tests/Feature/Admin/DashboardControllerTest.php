<?php

use App\Enums\BookingStatus;
use App\Enums\PackageStatus;
use App\Enums\PayoutStatus;
use App\Enums\TripStatus;
use App\Models\Booking;
use App\Models\DailyReport;
use App\Models\Package;
use App\Models\Payout;
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

    $this->client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);
});

/*
|==========================================================================
| KATEGORI 1 — CONTRACT / API SCHEMA
|==========================================================================
*/

it('GET /admin/dashboard merender Inertia component Admin/Dashboard', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.dashboard'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/Dashboard')
        ->has('stats')
        ->has('recent_bookings')
        ->has('monthly_revenue')
        ->has('monthly_bookings')
    );
});

it('stats memiliki struktur yang benar', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->has('stats.totalAdmin')
        ->has('stats.totalMitra')
        ->has('stats.totalClient')
        ->has('stats.packages')
        ->has('stats.bookings')
        ->has('stats.trips')
        ->has('stats.daily_reports')
        ->has('stats.payouts')
        ->has('stats.total_revenue')
        ->has('stats.total_honor')
    );
});

/*
|==========================================================================
| KATEGORI 2 — SECURITY & AUTHORIZATION
|==========================================================================
*/

it('guest di-redirect ke login saat akses /admin/dashboard', function () {
    $this->get(route('admin.dashboard'))->assertRedirect(route('login'));
});

it('mitra tidak bisa akses /admin/dashboard (redirect ke dashboard mitra)', function () {
    $this->actingAs($this->mitra)
        ->get(route('admin.dashboard'))
        ->assertRedirect(route('mitra.dashboard'));
});

it('client tidak bisa akses /admin/dashboard (redirect ke dashboard client)', function () {
    $this->actingAs($this->client)
        ->get(route('admin.dashboard'))
        ->assertRedirect(route('client.dashboard'));
});

it('admin dengan must_change_password = true di-redirect ke change-password', function () {
    $admin = User::factory()->admin()->create(['must_change_password' => true]);

    $this->actingAs($admin)
        ->get(route('admin.dashboard'))
        ->assertRedirect(route('password.change'));
});

/*
|==========================================================================
| KATEGORI 3 — DATA INTEGRITY: User Counts
|==========================================================================
*/

it('stats totalAdmin menghitung admin dengan benar', function () {
    User::factory()->admin()->create(['must_change_password' => false]);

    $response = $this->actingAs($this->admin)->get(route('admin.dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->where('stats.totalAdmin', 2)
    );
});

it('stats totalMitra menghitung mitra dengan benar', function () {
    User::factory()->mitra()->create(['must_change_password' => false]);

    $response = $this->actingAs($this->admin)->get(route('admin.dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->where('stats.totalMitra', 2)
    );
});

it('stats totalClient menghitung client dengan benar', function () {
    User::factory()->client()->create(['must_change_password' => false]);

    $response = $this->actingAs($this->admin)->get(route('admin.dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->where('stats.totalClient', 2)
    );
});

/*
|==========================================================================
| KATEGORI 4 — DATA INTEGRITY: Package Counts
|==========================================================================
*/

it('stats packages menghitung per status', function () {
    Package::factory()->create(['status' => PackageStatus::DRAFT, 'created_by' => $this->admin->id]);
    Package::factory()->create(['status' => PackageStatus::DRAFT, 'created_by' => $this->admin->id]);
    Package::factory()->create(['status' => PackageStatus::AKTIF, 'created_by' => $this->admin->id]);
    Package::factory()->create(['status' => PackageStatus::ARSIP, 'created_by' => $this->admin->id]);

    $response = $this->actingAs($this->admin)->get(route('admin.dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->where('stats.packages.draft', 2)
        ->where('stats.packages.aktif', 1)
        ->where('stats.packages.arsip', 1)
        ->where('stats.packages.total', 4)
    );
});

/*
|==========================================================================
| KATEGORI 5 — DATA INTEGRITY: Booking Counts
|==========================================================================
*/

it('stats bookings menghitung per status', function () {
    $package = Package::factory()->create([
        'status' => PackageStatus::AKTIF,
        'created_by' => $this->admin->id,
    ]);

    Booking::factory()->create(['user_id' => $this->client->id, 'package_id' => $package->id, 'status' => BookingStatus::PENDING_PAYMENT]);
    Booking::factory()->create(['user_id' => $this->client->id, 'package_id' => $package->id, 'status' => BookingStatus::PENDING_PAYMENT]);
    Booking::factory()->create(['user_id' => $this->client->id, 'package_id' => $package->id, 'status' => BookingStatus::PAYMENT_VERIFIED]);
    Booking::factory()->create(['user_id' => $this->client->id, 'package_id' => $package->id, 'status' => BookingStatus::CONFIRMED]);

    $response = $this->actingAs($this->admin)->get(route('admin.dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->where('stats.bookings.pending_payment', 2)
        ->where('stats.bookings.payment_verified', 1)
        ->where('stats.bookings.confirmed', 1)
        ->where('stats.bookings.total', 4)
        ->where('stats.bookings.needs_attention', 3)
    );
});

/*
|==========================================================================
| KATEGORI 6 — DATA INTEGRITY: Trip Counts
|==========================================================================
*/

it('stats trips menghitung per status', function () {
    $package = Package::factory()->create(['status' => PackageStatus::AKTIF, 'created_by' => $this->admin->id]);

    $booking1 = Booking::factory()->create(['user_id' => $this->client->id, 'package_id' => $package->id, 'status' => BookingStatus::CONFIRMED]);
    $booking2 = Booking::factory()->create(['user_id' => $this->client->id, 'package_id' => $package->id, 'status' => BookingStatus::CONFIRMED]);
    $booking3 = Booking::factory()->create(['user_id' => $this->client->id, 'package_id' => $package->id, 'status' => BookingStatus::CONFIRMED]);

    Trip::factory()->create(['booking_id' => $booking1->id, 'package_id' => $package->id, 'status' => TripStatus::SCHEDULED]);
    Trip::factory()->create(['booking_id' => $booking2->id, 'package_id' => $package->id, 'status' => TripStatus::ACTIVE]);
    Trip::factory()->create(['booking_id' => $booking3->id, 'package_id' => $package->id, 'status' => TripStatus::COMPLETED]);

    $response = $this->actingAs($this->admin)->get(route('admin.dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->where('stats.trips.scheduled', 1)
        ->where('stats.trips.active', 1)
        ->where('stats.trips.completed', 1)
        ->where('stats.trips.total', 3)
    );
});

it('stats trips.needs_mitra hitung trip scheduled tanpa mitra', function () {
    $package = Package::factory()->create(['status' => PackageStatus::AKTIF, 'created_by' => $this->admin->id]);

    $booking1 = Booking::factory()->create(['user_id' => $this->client->id, 'package_id' => $package->id, 'status' => BookingStatus::CONFIRMED]);
    $booking2 = Booking::factory()->create(['user_id' => $this->client->id, 'package_id' => $package->id, 'status' => BookingStatus::CONFIRMED]);

    Trip::factory()->create(['booking_id' => $booking1->id, 'package_id' => $package->id, 'status' => TripStatus::SCHEDULED]);

    $tripWithMitra = Trip::factory()->create(['booking_id' => $booking2->id, 'package_id' => $package->id, 'status' => TripStatus::SCHEDULED]);
    TripMitra::factory()->create(['trip_id' => $tripWithMitra->id, 'mitra_id' => $this->mitra->id]);

    $response = $this->actingAs($this->admin)->get(route('admin.dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->where('stats.trips.needs_mitra', 1)
    );
});

/*
|==========================================================================
| KATEGORI 7 — DATA INTEGRITY: Daily Report Counts
|==========================================================================
*/

it('stats daily_reports menghitung per status', function () {
    $package = Package::factory()->create(['status' => PackageStatus::AKTIF, 'created_by' => $this->admin->id]);
    $booking = Booking::factory()->create(['user_id' => $this->client->id, 'package_id' => $package->id, 'status' => BookingStatus::CONFIRMED]);
    $trip = Trip::factory()->create(['booking_id' => $booking->id, 'package_id' => $package->id]);
    $tripDay = TripDay::factory()->create(['trip_id' => $trip->id]);

    $mitra1 = User::factory()->mitra()->create(['must_change_password' => false]);
    $mitra2 = User::factory()->mitra()->create(['must_change_password' => false]);
    $mitra3 = User::factory()->mitra()->create(['must_change_password' => false]);

    DailyReport::factory()->create(['trip_day_id' => $tripDay->id, 'mitra_id' => $mitra1->id, 'status' => DailyReport::STATUS_SUBMITTED]);
    DailyReport::factory()->create(['trip_day_id' => $tripDay->id, 'mitra_id' => $mitra2->id, 'status' => DailyReport::STATUS_SUBMITTED]);
    DailyReport::factory()->create(['trip_day_id' => $tripDay->id, 'mitra_id' => $mitra3->id, 'status' => DailyReport::STATUS_VERIFIED]);

    $response = $this->actingAs($this->admin)->get(route('admin.dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->where('stats.daily_reports.submitted', 2)
        ->where('stats.daily_reports.verified', 1)
        ->where('stats.daily_reports.total', 3)
    );
});

/*
|==========================================================================
| KATEGORI 8 — DATA INTEGRITY: Payout Counts
|==========================================================================
*/

it('stats payouts menghitung per status', function () {
    Payout::factory()->create(['mitra_id' => $this->mitra->id, 'status' => PayoutStatus::PENDING]);
    Payout::factory()->create(['mitra_id' => $this->mitra->id, 'status' => PayoutStatus::PENDING]);
    Payout::factory()->create(['mitra_id' => $this->mitra->id, 'status' => PayoutStatus::APPROVED]);

    $response = $this->actingAs($this->admin)->get(route('admin.dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->where('stats.payouts.pending', 2)
        ->where('stats.payouts.approved', 1)
        ->where('stats.payouts.total', 3)
    );
});

/*
|==========================================================================
| KATEGORI 9 — ROUTE MIDDLEWARE
|==========================================================================
*/

it('route admin.dashboard pakai middleware auth, password.changed, role:admin', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'admin.dashboard');

    expect($route)->not->toBeNull();
    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:admin');
});

/*
|==========================================================================
| KATEGORI 10 — EDGE CASES
|==========================================================================
*/

it('stats return 0 jika tidak ada data', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->where('stats.totalAdmin', 1)
        ->where('stats.totalMitra', 1)
        ->where('stats.totalClient', 1)
        ->where('stats.packages.total', 0)
        ->where('stats.bookings.total', 0)
        ->where('stats.trips.total', 0)
        ->where('stats.daily_reports.total', 0)
        ->where('stats.payouts.total', 0)
    );
});

it('stats konsisten — total = sum of per-status', function () {
    Package::factory()->create(['status' => PackageStatus::DRAFT, 'created_by' => $this->admin->id]);
    Package::factory()->create(['status' => PackageStatus::AKTIF, 'created_by' => $this->admin->id]);

    $response = $this->actingAs($this->admin)->get(route('admin.dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->where('stats.packages.total', fn ($total) => $total === $page->toArray()['props']['stats']['packages']['draft']
                + $page->toArray()['props']['stats']['packages']['aktif']
                + $page->toArray()['props']['stats']['packages']['arsip']
        )
    );
});

/*
|==========================================================================
| KATEGORI 11 — DATA REVENUE & HONOR (BARU)
|==========================================================================
*/

it('stats total_revenue menghitung pendapatan dari booking confirmed/completed', function () {
    $package = Package::factory()->create(['status' => PackageStatus::AKTIF, 'created_by' => $this->admin->id]);

    Booking::factory()->create([
        'user_id' => $this->client->id,
        'package_id' => $package->id,
        'status' => BookingStatus::CONFIRMED,
        'total_harga' => 1000000,
    ]);
    Booking::factory()->create([
        'user_id' => $this->client->id,
        'package_id' => $package->id,
        'status' => BookingStatus::COMPLETED,
        'total_harga' => 2000000,
    ]);

    $response = $this->actingAs($this->admin)->get(route('admin.dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->where('stats.total_revenue', 3000000)
    );
});

it('stats total_honor menghitung honor dari trip completed', function () {
    $package = Package::factory()->create(['status' => PackageStatus::AKTIF, 'created_by' => $this->admin->id]);
    $booking = Booking::factory()->create(['user_id' => $this->client->id, 'package_id' => $package->id, 'status' => BookingStatus::CONFIRMED]);
    $trip = Trip::factory()->create(['booking_id' => $booking->id, 'package_id' => $package->id, 'status' => TripStatus::COMPLETED]);

    TripMitra::factory()->create(['trip_id' => $trip->id, 'mitra_id' => $this->mitra->id, 'honor' => 500000]);

    $response = $this->actingAs($this->admin)->get(route('admin.dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->where('stats.total_honor', 500000)
    );
});

it('recent_bookings mengembalikan 5 booking terbaru', function () {
    $package = Package::factory()->create(['status' => PackageStatus::AKTIF, 'created_by' => $this->admin->id]);

    for ($i = 0; $i < 6; $i++) {
        Booking::factory()->create([
            'user_id' => $this->client->id,
            'package_id' => $package->id,
            'status' => BookingStatus::CONFIRMED,
            'created_at' => now()->subDays($i),
        ]);
    }

    $response = $this->actingAs($this->admin)->get(route('admin.dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->has('recent_bookings', 5)
    );
});

it('monthly_revenue mengembalikan 6 bulan terakhir', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->has('monthly_revenue', 6)
    );
});

it('monthly_bookings mengembalikan 6 bulan terakhir', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->has('monthly_bookings', 6)
    );
});
