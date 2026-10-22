<?php

use App\Enums\TripStatus;
use App\Models\DailyReport;
use App\Models\Trip;
use App\Models\TripDay;
use App\Models\User;
use App\Repositories\Contracts\DailyReportRepositoryInterface;
use App\Services\Trip\DailyReportService;
use App\Services\Wallet\WalletService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Mockery\MockInterface;

/*
|==========================================================================
| SETUP
|==========================================================================
*/

beforeEach(function () {
    $this->dailyReportRepo = Mockery::mock(DailyReportRepositoryInterface::class);
    $this->walletService = Mockery::mock(WalletService::class);

    $this->service = new DailyReportService(
        $this->dailyReportRepo,
        $this->walletService,
    );

    DB::shouldReceive('transaction')
        ->byDefault()
        ->andReturnUsing(fn ($callback) => $callback());

    Log::shouldReceive('info')->byDefault()->andReturnNull();
    Log::shouldReceive('warning')->byDefault()->andReturnNull();
    Log::shouldReceive('error')->byDefault()->andReturnNull();
});

afterEach(function () {
    Mockery::close();
});

/*
|==========================================================================
| HELPERS
|==========================================================================
*/

function makeDailyReportMock(array $attrs = []): MockInterface
{
    $report = Mockery::mock(DailyReport::class)->makePartial();
    $report->forceFill(array_merge([
        'id' => 1,
        'trip_day_id' => 10,
        'mitra_id' => 100,
        'catatan' => null,
        'status' => DailyReport::STATUS_SUBMITTED,
        'submitted_at' => now(),
        'verified_by' => null,
        'verified_at' => null,
        'rejection_reason' => null,
    ], $attrs));

    return $report;
}

function makeTripDayMock(array $attrs = []): MockInterface
{
    $tripDay = Mockery::mock(TripDay::class)->makePartial();
    $tripDay->forceFill(array_merge([
        'id' => 10,
        'trip_id' => 1,
        'hari_ke' => 1,
        'tanggal' => now()->format('Y-m-d'),
        'judul' => 'Day 1',
        'status' => TripDay::STATUS_PENDING,
    ], $attrs));

    return $tripDay;
}

function makeTripForDailyReport(array $attrs = []): MockInterface
{
    $trip = Mockery::mock(Trip::class)->makePartial();
    $trip->forceFill(array_merge([
        'id' => 1,
        'kode' => 'TRP-001',
        'booking_id' => 10,
        'package_id' => 5,
        'tanggal_mulai' => now()->subDay()->format('Y-m-d'),
        'tanggal_selesai' => now()->addDay()->format('Y-m-d'),
        'status' => TripStatus::ACTIVE,
        'timezone' => 'Asia/Makassar',
    ], $attrs));

    return $trip;
}

function makeMitraForDailyReport(array $attrs = []): MockInterface
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

function makeAdminForDailyReport(array $attrs = []): MockInterface
{
    $admin = Mockery::mock(User::class)->makePartial();
    $admin->forceFill(array_merge([
        'id' => 99,
        'name' => 'Admin Test',
        'email' => 'admin@example.com',
        'role' => 'admin',
    ], $attrs));

    return $admin;
}

/*
|==========================================================================
| READ — Pass-through
|==========================================================================
*/

it('paginate meneruskan parameter ke repository', function () {
    $paginator = Mockery::mock(LengthAwarePaginator::class);

    $this->dailyReportRepo->shouldReceive('paginate')
        ->once()
        ->with(['search' => 'bali'], 25)
        ->andReturn($paginator);

    expect($this->service->paginate(['search' => 'bali'], 25))->toBe($paginator);
});

it('findDetail mengembalikan report jika ada', function () {
    $report = makeDailyReportMock();

    $this->dailyReportRepo->shouldReceive('findById')
        ->once()
        ->with(1)
        ->andReturn($report);

    expect($this->service->findDetail(1))->toBe($report);
});

it('findDetail throw jika report tidak ada', function () {
    $this->dailyReportRepo->shouldReceive('findById')->with(999)->andReturn(null);

    expect(fn () => $this->service->findDetail(999))
        ->toThrow(ValidationException::class);
});

it('allDaysVerifiedForTrip pass-through', function () {
    $trip = makeTripForDailyReport();

    $this->dailyReportRepo->shouldReceive('allDaysVerifiedForTrip')
        ->once()
        ->with($trip)
        ->andReturn(true);

    expect($this->service->allDaysVerifiedForTrip($trip))->toBeTrue();
});

it('countByStatus pass-through', function () {
    $this->dailyReportRepo->shouldReceive('countByStatus')
        ->once()
        ->andReturn(['submitted' => 3, 'verified' => 2]);

    expect($this->service->countByStatus())
        ->toBe(['submitted' => 3, 'verified' => 2]);
});

/*
|==========================================================================
| verify() — HAPPY & NEGATIVE PATH (FULL)
|==========================================================================
*/

it('verify throw jika report bukan submitted', function () {
    $report = makeDailyReportMock(['status' => DailyReport::STATUS_VERIFIED]);
    $admin = makeAdminForDailyReport();

    $report->shouldReceive('isSubmitted')->andReturn(false);

    expect(fn () => $this->service->verify($report, $admin))
        ->toThrow(ValidationException::class);
});

it('verify berhasil update status ke verified', function () {
    $report = makeDailyReportMock(['status' => DailyReport::STATUS_SUBMITTED]);
    $admin = makeAdminForDailyReport(['id' => 99]);

    $report->shouldReceive('isSubmitted')->andReturn(true);
    $report->shouldReceive('getAttribute')->with('trip_day_id')->andReturn(10);

    $updatedReport = makeDailyReportMock(['status' => DailyReport::STATUS_VERIFIED]);
    $updatedReport->shouldReceive('getAttribute')->with('tripDay')->andReturn(null);
    $updatedReport->shouldReceive('load')->with(['media', 'tripDay.trip'])->andReturnSelf();

    $this->dailyReportRepo->shouldReceive('update')
        ->once()
        ->with($report, Mockery::on(fn ($attrs) => $attrs['status'] === DailyReport::STATUS_VERIFIED
            && $attrs['verified_by'] === 99
            && $attrs['rejection_reason'] === null
        ))
        ->andReturn($updatedReport);

    $result = $this->service->verify($report, $admin);

    expect($result)->toBe($updatedReport);
});

it('verify otomatis complete TripDay jika semua report verified', function () {
    $report = makeDailyReportMock();
    $admin = makeAdminForDailyReport();

    $report->shouldReceive('isSubmitted')->andReturn(true);

    $tripDay = makeTripDayMock(['id' => 10]);
    $tripDay->shouldReceive('load')->andReturnSelf();
    $tripDay->shouldReceive('allReportsVerified')->andReturn(true);
    $tripDay->shouldReceive('isCompleted')->andReturn(false);
    $tripDay->shouldReceive('update')
        ->once()
        ->with(['status' => TripDay::STATUS_COMPLETED]);
    $tripDay->shouldReceive('getAttribute')->with('trip')->andReturn(null);

    $updatedReport = makeDailyReportMock();
    $updatedReport->shouldReceive('getAttribute')->with('tripDay')->andReturn($tripDay);
    $updatedReport->shouldReceive('load')->andReturnSelf();

    $this->dailyReportRepo->shouldReceive('update')->andReturn($updatedReport);

    $this->service->verify($report, $admin);

    expect(true)->toBeTrue();
});

/*
|==========================================================================
| reject() — HAPPY & NEGATIVE PATH (FULL)
|==========================================================================
*/

it('reject throw jika report bukan submitted', function () {
    $report = makeDailyReportMock(['status' => DailyReport::STATUS_VERIFIED]);
    $admin = makeAdminForDailyReport();

    $report->shouldReceive('isSubmitted')->andReturn(false);

    expect(fn () => $this->service->reject($report, $admin, 'Alasan valid'))
        ->toThrow(ValidationException::class);
});

it('reject throw jika alasan < 5 karakter (BVA)', function () {
    $report = makeDailyReportMock();
    $admin = makeAdminForDailyReport();

    $report->shouldReceive('isSubmitted')->andReturn(true);

    expect(fn () => $this->service->reject($report, $admin, 'abc'))
        ->toThrow(ValidationException::class);
});

it('reject berhasil dengan alasan >= 5 karakter', function () {
    $report = makeDailyReportMock();
    $admin = makeAdminForDailyReport(['id' => 99]);

    $report->shouldReceive('isSubmitted')->andReturn(true);

    $updatedReport = makeDailyReportMock(['status' => DailyReport::STATUS_REJECTED]);
    $updatedReport->shouldReceive('load')->andReturnSelf();

    $this->dailyReportRepo->shouldReceive('update')
        ->once()
        ->with($report, Mockery::on(fn ($attrs) => $attrs['status'] === DailyReport::STATUS_REJECTED
            && $attrs['rejection_reason'] === 'Foto kurang jelas'
        ))
        ->andReturn($updatedReport);

    $result = $this->service->reject($report, $admin, 'Foto kurang jelas');

    expect($result)->toBe($updatedReport);
});

it('reject dengan alasan tepat 5 karakter (BVA batas)', function () {
    $report = makeDailyReportMock();
    $admin = makeAdminForDailyReport();

    $report->shouldReceive('isSubmitted')->andReturn(true);

    $updatedReport = makeDailyReportMock();
    $updatedReport->shouldReceive('load')->andReturnSelf();

    $this->dailyReportRepo->shouldReceive('update')->andReturn($updatedReport);

    $result = $this->service->reject($report, $admin, 'abcde'); // 5 char

    expect($result)->toBe($updatedReport);
});

/*
|==========================================================================
| uploadMedia() — via Reflection (FULL)
|==========================================================================
*/

it('uploadMedia simpan file ke storage dan return path', function () {
    Storage::fake('public');

    $file = UploadedFile::fake()->image('bukti.jpg');

    $ref = new ReflectionMethod($this->service, 'uploadMedia');
    $ref->setAccessible(true);

    $result = $ref->invoke($this->service, [$file]);

    expect($result)->toHaveCount(1);
    expect($result[0])->toStartWith('daily-reports/');

    Storage::disk('public')->assertExists($result[0]);
});

it('uploadMedia throw RuntimeException jika store() return false', function () {
    // Mock UploadedFile->store() return false
    $file = Mockery::mock(UploadedFile::class);
    $file->shouldReceive('store')->with('daily-reports', 'public')->andReturn(false);

    $ref = new ReflectionMethod($this->service, 'uploadMedia');
    $ref->setAccessible(true);

    expect(fn () => $ref->invoke($this->service, [$file]))
        ->toThrow(RuntimeException::class);
});

/*
|==========================================================================
| validateSubmit() — via Reflection (PARTIAL)
|==========================================================================
| Karena `$trip->mitras()->where()->exists()` static HasMany,
| kita perlu mock HasMany untuk validasi mitra.
|==========================================================================
*/

it('validateSubmit throw jika trip bukan active', function () {
    $trip = makeTripForDailyReport(['status' => TripStatus::COMPLETED]);
    $tripDay = makeTripDayMock();
    $mitra = makeMitraForDailyReport();

    $ref = new ReflectionMethod($this->service, 'validateSubmit');
    $ref->setAccessible(true);

    expect(fn () => $ref->invoke($this->service, $trip, $tripDay, $mitra, [
        'media' => [UploadedFile::fake()->image('test.jpg')],
    ]))
        ->toThrow(ValidationException::class);
});

it('validateSubmit throw jika tripDay bukan bagian trip (trip_id beda)', function () {
    $trip = makeTripForDailyReport(['id' => 1]);
    $tripDay = makeTripDayMock(['trip_id' => 999]);
    $mitra = makeMitraForDailyReport();

    $ref = new ReflectionMethod($this->service, 'validateSubmit');
    $ref->setAccessible(true);

    expect(fn () => $ref->invoke($this->service, $trip, $tripDay, $mitra, [
        'media' => [UploadedFile::fake()->image('test.jpg')],
    ]))
        ->toThrow(ValidationException::class);
});

it('validateSubmit throw jika media < 1 (BVA)', function () {
    $trip = makeTripForDailyReport();
    $tripDay = makeTripDayMock(['trip_id' => 1, 'tanggal' => now()->format('Y-m-d')]);
    $mitra = makeMitraForDailyReport();

    $trip->shouldReceive('timezoneOrDefault')->andReturn('Asia/Makassar');

    // Mock hasMany — WAJIB agar tidak query DB
    $hasMany = Mockery::mock(HasMany::class);
    $hasMany->shouldReceive('where')->with('mitra_id', $mitra->id)->andReturnSelf();
    $hasMany->shouldReceive('exists')->andReturn(true);
    $trip->shouldReceive('mitras')->andReturn($hasMany);

    $ref = new ReflectionMethod($this->service, 'validateSubmit');
    $ref->setAccessible(true);

    expect(fn () => $ref->invoke($this->service, $trip, $tripDay, $mitra, [
        'media' => [],
    ]))
        ->toThrow(ValidationException::class);
});

it('validateSubmit throw jika media > 2 (BVA)', function () {
    $trip = makeTripForDailyReport();
    $tripDay = makeTripDayMock(['trip_id' => 1, 'tanggal' => now()->format('Y-m-d')]);
    $mitra = makeMitraForDailyReport();

    $trip->shouldReceive('timezoneOrDefault')->andReturn('Asia/Makassar');

    // Mock hasMany
    $hasMany = Mockery::mock(HasMany::class);
    $hasMany->shouldReceive('where')->with('mitra_id', $mitra->id)->andReturnSelf();
    $hasMany->shouldReceive('exists')->andReturn(true);
    $trip->shouldReceive('mitras')->andReturn($hasMany);

    $ref = new ReflectionMethod($this->service, 'validateSubmit');
    $ref->setAccessible(true);

    expect(fn () => $ref->invoke($this->service, $trip, $tripDay, $mitra, [
        'media' => [
            UploadedFile::fake()->image('1.jpg'),
            UploadedFile::fake()->image('2.jpg'),
            UploadedFile::fake()->image('3.jpg'),
        ],
    ]))
        ->toThrow(ValidationException::class);
});
