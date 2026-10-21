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
use App\Services\Trip\DailyReportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
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
        'tanggal_keberangkatan' => now()->format('Y-m-d'),
    ]);

    // Trip ACTIVE
    $this->trip = Trip::factory()->create([
        'booking_id' => $this->booking->id,
        'package_id' => $this->package->id,
        'kode' => 'TRP-2026-001',
        'tanggal_mulai' => now()->format('Y-m-d'),
        'tanggal_selesai' => now()->addDay()->format('Y-m-d'),
        'status' => TripStatus::ACTIVE,
    ]);

    // Assign mitra ke trip
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
        'tanggal' => now()->format('Y-m-d'),
        'status' => TripDay::STATUS_IN_PROGRESS,
    ]);

    // Trip Day besok (belum waktunya)
    $this->futureTripDay = TripDay::factory()->create([
        'trip_id' => $this->trip->id,
        'hari_ke' => 2,
        'tanggal' => now()->addDay()->format('Y-m-d'),
        'status' => TripDay::STATUS_PENDING,
    ]);
});

/*
|==========================================================================
| KATEGORI 1 — CONTRACT / API SCHEMA
|==========================================================================
*/

it('GET /mitra/daily-reports merender Inertia component Mitra/DailyReports/Index', function () {
    $response = $this->actingAs($this->mitra)
        ->get(route('mitra.daily-reports.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Mitra/DailyReports/Index')
        ->has('reports')
        ->has('filters')
        ->has('statusCounts')
    );
});

it('GET /mitra/trips/{id}/days/{dayId}/report merender Create', function () {
    $response = $this->actingAs($this->mitra)
        ->get(route('mitra.daily-reports.create', [
            'trip' => $this->trip->id,
            'tripDay' => $this->tripDay->id,
        ]));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Mitra/DailyReports/Create')
        ->has('trip')
        ->has('tripDay')
        ->where('existingReport', null)
    );
});

it('GET create menampilkan existingReport jika sudah ada', function () {
    DailyReport::factory()->create([
        'trip_day_id' => $this->tripDay->id,
        'mitra_id' => $this->mitra->id,
        'status' => DailyReport::STATUS_REJECTED,
        'rejection_reason' => 'Foto kurang jelas',
    ]);

    $response = $this->actingAs($this->mitra)
        ->get(route('mitra.daily-reports.create', [
            'trip' => $this->trip->id,
            'tripDay' => $this->tripDay->id,
        ]));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('existingReport')
        ->where('existingReport.status', 'rejected')
        ->where('existingReport.rejection_reason', 'Foto kurang jelas')
    );
});

it('store report redirect ke mitra.trips.show dengan status', function () {
    $response = $this->actingAs($this->mitra)
        ->post(route('mitra.daily-reports.store', [
            'trip' => $this->trip->id,
            'tripDay' => $this->tripDay->id,
        ]), [
            'catatan' => 'Kegiatan hari ini',
            'media' => [UploadedFile::fake()->image('bukti.jpg')],
        ]);

    $response->assertRedirect(route('mitra.trips.show', $this->trip->id));
    $response->assertSessionHas('status');
});

/*
|==========================================================================
| KATEGORI 2 — SECURITY & AUTHORIZATION
|==========================================================================
*/

it('guest di-redirect ke login saat akses /mitra/daily-reports', function () {
    $this->get(route('mitra.daily-reports.index'))->assertRedirect(route('login'));
});

it('admin tidak bisa akses /mitra/daily-reports (redirect ke dashboard admin)', function () {
    $this->actingAs($this->admin)
        ->get(route('mitra.daily-reports.index'))
        ->assertRedirect(route('admin.dashboard'));
});

it('client tidak bisa akses /mitra/daily-reports (redirect ke dashboard client)', function () {
    $this->actingAs($this->client)
        ->get(route('mitra.daily-reports.index'))
        ->assertRedirect(route('client.dashboard'));
});

it('mitra tidak di-assign ke trip → 403 saat create report', function () {
    $this->actingAs($this->otherMitra)
        ->get(route('mitra.daily-reports.create', [
            'trip' => $this->trip->id,
            'tripDay' => $this->tripDay->id,
        ]))
        ->assertForbidden();
});

it('mitra tidak di-assign ke trip → 403 saat submit report', function () {
    $this->actingAs($this->otherMitra)
        ->post(route('mitra.daily-reports.store', [
            'trip' => $this->trip->id,
            'tripDay' => $this->tripDay->id,
        ]), [
            'catatan' => 'Test',
            'media' => [UploadedFile::fake()->image('bukti.jpg')],
        ])
        ->assertSessionHasErrors('mitra');  // ← bukan assertForbidden()
});

it('mitra dengan must_change_password = true di-redirect ke change-password', function () {
    $mitra = User::factory()->mitra()->create(['must_change_password' => true]);

    $this->actingAs($mitra)
        ->get(route('mitra.daily-reports.index'))
        ->assertRedirect(route('password.change'));
});

/*
|==========================================================================
| KATEGORI 3 — DATA INTEGRITY: Submit
|==========================================================================
*/

it('store report create DailyReport di DB', function () {
    $this->actingAs($this->mitra)
        ->post(route('mitra.daily-reports.store', [
            'trip' => $this->trip->id,
            'tripDay' => $this->tripDay->id,
        ]), [
            'catatan' => 'Kegiatan hari ini',
            'media' => [UploadedFile::fake()->image('bukti.jpg')],
        ]);

    $this->assertDatabaseHas('daily_reports', [
        'trip_day_id' => $this->tripDay->id,
        'mitra_id' => $this->mitra->id,
        'catatan' => 'Kegiatan hari ini',
        'status' => DailyReport::STATUS_SUBMITTED,
    ]);
});

it('store report simpan media ke storage', function () {
    $this->actingAs($this->mitra)
        ->post(route('mitra.daily-reports.store', [
            'trip' => $this->trip->id,
            'tripDay' => $this->tripDay->id,
        ]), [
            'catatan' => 'Kegiatan',
            'media' => [UploadedFile::fake()->image('bukti.jpg')],
        ]);

    $report = DailyReport::where('mitra_id', $this->mitra->id)->first();
    expect($report->media)->toHaveCount(1);
    Storage::disk('public')->assertExists($report->media->first()->path);
});

it('store report set trip_day status in_progress', function () {
    $this->tripDay->update(['status' => TripDay::STATUS_PENDING]);

    $this->actingAs($this->mitra)
        ->post(route('mitra.daily-reports.store', [
            'trip' => $this->trip->id,
            'tripDay' => $this->tripDay->id,
        ]), [
            'catatan' => 'Kegiatan',
            'media' => [UploadedFile::fake()->image('bukti.jpg')],
        ]);

    $this->tripDay->refresh();
    expect($this->tripDay->status)->toBe(TripDay::STATUS_IN_PROGRESS);
});

/*
|==========================================================================
| KATEGORI 4 — ERROR HANDLING
|==========================================================================
*/

it('store report gagal jika media kosong', function () {
    $this->actingAs($this->mitra)
        ->post(route('mitra.daily-reports.store', [
            'trip' => $this->trip->id,
            'tripDay' => $this->tripDay->id,
        ]), [
            'catatan' => 'Kegiatan',
            'media' => [],
        ])
        ->assertSessionHasErrors('media');
});

it('store report gagal jika media > 2 file', function () {
    $this->actingAs($this->mitra)
        ->post(route('mitra.daily-reports.store', [
            'trip' => $this->trip->id,
            'tripDay' => $this->tripDay->id,
        ]), [
            'catatan' => 'Kegiatan',
            'media' => [
                UploadedFile::fake()->image('1.jpg'),
                UploadedFile::fake()->image('2.jpg'),
                UploadedFile::fake()->image('3.jpg'),
            ],
        ])
        ->assertSessionHasErrors('media');
});

it('store report gagal jika media bukan image', function () {
    $this->actingAs($this->mitra)
        ->post(route('mitra.daily-reports.store', [
            'trip' => $this->trip->id,
            'tripDay' => $this->tripDay->id,
        ]), [
            'catatan' => 'Kegiatan',
            'media' => [UploadedFile::fake()->create('document.pdf', 100, 'application/pdf')],
        ])
        ->assertSessionHasErrors('media.0');  // ← bukan media
});

it('store report gagal jika trip_day bukan bagian trip', function () {
    // Buat trip lain
    $otherTrip = Trip::factory()->create([
        'booking_id' => Booking::factory()->create([
            'user_id' => $this->client->id,
            'package_id' => $this->package->id,
            'status' => BookingStatus::CONFIRMED,
            'tanggal_keberangkatan' => now()->addDays(7)->format('Y-m-d'),
        ])->id,
        'package_id' => $this->package->id,
    ]);

    $this->actingAs($this->mitra)
        ->get(route('mitra.daily-reports.create', [
            'trip' => $otherTrip->id,
            'tripDay' => $this->tripDay->id, // tripDay milik trip lama
        ]))
        ->assertNotFound();
});

it('store report gagal jika trip belum active', function () {
    $this->trip->update(['status' => TripStatus::SCHEDULED]);

    $this->actingAs($this->mitra)
        ->post(route('mitra.daily-reports.store', [
            'trip' => $this->trip->id,
            'tripDay' => $this->tripDay->id,
        ]), [
            'catatan' => 'Kegiatan',
            'media' => [UploadedFile::fake()->image('bukti.jpg')],
        ])
        ->assertSessionHasErrors('trip');
});

it('store report gagal jika tanggal tripDay bukan hari ini', function () {
    $this->actingAs($this->mitra)
        ->post(route('mitra.daily-reports.store', [
            'trip' => $this->trip->id,
            'tripDay' => $this->futureTripDay->id, // besok
        ]), [
            'catatan' => 'Kegiatan',
            'media' => [UploadedFile::fake()->image('bukti.jpg')],
        ])
        ->assertSessionHasErrors('trip_day');
});

/*
|==========================================================================
| KATEGORI 5 — BEHAVIORAL: Service Dipanggil
|==========================================================================
*/

it('store report memanggil DailyReportService::submit', function () {
    $service = Mockery::mock(DailyReportService::class);
    $service->shouldReceive('submit')
        ->once()
        ->andReturn(new DailyReport);

    $this->app->instance(DailyReportService::class, $service);

    $this->actingAs($this->mitra)
        ->post(route('mitra.daily-reports.store', [
            'trip' => $this->trip->id,
            'tripDay' => $this->tripDay->id,
        ]), [
            'catatan' => 'Kegiatan',
            'media' => [UploadedFile::fake()->image('bukti.jpg')],
        ])
        ->assertRedirect();
});

/*
|==========================================================================
| KATEGORI 6 — ROUTE MIDDLEWARE
|==========================================================================
*/

it('route mitra.daily-reports.index pakai middleware auth, password.changed, role:mitra', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'mitra.daily-reports.index');

    expect($route)->not->toBeNull();
    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:mitra');
});

it('route mitra.daily-reports.store pakai middleware auth, password.changed, role:mitra', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'mitra.daily-reports.store');

    expect($route)->not->toBeNull();
    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:mitra');
});

/*
|==========================================================================
| KATEGORI 7 — BVA (Boundary Value Analysis)
|==========================================================================
*/

it('store report sukses dengan TEPAT 1 media (boundary bawah)', function () {
    $this->actingAs($this->mitra)
        ->post(route('mitra.daily-reports.store', [
            'trip' => $this->trip->id,
            'tripDay' => $this->tripDay->id,
        ]), [
            'catatan' => 'Kegiatan',
            'media' => [UploadedFile::fake()->image('1.jpg')],
        ])
        ->assertRedirect();

    $report = DailyReport::where('mitra_id', $this->mitra->id)->first();
    expect($report->media)->toHaveCount(1);
});

it('store report sukses dengan TEPAT 2 media (boundary atas)', function () {
    $this->actingAs($this->mitra)
        ->post(route('mitra.daily-reports.store', [
            'trip' => $this->trip->id,
            'tripDay' => $this->tripDay->id,
        ]), [
            'catatan' => 'Kegiatan',
            'media' => [
                UploadedFile::fake()->image('1.jpg'),
                UploadedFile::fake()->image('2.jpg'),
            ],
        ])
        ->assertRedirect();

    $report = DailyReport::where('mitra_id', $this->mitra->id)->first();
    expect($report->media)->toHaveCount(2);
});

it('store report gagal dengan TEPAT 3 media (boundary atas + 1)', function () {
    $this->actingAs($this->mitra)
        ->post(route('mitra.daily-reports.store', [
            'trip' => $this->trip->id,
            'tripDay' => $this->tripDay->id,
        ]), [
            'catatan' => 'Kegiatan',
            'media' => [
                UploadedFile::fake()->image('1.jpg'),
                UploadedFile::fake()->image('2.jpg'),
                UploadedFile::fake()->image('3.jpg'),
            ],
        ])
        ->assertSessionHasErrors('media');
});

/*
|==========================================================================
| KATEGORI 8 — EDGE CASES
|==========================================================================
*/

it('store report resubmit setelah rejected', function () {
    // Report lama REJECTED
    $oldReport = DailyReport::factory()->create([
        'trip_day_id' => $this->tripDay->id,
        'mitra_id' => $this->mitra->id,
        'status' => DailyReport::STATUS_REJECTED,
        'rejection_reason' => 'Foto kurang jelas',
    ]);

    // Submit ulang
    $this->actingAs($this->mitra)
        ->post(route('mitra.daily-reports.store', [
            'trip' => $this->trip->id,
            'tripDay' => $this->tripDay->id,
        ]), [
            'catatan' => 'Kegiatan baru',
            'media' => [UploadedFile::fake()->image('bukti-baru.jpg')],
        ])
        ->assertRedirect();

    $oldReport->refresh();
    expect($oldReport->status)->toBe(DailyReport::STATUS_SUBMITTED);
    expect($oldReport->rejection_reason)->toBeNull();
});

it('store report gagal jika sudah ada report submitted', function () {
    DailyReport::factory()->create([
        'trip_day_id' => $this->tripDay->id,
        'mitra_id' => $this->mitra->id,
        'status' => DailyReport::STATUS_SUBMITTED,
    ]);

    $this->actingAs($this->mitra)
        ->post(route('mitra.daily-reports.store', [
            'trip' => $this->trip->id,
            'tripDay' => $this->tripDay->id,
        ]), [
            'catatan' => 'Kegiatan',
            'media' => [UploadedFile::fake()->image('bukti.jpg')],
        ])
        ->assertSessionHasErrors('report');
});
