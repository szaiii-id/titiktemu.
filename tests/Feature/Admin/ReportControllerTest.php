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
| KATEGORI 1 — CONTRACT / API SCHEMA (INERTIA PAGES)
|==========================================================================
*/

it('GET /admin/reports merender Inertia component Admin/Reports/Index', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.reports.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/Reports/Index')
        ->has('data')
        ->has('monthly_revenue')
        ->has('filters')
    );
});

it('GET /admin/reports/mitra merender Inertia component Admin/Reports/Mitra', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.reports.mitra'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/Reports/Mitra')
        ->has('data')
        ->has('filters')
    );
});

it('GET /admin/reports/daily merender Inertia component Admin/Reports/Daily', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.reports.daily'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/Reports/Daily')
        ->has('data')
        ->has('filters')
    );
});

it('GET /admin/reports/payout merender Inertia component Admin/Reports/Payout', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.reports.payout'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/Reports/Payout')
        ->has('data')
        ->has('filters')
    );
});

/*
|==========================================================================
| KATEGORI 2 — EXPORT PDF/EXCEL (RESPONSE)
|==========================================================================
*/

it('GET /admin/reports/export-pdf mengembalikan file PDF', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.reports.export-pdf'));

    $response->assertOk();
    $response->assertHeader('Content-Type', 'application/pdf');
});

it('GET /admin/reports/export-excel mengembalikan file Excel', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.reports.export-excel'));

    $response->assertOk();
    $response->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
});

it('GET /admin/reports/mitra/export-pdf mengembalikan file PDF', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.reports.mitra.export-pdf'));

    $response->assertOk();
    $response->assertHeader('Content-Type', 'application/pdf');
});

it('GET /admin/reports/mitra/export-excel mengembalikan file Excel', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.reports.mitra.export-excel'));

    $response->assertOk();
    $response->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
});

it('GET /admin/reports/daily/export-pdf mengembalikan file PDF', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.reports.daily.export-pdf'));

    $response->assertOk();
    $response->assertHeader('Content-Type', 'application/pdf');
});

it('GET /admin/reports/daily/export-excel mengembalikan file Excel', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.reports.daily.export-excel'));

    $response->assertOk();
    $response->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
});

it('GET /admin/reports/payout/export-pdf mengembalikan file PDF', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.reports.payout.export-pdf'));

    $response->assertOk();
    $response->assertHeader('Content-Type', 'application/pdf');
});

it('GET /admin/reports/payout/export-excel mengembalikan file Excel', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.reports.payout.export-excel'));

    $response->assertOk();
    $response->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
});

/*
|==========================================================================
| KATEGORI 3 — MANIFEST TRIP
|==========================================================================
*/

it('GET /admin/trips/{trip}/manifest mengembalikan file PDF', function () {
    $package = Package::factory()->create([
        'status' => PackageStatus::AKTIF,
        'created_by' => $this->admin->id,
    ]);

    $booking = Booking::factory()->create([
        'user_id' => $this->client->id,
        'package_id' => $package->id,
        'status' => BookingStatus::CONFIRMED,
    ]);

    $trip = Trip::factory()->create([
        'booking_id' => $booking->id,
        'package_id' => $package->id,
    ]);

    $response = $this->actingAs($this->admin)->get(route('admin.trips.manifest', $trip));

    $response->assertOk();
    $response->assertHeader('Content-Type', 'application/pdf');
});

/*
|==========================================================================
| KATEGORI 4 — SECURITY & AUTHORIZATION
|==========================================================================
*/

it('guest di-redirect ke login saat akses /admin/reports', function () {
    $this->get(route('admin.reports.index'))->assertRedirect(route('login'));
});

it('mitra tidak bisa akses /admin/reports', function () {
    $this->actingAs($this->mitra)
        ->get(route('admin.reports.index'))
        ->assertRedirect(route('mitra.dashboard'));
});

it('client tidak bisa akses /admin/reports', function () {
    $this->actingAs($this->client)
        ->get(route('admin.reports.index'))
        ->assertRedirect(route('client.dashboard'));
});

it('route admin.reports.index pakai middleware auth, password.changed, role:admin', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'admin.reports.index');

    expect($route)->not->toBeNull();
    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:admin');
});

/*
|==========================================================================
| KATEGORI 5 — DATA INTEGRITY (REVENUE, MITRA, DAILY, PAYOUT)
|==========================================================================
*/

it('data revenue berisi total_revenue, total_honor, gross_profit, transactions', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.reports.index'));

    $response->assertInertia(fn ($page) => $page
        ->has('data.total_revenue')
        ->has('data.total_honor')
        ->has('data.gross_profit')
        ->has('data.transactions')
    );
});

it('data mitra berisi total_mitra, total_trip_completed, mitras', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.reports.mitra'));

    $response->assertInertia(fn ($page) => $page
        ->has('data.total_mitra')
        ->has('data.total_trip_completed')
        ->has('data.mitras')
    );
});

it('data daily berisi total_reports, pending_verify, verified, reports', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.reports.daily'));

    $response->assertInertia(fn ($page) => $page
        ->has('data.total_reports')
        ->has('data.pending_verify')
        ->has('data.verified')
        ->has('data.reports')
    );
});

it('data payout berisi total_dicairkan, total_pending, total_saldo_mengendap, payouts', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.reports.payout'));

    $response->assertInertia(fn ($page) => $page
        ->has('data.total_dicairkan')
        ->has('data.total_pending')
        ->has('data.total_saldo_mengendap')
        ->has('data.payouts')
    );
});