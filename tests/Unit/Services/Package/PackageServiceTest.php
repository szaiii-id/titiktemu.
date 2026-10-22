<?php

use App\Enums\PackageStatus;
use App\Models\Package;
use App\Models\User;
use App\Repositories\Contracts\PackageRepositoryInterface;
use App\Services\Package\PackageService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Mockery\MockInterface;

/*
|==========================================================================
| SETUP
|==========================================================================
*/

beforeEach(function () {
    $this->repo = Mockery::mock(PackageRepositoryInterface::class);
    $this->service = new PackageService($this->repo);

    // Default mock: transaction langsung eksekusi callback
    DB::shouldReceive('transaction')
        ->byDefault()
        ->andReturnUsing(fn ($callback) => $callback());

    // Default mock: Log no-op
    Log::shouldReceive('info')->byDefault()->andReturnNull();
    Log::shouldReceive('warning')->byDefault()->andReturnNull();
});

afterEach(function () {
    Mockery::close();
});

/*
|==========================================================================
| HELPERS
|==========================================================================
*/

function makePackageServiceMock(array $attrs = []): MockInterface
{
    $package = Mockery::mock(Package::class)->makePartial();
    $package->forceFill(array_merge([
        'id' => 5,
        'kode' => 'PKG-2026-001',
        'nama' => 'Paket Test',
        'slug' => 'paket-test',
        'status' => PackageStatus::DRAFT,
        'kategori' => 'wisata_alam',
        'durasi_hari' => 2,
        'durasi_malam' => 1,
        'harga_per_orang' => '500000.00',
        'harga_per_rombongan' => null,
        'min_peserta' => 2,
        'max_peserta' => 10,
        'timezone' => 'Asia/Makassar',
        'created_by' => 1,
    ], $attrs));

    return $package;
}

function makeAdminUserMock(array $attrs = []): MockInterface
{
    $user = Mockery::mock(User::class)->makePartial();
    $user->forceFill(array_merge([
        'id' => 99,
        'name' => 'Admin Test',
        'email' => 'admin@example.com',
        'role' => 'admin',
    ], $attrs));

    return $user;
}

function validPackageData(array $overrides = []): array
{
    return array_merge([
        'nama' => 'Paket Baru',
        'deskripsi' => 'Deskripsi',
        'kategori' => 'wisata_alam',
        'durasi_hari' => 2,
        'durasi_malam' => 1,
        'harga_per_orang' => 500000,
        'harga_per_rombongan' => null,
        'min_peserta' => 2,
        'max_peserta' => 10,
        'timezone' => 'Asia/Makassar',
    ], $overrides);
}

function makeHasManyForFacilities(bool $exists = true): HasMany
{
    $mock = Mockery::mock(HasMany::class);
    $mock->shouldReceive('where')->with('tipe', 'include')->andReturnSelf();
    $mock->shouldReceive('exists')->andReturn($exists);

    return $mock;
}

function makeHasManyForBookings(bool $exists = false): HasMany
{
    $mock = Mockery::mock(HasMany::class);
    $mock->shouldReceive('exists')->andReturn($exists);

    return $mock;
}

/*
|==========================================================================
| READ — Pass-through
|==========================================================================
*/

it('paginate meneruskan parameter ke repository', function () {
    $paginator = Mockery::mock(LengthAwarePaginator::class);

    $this->repo->shouldReceive('paginate')
        ->once()
        ->with(['search' => 'bali'], 25)
        ->andReturn($paginator);

    expect($this->service->paginate(['search' => 'bali'], 25))->toBe($paginator);
});

it('paginate pakai default perPage = 15', function () {
    $paginator = Mockery::mock(LengthAwarePaginator::class);

    $this->repo->shouldReceive('paginate')
        ->once()
        ->with([], 15)
        ->andReturn($paginator);

    $this->service->paginate();
});

it('findDetail mengembalikan package jika ada', function () {
    $package = makePackageServiceMock();

    $this->repo->shouldReceive('findById')
        ->once()
        ->with(5)
        ->andReturn($package);

    expect($this->service->findDetail(5))->toBe($package);
});

it('findDetail throw ValidationException jika tidak ada', function () {
    $this->repo->shouldReceive('findById')->with(999)->andReturn(null);

    expect(fn () => $this->service->findDetail(999))
        ->toThrow(ValidationException::class);
});

it('allAktif meneruskan ke repository', function () {
    $collection = new Collection;

    $this->repo->shouldReceive('allAktif')
        ->once()
        ->andReturn($collection);

    expect($this->service->allAktif())->toBe($collection);
});

it('countByStatus meneruskan ke repository', function () {
    $this->repo->shouldReceive('countByStatus')
        ->once()
        ->andReturn(['draft' => 3, 'aktif' => 5]);

    expect($this->service->countByStatus())
        ->toBe(['draft' => 3, 'aktif' => 5]);
});

/*
|==========================================================================
| create() — HAPPY PATH
|==========================================================================
*/

it('create buat package baru dengan payload benar', function () {
    $admin = makeAdminUserMock();
    $data = validPackageData();

    $this->repo->shouldReceive('generateKode')
        ->once()
        ->with((int) now()->year)
        ->andReturn('PKG-2026-001');

    $this->repo->shouldReceive('slugExists')
        ->with('paket-baru', null)
        ->andReturn(false);

    $created = makePackageServiceMock(['id' => 10, 'kode' => 'PKG-2026-001']);

    $this->repo->shouldReceive('create')
        ->once()
        ->with(Mockery::on(function ($payload) use ($admin) {
            return $payload['kode'] === 'PKG-2026-001'
                && $payload['nama'] === 'Paket Baru'
                && $payload['slug'] === 'paket-baru'
                && $payload['status'] === PackageStatus::DRAFT->value
                && $payload['created_by'] === $admin->id
                && $payload['min_peserta'] === 2
                && $payload['max_peserta'] === 10;
        }))
        ->andReturn($created);

    $result = $this->service->create($data, $admin);

    expect($result)->toBe($created);
});

it('create pakai default min_peserta = 1 dan max_peserta = 20', function () {
    $admin = makeAdminUserMock();
    $data = validPackageData();
    unset($data['min_peserta'], $data['max_peserta']);

    $this->repo->shouldReceive('generateKode')->andReturn('PKG-1');
    $this->repo->shouldReceive('slugExists')->andReturn(false);

    $this->repo->shouldReceive('create')
        ->once()
        ->with(Mockery::on(fn ($p) => $p['min_peserta'] === 1 && $p['max_peserta'] === 20
        ))
        ->andReturn(makePackageServiceMock());

    $this->service->create($data, $admin);
});

/*
|==========================================================================
| create() — NEGATIVE PATH (validation)
|==========================================================================
*/

it('create throw jika min_peserta > max_peserta', function () {
    // BVA: min = 10, max = 5
    $admin = makeAdminUserMock();
    $data = validPackageData(['min_peserta' => 10, 'max_peserta' => 5]);

    $this->repo->shouldReceive('create')->never();

    expect(fn () => $this->service->create($data, $admin))
        ->toThrow(ValidationException::class);
});

it('create throw jika durasi_malam >= durasi_hari', function () {
    // BVA: 2D2N (tidak valid, harus 2D1N)
    $admin = makeAdminUserMock();
    $data = validPackageData(['durasi_hari' => 2, 'durasi_malam' => 2]);

    expect(fn () => $this->service->create($data, $admin))
        ->toThrow(ValidationException::class);
});

it('create throw jika harga_per_rombongan = 0', function () {
    // BVA: 0 tidak valid (harus > 0)
    $admin = makeAdminUserMock();
    $data = validPackageData(['harga_per_rombongan' => 0]);

    expect(fn () => $this->service->create($data, $admin))
        ->toThrow(ValidationException::class);
});

it('create lolos jika harga_per_rombongan = null', function () {
    $admin = makeAdminUserMock();
    $data = validPackageData(['harga_per_rombongan' => null]);

    $this->repo->shouldReceive('generateKode')->andReturn('PKG-1');
    $this->repo->shouldReceive('slugExists')->andReturn(false);
    $this->repo->shouldReceive('create')->andReturn(makePackageServiceMock());

    $this->service->create($data, $admin);
    expect(true)->toBeTrue();
});

it('create lolos jika harga_per_rombongan > 0', function () {
    // BVA: batas bawah valid = 0.01
    $admin = makeAdminUserMock();
    $data = validPackageData(['harga_per_rombongan' => 0.01]);

    $this->repo->shouldReceive('generateKode')->andReturn('PKG-1');
    $this->repo->shouldReceive('slugExists')->andReturn(false);
    $this->repo->shouldReceive('create')->andReturn(makePackageServiceMock());

    $this->service->create($data, $admin);
    expect(true)->toBeTrue();
});

/*
|==========================================================================
| update() — HAPPY PATH
|==========================================================================
*/

it('update package dengan data baru', function () {
    $package = makePackageServiceMock(['nama' => 'Lama', 'slug' => 'lama']);
    $data = validPackageData(['nama' => 'Baru']);

    $this->repo->shouldReceive('slugExists')
        ->with('baru', 5)
        ->andReturn(false);

    $this->repo->shouldReceive('update')
        ->once()
        ->with($package, Mockery::on(fn ($p) => $p['nama'] === 'Baru'
            && $p['slug'] === 'baru'
        ))
        ->andReturn($package);

    $this->service->update($package, $data);
    expect(true)->toBeTrue();
});

it('update TIDAK regenerate slug jika nama tidak berubah', function () {
    $package = makePackageServiceMock(['nama' => 'Sama']);
    $data = validPackageData(['nama' => 'Sama']);

    // slugExists tidak dipanggil
    $this->repo->shouldReceive('slugExists')->never();

    $this->repo->shouldReceive('update')
        ->once()
        ->with($package, Mockery::on(fn ($p) => ! isset($p['slug'])))
        ->andReturn($package);

    $this->service->update($package, $data);
});

it('update cover_image jika dikirim', function () {
    $package = makePackageServiceMock(['nama' => 'Sama']);
    $data = validPackageData([
        'nama' => 'Sama',
        'cover_image' => 'images/new.jpg',
    ]);

    $this->repo->shouldReceive('slugExists')->never();

    $this->repo->shouldReceive('update')
        ->once()
        ->with($package, Mockery::on(fn ($p) => $p['cover_image'] === 'images/new.jpg'
        ))
        ->andReturn($package);

    $this->service->update($package, $data);
});

/*
|==========================================================================
| generateUniqueSlug() — BVA & EDGE CASES
|==========================================================================
*/

it('generateUniqueSlug return slug biasa jika belum ada', function () {
    $this->repo->shouldReceive('slugExists')
        ->with('paket-baru', null)
        ->once()
        ->andReturn(false);

    expect($this->service->generateUniqueSlug('Paket Baru'))->toBe('paket-baru');
});

it('generateUniqueSlug tambah -2 jika slug pertama sudah ada', function () {
    // BVA: collision pertama → -2
    $this->repo->shouldReceive('slugExists')
        ->with('paket-baru', null)
        ->once()
        ->andReturn(true);
    $this->repo->shouldReceive('slugExists')
        ->with('paket-baru-2', null)
        ->once()
        ->andReturn(false);

    expect($this->service->generateUniqueSlug('Paket Baru'))->toBe('paket-baru-2');
});

it('generateUniqueSlug tambah -3 jika -2 juga sudah ada', function () {
    // BVA: collision beruntun
    $this->repo->shouldReceive('slugExists')
        ->with('paket-baru', null)
        ->once()
        ->andReturn(true);
    $this->repo->shouldReceive('slugExists')
        ->with('paket-baru-2', null)
        ->once()
        ->andReturn(true);
    $this->repo->shouldReceive('slugExists')
        ->with('paket-baru-3', null)
        ->once()
        ->andReturn(false);

    expect($this->service->generateUniqueSlug('Paket Baru'))->toBe('paket-baru-3');
});

it('generateUniqueSlug pakai slug dengan exceptId', function () {
    // Kasus update: slug milik sendiri tidak dianggap konflik
    $this->repo->shouldReceive('slugExists')
        ->with('paket-test', 5)
        ->once()
        ->andReturn(false);

    expect($this->service->generateUniqueSlug('Paket Test', 5))->toBe('paket-test');
});

it('generateUniqueSlug fallback ke random jika counter > 1000 (edge case)', function () {
    // Edge: 1000 collision berturut-turut
    for ($i = 1; $i <= 1000; $i++) {
        $slug = $i === 1 ? 'paket-baru' : "paket-baru-{$i}";
        $this->repo->shouldReceive('slugExists')
            ->with($slug, null)
            ->andReturn(true);
    }

    // Fallback: random suffix
    $this->repo->shouldReceive('slugExists')
        ->with(Mockery::pattern('/^paket-baru-[a-zA-Z0-9]{6}$/'), null)
        ->once()
        ->andReturn(false);

    $result = $this->service->generateUniqueSlug('Paket Baru');

    expect($result)->toStartWith('paket-baru-');
    expect(strlen($result))->toBeGreaterThan(strlen('paket-baru-'));
});

/*
|==========================================================================
| publish() — HAPPY PATH & NEGATIVE
|==========================================================================
*/

it('publish throw jika sudah aktif', function () {
    $package = makePackageServiceMock(['status' => PackageStatus::AKTIF]);

    expect(fn () => $this->service->publish($package))
        ->toThrow(ValidationException::class);
});

it('publish throw jika tidak punya days', function () {
    $package = makePackageServiceMock(['status' => PackageStatus::DRAFT]);
    $package->shouldReceive('hasDays')->once()->andReturn(false);

    expect(fn () => $this->service->publish($package))
        ->toThrow(ValidationException::class);
});

it('publish throw jika tidak punya fasilitas include', function () {
    $package = makePackageServiceMock(['status' => PackageStatus::DRAFT]);
    $package->shouldReceive('hasDays')->andReturn(true);

    $facilitiesRelation = makeHasManyForFacilities(exists: false);
    $package->shouldReceive('facilities')->andReturn($facilitiesRelation);

    expect(fn () => $this->service->publish($package))
        ->toThrow(ValidationException::class);
});

it('publish berhasil jika semua prasyarat terpenuhi', function () {
    $package = makePackageServiceMock(['status' => PackageStatus::DRAFT]);
    $package->shouldReceive('hasDays')->andReturn(true);

    $facilitiesRelation = makeHasManyForFacilities(exists: true);
    $package->shouldReceive('facilities')->andReturn($facilitiesRelation);

    $this->repo->shouldReceive('update')
        ->once()
        ->with($package, ['status' => PackageStatus::AKTIF->value])
        ->andReturn($package);

    $result = $this->service->publish($package);

    expect($result)->toBe($package);
});

/*
|==========================================================================
| archive() & restore()
|==========================================================================
*/

it('archive throw jika sudah arsip', function () {
    $package = makePackageServiceMock(['status' => PackageStatus::ARSIP]);

    expect(fn () => $this->service->archive($package))
        ->toThrow(ValidationException::class);
});

it('archive berhasil mengubah status ke arsip', function () {
    $package = makePackageServiceMock(['status' => PackageStatus::AKTIF]);

    $this->repo->shouldReceive('update')
        ->once()
        ->with($package, ['status' => PackageStatus::ARSIP->value])
        ->andReturn($package);

    expect($this->service->archive($package))->toBe($package);
});

it('restore throw jika status bukan arsip', function () {
    $package = makePackageServiceMock(['status' => PackageStatus::DRAFT]);

    expect(fn () => $this->service->restore($package))
        ->toThrow(ValidationException::class);
});

it('restore berhasil mengubah status ke draft', function () {
    $package = makePackageServiceMock(['status' => PackageStatus::ARSIP]);

    $this->repo->shouldReceive('update')
        ->once()
        ->with($package, ['status' => PackageStatus::DRAFT->value])
        ->andReturn($package);

    expect($this->service->restore($package))->toBe($package);
});

/*
|==========================================================================
| delete()
|==========================================================================
*/

it('delete throw jika package punya booking', function () {
    $package = makePackageServiceMock();

    $bookingsRelation = makeHasManyForBookings(exists: true);
    $package->shouldReceive('bookings')->andReturn($bookingsRelation);

    $this->repo->shouldReceive('delete')->never();

    expect(fn () => $this->service->delete($package))
        ->toThrow(ValidationException::class);
});

it('delete berhasil jika tidak ada booking', function () {
    $package = makePackageServiceMock();

    $bookingsRelation = makeHasManyForBookings(exists: false);
    $package->shouldReceive('bookings')->andReturn($bookingsRelation);

    $this->repo->shouldReceive('delete')
        ->once()
        ->with($package);

    $this->service->delete($package);

    expect(true)->toBeTrue();
});
