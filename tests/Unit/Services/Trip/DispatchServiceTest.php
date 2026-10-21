<?php

use App\Enums\TripMitraRole;
use App\Enums\TripStatus;
use App\Models\Trip;
use App\Models\TripMitra;
use App\Models\User;
use App\Repositories\Contracts\UserRepositoryInterface;
use App\Services\Trip\DispatchService;
use App\Support\TripHonorTipe;
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
    $this->service = new DispatchService;

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

function makeTripForDispatch(array $attrs = []): MockInterface
{
    $trip = Mockery::mock(Trip::class)->makePartial();
    $trip->forceFill(array_merge([
        'id' => 1,
        'kode' => 'TRP-001',
        'booking_id' => 10,
        'package_id' => 5,
        'tanggal_mulai' => '2026-01-01',
        'tanggal_selesai' => '2026-01-02',
        'status' => TripStatus::SCHEDULED,
        'timezone' => 'Asia/Makassar',
    ], $attrs));

    return $trip;
}

function makeTripMitraForDispatch(array $attrs = []): MockInterface
{
    $tripMitra = Mockery::mock(TripMitra::class)->makePartial();
    $tripMitra->forceFill(array_merge([
        'id' => 50,
        'trip_id' => 1,
        'mitra_id' => 100,
        'role' => TripMitraRole::LEAD,
        'honor' => '500000.00',
        'honor_tipe' => TripHonorTipe::FLAT,
        'instruksi' => null,
        'assigned_by' => 99,
    ], $attrs));

    return $tripMitra;
}

function makeMitraForDispatch(array $attrs = []): MockInterface
{
    $user = Mockery::mock(User::class)->makePartial();
    $user->forceFill(array_merge([
        'id' => 100,
        'name' => 'Mitra Test',
        'email' => 'mitra@example.com',
        'role' => 'mitra',
    ], $attrs));

    return $user;
}

function makeAdminForDispatch(array $attrs = []): MockInterface
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

/*
|==========================================================================
| assignMitra() — NEGATIVE PATH (guard clause, no static calls)
|==========================================================================
*/

it('assignMitra throw jika trip tidak bisa assign', function () {
    $trip = makeTripForDispatch(['status' => TripStatus::COMPLETED]);
    $trip->shouldReceive('canAssignMitra')->andReturn(false);

    $admin = makeAdminForDispatch();

    expect(fn () => $this->service->assignMitra($trip, [
        'mitra_id' => 100,
        'honor' => 500000,
    ], $admin))
        ->toThrow(ValidationException::class);
});

it('assignMitra throw jika honor <= 0 (BVA)', function () {
    $trip = makeTripForDispatch(['status' => TripStatus::SCHEDULED]);
    $trip->shouldReceive('canAssignMitra')->andReturn(true);

    $admin = makeAdminForDispatch();

    // BVA: honor = 0 → tidak valid
    // Tapi karena `User::find()` static akan jalan dulu, kita perlu handle
    // Pakai reflection atau ubah test ke partial.
    // Untuk sekarang, skip karena butuh mock User::find() static.
    $this->markTestSkipped('Butuh static User::find() — test di Feature');
});

/*
|==========================================================================
| updateAssignment() — HAPPY PATH (instance mock, full unit test)
|==========================================================================
*/

it('updateAssignment throw jika trip tidak ditemukan', function () {
    $tripMitra = makeTripMitraForDispatch();
    $tripMitra->shouldReceive('getAttribute')->with('trip')->andReturn(null);

    expect(fn () => $this->service->updateAssignment($tripMitra, []))
        ->toThrow(ValidationException::class);
});

it('updateAssignment throw jika trip tidak bisa assign', function () {
    $tripMitra = makeTripMitraForDispatch();
    $trip = makeTripForDispatch(['status' => TripStatus::COMPLETED]);
    $trip->shouldReceive('canAssignMitra')->andReturn(false);

    $tripMitra->shouldReceive('getAttribute')->with('trip')->andReturn($trip);

    expect(fn () => $this->service->updateAssignment($tripMitra, []))
        ->toThrow(ValidationException::class);
});

it('updateAssignment update role valid', function () {
    $tripMitra = makeTripMitraForDispatch();
    $trip = makeTripForDispatch(['status' => TripStatus::SCHEDULED]);
    $trip->shouldReceive('canAssignMitra')->andReturn(true);

    $tripMitra->shouldReceive('getAttribute')->with('trip')->andReturn($trip);

    $tripMitra->shouldReceive('update')
        ->once()
        ->with(Mockery::on(fn ($attrs) => $attrs['role'] === TripMitraRole::ASISTEN->value
        ));

    $tripMitra->shouldReceive('refresh')->andReturnSelf();
    $tripMitra->shouldReceive('load')->with(['mitra', 'assigner'])->andReturnSelf();

    $result = $this->service->updateAssignment($tripMitra, [
        'role' => TripMitraRole::ASISTEN->value,
    ]);

    expect($result)->toBe($tripMitra);
});

it('updateAssignment throw jika role tidak valid', function () {
    $tripMitra = makeTripMitraForDispatch();
    $trip = makeTripForDispatch(['status' => TripStatus::SCHEDULED]);
    $trip->shouldReceive('canAssignMitra')->andReturn(true);

    $tripMitra->shouldReceive('getAttribute')->with('trip')->andReturn($trip);

    expect(fn () => $this->service->updateAssignment($tripMitra, [
        'role' => 'invalid_role',
    ]))
        ->toThrow(ValidationException::class);
});

it('updateAssignment throw jika honor <= 0 (BVA)', function () {
    $tripMitra = makeTripMitraForDispatch();
    $trip = makeTripForDispatch(['status' => TripStatus::SCHEDULED]);
    $trip->shouldReceive('canAssignMitra')->andReturn(true);

    $tripMitra->shouldReceive('getAttribute')->with('trip')->andReturn($trip);

    expect(fn () => $this->service->updateAssignment($tripMitra, [
        'honor' => 0,
    ]))
        ->toThrow(ValidationException::class);
});

it('updateAssignment update honor valid', function () {
    $tripMitra = makeTripMitraForDispatch();
    $trip = makeTripForDispatch(['status' => TripStatus::SCHEDULED]);
    $trip->shouldReceive('canAssignMitra')->andReturn(true);

    $tripMitra->shouldReceive('getAttribute')->with('trip')->andReturn($trip);

    $tripMitra->shouldReceive('update')
        ->once()
        ->with(Mockery::on(fn ($attrs) => $attrs['honor'] === 750000.0));

    $tripMitra->shouldReceive('refresh')->andReturnSelf();
    $tripMitra->shouldReceive('load')->andReturnSelf();

    $this->service->updateAssignment($tripMitra, ['honor' => 750000]);

    expect(true)->toBeTrue();
});

it('updateAssignment throw jika honor_tipe tidak valid', function () {
    $tripMitra = makeTripMitraForDispatch();
    $trip = makeTripForDispatch(['status' => TripStatus::SCHEDULED]);
    $trip->shouldReceive('canAssignMitra')->andReturn(true);

    $tripMitra->shouldReceive('getAttribute')->with('trip')->andReturn($trip);

    expect(fn () => $this->service->updateAssignment($tripMitra, [
        'honor_tipe' => 'invalid',
    ]))
        ->toThrow(ValidationException::class);
});

it('updateAssignment update instruksi', function () {
    $tripMitra = makeTripMitraForDispatch();
    $trip = makeTripForDispatch(['status' => TripStatus::SCHEDULED]);
    $trip->shouldReceive('canAssignMitra')->andReturn(true);

    $tripMitra->shouldReceive('getAttribute')->with('trip')->andReturn($trip);

    $tripMitra->shouldReceive('update')
        ->once()
        ->with(Mockery::on(fn ($attrs) => $attrs['instruksi'] === 'Instruksi baru'
        ));

    $tripMitra->shouldReceive('refresh')->andReturnSelf();
    $tripMitra->shouldReceive('load')->andReturnSelf();

    $this->service->updateAssignment($tripMitra, ['instruksi' => 'Instruksi baru']);

    expect(true)->toBeTrue();
});

it('updateAssignment hanya update field yang dikirim (partial update)', function () {
    $tripMitra = makeTripMitraForDispatch();
    $trip = makeTripForDispatch(['status' => TripStatus::SCHEDULED]);
    $trip->shouldReceive('canAssignMitra')->andReturn(true);

    $tripMitra->shouldReceive('getAttribute')->with('trip')->andReturn($trip);

    $tripMitra->shouldReceive('update')
        ->once()
        ->with(Mockery::on(fn ($attrs) => array_keys($attrs) === ['role']  // hanya role
        ));

    $tripMitra->shouldReceive('refresh')->andReturnSelf();
    $tripMitra->shouldReceive('load')->andReturnSelf();

    $this->service->updateAssignment($tripMitra, ['role' => 'lead']);

    expect(true)->toBeTrue();
});

/*
|==========================================================================
| unassignMitra() — HAPPY & NEGATIVE PATH
|==========================================================================
*/

it('unassignMitra throw jika trip tidak ditemukan', function () {
    $tripMitra = makeTripMitraForDispatch();
    $tripMitra->shouldReceive('getAttribute')->with('trip')->andReturn(null);

    expect(fn () => $this->service->unassignMitra($tripMitra))
        ->toThrow(ValidationException::class);
});

it('unassignMitra throw jika trip tidak bisa assign', function () {
    $tripMitra = makeTripMitraForDispatch();
    $trip = makeTripForDispatch(['status' => TripStatus::COMPLETED]);
    $trip->shouldReceive('canAssignMitra')->andReturn(false);

    $tripMitra->shouldReceive('getAttribute')->with('trip')->andReturn($trip);

    expect(fn () => $this->service->unassignMitra($tripMitra))
        ->toThrow(ValidationException::class);
});

it('unassignMitra berhasil delete (status SCHEDULED)', function () {
    $tripMitra = makeTripMitraForDispatch();
    $trip = makeTripForDispatch(['status' => TripStatus::SCHEDULED]);
    $trip->shouldReceive('canAssignMitra')->andReturn(true);

    $tripMitra->shouldReceive('getAttribute')->with('trip')->andReturn($trip);
    $tripMitra->shouldReceive('delete')->once();

    $this->service->unassignMitra($tripMitra);

    expect(true)->toBeTrue();
});

/*
|==========================================================================
| totalHonorForTrip() — HAPPY PATH (FULL)
|==========================================================================
*/

it('totalHonorForTrip return 0 jika tidak ada mitra', function () {
    $trip = makeTripForDispatch();
    $trip->shouldReceive('loadMissing')->with('mitras')->andReturnSelf();
    $trip->shouldReceive('getAttribute')->with('mitras')->andReturn(new Collection);
    $trip->shouldReceive('durasiHari')->andReturn(2);

    expect($this->service->totalHonorForTrip($trip))->toBe(0.0);
});

it('totalHonorForTrip hitung total honor dari semua mitra', function () {
    $trip = makeTripForDispatch();
    $trip->shouldReceive('loadMissing')->andReturnSelf();
    $trip->shouldReceive('durasiHari')->andReturn(3);

    // 2 mitra
    $mitra1 = makeTripMitraForDispatch(['honor_tipe' => TripHonorTipe::FLAT, 'honor' => '500000.00']);
    $mitra1->shouldReceive('hitungHonorTotal')->with(3)->andReturn(500000.0);

    $mitra2 = makeTripMitraForDispatch(['honor_tipe' => TripHonorTipe::PER_HARI, 'honor' => '200000.00']);
    $mitra2->shouldReceive('hitungHonorTotal')->with(3)->andReturn(600000.0);

    $collection = new Collection([$mitra1, $mitra2]);
    $trip->shouldReceive('getAttribute')->with('mitras')->andReturn($collection);

    expect($this->service->totalHonorForTrip($trip))->toBe(1_100_000.0);
});

/*
|==========================================================================
| searchMitras() — HAPPY PATH
|==========================================================================
*/

it('searchMitras memanggil UserRepository->searchByRole', function () {
    $userRepo = Mockery::mock(UserRepositoryInterface::class);
    $expectedCollection = new Collection;

    $userRepo->shouldReceive('searchByRole')
        ->once()
        ->with('mitra', 'budi', 10)
        ->andReturn($expectedCollection);

    app()->instance(UserRepositoryInterface::class, $userRepo);

    $result = $this->service->searchMitras('budi', 10);

    expect($result)->toBe($expectedCollection);
});

it('searchMitras pakai default limit = 10', function () {
    $userRepo = Mockery::mock(UserRepositoryInterface::class);
    $expectedCollection = new Collection;

    $userRepo->shouldReceive('searchByRole')
        ->once()
        ->with('mitra', 'test', 10)
        ->andReturn($expectedCollection);

    app()->instance(UserRepositoryInterface::class, $userRepo);

    $this->service->searchMitras('test');
});
