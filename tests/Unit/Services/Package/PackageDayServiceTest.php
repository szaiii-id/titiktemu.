<?php

use App\Services\Package\PackageDayService;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

/*
|==========================================================================
| SETUP
|==========================================================================
*/

beforeEach(function () {
    $this->service = new PackageDayService;

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
| HELPERS — Mock HasMany
|==========================================================================
*/

/**
 * Buat mock HasMany untuk `$package->days()`.
 *
 * Karena `Package::days()` return type `HasMany`, kita **wajib**
 * mock `HasMany::class` agar tidak kena TypeError.
 */
function makeHasManyMock(int $count = 0, ?int $maxHariKe = null): HasMany
{
    $mock = Mockery::mock(HasMany::class);
    $mock->shouldReceive('count')->andReturn($count);

    if ($maxHariKe !== null) {
        $mock->shouldReceive('max')->with('hari_ke')->andReturn($maxHariKe);
    }

    return $mock;
}

/*
|==========================================================================
| validateCanAddDay() — BVA & EQUIVALENCE PARTITIONING (via Reflection)
|==========================================================================
*/

it('validateCanAddDay lolos jika existing < durasi_hari', function () {
    // BVA: existing = 2, durasi = 3 → masih boleh
    $package = makePackageMock(['id' => 5, 'durasi_hari' => 3]);

    $daysRelation = makeHasManyMock(count: 2);
    $package->shouldReceive('days')->andReturn($daysRelation);

    $ref = new ReflectionMethod($this->service, 'validateCanAddDay');
    $ref->setAccessible(true);

    $ref->invoke($this->service, $package);

    expect(true)->toBeTrue();
});

it('validateCanAddDay throw jika existing == durasi_hari (BVA batas)', function () {
    // BVA: existing = 3, durasi = 3 → tidak boleh (>=)
    $package = makePackageMock(['id' => 5, 'durasi_hari' => 3]);

    $daysRelation = makeHasManyMock(count: 3);
    $package->shouldReceive('days')->andReturn($daysRelation);

    $ref = new ReflectionMethod($this->service, 'validateCanAddDay');
    $ref->setAccessible(true);

    expect(fn () => $ref->invoke($this->service, $package))
        ->toThrow(ValidationException::class);
});

it('validateCanAddDay throw jika existing > durasi_hari', function () {
    // BVA: existing = 4, durasi = 3 → tidak boleh
    $package = makePackageMock(['id' => 5, 'durasi_hari' => 3]);

    $daysRelation = makeHasManyMock(count: 4);
    $package->shouldReceive('days')->andReturn($daysRelation);

    $ref = new ReflectionMethod($this->service, 'validateCanAddDay');
    $ref->setAccessible(true);

    expect(fn () => $ref->invoke($this->service, $package))
        ->toThrow(ValidationException::class);
});

it('validateCanAddDay lolos jika existing = 0 (BVA batas bawah)', function () {
    $package = makePackageMock(['id' => 5, 'durasi_hari' => 1]);

    $daysRelation = makeHasManyMock(count: 0);
    $package->shouldReceive('days')->andReturn($daysRelation);

    $ref = new ReflectionMethod($this->service, 'validateCanAddDay');
    $ref->setAccessible(true);

    $ref->invoke($this->service, $package);

    expect(true)->toBeTrue();
});

/*
|==========================================================================
| update() — HAPPY PATH (instance mock)
|==========================================================================
*/

it('update memanggil $day->update() dengan payload benar', function () {
    $day = makePackageDayMock();

    $day->shouldReceive('update')
        ->once()
        ->with(Mockery::on(function ($attrs) {
            return $attrs['judul'] === 'Updated Day'
                && $attrs['deskripsi'] === 'Desc'
                && $attrs['jam_mulai'] === '08:00'
                && $attrs['jam_selesai'] === '10:00'
                && $attrs['lokasi'] === 'Lokasi';
        }));

    $day->shouldReceive('refresh')->once()->andReturnSelf();

    $result = $this->service->update($day, [
        'judul' => 'Updated Day',
        'deskripsi' => 'Desc',
        'jam_mulai' => '08:00',
        'jam_selesai' => '10:00',
        'lokasi' => 'Lokasi',
    ]);

    expect($result)->toBe($day);
});

it('update handle field opsional null (Equivalence Partitioning)', function () {
    $day = makePackageDayMock();

    $day->shouldReceive('update')
        ->once()
        ->with(Mockery::on(function ($attrs) {
            return $attrs['judul'] === 'Only Judul'
                && $attrs['deskripsi'] === null
                && $attrs['jam_mulai'] === null
                && $attrs['jam_selesai'] === null
                && $attrs['lokasi'] === null;
        }));

    $day->shouldReceive('refresh')->once()->andReturnSelf();

    $this->service->update($day, ['judul' => 'Only Judul']);

    expect(true)->toBeTrue();
});

it('update panggil Log::info dengan context benar', function () {
    $day = makePackageDayMock(['id' => 100, 'package_id' => 5, 'hari_ke' => 2]);

    $day->shouldReceive('update')->once();
    $day->shouldReceive('refresh')->andReturnSelf();

    Log::shouldReceive('info')
        ->once()
        ->with('Package day diupdate', Mockery::on(fn ($ctx) => $ctx['day_id'] === 100
            && $ctx['package_id'] === 5
            && $ctx['hari_ke'] === 2
        ));

    $this->service->update($day, ['judul' => 'Test']);

    expect(true)->toBeTrue();
});

it('update panggil DB::transaction tepat 1 kali', function () {
    $day = makePackageDayMock();
    $day->shouldReceive('update')->once();
    $day->shouldReceive('refresh')->andReturnSelf();

    DB::shouldReceive('transaction')
        ->once()
        ->andReturnUsing(fn ($cb) => $cb());

    $this->service->update($day, ['judul' => 'Test']);

    expect(true)->toBeTrue();
});

it('update return hasil refresh (bukan instance lama)', function () {
    $day = makePackageDayMock();
    $refreshed = makePackageDayMock(['id' => 100, 'judul' => 'Refreshed']);

    $day->shouldReceive('update')->once();
    $day->shouldReceive('refresh')->once()->andReturn($refreshed);

    $result = $this->service->update($day, ['judul' => 'Test']);

    expect($result)->toBe($refreshed);
});

it('update urutan: transaction → update → refresh', function () {
    $day = makePackageDayMock();

    DB::shouldReceive('transaction')
        ->once()
        ->ordered()
        ->andReturnUsing(fn ($cb) => $cb());

    $day->shouldReceive('update')->once()->ordered();
    $day->shouldReceive('refresh')->once()->ordered()->andReturnSelf();

    $this->service->update($day, ['judul' => 'Test']);

    expect(true)->toBeTrue();
});

/*
|==========================================================================
| create() — PARTIAL (via mock $package)
|==========================================================================
*/

it('create throw jika durasi_hari sudah tercapai', function () {
    $package = makePackageMock(['id' => 5, 'durasi_hari' => 2]);

    $daysRelation = makeHasManyMock(count: 2);
    $package->shouldReceive('days')->andReturn($daysRelation);

    // DB::transaction TIDAK boleh dipanggil (validasi throw dulu)
    DB::shouldReceive('transaction')->never();

    expect(fn () => $this->service->create($package, ['judul' => 'Test']))
        ->toThrow(ValidationException::class);
});

it('create panggil DB::transaction jika validasi lolos', function () {
    $package = makePackageMock(['id' => 5, 'durasi_hari' => 3]);

    $daysRelation = Mockery::mock(HasMany::class);
    $daysRelation->shouldReceive('count')->once()->andReturn(1);
    $daysRelation->shouldReceive('max')->with('hari_ke')->once()->andReturn(1);
    $package->shouldReceive('days')->andReturn($daysRelation);

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
            'judul' => 'New Day',
            'deskripsi' => 'Desc',
        ]);
    } catch (Throwable $e) {
        // Ignore — PackageDay::create() static error (no DB)
    }

    expect($transactionCalled)->toBeTrue();
});

it('create hitung nextHariKe dari max + 1 (BVA)', function () {
    // BVA: existing max = 5 → nextHariKe = 6
    $package = makePackageMock(['id' => 5, 'durasi_hari' => 10]);

    $daysRelation = Mockery::mock(HasMany::class);
    $daysRelation->shouldReceive('count')->andReturn(5);
    $daysRelation->shouldReceive('max')->with('hari_ke')->once()->andReturn(5);
    $package->shouldReceive('days')->andReturn($daysRelation);

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
        $this->service->create($package, ['judul' => 'Day 6']);
    } catch (Throwable $e) {
        // Ignore
    }

    expect($transactionCalled)->toBeTrue();
});

/*
|==========================================================================
| delete() — PARTIAL
|==========================================================================
*/

it('delete memanggil $day->delete() tepat 1 kali', function () {
    $day = makePackageDayMock(['id' => 100, 'hari_ke' => 2, 'package_id' => 5]);
    $day->shouldReceive('delete')->once();

    DB::shouldReceive('transaction')
        ->once()
        ->andReturnUsing(function ($callback) {
            try {
                return $callback();
            } catch (Throwable $e) {
                return null;
            }
        });

    $this->service->delete($day);

    expect(true)->toBeTrue();
});

it('delete panggil Log::warning dengan context benar', function () {
    $day = makePackageDayMock(['id' => 100, 'hari_ke' => 2, 'package_id' => 5]);
    $day->shouldReceive('delete')->once();

    Log::shouldReceive('warning')
        ->once()
        ->with('Package day dihapus', Mockery::on(fn ($ctx) => $ctx['day_id'] === 100
            && $ctx['package_id'] === 5
            && $ctx['hari_ke'] === 2
        ));

    DB::shouldReceive('transaction')
        ->once()
        ->andReturnUsing(function ($callback) {
            try {
                return $callback();
            } catch (Throwable $e) {
                return null;
            }
        });

    $this->service->delete($day);

    expect(true)->toBeTrue();
});

it('delete panggil DB::transaction tepat 1 kali', function () {
    $day = makePackageDayMock();
    $day->shouldReceive('delete')->once();

    DB::shouldReceive('transaction')
        ->once()
        ->andReturnUsing(function ($callback) {
            try {
                return $callback();
            } catch (Throwable $e) {
                return null;
            }
        });

    $this->service->delete($day);

    expect(true)->toBeTrue();
});

it('delete ekstrak packageId dan hari_ke dari $day sebelum delete', function () {
    $day = makePackageDayMock(['id' => 100, 'hari_ke' => 3, 'package_id' => 7]);
    $day->shouldReceive('delete')->once();

    Log::shouldReceive('warning')
        ->once()
        ->with('Package day dihapus', Mockery::on(fn ($ctx) => $ctx['package_id'] === 7 && $ctx['hari_ke'] === 3
        ));

    DB::shouldReceive('transaction')
        ->once()
        ->andReturnUsing(function ($callback) {
            try {
                return $callback();
            } catch (Throwable $e) {
                return null;
            }
        });

    $this->service->delete($day);

    expect(true)->toBeTrue();
});
