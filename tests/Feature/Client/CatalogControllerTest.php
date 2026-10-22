<?php

use App\Enums\PackageKategori;
use App\Enums\PackageStatus;
use App\Models\Package;
use App\Models\PackageDay;
use App\Models\PackageFacility;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Response;
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

    $this->client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    // Package aktif (bisa dilihat client)
    $this->activePackage = Package::factory()->create([
        'nama' => 'Paket Aktif',
        'slug' => 'paket-aktif',
        'kode' => 'PKG-AKTIF',
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

    // Package draft (tidak boleh dilihat)
    $this->draftPackage = Package::factory()->create([
        'nama' => 'Paket Draft',
        'slug' => 'paket-draft',
        'kode' => 'PKG-DRAFT',
        'status' => PackageStatus::DRAFT,
        'kategori' => PackageKategori::BUDAYA,
        'timezone' => 'Asia/Makassar',
        'harga_per_orang' => '300000.00',
    ]);

    // Package arsip (tidak boleh dilihat)
    $this->archivedPackage = Package::factory()->create([
        'nama' => 'Paket Arsip',
        'slug' => 'paket-arsip',
        'kode' => 'PKG-ARSIP',
        'status' => PackageStatus::ARSIP,
        'kategori' => PackageKategori::KULINER,
        'timezone' => 'Asia/Makassar',
        'harga_per_orang' => '400000.00',
    ]);

    // Setup days + costs + facilities untuk active package
    PackageDay::factory()->create([
        'package_id' => $this->activePackage->id,
        'hari_ke' => 1,
        'judul' => 'Day 1',
    ]);
    PackageDay::factory()->create([
        'package_id' => $this->activePackage->id,
        'hari_ke' => 2,
        'judul' => 'Day 2',
    ]);

    PackageFacility::factory()->create([
        'package_id' => $this->activePackage->id,
        'tipe' => 'include',
        'nama' => 'Transportasi',
        'urutan' => 1,
    ]);
});

/*
|==========================================================================
| KATEGORI 1 — CONTRACT / API SCHEMA
|==========================================================================
*/

it('GET /client/catalog merender Inertia component Client/Catalog/Index', function () {
    $response = $this->actingAs($this->client)->get('/client/catalog');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Client/Catalog/Index')
        ->has('packages')
        ->has('filters')
        ->where('filters.status', 'aktif')
        ->where('filters.sort', 'nama')
        ->where('filters.direction', 'asc')
    );
});

it('GET /client/catalog/{slug} merender Inertia component Client/Catalog/Show', function () {
    $response = $this->actingAs($this->client)
        ->get("/client/catalog/{$this->activePackage->slug}");

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Client/Catalog/Show')
        ->has('package')
        ->where('package.id', $this->activePackage->id)
        ->where('package.nama', 'Paket Aktif')
    );
});

/*
|==========================================================================
| KATEGORI 2 — SECURITY & AUTHORIZATION
|==========================================================================
*/

it('guest di-redirect ke login saat akses katalog', function () {
    $this->get('/client/catalog')->assertRedirect(route('login'));
});

it('guest di-redirect ke login saat akses detail paket', function () {
    $this->get("/client/catalog/{$this->activePackage->slug}")
        ->assertRedirect(route('login'));
});

it('admin di-redirect ke dashboard admin saat akses katalog', function () {
    $admin = User::factory()->admin()->create(['must_change_password' => false]);

    $this->actingAs($admin)
        ->get('/client/catalog')
        ->assertRedirect(route('admin.dashboard'));
});

it('mitra di-redirect ke dashboard mitra saat akses katalog', function () {
    $mitra = User::factory()->mitra()->create(['must_change_password' => false]);

    $this->actingAs($mitra)
        ->get('/client/catalog')
        ->assertRedirect(route('mitra.dashboard'));
});

it('client dengan must_change_password = true di-redirect ke change-password', function () {
    $client = User::factory()->client()->create(['must_change_password' => true]);

    $this->actingAs($client)
        ->get('/client/catalog')
        ->assertRedirect(route('password.change'));
});

/*
|==========================================================================
| KATEGORI 3 — DATA INTEGRITY: Filter Status
|==========================================================================
*/

it('hanya menampilkan package dengan status aktif', function () {
    $response = $this->actingAs($this->client)->get('/client/catalog');

    $response->assertInertia(fn ($page) => $page
        ->has('packages.data', 1)
        ->where('packages.data.0.id', $this->activePackage->id)
        ->where('packages.data.0.status', 'aktif')
    );
});

it('detail package draft return 404', function () {
    $this->actingAs($this->client)
        ->get("/client/catalog/{$this->draftPackage->slug}")
        ->assertNotFound();
});

it('detail package arsip return 404', function () {
    $this->actingAs($this->client)
        ->get("/client/catalog/{$this->archivedPackage->slug}")
        ->assertNotFound();
});

it('detail package aktif return 200', function () {
    $this->actingAs($this->client)
        ->get("/client/catalog/{$this->activePackage->slug}")
        ->assertOk();
});

/*
|==========================================================================
| KATEGORI 4 — ERROR HANDLING & VALIDATION
|==========================================================================
*/

it('detail package dengan slug tidak ada return 404', function () {
    $this->actingAs($this->client)
        ->get('/client/catalog/tidak-ada-slug')
        ->assertNotFound();
});

it('filter search tidak error jika kosong', function () {
    $this->actingAs($this->client)
        ->get('/client/catalog?search=')
        ->assertOk();
});

it('filter kategori invalid tidak error (diabaikan atau 0 hasil)', function () {
    $response = $this->actingAs($this->client)
        ->get('/client/catalog?kategori=invalid');

    $response->assertOk();
});

it('filter sort invalid fallback ke default', function () {
    $response = $this->actingAs($this->client)
        ->get('/client/catalog?sort=invalid_sort');

    // Tidak crash, mungkin fallback ke default atau 0 hasil
    $response->assertOk();
});

/*
|==========================================================================
| KATEGORI 5 — BEHAVIORAL: Filter & Sort
|==========================================================================
*/

it('filter search nama package', function () {
    $response = $this->actingAs($this->client)
        ->get('/client/catalog?search=Aktif');

    // Debug: cek status DULU
    if ($response->status() !== 200) {
        // Cek exception
        if ($response->exception) {
            fwrite(STDERR, "\n=== EXCEPTION ===\n");
            fwrite(STDERR, get_class($response->exception)."\n");
            fwrite(STDERR, $response->exception->getMessage()."\n");
            fwrite(STDERR, "================\n");
        }

        // Jangan panggil getSession() — mungkin null
        $session = $response->baseResponse instanceof Response
            ? $response->getSession()
            : null;

        fwrite(STDERR, 'Status: '.$response->status()."\n");
        fwrite(STDERR, 'Content: '.substr($response->getContent(), 0, 300)."\n");
    }

    $response->assertStatus(200);
});

it('filter kategori wisata_alam', function () {
    $response = $this->actingAs($this->client)
        ->get('/client/catalog?kategori=wisata_alam');

    $response->assertInertia(fn ($page) => $page
        ->has('packages.data', 1)
        ->where('packages.data.0.kategori', 'wisata_alam')
    );
});

it('sort by harga_per_orang direction asc', function () {
    $response = $this->actingAs($this->client)
        ->get('/client/catalog?sort=harga_per_orang&direction=asc');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->has('packages.data'));
});

it('direction default asc', function () {
    $response = $this->actingAs($this->client)->get('/client/catalog');

    $response->assertInertia(fn ($page) => $page
        ->where('filters.direction', 'asc')
        ->where('filters.sort', 'nama')
    );
});

/*
|==========================================================================
| KATEGORI 6 — EDGE CASES
|==========================================================================
*/

it('katalog kosong jika tidak ada package aktif', function () {
    // Hapus semua package aktif
    Package::where('status', PackageStatus::AKTIF)->update(['status' => PackageStatus::DRAFT]);

    $response = $this->actingAs($this->client)->get('/client/catalog');

    $response->assertInertia(fn ($page) => $page
        ->has('packages.data', 0)
    );
});

it('katalog dengan per_page=1 hanya return 1 package', function () {
    // Buat package aktif kedua
    Package::factory()->create([
        'status' => PackageStatus::AKTIF,
        'slug' => 'paket-kedua',
        'kode' => 'PKG-002',
    ]);

    $response = $this->actingAs($this->client)
        ->get('/client/catalog?per_page=1');

    $response->assertInertia(fn ($page) => $page
        ->has('packages.data', 1)
    );
});

it('detail package load relasi creator, days, facilities', function () {
    $response = $this->actingAs($this->client)
        ->get("/client/catalog/{$this->activePackage->slug}");

    $response->assertInertia(fn ($page) => $page
        ->has('package.creator')
        ->has('package.days', 2)
        ->has('package.facilities', 1)
    );
});

/*
|==========================================================================
| KATEGORI 7 — BVA (Boundary Value Analysis)
|==========================================================================
*/

it('per_page default = 12 jika tidak dikirim', function () {
    // Buat 15 package aktif
    for ($i = 0; $i < 14; $i++) {
        Package::factory()->create([
            'status' => PackageStatus::AKTIF,
            'slug' => "paket-{$i}",
            'kode' => "PKG-{$i}",
        ]);
    }

    $response = $this->actingAs($this->client)->get('/client/catalog');

    $response->assertInertia(fn ($page) => $page
        ->has('packages.data', 12) // default 12
    );
});

/*
|==========================================================================
| KATEGORI 8 — BEHAVIORAL: Route Middleware
|==========================================================================
*/

it('route client.catalog.index pakai middleware auth, password.changed, dan role:client', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'client.catalog.index');

    expect($route)->not->toBeNull();

    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:client');
});

it('route client.catalog.show pakai middleware auth, password.changed, dan role:client', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'client.catalog.show');

    expect($route)->not->toBeNull();

    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:client');
});
