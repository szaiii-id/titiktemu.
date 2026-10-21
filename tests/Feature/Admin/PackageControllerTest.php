<?php

use App\Enums\PackageKategori;
use App\Enums\PackageStatus;
use App\Models\Booking;
use App\Models\Package;
use App\Models\PackageDay;
use App\Models\PackageFacility;
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

    // Package DRAFT (siap di-publish)
    $this->draftPackage = Package::factory()->create([
        'kode' => 'PKG-2026-001',
        'nama' => 'Paket Draft',
        'slug' => 'paket-draft',
        'status' => PackageStatus::DRAFT,
        'kategori' => PackageKategori::WISATA_ALAM,
        'timezone' => 'Asia/Makassar',
        'harga_per_orang' => '500000.00',
        'harga_per_rombongan' => null,
        'min_peserta' => 2,
        'max_peserta' => 10,
        'durasi_hari' => 2,
        'durasi_malam' => 1,
        'created_by' => $this->admin->id,
    ]);

    // Setup day + facility (draft)
    PackageDay::factory()->create([
        'package_id' => $this->draftPackage->id,
        'hari_ke' => 1,
        'judul' => 'Day 1',
    ]);
    PackageFacility::factory()->create([
        'package_id' => $this->draftPackage->id,
        'tipe' => 'include',
        'nama' => 'Transportasi',
        'urutan' => 1,
    ]);

    // Package AKTIF
    $this->activePackage = Package::factory()->create([
        'kode' => 'PKG-2026-002',
        'nama' => 'Paket Aktif',
        'slug' => 'paket-aktif',
        'status' => PackageStatus::AKTIF,
        'kategori' => PackageKategori::BUDAYA,
        'timezone' => 'Asia/Makassar',
        'harga_per_orang' => '750000.00',
        'min_peserta' => 2,
        'max_peserta' => 15,
        'durasi_hari' => 3,
        'durasi_malam' => 2,
        'created_by' => $this->admin->id,
    ]);

    // Package ARSIP
    $this->archivedPackage = Package::factory()->create([
        'kode' => 'PKG-2026-003',
        'nama' => 'Paket Arsip',
        'slug' => 'paket-arsip',
        'status' => PackageStatus::ARSIP,
        'kategori' => PackageKategori::KULINER,
        'timezone' => 'Asia/Makassar',
        'harga_per_orang' => '400000.00',
        'min_peserta' => 2,
        'max_peserta' => 20,
        'durasi_hari' => 2,
        'durasi_malam' => 1,
        'created_by' => $this->admin->id,
    ]);
});

/*
|==========================================================================
| KATEGORI 1 — CONTRACT / API SCHEMA
|==========================================================================
*/

it('GET /admin/packages merender Inertia component Admin/Packages/Index', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.packages.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/Packages/Index')
        ->has('packages')
        ->has('filters')
        ->has('statusCounts')
    );
});

it('GET /admin/packages/create merender Inertia component Admin/Packages/Create', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.packages.create'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/Packages/Create')
    );
});

it('GET /admin/packages/{id} merender Inertia component Admin/Packages/Show', function () {
    $response = $this->actingAs($this->admin)
        ->get(route('admin.packages.show', $this->draftPackage->id));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/Packages/Show')
        ->has('package')
        ->has('hpp')
        ->has('margin')
    );
});

it('GET /admin/packages/{id}/edit merender Inertia component Admin/Packages/Edit', function () {
    $response = $this->actingAs($this->admin)
        ->get(route('admin.packages.edit', $this->draftPackage->id));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/Packages/Edit')
        ->has('package')
    );
});

/*
|==========================================================================
| KATEGORI 2 — SECURITY & AUTHORIZATION
|==========================================================================
*/

it('guest di-redirect ke login saat akses /admin/packages', function () {
    $this->get(route('admin.packages.index'))->assertRedirect(route('login'));
});

it('mitra tidak bisa akses /admin/packages (redirect ke dashboard mitra)', function () {
    $this->actingAs($this->mitra)
        ->get(route('admin.packages.index'))
        ->assertRedirect(route('mitra.dashboard'));
});

it('client tidak bisa akses /admin/packages (redirect ke dashboard client)', function () {
    $this->actingAs($this->client)
        ->get(route('admin.packages.index'))
        ->assertRedirect(route('client.dashboard'));
});

it('admin dengan must_change_password = true di-redirect ke change-password', function () {
    $admin = User::factory()->admin()->create(['must_change_password' => true]);

    $this->actingAs($admin)
        ->get(route('admin.packages.index'))
        ->assertRedirect(route('password.change'));
});

/*
|==========================================================================
| KATEGORI 3 — DATA INTEGRITY: Create
|==========================================================================
*/

it('store package baru sukses', function () {
    $response = $this->actingAs($this->admin)
        ->post(route('admin.packages.store'), [
            'nama' => 'Paket Baru',
            'deskripsi' => 'Deskripsi',
            'kategori' => PackageKategori::WISATA_ALAM->value,
            'durasi_hari' => 2,
            'durasi_malam' => 1,
            'harga_per_orang' => 500000,
            'harga_per_rombongan' => null,
            'min_peserta' => 2,
            'max_peserta' => 10,
            'timezone' => 'Asia/Makassar',
        ]);

    $response->assertRedirect();
    $response->assertSessionHas('status');

    $this->assertDatabaseHas('packages', [
        'nama' => 'Paket Baru',
        'status' => PackageStatus::DRAFT->value,
        'created_by' => $this->admin->id,
    ]);
});

it('store package set status draft otomatis', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.packages.store'), [
            'nama' => 'Paket Baru',
            'kategori' => PackageKategori::WISATA_ALAM->value,
            'durasi_hari' => 2,
            'durasi_malam' => 1,
            'harga_per_orang' => 500000,
            'min_peserta' => 2,
            'max_peserta' => 10,
            'timezone' => 'Asia/Makassar',
        ]);

    $package = Package::where('nama', 'Paket Baru')->first();
    expect($package->status)->toBe(PackageStatus::DRAFT);
});

/*
|==========================================================================
| KATEGORI 4 — DATA INTEGRITY: Update
|==========================================================================
*/

it('update package sukses', function () {
    $this->actingAs($this->admin)
        ->put(route('admin.packages.update', $this->draftPackage->id), [
            'nama' => 'Paket Updated',
            'kategori' => PackageKategori::BUDAYA->value,
            'durasi_hari' => 3,
            'durasi_malam' => 2,
            'harga_per_orang' => 750000,
            'min_peserta' => 2,
            'max_peserta' => 15,
            'timezone' => 'Asia/Makassar',
        ])
        ->assertRedirect(route('admin.packages.show', $this->draftPackage->id));

    $this->draftPackage->refresh();
    expect($this->draftPackage->nama)->toBe('Paket Updated');
    expect((float) $this->draftPackage->harga_per_orang)->toBe(750000.0);
});

it('update package regenerate slug jika nama berubah', function () {
    $oldSlug = $this->draftPackage->slug;

    $this->actingAs($this->admin)
        ->put(route('admin.packages.update', $this->draftPackage->id), [
            'nama' => 'Nama Baru Total',
            'kategori' => PackageKategori::BUDAYA->value,
            'durasi_hari' => 3,
            'durasi_malam' => 2,
            'harga_per_orang' => 750000,
            'min_peserta' => 2,
            'max_peserta' => 15,
            'timezone' => 'Asia/Makassar',
        ]);

    $this->draftPackage->refresh();
    expect($this->draftPackage->slug)->not->toBe($oldSlug);
});

/*
|==========================================================================
| KATEGORI 5 — DATA INTEGRITY: Delete
|==========================================================================
*/

it('destroy package sukses (soft delete)', function () {
    $this->actingAs($this->admin)
        ->delete(route('admin.packages.destroy', $this->draftPackage->id))
        ->assertRedirect(route('admin.packages.index'));

    // Soft delete → assertSoftDeleted
    $this->assertSoftDeleted('packages', [
        'id' => $this->draftPackage->id,
    ]);
});

it('destroy package dengan booking ditolak', function () {
    $booking = Booking::factory()->create([
        'package_id' => $this->draftPackage->id,
        'user_id' => $this->client->id,
    ]);

    $this->actingAs($this->admin)
        ->delete(route('admin.packages.destroy', $this->draftPackage->id))
        ->assertSessionHasErrors('package');

    // Package masih ada
    $this->assertNotSoftDeleted('packages', [
        'id' => $this->draftPackage->id,
    ]);
});

/*
|==========================================================================
| KATEGORI 6 — DATA INTEGRITY: Status Transitions
|==========================================================================
*/

it('publish package draft → aktif', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.packages.publish', $this->draftPackage->id))
        ->assertRedirect(route('admin.packages.show', $this->draftPackage->id));

    $this->draftPackage->refresh();
    expect($this->draftPackage->status)->toBe(PackageStatus::AKTIF);
});

it('publish package tanpa day ditolak', function () {
    $package = Package::factory()->create([
        'status' => PackageStatus::DRAFT,
        'created_by' => $this->admin->id,
    ]);

    $this->actingAs($this->admin)
        ->post(route('admin.packages.publish', $package->id))
        ->assertSessionHasErrors('status');
});

it('publish package tanpa fasilitas include ditolak', function () {
    $package = Package::factory()->create([
        'status' => PackageStatus::DRAFT,
        'created_by' => $this->admin->id,
    ]);

    // Tambah day tanpa facility
    PackageDay::factory()->create(['package_id' => $package->id]);

    $this->actingAs($this->admin)
        ->post(route('admin.packages.publish', $package->id))
        ->assertSessionHasErrors('status');
});

it('archive package aktif → arsip', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.packages.archive', $this->activePackage->id))
        ->assertRedirect(route('admin.packages.show', $this->activePackage->id));

    $this->activePackage->refresh();
    expect($this->activePackage->status)->toBe(PackageStatus::ARSIP);
});

it('restore package arsip → draft', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.packages.restore', $this->archivedPackage->id))
        ->assertRedirect(route('admin.packages.show', $this->archivedPackage->id));

    $this->archivedPackage->refresh();
    expect($this->archivedPackage->status)->toBe(PackageStatus::DRAFT);
});

/*
|==========================================================================
| KATEGORI 7 — ERROR HANDLING
|==========================================================================
*/

it('show package 404 jika tidak ditemukan', function () {
    $this->actingAs($this->admin)
        ->get('/admin/packages/9999')
        ->assertNotFound();
});

it('store package validasi nama required ditolak', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.packages.store'), [
            'nama' => '',
            'kategori' => PackageKategori::WISATA_ALAM->value,
            'durasi_hari' => 2,
            'durasi_malam' => 1,
            'harga_per_orang' => 500000,
            'min_peserta' => 2,
            'max_peserta' => 10,
            'timezone' => 'Asia/Makassar',
        ])
        ->assertSessionHasErrors('nama');
});

it('store package validasi min > max ditolak', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.packages.store'), [
            'nama' => 'Paket Baru',
            'kategori' => PackageKategori::WISATA_ALAM->value,
            'durasi_hari' => 2,
            'durasi_malam' => 1,
            'harga_per_orang' => 500000,
            'min_peserta' => 10,
            'max_peserta' => 5,
            'timezone' => 'Asia/Makassar',
        ])
        ->assertSessionHasErrors('min_peserta');
});

/*
|==========================================================================
| KATEGORI 8 — ROUTE MIDDLEWARE
|==========================================================================
*/

it('route admin.packages.index pakai middleware auth, password.changed, role:admin', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'admin.packages.index');

    expect($route)->not->toBeNull();
    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:admin');
});

it('route admin.packages.publish pakai middleware auth, password.changed, role:admin', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'admin.packages.publish');

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

it('store package sukses dengan durasi_malam = durasi_hari - 1 (boundary)', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.packages.store'), [
            'nama' => 'Paket 3D2N',
            'kategori' => PackageKategori::WISATA_ALAM->value,
            'durasi_hari' => 3,
            'durasi_malam' => 2,
            'harga_per_orang' => 500000,
            'min_peserta' => 2,
            'max_peserta' => 10,
            'timezone' => 'Asia/Makassar',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('packages', ['nama' => 'Paket 3D2N']);
});

it('store package ditolak jika durasi_malam >= durasi_hari', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.packages.store'), [
            'nama' => 'Paket 2D2N',
            'kategori' => PackageKategori::WISATA_ALAM->value,
            'durasi_hari' => 2,
            'durasi_malam' => 2,
            'harga_per_orang' => 500000,
            'min_peserta' => 2,
            'max_peserta' => 10,
            'timezone' => 'Asia/Makassar',
        ])
        ->assertSessionHasErrors('durasi_malam');
});

/*
|==========================================================================
| KATEGORI 10 — EDGE CASES
|==========================================================================
*/

it('index menampilkan statusCounts dengan jumlah benar', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.packages.index'));

    $response->assertInertia(fn ($page) => $page
        ->where('statusCounts.draft', 1)
        ->where('statusCounts.aktif', 1)
        ->where('statusCounts.arsip', 1)
    );
});

it('show menampilkan hpp dan margin', function () {
    $response = $this->actingAs($this->admin)
        ->get(route('admin.packages.show', $this->draftPackage->id));

    $response->assertInertia(fn ($page) => $page
        ->has('hpp.total')
        ->has('hpp.per_kategori')
        ->has('hpp.breakdown')
        ->has('margin.hpp_total')
        ->has('margin.margin_persen')
    );
});
