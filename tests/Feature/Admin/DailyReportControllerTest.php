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
use App\Models\User;
use App\Services\Trip\DailyReportService;
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
        'tanggal_mulai' => now()->format('Y-m-d'),
        'tanggal_selesai' => now()->addDay()->format('Y-m-d'),
        'status' => TripStatus::ACTIVE,
    ]);

    // Trip Day
    $this->tripDay = TripDay::factory()->create([
        'trip_id' => $this->trip->id,
        'hari_ke' => 1,
        'tanggal' => now()->format('Y-m-d'),
        'status' => TripDay::STATUS_IN_PROGRESS,
    ]);

    // Daily Report (submitted)
    $this->report = DailyReport::factory()->create([
        'trip_day_id' => $this->tripDay->id,
        'mitra_id' => $this->mitra->id,
        'catatan' => 'Laporan hari ini',
        'status' => DailyReport::STATUS_SUBMITTED,
        'submitted_at' => now(),
    ]);
});

/*
|==========================================================================
| KATEGORI 1 — CONTRACT / API SCHEMA
|==========================================================================
*/

it('GET /admin/daily-reports merender Inertia component Admin/DailyReports/Index', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.daily-reports.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/DailyReports/Index')
        ->has('reports')
        ->has('filters')
        ->has('statusCounts')
    );
});

it('verify redirect back dengan status', function () {
    $response = $this->actingAs($this->admin)
        ->from('/admin/daily-reports')
        ->post(route('admin.daily-reports.verify', $this->report->id));

    $response->assertRedirect('/admin/daily-reports');
    $response->assertSessionHas('status');
});

it('reject redirect back dengan status', function () {
    $response = $this->actingAs($this->admin)
        ->from('/admin/daily-reports')
        ->post(route('admin.daily-reports.reject', $this->report->id), [
            'reason' => 'Foto kurang jelas',
        ]);

    $response->assertRedirect('/admin/daily-reports');
    $response->assertSessionHas('status');
});

/*
|==========================================================================
| KATEGORI 2 — SECURITY & AUTHORIZATION
|==========================================================================
*/

it('guest di-redirect ke login saat akses /admin/daily-reports', function () {
    $this->get(route('admin.daily-reports.index'))->assertRedirect(route('login'));
});

it('mitra tidak bisa akses /admin/daily-reports (redirect ke dashboard mitra)', function () {
    $this->actingAs($this->mitra)
        ->get(route('admin.daily-reports.index'))
        ->assertRedirect(route('mitra.dashboard'));
});

it('client tidak bisa akses /admin/daily-reports (redirect ke dashboard client)', function () {
    $this->actingAs($this->client)
        ->get(route('admin.daily-reports.index'))
        ->assertRedirect(route('client.dashboard'));
});

it('admin dengan must_change_password = true di-redirect ke change-password', function () {
    $admin = User::factory()->admin()->create(['must_change_password' => true]);

    $this->actingAs($admin)
        ->get(route('admin.daily-reports.index'))
        ->assertRedirect(route('password.change'));
});

/*
|==========================================================================
| KATEGORI 3 — DATA INTEGRITY: Verify
|==========================================================================
*/

it('verify ubah status submitted → verified', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.daily-reports.verify', $this->report->id));

    $this->report->refresh();
    expect($this->report->status)->toBe(DailyReport::STATUS_VERIFIED);
});

it('verify set verified_by dan verified_at', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.daily-reports.verify', $this->report->id));

    $this->report->refresh();
    expect($this->report->verified_by)->toBe($this->admin->id);
    expect($this->report->verified_at)->not->toBeNull();
});

it('verify set rejection_reason = null', function () {
    // Set rejected dulu
    $this->report->update([
        'status' => DailyReport::STATUS_REJECTED,
        'rejection_reason' => 'Old reason',
    ]);

    // Ubah jadi submitted untuk verify
    $this->report->update(['status' => DailyReport::STATUS_SUBMITTED]);

    $this->actingAs($this->admin)
        ->post(route('admin.daily-reports.verify', $this->report->id));

    $this->report->refresh();
    expect($this->report->rejection_reason)->toBeNull();
});

/*
|==========================================================================
| KATEGORI 4 — DATA INTEGRITY: Reject
|==========================================================================
*/

it('reject ubah status submitted → rejected', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.daily-reports.reject', $this->report->id), [
            'reason' => 'Foto kurang jelas',
        ]);

    $this->report->refresh();
    expect($this->report->status)->toBe(DailyReport::STATUS_REJECTED);
});

it('reject set rejection_reason', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.daily-reports.reject', $this->report->id), [
            'reason' => 'Foto kurang jelas',
        ]);

    $this->report->refresh();
    expect($this->report->rejection_reason)->toBe('Foto kurang jelas');
});

it('reject set verified_by dan verified_at', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.daily-reports.reject', $this->report->id), [
            'reason' => 'Foto kurang jelas',
        ]);

    $this->report->refresh();
    expect($this->report->verified_by)->toBe($this->admin->id);
    expect($this->report->verified_at)->not->toBeNull();
});

/*
|==========================================================================
| KATEGORI 5 — ERROR HANDLING
|==========================================================================
*/

it('verify report status bukan submitted ditolak', function () {
    $this->report->update(['status' => DailyReport::STATUS_VERIFIED]);

    $this->actingAs($this->admin)
        ->post(route('admin.daily-reports.verify', $this->report->id))
        ->assertSessionHasErrors('status');
});

it('reject report status bukan submitted ditolak', function () {
    $this->report->update(['status' => DailyReport::STATUS_VERIFIED]);

    $this->actingAs($this->admin)
        ->post(route('admin.daily-reports.reject', $this->report->id), [
            'reason' => 'Test valid', // ← minimal 5 karakter
        ])
        ->assertSessionHasErrors('status');
});

it('reject validasi reason minimal 5 karakter ditolak', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.daily-reports.reject', $this->report->id), [
            'reason' => 'abc',
        ])
        ->assertSessionHasErrors('reason');
});

it('verify report 404 jika tidak ditemukan', function () {
    $this->actingAs($this->admin)
        ->post('/admin/daily-reports/9999/verify')
        ->assertNotFound();
});

it('reject report 404 jika tidak ditemukan', function () {
    $this->actingAs($this->admin)
        ->post('/admin/daily-reports/9999/reject', ['reason' => 'Test'])
        ->assertNotFound();
});

/*
|==========================================================================
| KATEGORI 6 — BEHAVIORAL: Service Dipanggil
|==========================================================================
*/

it('verify memanggil DailyReportService::verify', function () {
    $service = Mockery::mock(DailyReportService::class);
    $service->shouldReceive('verify')
        ->once()
        ->andReturn($this->report);

    $this->app->instance(DailyReportService::class, $service);

    $this->actingAs($this->admin)
        ->from('/admin/daily-reports')
        ->post(route('admin.daily-reports.verify', $this->report->id))
        ->assertRedirect();
});

it('reject memanggil DailyReportService::reject', function () {
    $service = Mockery::mock(DailyReportService::class);
    $service->shouldReceive('reject')
        ->once()
        ->with(
            Mockery::on(fn ($r) => $r->id === $this->report->id),
            Mockery::on(fn ($u) => $u->id === $this->admin->id),
            'Foto kurang jelas',
        )
        ->andReturn($this->report);

    $this->app->instance(DailyReportService::class, $service);

    $this->actingAs($this->admin)
        ->from('/admin/daily-reports')
        ->post(route('admin.daily-reports.reject', $this->report->id), [
            'reason' => 'Foto kurang jelas',
        ])
        ->assertRedirect();
});

/*
|==========================================================================
| KATEGORI 7 — ROUTE MIDDLEWARE
|==========================================================================
*/

it('route admin.daily-reports.index pakai middleware auth, password.changed, role:admin', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'admin.daily-reports.index');

    expect($route)->not->toBeNull();
    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:admin');
});

it('route admin.daily-reports.verify pakai middleware auth, password.changed, role:admin', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'admin.daily-reports.verify');

    expect($route)->not->toBeNull();
    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:admin');
});

/*
|==========================================================================
| KATEGORI 8 — BVA (Boundary Value Analysis)
|==========================================================================
*/

it('reject sukses dengan reason TEPAT 5 karakter (boundary bawah)', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.daily-reports.reject', $this->report->id), [
            'reason' => 'abcde',
        ])
        ->assertRedirect();

    $this->report->refresh();
    expect($this->report->status)->toBe(DailyReport::STATUS_REJECTED);
});

it('reject sukses dengan reason TEPAT 1000 karakter (boundary atas)', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.daily-reports.reject', $this->report->id), [
            'reason' => str_repeat('a', 1000),
        ])
        ->assertRedirect();
});

it('reject gagal dengan reason 1001 karakter (boundary atas + 1)', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.daily-reports.reject', $this->report->id), [
            'reason' => str_repeat('a', 1001),
        ])
        ->assertSessionHasErrors('reason');
});

/*
|==========================================================================
| KATEGORI 9 — EDGE CASES
|==========================================================================
*/

it('index menampilkan statusCounts dengan jumlah benar', function () {
    // Ada 1 submitted
    $response = $this->actingAs($this->admin)->get(route('admin.daily-reports.index'));

    $response->assertInertia(fn ($page) => $page
        ->where('statusCounts.submitted', 1)
    );
});

it('verify auto-complete TripDay jika semua reports verified', function () {
    // Tambah report 2 dari mitra lain
    $mitra2 = User::factory()->mitra()->create(['must_change_password' => false]);
    DailyReport::factory()->create([
        'trip_day_id' => $this->tripDay->id,
        'mitra_id' => $mitra2->id,
        'status' => DailyReport::STATUS_VERIFIED,
        'verified_by' => $this->admin->id,
        'verified_at' => now(),
    ]);

    // Verify report 1 → semua verified → TripDay auto-complete
    $this->actingAs($this->admin)
        ->post(route('admin.daily-reports.verify', $this->report->id));

    $this->tripDay->refresh();
    expect($this->tripDay->status)->toBe(TripDay::STATUS_COMPLETED);
});
