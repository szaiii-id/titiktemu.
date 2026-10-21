<?php

use App\Enums\BookingStatus;
use App\Enums\PackageKategori;
use App\Enums\PackageStatus;
use App\Enums\TripMitraRole;
use App\Enums\TripStatus;
use App\Models\Booking;
use App\Models\Package;
use App\Models\Trip;
use App\Models\TripDay;
use App\Models\TripMitra;
use App\Models\User;
use App\Repositories\Contracts\DailyReportRepositoryInterface;
use App\Repositories\Contracts\TripRepositoryInterface;
use App\Services\Trip\TripService;
use App\Services\Wallet\WalletService;
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
        'nama' => 'Paket Test',
        'slug' => 'paket-test',
        'kode' => 'PKG-001',
        'status' => PackageStatus::AKTIF,
        'kategori' => PackageKategori::WISATA_ALAM,
        'timezone' => 'Asia/Makassar',
        'durasi_hari' => 2,
        'durasi_malam' => 1,
    ]);

    // Booking
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
        'jumlah_peserta' => 2,
        'timezone' => 'Asia/Makassar',
        'status' => TripStatus::SCHEDULED,
    ]);

    // Trip day
    $this->tripDay1 = TripDay::factory()->create([
        'trip_id' => $this->trip->id,
        'hari_ke' => 1,
        'tanggal' => now()->addDays(7)->format('Y-m-d'),
        'status' => TripDay::STATUS_PENDING,
    ]);
    $this->tripDay2 = TripDay::factory()->create([
        'trip_id' => $this->trip->id,
        'hari_ke' => 2,
        'tanggal' => now()->addDays(8)->format('Y-m-d'),
        'status' => TripDay::STATUS_PENDING,
    ]);

    // Trip mitra (assign default)
    $this->tripMitra = TripMitra::factory()->create([
        'trip_id' => $this->trip->id,
        'mitra_id' => $this->mitra->id,
        'role' => TripMitraRole::LEAD,
        'honor' => '500000.00',
        'honor_tipe' => 'flat',
    ]);
});

/*
|==========================================================================
| KATEGORI 1 — CONTRACT / API SCHEMA
|==========================================================================
*/

it('GET /admin/trips merender Inertia component Admin/Trips/Index', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.trips.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/Trips/Index')
        ->has('trips')
        ->has('filters')
        ->has('statusCounts')
    );
});

it('GET /admin/trips/{id} merender Inertia component Admin/Trips/Show', function () {
    $response = $this->actingAs($this->admin)
        ->get(route('admin.trips.show', $this->trip->id));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/Trips/Show')
        ->has('trip')
        ->has('totalHonor')
        ->has('unverifiedDays')
        ->has('submittedReports')
        ->has('canComplete')
        ->has('allMitras')
    );
});

/*
|==========================================================================
| KATEGORI 2 — SECURITY & AUTHORIZATION
|==========================================================================
*/

it('guest di-redirect ke login saat akses /admin/trips', function () {
    $this->get(route('admin.trips.index'))->assertRedirect(route('login'));
});

it('mitra tidak bisa akses /admin/trips (redirect ke dashboard mitra)', function () {
    $this->actingAs($this->mitra)
        ->get(route('admin.trips.index'))
        ->assertRedirect(route('mitra.dashboard'));
});

it('client tidak bisa akses /admin/trips (redirect ke dashboard client)', function () {
    $this->actingAs($this->client)
        ->get(route('admin.trips.index'))
        ->assertRedirect(route('client.dashboard'));
});

it('admin dengan must_change_password = true di-redirect ke change-password', function () {
    $admin = User::factory()->admin()->create(['must_change_password' => true]);

    $this->actingAs($admin)
        ->get(route('admin.trips.index'))
        ->assertRedirect(route('password.change'));
});

/*
|==========================================================================
| KATEGORI 3 — DATA INTEGRITY: Activity (activate, complete, cancel)
|==========================================================================
*/

it('activate trip ubah status scheduled → active', function () {
    // Set tanggal_mulai ke masa lalu agar bisa di-activate
    $this->trip->update([
        'tanggal_mulai' => now()->subDay()->format('Y-m-d'),
        'tanggal_selesai' => now()->addDay()->format('Y-m-d'),
    ]);

    $this->actingAs($this->admin)
        ->post(route('admin.trips.activate', $this->trip->id))
        ->assertRedirect(route('admin.trips.show', $this->trip->id))
        ->assertSessionHas('status');

    $this->trip->refresh();
    expect($this->trip->status)->toBe(TripStatus::ACTIVE);
});

it('complete trip ubah status active → completed', function () {
    $this->trip->update(['status' => TripStatus::ACTIVE]);

    // Mock DailyReportRepository — semua terverifikasi
    $dailyReportRepo = Mockery::mock(DailyReportRepositoryInterface::class);
    $dailyReportRepo->shouldReceive('allDaysVerifiedForTrip')->andReturn(true);

    // Mock WalletService
    $walletService = Mockery::mock(WalletService::class);
    $walletService->shouldReceive('creditHonorForTrip')->once();

    $tripService = new TripService(
        app(TripRepositoryInterface::class),
        $dailyReportRepo,
        $walletService,
    );
    $this->app->instance(TripService::class, $tripService);

    $this->actingAs($this->admin)
        ->post(route('admin.trips.complete', $this->trip->id))
        ->assertRedirect(route('admin.trips.show', $this->trip->id));

    $this->trip->refresh();
    expect($this->trip->status)->toBe(TripStatus::COMPLETED);
});

it('cancel trip ubah status → cancelled', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.trips.cancel', $this->trip->id), [
            'alasan' => 'Cuaca buruk',
        ])
        ->assertRedirect(route('admin.trips.show', $this->trip->id));

    $this->trip->refresh();
    expect($this->trip->status)->toBe(TripStatus::CANCELLED);
});

/*
|==========================================================================
| KATEGORI 4 — DISPATCH: Assign/Update/Unassign Mitra
|==========================================================================
*/

it('assign mitra ke trip sukses', function () {
    $mitra2 = User::factory()->mitra()->create(['must_change_password' => false]);

    $this->actingAs($this->admin)
        ->post(route('admin.trips.assign-mitra', $this->trip->id), [
            'mitra_id' => $mitra2->id,
            'role' => 'asisten',
            'honor' => 300000,
            'honor_tipe' => 'flat',
            'instruksi' => 'Bantu lead',
        ])
        ->assertRedirect(route('admin.trips.show', $this->trip->id));

    $this->assertDatabaseHas('trip_mitras', [
        'trip_id' => $this->trip->id,
        'mitra_id' => $mitra2->id,
        'role' => 'asisten',
    ]);
});

it('update mitra assignment sukses', function () {
    $this->actingAs($this->admin)
        ->put(route('admin.trips.update-mitra', [
            'trip' => $this->trip->id,
            'tripMitra' => $this->tripMitra->id,
        ]), [
            'role' => 'lead',
            'honor' => 750000,
            'honor_tipe' => 'flat',
            'instruksi' => 'Updated',
        ])
        ->assertRedirect(route('admin.trips.show', $this->trip->id));

    $this->tripMitra->refresh();
    expect((float) $this->tripMitra->honor)->toBe(750000.0);
});

it('unassign mitra sukses', function () {
    // Set trip scheduled dulu (bukan active)
    $this->trip->update(['status' => TripStatus::SCHEDULED]);

    $this->actingAs($this->admin)
        ->delete(route('admin.trips.unassign-mitra', [
            'trip' => $this->trip->id,
            'tripMitra' => $this->tripMitra->id,
        ]))
        ->assertRedirect(route('admin.trips.show', $this->trip->id));

    $this->assertDatabaseMissing('trip_mitras', [
        'id' => $this->tripMitra->id,
    ]);
});

/*
|==========================================================================
| KATEGORI 5 — ERROR HANDLING
|==========================================================================
*/

it('activate trip throw jika status bukan scheduled', function () {
    $this->trip->update(['status' => TripStatus::ACTIVE]);

    $response = $this->actingAs($this->admin)
        ->post(route('admin.trips.activate', $this->trip->id));

    $response->assertSessionHasErrors();
});

it('cancel trip validasi alasan < 5 karakter ditolak', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.trips.cancel', $this->trip->id), [
            'alasan' => 'abc',
        ])
        ->assertSessionHasErrors('alasan');
});

it('update mitra dengan trip_id mismatch return 404', function () {
    // Buat booking + trip baru
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
    ]);

    $this->actingAs($this->admin)
        ->put(route('admin.trips.update-mitra', [
            'trip' => $otherTrip->id,
            'tripMitra' => $this->tripMitra->id,
        ]), [
            'role' => 'lead',
            'honor' => 500000,
        ])
        ->assertNotFound();
});

/*
|==========================================================================
| KATEGORI 6 — ROUTE MIDDLEWARE
|==========================================================================
*/

it('route admin.trips.index pakai middleware auth, password.changed, role:admin', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'admin.trips.index');

    expect($route)->not->toBeNull();
    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:admin');
});

it('route admin.trips.activate pakai middleware auth, password.changed, role:admin', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'admin.trips.activate');

    expect($route)->not->toBeNull();
    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:admin');
});

/*
|==========================================================================
| KATEGORI 7 — BEHAVIORAL: Service Dipanggil
|==========================================================================
*/

it('activate memanggil TripService::activate', function () {
    $service = Mockery::mock(TripService::class);
    $service->shouldReceive('activate')
        ->once()
        ->with(Mockery::on(fn ($t) => $t->id === $this->trip->id))
        ->andReturn($this->trip);

    // Juga butuh TripService yang lain — handle via container
    $this->app->instance(TripService::class, $service);

    $this->actingAs($this->admin)
        ->post(route('admin.trips.activate', $this->trip->id))
        ->assertRedirect();
});

it('cancel memanggil TripService::cancel dengan alasan benar', function () {
    $service = Mockery::mock(TripService::class);
    $service->shouldReceive('cancel')
        ->once()
        ->with(
            Mockery::on(fn ($t) => $t->id === $this->trip->id),
            'Cuaca buruk',
        )
        ->andReturn($this->trip);

    $this->app->instance(TripService::class, $service);

    $this->actingAs($this->admin)
        ->post(route('admin.trips.cancel', $this->trip->id), [
            'alasan' => 'Cuaca buruk',
        ])
        ->assertRedirect();
});

/*
|==========================================================================
| KATEGORI 8 — BVA: Validasi Request
|==========================================================================
*/

it('cancel trip sukses dengan alasan TEPAT 5 karakter (boundary bawah)', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.trips.cancel', $this->trip->id), [
            'alasan' => 'abcde',
        ])
        ->assertRedirect(route('admin.trips.show', $this->trip->id));
});

it('cancel trip sukses dengan alasan TEPAT 1000 karakter (boundary atas)', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.trips.cancel', $this->trip->id), [
            'alasan' => str_repeat('a', 1000),
        ])
        ->assertRedirect(route('admin.trips.show', $this->trip->id));
});

it('cancel trip gagal dengan alasan 1001 karakter (boundary atas + 1)', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.trips.cancel', $this->trip->id), [
            'alasan' => str_repeat('a', 1001),
        ])
        ->assertSessionHasErrors('alasan');
});

/*
|==========================================================================
| KATEGORI 9 — EDGE CASES
|==========================================================================
*/

it('index menampilkan statusCounts dengan jumlah benar', function () {
    // Buat booking + trip baru
    $otherBooking = Booking::factory()->create([
        'user_id' => $this->client->id,
        'package_id' => $this->package->id,
        'status' => BookingStatus::CONFIRMED,
        'tanggal_keberangkatan' => now()->addDays(14)->format('Y-m-d'),
    ]);

    Trip::factory()->create([
        'booking_id' => $otherBooking->id,
        'package_id' => $this->package->id,
        'kode' => 'TRP-2026-OTHER',
        'tanggal_mulai' => now()->addDays(14)->format('Y-m-d'),
        'status' => TripStatus::ACTIVE,
    ]);

    $response = $this->actingAs($this->admin)->get(route('admin.trips.index'));

    $response->assertInertia(fn ($page) => $page
        ->where('statusCounts.scheduled', 1)
        ->where('statusCounts.active', 1)
    );
});

it('show trip load relasi package, booking, mitras, days', function () {
    $response = $this->actingAs($this->admin)
        ->get(route('admin.trips.show', $this->trip->id));

    $response->assertInertia(fn ($page) => $page
        ->has('trip.package')
        ->has('trip.booking')
        ->has('trip.mitras')
        ->has('trip.days')
    );
});
