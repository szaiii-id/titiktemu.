<?php

use App\Enums\PackageFacilityTipe;
use App\Enums\PackageKategori;
use App\Enums\PackageStatus;
use App\Models\Package;
use App\Models\PackageFacility;
use App\Models\User;
use App\Services\Package\PackageFacilityService;
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
        'status' => PackageStatus::DRAFT,
        'kategori' => PackageKategori::WISATA_ALAM,
        'timezone' => 'Asia/Makassar',
        'durasi_hari' => 2,
        'durasi_malam' => 1,
        'created_by' => $this->admin->id,
    ]);

    // Existing facility (include)
    $this->facility = PackageFacility::factory()->create([
        'package_id' => $this->package->id,
        'tipe' => PackageFacilityTipe::INCLUDE->value,
        'nama' => 'Transportasi',
        'urutan' => 1,
    ]);
});

/*
|==========================================================================
| KATEGORI 1 — CONTRACT / API SCHEMA
|==========================================================================
*/

it('store facility redirect ke admin.packages.show dengan status', function () {
    $response = $this->actingAs($this->admin)
        ->post(route('admin.packages.facilities.store', $this->package->id), [
            'tipe' => PackageFacilityTipe::INCLUDE->value,
            'nama' => 'Makan Siang',
        ]);

    $response->assertRedirect(route('admin.packages.show', $this->package->id));
    $response->assertSessionHas('status');
});

it('update facility redirect ke admin.packages.show', function () {
    $response = $this->actingAs($this->admin)
        ->put(route('admin.package-facilities.update', $this->facility->id), [
            'tipe' => PackageFacilityTipe::EXCLUDE->value, // ✅ pakai ->value
            'nama' => 'Transportasi (Tidak Termasuk)',
        ]);

    $response->assertRedirect(route('admin.packages.show', $this->package->id));
    $response->assertSessionHas('status');
});

it('destroy facility redirect ke admin.packages.show', function () {
    $response = $this->actingAs($this->admin)
        ->delete(route('admin.package-facilities.destroy', $this->facility->id));

    $response->assertRedirect(route('admin.packages.show', $this->package->id));
    $response->assertSessionHas('status');
});

/*
|==========================================================================
| KATEGORI 2 — SECURITY & AUTHORIZATION
|==========================================================================
*/

it('guest di-redirect ke login saat store facility', function () {
    $this->post(route('admin.packages.facilities.store', $this->package->id), [
        'tipe' => PackageFacilityTipe::INCLUDE->value,
        'nama' => 'Test',
    ])->assertRedirect(route('login'));
});

it('mitra tidak bisa store facility (redirect ke dashboard mitra)', function () {
    $this->actingAs($this->mitra)
        ->post(route('admin.packages.facilities.store', $this->package->id), [
            'tipe' => PackageFacilityTipe::INCLUDE->value,
            'nama' => 'Test',
        ])
        ->assertRedirect(route('mitra.dashboard'));
});

it('client tidak bisa update facility (redirect ke dashboard client)', function () {
    $this->actingAs($this->client)
        ->put(route('admin.package-facilities.update', $this->facility->id), [
            'tipe' => PackageFacilityTipe::EXCLUDE->value,
            'nama' => 'Test',
        ])
        ->assertRedirect(route('client.dashboard'));
});

it('admin dengan must_change_password = true di-redirect ke change-password', function () {
    $admin = User::factory()->admin()->create(['must_change_password' => true]);

    $this->actingAs($admin)
        ->post(route('admin.packages.facilities.store', $this->package->id), [
            'tipe' => PackageFacilityTipe::INCLUDE->value,
            'nama' => 'Test',
        ])
        ->assertRedirect(route('password.change'));
});

/*
|==========================================================================
| KATEGORI 3 — DATA INTEGRITY: Create
|==========================================================================
*/

it('store facility baru sukses', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.packages.facilities.store', $this->package->id), [
            'tipe' => PackageFacilityTipe::INCLUDE->value,
            'nama' => 'Makan Siang',
        ]);

    $this->assertDatabaseHas('package_facilities', [
        'package_id' => $this->package->id,
        'tipe' => PackageFacilityTipe::INCLUDE->value,
        'nama' => 'Makan Siang',
    ]);
});

it('store facility auto-assign urutan = max + 1', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.packages.facilities.store', $this->package->id), [
            'tipe' => PackageFacilityTipe::INCLUDE->value,
            'nama' => 'Makan Siang',
        ]);

    $newFacility = PackageFacility::where('nama', 'Makan Siang')->first();

    // Existing urutan = 1 → next = 2
    expect($newFacility->urutan)->toBe(2);
});

it('store facility urutan per-tipe (include vs exclude terpisah)', function () {
    // Existing include urutan = 1
    $this->actingAs($this->admin)
        ->post(route('admin.packages.facilities.store', $this->package->id), [
            'tipe' => PackageFacilityTipe::EXCLUDE->value,
            'nama' => 'Tiket Masuk',
        ]);

    $excludeFacility = PackageFacility::where('nama', 'Tiket Masuk')->first();

    // Karena tipe beda (exclude), urutan mulai dari 1
    expect($excludeFacility->urutan)->toBe(1);
});

/*
|==========================================================================
| KATEGORI 4 — DATA INTEGRITY: Update
|==========================================================================
*/

it('update facility sukses mengubah field', function () {
    $this->actingAs($this->admin)
        ->put(route('admin.package-facilities.update', $this->facility->id), [
            'tipe' => PackageFacilityTipe::EXCLUDE->value, // ✅ pakai ->value
            'nama' => 'Transportasi Updated',
        ]);

    $this->facility->refresh();
    expect($this->facility->nama)->toBe('Transportasi Updated');
    expect($this->facility->tipe)->toBe(PackageFacilityTipe::EXCLUDE);
});

it('update facility TIDAK mengubah urutan', function () {
    $oldUrutan = $this->facility->urutan;

    $this->actingAs($this->admin)
        ->put(route('admin.package-facilities.update', $this->facility->id), [
            'tipe' => PackageFacilityTipe::INCLUDE->value,
            'nama' => 'Updated',
        ]);

    $this->facility->refresh();
    expect($this->facility->urutan)->toBe($oldUrutan);
});

/*
|==========================================================================
| KATEGORI 5 — DATA INTEGRITY: Delete
|==========================================================================
*/

it('destroy facility sukses hapus dari DB', function () {
    $this->actingAs($this->admin)
        ->delete(route('admin.package-facilities.destroy', $this->facility->id));

    $this->assertDatabaseMissing('package_facilities', [
        'id' => $this->facility->id,
    ]);
});

/*
|==========================================================================
| KATEGORI 6 — ERROR HANDLING
|==========================================================================
*/

it('store facility validasi nama required ditolak', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.packages.facilities.store', $this->package->id), [
            'tipe' => PackageFacilityTipe::INCLUDE->value,
            'nama' => '',
        ])
        ->assertSessionHasErrors('nama');
});

it('store facility validasi tipe invalid ditolak', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.packages.facilities.store', $this->package->id), [
            'tipe' => 'invalid_tipe',
            'nama' => 'Test',
        ])
        ->assertSessionHasErrors('tipe');
});

it('store facility validasi nama minimal 2 karakter ditolak', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.packages.facilities.store', $this->package->id), [
            'tipe' => PackageFacilityTipe::INCLUDE->value,
            'nama' => 'a',
        ])
        ->assertSessionHasErrors('nama');
});

it('update facility 404 jika ID tidak ditemukan', function () {
    $this->actingAs($this->admin)
        ->put('/admin/package-facilities/9999', [
            'tipe' => PackageFacilityTipe::INCLUDE->value,
            'nama' => 'Test',
        ])
        ->assertNotFound();
});

it('store facility 404 jika package tidak ditemukan', function () {
    $this->actingAs($this->admin)
        ->post('/admin/packages/9999/facilities', [
            'tipe' => PackageFacilityTipe::INCLUDE->value,
            'nama' => 'Test',
        ])
        ->assertNotFound();
});

/*
|==========================================================================
| KATEGORI 7 — DATA INTEGRITY: Service Dipanggil
|==========================================================================
*/

it('store facility memanggil PackageFacilityService::create', function () {
    $service = Mockery::mock(PackageFacilityService::class);
    $service->shouldReceive('create')
        ->once()
        ->andReturn(new PackageFacility);

    $this->app->instance(PackageFacilityService::class, $service);

    $this->actingAs($this->admin)
        ->post(route('admin.packages.facilities.store', $this->package->id), [
            'tipe' => PackageFacilityTipe::INCLUDE->value,
            'nama' => 'Test',
        ])
        ->assertRedirect();
});

it('destroy facility memanggil PackageFacilityService::delete', function () {
    $service = Mockery::mock(PackageFacilityService::class);
    $service->shouldReceive('delete')
        ->once()
        ->with(Mockery::on(fn ($f) => $f->id === $this->facility->id));

    $this->app->instance(PackageFacilityService::class, $service);

    $this->actingAs($this->admin)
        ->delete(route('admin.package-facilities.destroy', $this->facility->id))
        ->assertRedirect();
});

/*
|==========================================================================
| KATEGORI 8 — ROUTE MIDDLEWARE
|==========================================================================
*/

it('route admin.packages.facilities.store pakai middleware auth, password.changed, role:admin', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'admin.packages.facilities.store');

    expect($route)->not->toBeNull();
    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:admin');
});

it('route admin.package-facilities.destroy pakai middleware auth, password.changed, role:admin', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'admin.package-facilities.destroy');

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

it('store facility sukses dengan nama TEPAT 2 karakter (boundary bawah)', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.packages.facilities.store', $this->package->id), [
            'tipe' => PackageFacilityTipe::INCLUDE->value,
            'nama' => 'ab',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('package_facilities', [
        'package_id' => $this->package->id,
        'nama' => 'ab',
    ]);
});

it('store facility sukses dengan nama TEPAT 255 karakter (boundary atas)', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.packages.facilities.store', $this->package->id), [
            'tipe' => PackageFacilityTipe::INCLUDE->value,
            'nama' => str_repeat('a', 255),
        ])
        ->assertRedirect();
});

it('store facility gagal dengan nama 256 karakter (boundary atas + 1)', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.packages.facilities.store', $this->package->id), [
            'tipe' => PackageFacilityTipe::INCLUDE->value,
            'nama' => str_repeat('a', 256),
        ])
        ->assertSessionHasErrors('nama');
});

/*
|==========================================================================
| KATEGORI 10 — EDGE CASES
|==========================================================================
*/

it('store facility sukses dengan semua tipe valid', function () {
    $tipeList = PackageFacilityTipe::values();

    foreach ($tipeList as $tipe) {
        $this->actingAs($this->admin)
            ->post(route('admin.packages.facilities.store', $this->package->id), [
                'tipe' => $tipe,
                'nama' => 'Test '.$tipe,
            ])
            ->assertRedirect();
    }

    // Assert count = existing 1 + N tipe
    expect(PackageFacility::where('package_id', $this->package->id)->count())
        ->toBe(1 + count($tipeList));
});

it('destroy facility dengan costs tidak error', function () {
    // Facility tidak punya child, jadi langsung hapus
    $this->actingAs($this->admin)
        ->delete(route('admin.package-facilities.destroy', $this->facility->id))
        ->assertRedirect();

    $this->assertDatabaseMissing('package_facilities', [
        'id' => $this->facility->id,
    ]);
});
