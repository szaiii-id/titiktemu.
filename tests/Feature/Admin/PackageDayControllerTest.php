<?php

use App\Enums\PackageKategori;
use App\Enums\PackageStatus;
use App\Models\Package;
use App\Models\PackageDay;
use App\Models\PackageDayCost;
use App\Models\User;
use App\Services\Package\PackageDayService;
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

    // Package dengan 2 hari
    $this->package = Package::factory()->create([
        'kode' => 'PKG-2026-001',
        'nama' => 'Paket Test',
        'slug' => 'paket-test',
        'status' => PackageStatus::DRAFT,
        'kategori' => PackageKategori::WISATA_ALAM,
        'timezone' => 'Asia/Makassar',
        'durasi_hari' => 3,
        'durasi_malam' => 2,
        'min_peserta' => 2,
        'max_peserta' => 10,
        'created_by' => $this->admin->id,
    ]);

    // Day 1 dan Day 2
    $this->day1 = PackageDay::factory()->create([
        'package_id' => $this->package->id,
        'hari_ke' => 1,
        'judul' => 'Day 1',
    ]);
    $this->day2 = PackageDay::factory()->create([
        'package_id' => $this->package->id,
        'hari_ke' => 2,
        'judul' => 'Day 2',
    ]);
});

/*
|==========================================================================
| KATEGORI 1 — CONTRACT / API SCHEMA
|==========================================================================
*/

it('store day redirect ke admin.packages.show dengan status', function () {
    $response = $this->actingAs($this->admin)
        ->post(route('admin.packages.days.store', $this->package->id), [
            'judul' => 'Day Baru',
            'deskripsi' => 'Deskripsi',
        ]);

    $response->assertRedirect(route('admin.packages.show', $this->package->id));
    $response->assertSessionHas('status');
});

it('update day redirect ke admin.packages.show', function () {
    $response = $this->actingAs($this->admin)
        ->put(route('admin.package-days.update', $this->day1->id), [
            'judul' => 'Day 1 Updated',
        ]);

    $response->assertRedirect(route('admin.packages.show', $this->day1->package_id));
    $response->assertSessionHas('status');
});

it('destroy day redirect ke admin.packages.show', function () {
    $response = $this->actingAs($this->admin)
        ->delete(route('admin.package-days.destroy', $this->day1->id));

    $response->assertRedirect(route('admin.packages.show', $this->package->id));
    $response->assertSessionHas('status');
});

/*
|==========================================================================
| KATEGORI 2 — SECURITY & AUTHORIZATION
|==========================================================================
*/

it('guest di-redirect ke login saat store day', function () {
    $this->post(route('admin.packages.days.store', $this->package->id), [
        'judul' => 'Test',
    ])->assertRedirect(route('login'));
});

it('mitra tidak bisa store day (redirect ke dashboard mitra)', function () {
    $this->actingAs($this->mitra)
        ->post(route('admin.packages.days.store', $this->package->id), [
            'judul' => 'Test',
        ])
        ->assertRedirect(route('mitra.dashboard'));
});

it('client tidak bisa update day (redirect ke dashboard client)', function () {
    $this->actingAs($this->client)
        ->put(route('admin.package-days.update', $this->day1->id), [
            'judul' => 'Test',
        ])
        ->assertRedirect(route('client.dashboard'));
});

it('admin dengan must_change_password = true di-redirect ke change-password', function () {
    $admin = User::factory()->admin()->create(['must_change_password' => true]);

    $this->actingAs($admin)
        ->post(route('admin.packages.days.store', $this->package->id), [
            'judul' => 'Test',
        ])
        ->assertRedirect(route('password.change'));
});

/*
|==========================================================================
| KATEGORI 3 — DATA INTEGRITY: Create
|==========================================================================
*/

it('store day baru sukses', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.packages.days.store', $this->package->id), [
            'judul' => 'Day Baru',
            'deskripsi' => 'Deskripsi baru',
            'jam_mulai' => '08:00',
            'jam_selesai' => '10:00',
            'lokasi' => 'Lokasi A',
        ]);

    $this->assertDatabaseHas('package_days', [
        'package_id' => $this->package->id,
        'judul' => 'Day Baru',
        'lokasi' => 'Lokasi A',
    ]);
});

it('store day auto-assign hari_ke = max + 1', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.packages.days.store', $this->package->id), [
            'judul' => 'Day 3',
        ]);

    $newDay = PackageDay::where('package_id', $this->package->id)
        ->where('judul', 'Day 3')
        ->first();

    // Existing: Day 1, Day 2 → next = 3
    expect($newDay->hari_ke)->toBe(3);
});

it('store day dengan semua field opsional', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.packages.days.store', $this->package->id), [
            'judul' => 'Day 3',
            'deskripsi' => 'Deskripsi',
            'jam_mulai' => '09:00',
            'jam_selesai' => '12:00',
            'lokasi' => 'Pantai Kuta',
        ])
        ->assertRedirect();

    $newDay = PackageDay::where('judul', 'Day 3')->first();
    expect($newDay->deskripsi)->toBe('Deskripsi');
    expect($newDay->lokasi)->toBe('Pantai Kuta');
});

/*
|==========================================================================
| KATEGORI 4 — DATA INTEGRITY: Update
|==========================================================================
*/

it('update day sukses mengubah field', function () {
    $this->actingAs($this->admin)
        ->put(route('admin.package-days.update', $this->day1->id), [
            'judul' => 'Day 1 Updated',
            'deskripsi' => 'Updated',
            'jam_mulai' => '07:00',
            'jam_selesai' => '09:00',
            'lokasi' => 'Lokasi B',
        ]);

    $this->day1->refresh();
    expect($this->day1->judul)->toBe('Day 1 Updated');
    expect($this->day1->lokasi)->toBe('Lokasi B');
});

it('update day TIDAK mengubah hari_ke', function () {
    $this->actingAs($this->admin)
        ->put(route('admin.package-days.update', $this->day1->id), [
            'judul' => 'Updated',
            'deskripsi' => 'Updated',
        ]);

    $this->day1->refresh();
    expect($this->day1->hari_ke)->toBe(1); // tetap
});

it('update day handle field opsional null', function () {
    $this->actingAs($this->admin)
        ->put(route('admin.package-days.update', $this->day1->id), [
            'judul' => 'Only Judul',
        ]);

    $this->day1->refresh();
    expect($this->day1->deskripsi)->toBeNull();
    expect($this->day1->jam_mulai)->toBeNull();
    expect($this->day1->jam_selesai)->toBeNull();
    expect($this->day1->lokasi)->toBeNull();
});

/*
|==========================================================================
| KATEGORI 5 — DATA INTEGRITY: Delete + Re-number
|==========================================================================
*/

it('destroy day sukses hapus dari DB', function () {
    $this->actingAs($this->admin)
        ->delete(route('admin.package-days.destroy', $this->day1->id));

    $this->assertDatabaseMissing('package_days', [
        'id' => $this->day1->id,
    ]);
});

it('destroy day re-number hari setelahnya', function () {
    // Tambah Day 3 dulu
    $day3 = PackageDay::factory()->create([
        'package_id' => $this->package->id,
        'hari_ke' => 3,
        'judul' => 'Day 3',
    ]);

    // Hapus Day 1
    $this->actingAs($this->admin)
        ->delete(route('admin.package-days.destroy', $this->day1->id));

    // Day 2 → jadi hari_ke = 1
    $this->day2->refresh();
    expect($this->day2->hari_ke)->toBe(1);

    // Day 3 → jadi hari_ke = 2
    $day3->refresh();
    expect($day3->hari_ke)->toBe(2);
});

it('destroy day tidak error jika tidak ada hari setelahnya', function () {
    // Hapus Day 2 dulu, lalu Day 1
    $this->actingAs($this->admin)
        ->delete(route('admin.package-days.destroy', $this->day2->id));

    $this->actingAs($this->admin)
        ->delete(route('admin.package-days.destroy', $this->day1->id))
        ->assertRedirect();

    $this->assertDatabaseCount('package_days', 0);
});

/*
|==========================================================================
| KATEGORI 6 — ERROR HANDLING
|==========================================================================
*/

it('store day validasi judul required ditolak', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.packages.days.store', $this->package->id), [
            'judul' => '',
        ])
        ->assertSessionHasErrors('judul');
});

it('store day validasi judul minimal 3 karakter ditolak', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.packages.days.store', $this->package->id), [
            'judul' => 'ab',
        ])
        ->assertSessionHasErrors('judul');
});

it('store day validasi package tidak ditemukan 404', function () {
    $this->actingAs($this->admin)
        ->post('/admin/packages/9999/days', [
            'judul' => 'Day Test',
        ])
        ->assertNotFound();
});

it('update day 404 jika ID tidak ditemukan', function () {
    $this->actingAs($this->admin)
        ->put('/admin/package-days/9999', [
            'judul' => 'Test',
        ])
        ->assertNotFound();
});

/*
|==========================================================================
| KATEGORI 7 — DATA INTEGRITY: Service Dipanggil
|==========================================================================
*/

it('store day memanggil PackageDayService::create', function () {
    $service = Mockery::mock(PackageDayService::class);
    $service->shouldReceive('create')
        ->once()
        ->andReturn(new PackageDay);

    $this->app->instance(PackageDayService::class, $service);

    $this->actingAs($this->admin)
        ->post(route('admin.packages.days.store', $this->package->id), [
            'judul' => 'Test Day',
        ])
        ->assertRedirect();
});

it('destroy day memanggil PackageDayService::delete', function () {
    $service = Mockery::mock(PackageDayService::class);
    $service->shouldReceive('delete')
        ->once()
        ->with(Mockery::on(fn ($d) => $d->id === $this->day1->id));

    $this->app->instance(PackageDayService::class, $service);

    $this->actingAs($this->admin)
        ->delete(route('admin.package-days.destroy', $this->day1->id))
        ->assertRedirect();
});

/*
|==========================================================================
| KATEGORI 8 — ROUTE MIDDLEWARE
|==========================================================================
*/

it('route admin.packages.days.store pakai middleware auth, password.changed, role:admin', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'admin.packages.days.store');

    expect($route)->not->toBeNull();
    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:admin');
});

it('route admin.package-days.update pakai middleware auth, password.changed, role:admin', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'admin.package-days.update');

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

it('store day sukses dengan judul TEPAT 3 karakter (boundary bawah)', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.packages.days.store', $this->package->id), [
            'judul' => 'abc',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('package_days', [
        'package_id' => $this->package->id,
        'judul' => 'abc',
    ]);
});

it('store day sukses dengan judul TEPAT 255 karakter (boundary atas)', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.packages.days.store', $this->package->id), [
            'judul' => str_repeat('a', 255),
        ])
        ->assertRedirect();
});

it('store day gagal dengan judul 256 karakter (boundary atas + 1)', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.packages.days.store', $this->package->id), [
            'judul' => str_repeat('a', 256),
        ])
        ->assertSessionHasErrors('judul');
});

/*
|==========================================================================
| KATEGORI 10 — EDGE CASES
|==========================================================================
*/

it('store day gagal jika melebihi durasi_hari package', function () {
    // Package durasi_hari = 3, existing 2 days
    // Add Day 3 → sukses (existing + 1 = 3, boundary)
    $this->actingAs($this->admin)
        ->post(route('admin.packages.days.store', $this->package->id), [
            'judul' => 'Day 3',
        ])
        ->assertRedirect();

    // Add Day 4 → gagal (existing = 3 >= durasi_hari = 3)
    $this->actingAs($this->admin)
        ->post(route('admin.packages.days.store', $this->package->id), [
            'judul' => 'Day 4',
        ])
        ->assertSessionHasErrors('judul');
});

it('destroy day dengan costs cascade delete', function () {
    // Buat cost di day 1
    PackageDayCost::factory()->create([
        'package_day_id' => $this->day1->id,
    ]);

    $this->actingAs($this->admin)
        ->delete(route('admin.package-days.destroy', $this->day1->id));

    // Cost harus ikut terhapus (cascade)
    $this->assertDatabaseMissing('package_day_costs', [
        'package_day_id' => $this->day1->id,
    ]);
});
