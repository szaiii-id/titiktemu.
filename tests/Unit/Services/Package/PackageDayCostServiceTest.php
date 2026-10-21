<?php

use App\Services\Package\PackageDayCostService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/*
|==========================================================================
| SETUP
|==========================================================================
*/

beforeEach(function () {
    $this->service = new PackageDayCostService;

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
| create() — PARTIAL (verifikasi DB::transaction dipanggil)
|==========================================================================
| `PackageDayCost::create()` static — tidak bisa di-mock bersih.
| Test ini verifikasi: DB::transaction dipanggil 1×.
|==========================================================================
*/

it('create panggil DB::transaction tepat 1 kali', function () {
    $day = makePackageDayMock();

    DB::shouldReceive('transaction')
        ->once()
        ->andReturnUsing(fn ($callback) => $callback());

    try {
        $this->service->create($day, [
            'nama_biaya' => 'Makan',
            'kategori' => 'konsumsi',
            'jumlah' => 50000,
            'satuan' => 'per_orang',
            'catatan' => null,
        ]);
    } catch (Throwable $e) {
        // Ignore — static model create() error (no DB)
    }

    expect(true)->toBeTrue();
});

it('create dengan data lengkap memanggil transaction', function () {
    $day = makePackageDayMock(['id' => 10, 'package_id' => 5]);

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
        $this->service->create($day, [
            'nama_biaya' => 'Makan',
            'kategori' => 'konsumsi',
            'jumlah' => 50000,
            'satuan' => 'per_orang',
            'catatan' => 'Test',
        ]);
    } catch (Throwable $e) {
        // Ignore
    }

    expect($transactionCalled)->toBeTrue();
});

/*
|==========================================================================
| update() — HAPPY PATH (instance mock)
|==========================================================================
*/

it('update memanggil $cost->update() dengan payload benar', function () {
    $cost = makePackageDayCostMock();

    $cost->shouldReceive('update')
        ->once()
        ->with(Mockery::on(function ($attrs) {
            return $attrs['nama_biaya'] === 'Makan Malam'
                && $attrs['kategori'] === 'konsumsi'
                && $attrs['jumlah'] === 75000
                && $attrs['satuan'] === 'per_orang'
                && $attrs['catatan'] === 'Updated';
        }));

    $cost->shouldReceive('refresh')->once()->andReturnSelf();

    $result = $this->service->update($cost, [
        'nama_biaya' => 'Makan Malam',
        'kategori' => 'konsumsi',
        'jumlah' => 75000,
        'satuan' => 'per_orang',
        'catatan' => 'Updated',
    ]);

    expect($result)->toBe($cost);
});

it('update handle catatan null (Equivalence Partitioning)', function () {
    $cost = makePackageDayCostMock();

    $cost->shouldReceive('update')
        ->once()
        ->with(Mockery::on(fn ($attrs) => $attrs['catatan'] === null));

    $cost->shouldReceive('refresh')->once()->andReturnSelf();

    $this->service->update($cost, [
        'nama_biaya' => 'Makan',
        'kategori' => 'konsumsi',
        'jumlah' => 50000,
        'satuan' => 'per_orang',
    ]);

    expect(true)->toBeTrue();
});

it('update panggil Log::info dengan context benar', function () {
    $cost = makePackageDayCostMock(['id' => 100, 'nama_biaya' => 'Snack']);

    $cost->shouldReceive('update')->once();
    $cost->shouldReceive('refresh')->andReturnSelf();

    Log::shouldReceive('info')
        ->once()
        ->with('Package day cost diupdate', Mockery::on(fn ($ctx) => $ctx['cost_id'] === 100
        ));

    $this->service->update($cost, [
        'nama_biaya' => 'Snack',
        'kategori' => 'konsumsi',
        'jumlah' => 20000,
        'satuan' => 'per_orang',
        'catatan' => null,
    ]);

    expect(true)->toBeTrue();
});

it('update panggil DB::transaction tepat 1 kali', function () {
    $cost = makePackageDayCostMock();
    $cost->shouldReceive('update')->once();
    $cost->shouldReceive('refresh')->andReturnSelf();

    DB::shouldReceive('transaction')
        ->once()
        ->andReturnUsing(fn ($cb) => $cb());

    $this->service->update($cost, [
        'nama_biaya' => 'Test',
        'kategori' => 'konsumsi',
        'jumlah' => 10000,
        'satuan' => 'per_orang',
        'catatan' => null,
    ]);

    expect(true)->toBeTrue();
});

it('update return hasil refresh (bukan instance lama)', function () {
    $cost = makePackageDayCostMock();
    $refreshed = makePackageDayCostMock(['id' => 100]);

    $cost->shouldReceive('update')->once();
    $cost->shouldReceive('refresh')->once()->andReturn($refreshed);

    $result = $this->service->update($cost, [
        'nama_biaya' => 'Test',
        'kategori' => 'konsumsi',
        'jumlah' => 10000,
        'satuan' => 'per_orang',
        'catatan' => null,
    ]);

    expect($result)->toBe($refreshed);
});

it('update urutan: transaction → update → refresh', function () {
    $cost = makePackageDayCostMock();

    DB::shouldReceive('transaction')
        ->once()
        ->ordered()
        ->andReturnUsing(fn ($cb) => $cb());

    $cost->shouldReceive('update')->once()->ordered();
    $cost->shouldReceive('refresh')->once()->ordered()->andReturnSelf();

    $this->service->update($cost, [
        'nama_biaya' => 'Test',
        'kategori' => 'konsumsi',
        'jumlah' => 10000,
        'satuan' => 'per_orang',
        'catatan' => null,
    ]);

    expect(true)->toBeTrue();
});

/*
|==========================================================================
| delete() — HAPPY PATH
|==========================================================================
*/

it('delete memanggil $cost->delete() tepat 1 kali', function () {
    $cost = makePackageDayCostMock(['id' => 100, 'nama_biaya' => 'Test']);
    $cost->shouldReceive('delete')->once();

    $this->service->delete($cost);

    expect(true)->toBeTrue();
});

it('delete panggil Log::warning dengan context benar', function () {
    $cost = makePackageDayCostMock(['id' => 100, 'nama_biaya' => 'Test']);
    $cost->shouldReceive('delete')->once();

    Log::shouldReceive('warning')
        ->once()
        ->with('Package day cost dihapus', Mockery::on(fn ($ctx) => $ctx['cost_id'] === 100
        ));

    $this->service->delete($cost);

    expect(true)->toBeTrue();
});

it('delete panggil DB::transaction tepat 1 kali', function () {
    $cost = makePackageDayCostMock();
    $cost->shouldReceive('delete')->once();

    DB::shouldReceive('transaction')
        ->once()
        ->andReturnUsing(fn ($cb) => $cb());

    $this->service->delete($cost);

    expect(true)->toBeTrue();
});

it('delete urutan: transaction → log warning → delete', function () {
    $cost = makePackageDayCostMock(['id' => 100]);

    DB::shouldReceive('transaction')
        ->once()
        ->ordered()
        ->andReturnUsing(fn ($cb) => $cb());

    Log::shouldReceive('warning')
        ->once()
        ->ordered();

    $cost->shouldReceive('delete')->once()->ordered();

    $this->service->delete($cost);

    expect(true)->toBeTrue();
});

it('delete idempotent — panggil 2× pada instance sama tetap jalan', function () {
    $cost = makePackageDayCostMock(['id' => 100]);
    $cost->shouldReceive('delete')->twice();

    $this->service->delete($cost);
    $this->service->delete($cost);

    expect(true)->toBeTrue();
});
