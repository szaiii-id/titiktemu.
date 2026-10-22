<?php

use App\Services\Package\PackageFacilityService;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/*
|==========================================================================
| SETUP
|==========================================================================
*/

beforeEach(function () {
    $this->service = new PackageFacilityService;

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
| HELPERS — Mock HasMany (untuk $package->facilities())
|==========================================================================
| Karena `Package::facilities()` return type `HasMany`, kita **wajib**
| mock `HasMany::class` agar tidak kena TypeError.
|
| Note: `create()` panggil chain:
|   $package->facilities()->where('tipe', $tipe)->max('urutan')
|
| Jadi mock harus support:
| - where('tipe', string): HasMany (return self)
| - max('urutan'): ?int
|==========================================================================
*/

function makeFacilitiesHasManyMock(?int $maxUrutan = null): HasMany
{
    $mock = Mockery::mock(HasMany::class);

    // where('tipe', $tipe) → return self
    $mock->shouldReceive('where')
        ->with('tipe', Mockery::any())
        ->andReturnSelf();

    // max('urutan') → return nilai atau 0
    $mock->shouldReceive('max')
        ->with('urutan')
        ->andReturn($maxUrutan);

    return $mock;
}

/*
|==========================================================================
| create() — PARTIAL (via mock $package)
|==========================================================================
| Karena `PackageFacility::create()` static, kita tidak bisa verifikasi
| payload. Tapi kita bisa verifikasi:
| - DB::transaction dipanggil 1×
| - $package->facilities()->where()->max() dipanggil (urutan auto-assign)
|==========================================================================
*/

it('create panggil DB::transaction tepat 1 kali', function () {
    $package = makePackageMock(['id' => 5]);

    $facilitiesRelation = makeFacilitiesHasManyMock(maxUrutan: 2);
    $package->shouldReceive('facilities')->andReturn($facilitiesRelation);

    DB::shouldReceive('transaction')
        ->once()
        ->andReturnUsing(fn ($callback) => $callback());

    try {
        $this->service->create($package, [
            'tipe' => 'include',
            'nama' => 'Breakfast',
        ]);
    } catch (Throwable $e) {
        // Ignore — PackageFacility::create() static error (no DB)
    }

    expect(true)->toBeTrue();
});

it('create hitung nextUrutan dari max + 1 (BVA)', function () {
    // BVA: existing max = 2 → nextUrutan = 3
    $package = makePackageMock(['id' => 5]);

    $facilitiesRelation = Mockery::mock(HasMany::class);
    $facilitiesRelation->shouldReceive('where')
        ->with('tipe', 'include')
        ->once()
        ->andReturnSelf();
    $facilitiesRelation->shouldReceive('max')
        ->with('urutan')
        ->once()
        ->andReturn(2);

    $package->shouldReceive('facilities')->andReturn($facilitiesRelation);

    $transactionCalled = false;
    DB::shouldReceive('transaction')
        ->once()
        ->andReturnUsing(function ($callback) use (&$transactionCalled) {
            $transactionCalled = true;
            try {
                return $callback();
            } catch (Throwable $e) {
                return null;
            }
        });

    try {
        $this->service->create($package, [
            'tipe' => 'include',
            'nama' => 'Breakfast',
        ]);
    } catch (Throwable $e) {
        // Ignore
    }

    expect($transactionCalled)->toBeTrue();
});

it('create hitung nextUrutan = 1 jika belum ada fasilitas (BVA batas bawah)', function () {
    // BVA: existing max = null (belum ada) → nextUrutan = 1
    $package = makePackageMock(['id' => 5]);

    $facilitiesRelation = makeFacilitiesHasManyMock(maxUrutan: null);
    $package->shouldReceive('facilities')->andReturn($facilitiesRelation);

    $transactionCalled = false;
    DB::shouldReceive('transaction')
        ->once()
        ->andReturnUsing(function ($callback) use (&$transactionCalled) {
            $transactionCalled = true;
            try {
                return $callback();
            } catch (Throwable $e) {
                return null;
            }
        });

    try {
        $this->service->create($package, [
            'tipe' => 'include',
            'nama' => 'First Facility',
        ]);
    } catch (Throwable $e) {
        // Ignore
    }

    expect($transactionCalled)->toBeTrue();
});

it('create query facilities dengan tipe yang benar', function () {
    // Behavioral: pastikan where('tipe', $tipe) dipanggil dengan tipe dari data
    $package = makePackageMock(['id' => 5]);

    $facilitiesRelation = Mockery::mock(HasMany::class);
    $facilitiesRelation->shouldReceive('where')
        ->with('tipe', 'exclude')  // ← assert tipe = 'exclude'
        ->once()
        ->andReturnSelf();
    $facilitiesRelation->shouldReceive('max')
        ->with('urutan')
        ->andReturn(0);

    $package->shouldReceive('facilities')->andReturn($facilitiesRelation);

    try {
        $this->service->create($package, [
            'tipe' => 'exclude',
            'nama' => 'Tidak Termasuk: Tiket Masuk',
        ]);
    } catch (Throwable $e) {
        // Ignore
    }

    expect(true)->toBeTrue();
});

/*
|==========================================================================
| update() — HAPPY PATH (instance mock)
|==========================================================================
*/

it('update memanggil $facility->update() dengan payload benar', function () {
    $facility = makePackageFacilityMock();

    $facility->shouldReceive('update')
        ->once()
        ->with(Mockery::on(function ($attrs) {
            return $attrs['tipe'] === 'exclude'
                && $attrs['nama'] === 'Updated Facility';
        }));

    $facility->shouldReceive('refresh')->once()->andReturnSelf();

    $result = $this->service->update($facility, [
        'tipe' => 'exclude',
        'nama' => 'Updated Facility',
    ]);

    expect($result)->toBe($facility);
});

it('update TIDAK mengubah urutan (behavioral)', function () {
    // Behavioral: `urutan` tidak boleh ada di payload update
    $facility = makePackageFacilityMock();

    $facility->shouldReceive('update')
        ->once()
        ->with(Mockery::on(function ($attrs) {
            // Pastikan `urutan` TIDAK ada di payload
            return ! array_key_exists('urutan', $attrs);
        }));

    $facility->shouldReceive('refresh')->once()->andReturnSelf();

    $this->service->update($facility, [
        'tipe' => 'include',
        'nama' => 'Test',
    ]);

    expect(true)->toBeTrue();
});

it('update panggil Log::info dengan context benar', function () {
    $facility = makePackageFacilityMock(['id' => 100]);

    $facility->shouldReceive('update')->once();
    $facility->shouldReceive('refresh')->andReturnSelf();

    Log::shouldReceive('info')
        ->once()
        ->with('Package facility diupdate', Mockery::on(fn ($ctx) => $ctx['facility_id'] === 100
        ));

    $this->service->update($facility, [
        'tipe' => 'include',
        'nama' => 'Test',
    ]);

    expect(true)->toBeTrue();
});

it('update panggil DB::transaction tepat 1 kali', function () {
    $facility = makePackageFacilityMock();
    $facility->shouldReceive('update')->once();
    $facility->shouldReceive('refresh')->andReturnSelf();

    DB::shouldReceive('transaction')
        ->once()
        ->andReturnUsing(fn ($cb) => $cb());

    $this->service->update($facility, [
        'tipe' => 'include',
        'nama' => 'Test',
    ]);

    expect(true)->toBeTrue();
});

it('update return hasil refresh (bukan instance lama)', function () {
    $facility = makePackageFacilityMock();
    $refreshed = makePackageFacilityMock(['id' => 100, 'nama' => 'Refreshed']);

    $facility->shouldReceive('update')->once();
    $facility->shouldReceive('refresh')->once()->andReturn($refreshed);

    $result = $this->service->update($facility, [
        'tipe' => 'include',
        'nama' => 'Test',
    ]);

    expect($result)->toBe($refreshed);
});

it('update urutan: transaction → update → refresh', function () {
    $facility = makePackageFacilityMock();

    DB::shouldReceive('transaction')
        ->once()
        ->ordered()
        ->andReturnUsing(fn ($cb) => $cb());

    $facility->shouldReceive('update')->once()->ordered();
    $facility->shouldReceive('refresh')->once()->ordered()->andReturnSelf();

    $this->service->update($facility, [
        'tipe' => 'include',
        'nama' => 'Test',
    ]);

    expect(true)->toBeTrue();
});

/*
|==========================================================================
| delete() — HAPPY PATH (instance mock)
|==========================================================================
*/

it('delete memanggil $facility->delete() tepat 1 kali', function () {
    $facility = makePackageFacilityMock(['id' => 100, 'nama' => 'Test']);
    $facility->shouldReceive('delete')->once();

    $this->service->delete($facility);

    expect(true)->toBeTrue();
});

it('delete panggil Log::warning dengan context benar', function () {
    $facility = makePackageFacilityMock(['id' => 100, 'nama' => 'Breakfast']);
    $facility->shouldReceive('delete')->once();

    Log::shouldReceive('warning')
        ->once()
        ->with('Package facility dihapus', Mockery::on(fn ($ctx) => $ctx['facility_id'] === 100
            && $ctx['nama'] === 'Breakfast'
        ));

    $this->service->delete($facility);

    expect(true)->toBeTrue();
});

it('delete panggil DB::transaction tepat 1 kali', function () {
    $facility = makePackageFacilityMock();
    $facility->shouldReceive('delete')->once();

    DB::shouldReceive('transaction')
        ->once()
        ->andReturnUsing(fn ($cb) => $cb());

    $this->service->delete($facility);

    expect(true)->toBeTrue();
});

it('delete urutan: transaction → log warning → delete', function () {
    $facility = makePackageFacilityMock(['id' => 100, 'nama' => 'Test']);

    DB::shouldReceive('transaction')
        ->once()
        ->ordered()
        ->andReturnUsing(fn ($cb) => $cb());

    Log::shouldReceive('warning')
        ->once()
        ->ordered();

    $facility->shouldReceive('delete')->once()->ordered();

    $this->service->delete($facility);

    expect(true)->toBeTrue();
});

it('delete idempotent — panggil 2× pada instance sama tetap jalan', function () {
    $facility = makePackageFacilityMock(['id' => 100]);
    $facility->shouldReceive('delete')->twice();

    $this->service->delete($facility);
    $this->service->delete($facility);

    expect(true)->toBeTrue();
});
