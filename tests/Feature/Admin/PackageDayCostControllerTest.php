<?php

use App\Enums\PackageDayCostKategori;
use App\Enums\PackageDayCostSatuan;
use App\Enums\PackageKategori;
use App\Enums\PackageStatus;
use App\Models\Package;
use App\Models\PackageDay;
use App\Models\PackageDayCost;
use App\Models\User;
use App\Services\Package\PackageDayCostService;
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

    // Day
    $this->day = PackageDay::factory()->create([
        'package_id' => $this->package->id,
        'hari_ke' => 1,
        'judul' => 'Day 1',
    ]);

    // Existing cost (untuk test update/delete)
    $this->cost = PackageDayCost::factory()->create([
        'package_day_id' => $this->day->id,
        'nama_biaya' => 'Makan Siang',
        'kategori' => PackageDayCostKategori::KONSUMSI,
        'jumlah' => '50000.00',
        'satuan' => PackageDayCostSatuan::PER_ORANG,
        'catatan' => null,
    ]);
});

/*
|==========================================================================
| KATEGORI 1 — CONTRACT / API SCHEMA
|==========================================================================
*/

it('store cost redirect ke admin.packages.show dengan status', function () {
    $response = $this->actingAs($this->admin)
        ->post(route('admin.package-days.costs.store', $this->day->id), [
            'nama_biaya' => 'Transportasi',
            'kategori' => PackageDayCostKategori::TRANSPORTASI->value,
            'jumlah' => 100000,
            'satuan' => PackageDayCostSatuan::TOTAL->value,
        ]);

    $response->assertRedirect(route('admin.packages.show', $this->package->id));
    $response->assertSessionHas('status');
});

it('update cost redirect ke admin.packages.show', function () {
    $response = $this->actingAs($this->admin)
        ->put(route('admin.package-day-costs.update', $this->cost->id), [
            'nama_biaya' => 'Makan Malam',
            'kategori' => PackageDayCostKategori::KONSUMSI->value,
            'jumlah' => 75000,
            'satuan' => PackageDayCostSatuan::PER_ORANG->value,
        ]);

    $response->assertRedirect(route('admin.packages.show', $this->package->id));
    $response->assertSessionHas('status');
});

it('destroy cost redirect ke admin.packages.show', function () {
    $response = $this->actingAs($this->admin)
        ->delete(route('admin.package-day-costs.destroy', $this->cost->id));

    $response->assertRedirect(route('admin.packages.show', $this->package->id));
    $response->assertSessionHas('status');
});

/*
|==========================================================================
| KATEGORI 2 — SECURITY & AUTHORIZATION
|==========================================================================
*/

it('guest di-redirect ke login saat store cost', function () {
    $this->post(route('admin.package-days.costs.store', $this->day->id), [
        'nama_biaya' => 'Test',
    ])->assertRedirect(route('login'));
});

it('mitra tidak bisa store cost (redirect ke dashboard mitra)', function () {
    $this->actingAs($this->mitra)
        ->post(route('admin.package-days.costs.store', $this->day->id), [
            'nama_biaya' => 'Test',
        ])
        ->assertRedirect(route('mitra.dashboard'));
});

it('client tidak bisa update cost (redirect ke dashboard client)', function () {
    $this->actingAs($this->client)
        ->put(route('admin.package-day-costs.update', $this->cost->id), [
            'nama_biaya' => 'Test',
        ])
        ->assertRedirect(route('client.dashboard'));
});

it('admin dengan must_change_password = true di-redirect ke change-password', function () {
    $admin = User::factory()->admin()->create(['must_change_password' => true]);

    $this->actingAs($admin)
        ->post(route('admin.package-days.costs.store', $this->day->id), [
            'nama_biaya' => 'Test',
        ])
        ->assertRedirect(route('password.change'));
});

/*
|==========================================================================
| KATEGORI 3 — DATA INTEGRITY: Create
|==========================================================================
*/

it('store cost baru sukses', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.package-days.costs.store', $this->day->id), [
            'nama_biaya' => 'Transportasi',
            'kategori' => PackageDayCostKategori::TRANSPORTASI->value,
            'jumlah' => 200000,
            'satuan' => PackageDayCostSatuan::TOTAL->value,
            'catatan' => 'Bus pariwisata',
        ]);

    $this->assertDatabaseHas('package_day_costs', [
        'package_day_id' => $this->day->id,
        'nama_biaya' => 'Transportasi',
        'catatan' => 'Bus pariwisata',
    ]);
});

it('store cost dengan catatan null sukses', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.package-days.costs.store', $this->day->id), [
            'nama_biaya' => 'Snack',
            'kategori' => PackageDayCostKategori::KONSUMSI->value,
            'jumlah' => 10000,
            'satuan' => PackageDayCostSatuan::PER_ORANG->value,
        ])
        ->assertRedirect();

    $newCost = PackageDayCost::where('nama_biaya', 'Snack')->first();
    expect($newCost->catatan)->toBeNull();
});

/*
|==========================================================================
| KATEGORI 4 — DATA INTEGRITY: Update
|==========================================================================
*/

it('update cost sukses mengubah field', function () {
    $this->actingAs($this->admin)
        ->put(route('admin.package-day-costs.update', $this->cost->id), [
            'nama_biaya' => 'Makan Malam',
            'kategori' => PackageDayCostKategori::KONSUMSI->value,
            'jumlah' => 75000,
            'satuan' => PackageDayCostSatuan::PER_ORANG->value,
            'catatan' => 'Updated',
        ]);

    $this->cost->refresh();
    expect($this->cost->nama_biaya)->toBe('Makan Malam');
    expect((float) $this->cost->jumlah)->toBe(75000.0);
    expect($this->cost->catatan)->toBe('Updated');
});

it('update cost dengan catatan null sukses', function () {
    $this->actingAs($this->admin)
        ->put(route('admin.package-day-costs.update', $this->cost->id), [
            'nama_biaya' => 'Snack',
            'kategori' => PackageDayCostKategori::KONSUMSI->value,
            'jumlah' => 5000,
            'satuan' => PackageDayCostSatuan::TOTAL->value,
        ]);

    $this->cost->refresh();
    expect($this->cost->catatan)->toBeNull();
});

/*
|==========================================================================
| KATEGORI 5 — DATA INTEGRITY: Delete
|==========================================================================
*/

it('destroy cost sukses hapus dari DB', function () {
    $this->actingAs($this->admin)
        ->delete(route('admin.package-day-costs.destroy', $this->cost->id));

    $this->assertDatabaseMissing('package_day_costs', [
        'id' => $this->cost->id,
    ]);
});

/*
|==========================================================================
| KATEGORI 6 — ERROR HANDLING
|==========================================================================
*/

it('store cost validasi nama_biaya required ditolak', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.package-days.costs.store', $this->day->id), [
            'nama_biaya' => '',
        ])
        ->assertSessionHasErrors('nama_biaya');
});

it('store cost validasi jumlah negatif ditolak', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.package-days.costs.store', $this->day->id), [
            'nama_biaya' => 'Test',
            'kategori' => PackageDayCostKategori::KONSUMSI->value,
            'jumlah' => -1000,
            'satuan' => PackageDayCostSatuan::TOTAL->value,
        ])
        ->assertSessionHasErrors('jumlah');
});

it('store cost validasi kategori invalid ditolak', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.package-days.costs.store', $this->day->id), [
            'nama_biaya' => 'Test',
            'kategori' => 'invalid_kategori',
            'jumlah' => 50000,
            'satuan' => PackageDayCostSatuan::TOTAL->value,
        ])
        ->assertSessionHasErrors('kategori');
});

it('store cost validasi satuan invalid ditolak', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.package-days.costs.store', $this->day->id), [
            'nama_biaya' => 'Test',
            'kategori' => PackageDayCostKategori::KONSUMSI->value,
            'jumlah' => 50000,
            'satuan' => 'invalid_satuan',
        ])
        ->assertSessionHasErrors('satuan');
});

it('update cost 404 jika ID tidak ditemukan', function () {
    $this->actingAs($this->admin)
        ->put('/admin/package-day-costs/9999', [
            'nama_biaya' => 'Test',
        ])
        ->assertNotFound();
});

/*
|==========================================================================
| KATEGORI 7 — DATA INTEGRITY: Service Dipanggil
|==========================================================================
*/

it('store cost memanggil PackageDayCostService::create', function () {
    $service = Mockery::mock(PackageDayCostService::class);
    $service->shouldReceive('create')
        ->once()
        ->andReturn(new PackageDayCost);

    $this->app->instance(PackageDayCostService::class, $service);

    $this->actingAs($this->admin)
        ->post(route('admin.package-days.costs.store', $this->day->id), [
            'nama_biaya' => 'Test',
            'kategori' => PackageDayCostKategori::KONSUMSI->value,
            'jumlah' => 50000,
            'satuan' => PackageDayCostSatuan::TOTAL->value,
        ])
        ->assertRedirect();
});

it('destroy cost memanggil PackageDayCostService::delete', function () {
    $service = Mockery::mock(PackageDayCostService::class);
    $service->shouldReceive('delete')
        ->once()
        ->with(Mockery::on(fn ($c) => $c->id === $this->cost->id));

    $this->app->instance(PackageDayCostService::class, $service);

    $this->actingAs($this->admin)
        ->delete(route('admin.package-day-costs.destroy', $this->cost->id))
        ->assertRedirect();
});

/*
|==========================================================================
| KATEGORI 8 — ROUTE MIDDLEWARE
|==========================================================================
*/

it('route admin.package-days.costs.store pakai middleware auth, password.changed, role:admin', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'admin.package-days.costs.store');

    expect($route)->not->toBeNull();
    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:admin');
});

it('route admin.package-day-costs.destroy pakai middleware auth, password.changed, role:admin', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'admin.package-day-costs.destroy');

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

it('store cost sukses dengan jumlah = 0 (boundary bawah)', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.package-days.costs.store', $this->day->id), [
            'nama_biaya' => 'Gratis',
            'kategori' => PackageDayCostKategori::KONSUMSI->value,
            'jumlah' => 0,
            'satuan' => PackageDayCostSatuan::TOTAL->value,
        ])
        ->assertRedirect();
});

it('store cost sukses dengan jumlah = 9999999999.99 (boundary atas)', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.package-days.costs.store', $this->day->id), [
            'nama_biaya' => 'Extreme',
            'kategori' => PackageDayCostKategori::KONSUMSI->value,
            'jumlah' => 9999999999.99,
            'satuan' => PackageDayCostSatuan::TOTAL->value,
        ])
        ->assertRedirect();
});

it('store cost gagal dengan jumlah > 9999999999.99', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.package-days.costs.store', $this->day->id), [
            'nama_biaya' => 'Terlalu Extreme',
            'kategori' => PackageDayCostKategori::KONSUMSI->value,
            'jumlah' => 10000000000.00,
            'satuan' => PackageDayCostSatuan::TOTAL->value,
        ])
        ->assertSessionHasErrors('jumlah');
});

/*
|==========================================================================
| KATEGORI 10 — EDGE CASES
|==========================================================================
*/

it('store cost sukses dengan semua kategori valid', function () {
    $kategoriList = PackageDayCostKategori::values();

    foreach ($kategoriList as $kategori) {
        $this->actingAs($this->admin)
            ->post(route('admin.package-days.costs.store', $this->day->id), [
                'nama_biaya' => 'Test '.$kategori,
                'kategori' => $kategori,
                'jumlah' => 50000,
                'satuan' => PackageDayCostSatuan::TOTAL->value,
            ])
            ->assertRedirect();
    }

    // Assert count = existing 1 + N kategori
    expect(PackageDayCost::where('package_day_id', $this->day->id)->count())
        ->toBe(1 + count($kategoriList));
});

it('store cost sukses dengan semua satuan valid', function () {
    $satuanList = PackageDayCostSatuan::values();

    foreach ($satuanList as $satuan) {
        $this->actingAs($this->admin)
            ->post(route('admin.package-days.costs.store', $this->day->id), [
                'nama_biaya' => 'Test '.$satuan,
                'kategori' => PackageDayCostKategori::KONSUMSI->value,
                'jumlah' => 50000,
                'satuan' => $satuan,
            ])
            ->assertRedirect();
    }

    // Assert count = existing 1 + N satuan
    expect(PackageDayCost::where('package_day_id', $this->day->id)->count())
        ->toBe(1 + count($satuanList));
});
