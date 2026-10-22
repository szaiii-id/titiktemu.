<?php

use App\Enums\PayoutStatus;
use App\Models\MitraWallet;
use App\Models\Payout;
use App\Models\User;
use App\Repositories\Contracts\PayoutRepositoryInterface;
use App\Services\Wallet\PayoutService;
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
    $this->payoutRepo = Mockery::mock(PayoutRepositoryInterface::class);
    $this->walletService = Mockery::mock(WalletService::class);

    $this->service = new PayoutService(
        $this->payoutRepo,
        $this->walletService,
    );

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

function makePayoutMock(array $attrs = []): MockInterface
{
    $payout = Mockery::mock(Payout::class)->makePartial();
    $payout->forceFill(array_merge([
        'id' => 1,
        'kode' => 'PAY-2026-001',
        'mitra_id' => 100,
        'jumlah' => '500000.00',
        'bank_tujuan' => 'BCA',
        'no_rekening' => '1234567890',
        'nama_pemilik' => 'Budi',
        'status' => PayoutStatus::PENDING,
        'requested_at' => now(),
        'reviewed_by' => null,
        'reviewed_at' => null,
        'paid_at' => null,
        'rejection_reason' => null,
        'catatan' => null,
    ], $attrs));

    return $payout;
}

function makeMitraForPayout(array $attrs = []): MockInterface
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

function makeAdminForPayout(array $attrs = []): MockInterface
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

function makeWalletForPayout(array $attrs = []): MockInterface
{
    $wallet = Mockery::mock(MitraWallet::class)->makePartial();
    $wallet->forceFill(array_merge([
        'id' => 1,
        'mitra_id' => 100,
        'saldo' => '1000000.00',
        'total_pendapatan' => '2000000.00',
        'total_dicairkan' => '0.00',
    ], $attrs));

    return $wallet;
}

/*
|==========================================================================
| READ — Pass-through
|==========================================================================
*/

it('paginate meneruskan parameter ke repository', function () {
    $paginator = Mockery::mock(LengthAwarePaginator::class);

    $this->payoutRepo->shouldReceive('paginate')
        ->once()
        ->with(['status' => 'pending'], 20)
        ->andReturn($paginator);

    expect($this->service->paginate(['status' => 'pending'], 20))->toBe($paginator);
});

it('paginateForMitra meneruskan parameter', function () {
    $paginator = Mockery::mock(LengthAwarePaginator::class);
    $mitra = makeMitraForPayout();

    $this->payoutRepo->shouldReceive('paginateForMitra')
        ->once()
        ->with($mitra, [], 10)
        ->andReturn($paginator);

    expect($this->service->paginateForMitra($mitra))->toBe($paginator);
});

it('countByStatus pass-through', function () {
    $this->payoutRepo->shouldReceive('countByStatus')
        ->once()
        ->andReturn(['pending' => 5, 'approved' => 2]);

    expect($this->service->countByStatus())
        ->toBe(['pending' => 5, 'approved' => 2]);
});

it('countByStatusForMitra pass-through', function () {
    $mitra = makeMitraForPayout();

    $this->payoutRepo->shouldReceive('countByStatusForMitra')
        ->once()
        ->with($mitra)
        ->andReturn(['pending' => 1]);

    expect($this->service->countByStatusForMitra($mitra))->toBe(['pending' => 1]);
});

/*
|==========================================================================
| request() — NEGATIVE PATH (guard clause)
|==========================================================================
*/

it('request throw jika saldo kurang dari jumlah', function () {
    $mitra = makeMitraForPayout();
    $wallet = makeWalletForPayout(['saldo' => '100000.00']);

    $this->walletService->shouldReceive('findByMitra')
        ->with($mitra)
        ->andReturn($wallet);

    expect(fn () => $this->service->request($mitra, [
        'jumlah' => 500000,
        'bank_tujuan' => 'BCA',
        'no_rekening' => '1234567890',
        'nama_pemilik' => 'Budi',
    ]))
        ->toThrow(ValidationException::class);
});

it('request throw jika jumlah < MINIMUM_PAYOUT (BVA)', function () {
    // BVA: jumlah = 99999 (di bawah 100000)
    $mitra = makeMitraForPayout();
    $wallet = makeWalletForPayout(['saldo' => '1000000.00']);

    $this->walletService->shouldReceive('findByMitra')
        ->with($mitra)
        ->andReturn($wallet);

    expect(fn () => $this->service->request($mitra, [
        'jumlah' => 99999,
        'bank_tujuan' => 'BCA',
        'no_rekening' => '1234567890',
        'nama_pemilik' => 'Budi',
    ]))
        ->toThrow(ValidationException::class);
});

it('request throw jika sudah ada payout pending hari ini', function () {
    $mitra = makeMitraForPayout();
    $wallet = makeWalletForPayout(['saldo' => '1000000.00']);

    $this->walletService->shouldReceive('findByMitra')
        ->with($mitra)
        ->andReturn($wallet);

    $pendingCollection = new Collection([makePayoutMock()]);

    $this->payoutRepo->shouldReceive('findPendingForMitraToday')
        ->with($mitra)
        ->andReturn($pendingCollection);

    expect(fn () => $this->service->request($mitra, [
        'jumlah' => 500000,
        'bank_tujuan' => 'BCA',
        'no_rekening' => '1234567890',
        'nama_pemilik' => 'Budi',
    ]))
        ->toThrow(ValidationException::class);
});

/*
|==========================================================================
| request() — HAPPY PATH
|==========================================================================
*/

it('request berhasil buat payout dengan data lengkap', function () {
    $mitra = makeMitraForPayout();
    $wallet = makeWalletForPayout(['saldo' => '1000000.00']);

    $this->walletService->shouldReceive('findByMitra')
        ->with($mitra)
        ->andReturn($wallet);

    $this->payoutRepo->shouldReceive('findPendingForMitraToday')
        ->with($mitra)
        ->andReturn(new Collection);

    $this->payoutRepo->shouldReceive('generateKode')
        ->once()
        ->with((int) now()->year)
        ->andReturn('PAY-2026-001');

    $createdPayout = makePayoutMock(['id' => 1, 'kode' => 'PAY-2026-001']);

    $this->payoutRepo->shouldReceive('create')
        ->once()
        ->with(Mockery::on(function ($payload) use ($mitra) {
            return $payload['kode'] === 'PAY-2026-001'
                && $payload['mitra_id'] === $mitra->id
                && $payload['jumlah'] === 500000.0
                && $payload['bank_tujuan'] === 'BCA'
                && $payload['no_rekening'] === '1234567890'
                && $payload['nama_pemilik'] === 'Budi'
                && $payload['status'] === PayoutStatus::PENDING->value
                && $payload['requested_at'] !== null;
        }))
        ->andReturn($createdPayout);

    $result = $this->service->request($mitra, [
        'jumlah' => 500000,
        'bank_tujuan' => 'BCA',
        'no_rekening' => '1234567890',
        'nama_pemilik' => 'Budi',
        'catatan' => 'Tolong segera',
    ]);

    expect($result)->toBe($createdPayout);
});

it('request lolos jika jumlah tepat MINIMUM_PAYOUT (BVA batas bawah)', function () {
    // BVA: jumlah = 100000 (batas valid)
    $mitra = makeMitraForPayout();
    $wallet = makeWalletForPayout(['saldo' => '1000000.00']);

    $this->walletService->shouldReceive('findByMitra')
        ->with($mitra)
        ->andReturn($wallet);

    $this->payoutRepo->shouldReceive('findPendingForMitraToday')
        ->andReturn(new Collection);

    $this->payoutRepo->shouldReceive('generateKode')
        ->andReturn('PAY-2026-001');

    $this->payoutRepo->shouldReceive('create')
        ->once()
        ->with(Mockery::on(fn ($p) => $p['jumlah'] === 100000.0))
        ->andReturn(makePayoutMock());

    $this->service->request($mitra, [
        'jumlah' => 100000,
        'bank_tujuan' => 'BCA',
        'no_rekening' => '1234567890',
        'nama_pemilik' => 'Budi',
    ]);

    expect(true)->toBeTrue();
});

/*
|==========================================================================
| approve() — HAPPY & NEGATIVE PATH
|==========================================================================
*/

it('approve throw jika status bukan pending', function () {
    $payout = makePayoutMock(['status' => PayoutStatus::APPROVED]);
    $admin = makeAdminForPayout();

    expect(fn () => $this->service->approve($payout, $admin))
        ->toThrow(ValidationException::class);
});

it('approve throw jika mitra null', function () {
    $payout = makePayoutMock();
    $payout->shouldReceive('getAttribute')->with('mitra')->andReturn(null);

    $admin = makeAdminForPayout();

    expect(fn () => $this->service->approve($payout, $admin))
        ->toThrow(ValidationException::class);
});

it('approve debit wallet dan update status ke approved', function () {
    $payout = makePayoutMock(['status' => PayoutStatus::PENDING, 'jumlah' => '500000.00']);
    $admin = makeAdminForPayout(['id' => 99]);
    $mitra = makeMitraForPayout();

    $payout->shouldReceive('getAttribute')->with('mitra')->andReturn($mitra);
    $payout->shouldReceive('getAttribute')->with('jumlah')->andReturn('500000.00');
    $payout->shouldReceive('getAttribute')->with('kode')->andReturn('PAY-2026-001');
    $payout->shouldReceive('getAttribute')->with('id')->andReturn(1);

    $this->walletService->shouldReceive('debitForPayout')
        ->once()
        ->with($mitra, 500000.0, 'Pencairan PAY-2026-001', 1);

    $approvedPayout = makePayoutMock(['status' => PayoutStatus::APPROVED]);

    $this->payoutRepo->shouldReceive('update')
        ->once()
        ->with($payout, Mockery::on(fn ($attrs) => $attrs['status'] === PayoutStatus::APPROVED->value
            && $attrs['reviewed_by'] === 99
        ))
        ->andReturn($approvedPayout);

    $result = $this->service->approve($payout, $admin);

    expect($result)->toBe($approvedPayout);
});

/*
|==========================================================================
| reject() — HAPPY & NEGATIVE PATH
|==========================================================================
*/

it('reject throw jika status bukan pending', function () {
    $payout = makePayoutMock(['status' => PayoutStatus::APPROVED]);
    $admin = makeAdminForPayout();

    expect(fn () => $this->service->reject($payout, $admin, 'Alasan'))
        ->toThrow(ValidationException::class);
});

it('reject berhasil update status ke rejected', function () {
    $payout = makePayoutMock(['status' => PayoutStatus::PENDING]);
    $admin = makeAdminForPayout(['id' => 99]);

    $payout->shouldReceive('getAttribute')->with('id')->andReturn(1);

    $rejectedPayout = makePayoutMock(['status' => PayoutStatus::REJECTED]);

    $this->payoutRepo->shouldReceive('update')
        ->once()
        ->with($payout, Mockery::on(fn ($attrs) => $attrs['status'] === PayoutStatus::REJECTED->value
            && $attrs['rejection_reason'] === 'Data rekening salah'
            && $attrs['reviewed_by'] === 99
        ))
        ->andReturn($rejectedPayout);

    $result = $this->service->reject($payout, $admin, 'Data rekening salah');

    expect($result)->toBe($rejectedPayout);
});

/*
|==========================================================================
| markPaid() — HAPPY & NEGATIVE PATH
|==========================================================================
*/

it('markPaid throw jika status bukan approved', function () {
    $payout = makePayoutMock(['status' => PayoutStatus::PENDING]);
    $admin = makeAdminForPayout();

    expect(fn () => $this->service->markPaid($payout, $admin))
        ->toThrow(ValidationException::class);
});

it('markPaid berhasil update status ke paid', function () {
    $payout = makePayoutMock(['status' => PayoutStatus::APPROVED]);
    $admin = makeAdminForPayout();

    $payout->shouldReceive('getAttribute')->with('id')->andReturn(1);

    $paidPayout = makePayoutMock(['status' => PayoutStatus::PAID]);

    $this->payoutRepo->shouldReceive('update')
        ->once()
        ->with($payout, Mockery::on(fn ($attrs) => $attrs['status'] === PayoutStatus::PAID->value
            && $attrs['paid_at'] !== null
        ))
        ->andReturn($paidPayout);

    $result = $this->service->markPaid($payout, $admin);

    expect($result)->toBe($paidPayout);
});

/*
|==========================================================================
| BVA — minimum payout (const)
|==========================================================================
*/

it('MINIMUM_PAYOUT bernilai 100000', function () {
    expect(PayoutService::MINIMUM_PAYOUT)->toBe(100000);
});
