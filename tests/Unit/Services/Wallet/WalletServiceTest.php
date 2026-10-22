<?php

use App\Models\MitraWallet;
use App\Models\Trip;
use App\Models\TripMitra;
use App\Models\User;
use App\Repositories\Contracts\WalletRepositoryInterface;
use App\Services\Wallet\WalletService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
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
    $this->walletRepo = Mockery::mock(WalletRepositoryInterface::class);
    $this->service = new WalletService($this->walletRepo);

    DB::shouldReceive('transaction')
        ->byDefault()
        ->andReturnUsing(fn ($callback) => $callback());

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

function makeWalletMock(array $attrs = []): MockInterface
{
    $wallet = Mockery::mock(MitraWallet::class)->makePartial();
    $wallet->forceFill(array_merge([
        'id' => 1,
        'mitra_id' => 100,
        'saldo' => '0.00',
        'total_pendapatan' => '0.00',
        'total_dicairkan' => '0.00',
    ], $attrs));

    return $wallet;
}

function makeMitraForWallet(array $attrs = []): MockInterface
{
    $mitra = Mockery::mock(User::class)->makePartial();
    $mitra->forceFill(array_merge([
        'id' => 100,
        'name' => 'Mitra Test',
        'email' => 'mitra@example.com',
        'role' => 'mitra',
    ], $attrs));

    return $mitra;
}

function makeTripMitraForWallet(array $attrs = []): MockInterface
{
    $tm = Mockery::mock(TripMitra::class)->makePartial();
    $tm->forceFill(array_merge([
        'id' => 10,
        'trip_id' => 1,
        'mitra_id' => 100,
        'role' => 'lead',
        'honor' => '500000.00',
        'honor_tipe' => 'flat',
    ], $attrs));

    return $tm;
}

function makeTripForWallet(array $attrs = []): MockInterface
{
    $trip = Mockery::mock(Trip::class)->makePartial();
    $trip->forceFill(array_merge([
        'id' => 1,
        'kode' => 'TRP-001',
        'tanggal_mulai' => '2026-01-01',
        'tanggal_selesai' => '2026-01-02',
    ], $attrs));

    return $trip;
}

/*
|==========================================================================
| findByMitra() — HAPPY & NEGATIVE PATH (FULL)
|==========================================================================
*/

it('findByMitra return wallet existing jika ada', function () {
    $mitra = makeMitraForWallet();
    $wallet = makeWalletMock();

    $this->walletRepo->shouldReceive('findByMitra')
        ->once()
        ->with($mitra)
        ->andReturn($wallet);

    $this->walletRepo->shouldReceive('createForMitra')->never();

    expect($this->service->findByMitra($mitra))->toBe($wallet);
});

it('findByMitra buat wallet baru jika tidak ada', function () {
    $mitra = makeMitraForWallet();
    $wallet = makeWalletMock();

    $this->walletRepo->shouldReceive('findByMitra')
        ->once()
        ->with($mitra)
        ->andReturn(null);

    $this->walletRepo->shouldReceive('createForMitra')
        ->once()
        ->with($mitra)
        ->andReturn($wallet);

    expect($this->service->findByMitra($mitra))->toBe($wallet);
});

/*
|==========================================================================
| paginateTransactions() — FULL
|==========================================================================
*/

it('paginateTransactions panggil findByMitra lalu repo->paginateTransactions', function () {
    $mitra = makeMitraForWallet();
    $wallet = makeWalletMock();
    $paginator = Mockery::mock(LengthAwarePaginator::class);

    $this->walletRepo->shouldReceive('findByMitra')
        ->once()
        ->with($mitra)
        ->andReturn($wallet);

    $this->walletRepo->shouldReceive('paginateTransactions')
        ->once()
        ->with($wallet, 20)
        ->andReturn($paginator);

    $result = $this->service->paginateTransactions($mitra, 20);

    expect($result)->toBe($paginator);
});

it('paginateTransactions pakai default perPage = 15', function () {
    $mitra = makeMitraForWallet();
    $wallet = makeWalletMock();
    $paginator = Mockery::mock(LengthAwarePaginator::class);

    $this->walletRepo->shouldReceive('findByMitra')->andReturn($wallet);
    $this->walletRepo->shouldReceive('paginateTransactions')
        ->once()
        ->with($wallet, 15)
        ->andReturn($paginator);

    $this->service->paginateTransactions($mitra);
});

/*
|==========================================================================
| creditHonorForTrip() — PARTIAL
|==========================================================================
| Karena `MitraWallet::lockForUpdate()` static, tidak bisa verifikasi
| sepenuhnya. Tapi kita bisa verifikasi:
| - Trip tanpa mitra → tidak error
| - Mitra tanpa wallet → auto-create
|==========================================================================
*/

it('creditHonorForTrip tidak error jika trip tanpa mitra', function () {
    $trip = makeTripForWallet();
    $trip->shouldReceive('loadMissing')->with('mitras.mitra')->andReturnSelf();
    $trip->shouldReceive('getAttribute')->with('mitras')->andReturn(new Collection);

    $this->service->creditHonorForTrip($trip);

    expect(true)->toBeTrue();
});

it('creditHonorForTrip skip mitra dengan honor <= 0 (BVA)', function () {
    $trip = makeTripForWallet();
    $trip->shouldReceive('loadMissing')->andReturnSelf();
    $trip->shouldReceive('durasiHari')->andReturn(2);

    $mitra = makeMitraForWallet();
    $tm = makeTripMitraForWallet();
    $tm->shouldReceive('getAttribute')->with('mitra')->andReturn($mitra);
    $tm->shouldReceive('hitungHonorTotal')->with(2)->andReturn(0.0);  // honor = 0

    $trip->shouldReceive('getAttribute')->with('mitras')->andReturn(new Collection([$tm]));

    // Tidak boleh ada update / createTransaction
    $this->walletRepo->shouldReceive('update')->never();
    $this->walletRepo->shouldReceive('createTransaction')->never();

    $this->service->creditHonorForTrip($trip);

    expect(true)->toBeTrue();
});

it('creditHonorForTrip skip mitra null di TripMitra', function () {
    $trip = makeTripForWallet();
    $trip->shouldReceive('loadMissing')->andReturnSelf();
    $trip->shouldReceive('durasiHari')->andReturn(2);

    $tm = makeTripMitraForWallet();
    $tm->shouldReceive('getAttribute')->with('mitra')->andReturn(null);

    $trip->shouldReceive('getAttribute')->with('mitras')->andReturn(new Collection([$tm]));

    $this->walletRepo->shouldReceive('update')->never();

    $this->service->creditHonorForTrip($trip);

    expect(true)->toBeTrue();
});

/*
|==========================================================================
| debitForPayout() — PARTIAL
|==========================================================================
| Karena `MitraWallet::lockForUpdate()` static, tidak bisa verifikasi
| penuh. Tapi kita bisa verifikasi guard clause.
|==========================================================================
*/

it('debitForPayout throw jika wallet tidak ditemukan', function () {
    $mitra = makeMitraForWallet();

    $this->walletRepo->shouldReceive('findByMitra')
        ->once()
        ->with($mitra)
        ->andReturn(null);

    $this->walletRepo->shouldReceive('createForMitra')->never();
    $this->walletRepo->shouldReceive('update')->never();

    expect(fn () => $this->service->debitForPayout($mitra, 500000, 'Test payout', 1))
        ->toThrow(ValidationException::class);
});

/*
|==========================================================================
| BVA / Equivalence — via reflection ke `lockForUpdate` tidak bisa.
| Untuk test behavior lengkap `creditHonorForTrip` dan `debitForPayout`,
| tunggu Feature Test (dengan DB).
|==========================================================================
*/
