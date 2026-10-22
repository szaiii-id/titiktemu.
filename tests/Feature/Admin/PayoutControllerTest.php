<?php

use App\Enums\PayoutStatus;
use App\Models\MitraWallet;
use App\Models\Payout;
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

    // Wallet mitra (untuk debitForPayout)
    $this->wallet = MitraWallet::factory()->create([
        'mitra_id' => $this->mitra->id,
        'saldo' => '1000000.00',
        'total_pendapatan' => '2000000.00',
        'total_dicairkan' => '0.00',
    ]);

    // Payout PENDING
    $this->pendingPayout = Payout::factory()->create([
        'mitra_id' => $this->mitra->id,
        'jumlah' => '500000.00',
        'bank_tujuan' => 'BCA',
        'no_rekening' => '1234567890',
        'nama_pemilik' => 'Mitra Test',
        'status' => PayoutStatus::PENDING,
        'requested_at' => now(),
    ]);

    // Payout APPROVED
    $this->approvedPayout = Payout::factory()->create([
        'mitra_id' => $this->mitra->id,
        'jumlah' => '250000.00',
        'bank_tujuan' => 'Mandiri',
        'no_rekening' => '0987654321',
        'nama_pemilik' => 'Mitra Test',
        'status' => PayoutStatus::APPROVED,
        'requested_at' => now()->subDay(),
        'reviewed_by' => $this->admin->id,
        'reviewed_at' => now()->subHours(12),
    ]);
});

/*
|==========================================================================
| KATEGORI 1 — CONTRACT / API SCHEMA
|==========================================================================
*/

it('GET /admin/payouts merender Inertia component Admin/Payouts/Index', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.payouts.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/Payouts/Index')
        ->has('payouts')
        ->has('filters')
        ->has('statusCounts')
    );
});

/*
|==========================================================================
| KATEGORI 2 — SECURITY & AUTHORIZATION
|==========================================================================
*/

it('guest di-redirect ke login saat akses /admin/payouts', function () {
    $this->get(route('admin.payouts.index'))->assertRedirect(route('login'));
});

it('mitra tidak bisa akses /admin/payouts (redirect ke dashboard mitra)', function () {
    $this->actingAs($this->mitra)
        ->get(route('admin.payouts.index'))
        ->assertRedirect(route('mitra.dashboard'));
});

it('client tidak bisa akses /admin/payouts (redirect ke dashboard client)', function () {
    $this->actingAs($this->client)
        ->get(route('admin.payouts.index'))
        ->assertRedirect(route('client.dashboard'));
});

it('admin dengan must_change_password = true di-redirect ke change-password', function () {
    $admin = User::factory()->admin()->create(['must_change_password' => true]);

    $this->actingAs($admin)
        ->get(route('admin.payouts.index'))
        ->assertRedirect(route('password.change'));
});

/*
|==========================================================================
| KATEGORI 3 — DATA INTEGRITY: Approve Payout
|==========================================================================
*/

it('approve payout ubah status pending → approved', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.payouts.approve', $this->pendingPayout->id))
        ->assertRedirect();

    $this->pendingPayout->refresh();
    expect($this->pendingPayout->status)->toBe(PayoutStatus::APPROVED);
});

it('approve payout debit saldo wallet mitra', function () {
    $saldoBefore = (float) $this->wallet->saldo;

    $this->actingAs($this->admin)
        ->post(route('admin.payouts.approve', $this->pendingPayout->id));

    $this->wallet->refresh();
    $saldoAfter = (float) $this->wallet->saldo;

    expect($saldoAfter)->toBe($saldoBefore - 500000.0);
});

it('approve payout set reviewed_by dan reviewed_at', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.payouts.approve', $this->pendingPayout->id));

    $this->pendingPayout->refresh();
    expect($this->pendingPayout->reviewed_by)->toBe($this->admin->id);
    expect($this->pendingPayout->reviewed_at)->not->toBeNull();
});

it('approve payout create wallet_transaction kategori payout', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.payouts.approve', $this->pendingPayout->id));

    $this->assertDatabaseHas('wallet_transactions', [
        'referensi_type' => Payout::class,
        'referensi_id' => $this->pendingPayout->id,
        'kategori' => 'payout',
    ]);
});

/*
|==========================================================================
| KATEGORI 4 — DATA INTEGRITY: Reject Payout
|==========================================================================
*/

it('reject payout ubah status pending → rejected', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.payouts.reject', $this->pendingPayout->id), [
            'reason' => 'Rekening tidak valid',
        ])
        ->assertRedirect();

    $this->pendingPayout->refresh();
    expect($this->pendingPayout->status)->toBe(PayoutStatus::REJECTED);
    expect($this->pendingPayout->rejection_reason)->toBe('Rekening tidak valid');
});

it('reject payout TIDAK debit saldo wallet', function () {
    $saldoBefore = (float) $this->wallet->saldo;

    $this->actingAs($this->admin)
        ->post(route('admin.payouts.reject', $this->pendingPayout->id), [
            'reason' => 'Rekening tidak valid',
        ]);

    $this->wallet->refresh();
    expect((float) $this->wallet->saldo)->toBe($saldoBefore);
});

it('reject payout validasi reason minimal 5 karakter', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.payouts.reject', $this->pendingPayout->id), [
            'reason' => 'abc',
        ])
        ->assertSessionHasErrors('reason');

    $this->pendingPayout->refresh();
    expect($this->pendingPayout->status)->toBe(PayoutStatus::PENDING);
});

/*
|==========================================================================
| KATEGORI 5 — DATA INTEGRITY: Mark Paid
|==========================================================================
*/

it('markPaid ubah status approved → paid', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.payouts.mark-paid', $this->approvedPayout->id))
        ->assertRedirect();

    $this->approvedPayout->refresh();
    expect($this->approvedPayout->status)->toBe(PayoutStatus::PAID);
});

it('markPaid set paid_at', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.payouts.mark-paid', $this->approvedPayout->id));

    $this->approvedPayout->refresh();
    expect($this->approvedPayout->paid_at)->not->toBeNull();
});

/*
|==========================================================================
| KATEGORI 6 — ERROR HANDLING
|==========================================================================
*/

it('approve payout 404 jika ID tidak ditemukan', function () {
    $this->actingAs($this->admin)
        ->post('/admin/payouts/9999/approve')
        ->assertNotFound();
});

it('approve payout status bukan pending → error validasi', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.payouts.approve', $this->approvedPayout->id))
        ->assertSessionHasErrors('status');
});

it('markPaid payout status bukan approved → error validasi', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.payouts.mark-paid', $this->pendingPayout->id))
        ->assertSessionHasErrors('status');
});

it('approve payout dengan saldo kurang → error validasi', function () {
    // Set saldo wallet < jumlah payout
    $this->wallet->update(['saldo' => '100000.00']);

    $this->actingAs($this->admin)
        ->post(route('admin.payouts.approve', $this->pendingPayout->id))
        ->assertSessionHasErrors();

    $this->pendingPayout->refresh();
    // Status tetap pending (rollback)
    expect($this->pendingPayout->status)->toBe(PayoutStatus::PENDING);
});

/*
|==========================================================================
| KATEGORI 7 — ROUTE MIDDLEWARE
|==========================================================================
*/

it('route admin.payouts.index pakai middleware auth, password.changed, role:admin', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'admin.payouts.index');

    expect($route)->not->toBeNull();
    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:admin');
});

it('route admin.payouts.approve pakai middleware auth, password.changed, role:admin', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'admin.payouts.approve');

    expect($route)->not->toBeNull();
    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:admin');
});

/*
|==========================================================================
| KATEGORI 8 — BVA (Boundary Value Analysis)
|==========================================================================
*/

it('reject payout sukses dengan reason TEPAT 5 karakter', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.payouts.reject', $this->pendingPayout->id), [
            'reason' => 'abcde',
        ])
        ->assertRedirect();

    $this->pendingPayout->refresh();
    expect($this->pendingPayout->status)->toBe(PayoutStatus::REJECTED);
});

it('reject payout sukses dengan reason TEPAT 1000 karakter', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.payouts.reject', $this->pendingPayout->id), [
            'reason' => str_repeat('a', 1000),
        ])
        ->assertRedirect();
});

it('reject payout gagal dengan reason 1001 karakter', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.payouts.reject', $this->pendingPayout->id), [
            'reason' => str_repeat('a', 1001),
        ])
        ->assertSessionHasErrors('reason');
});

/*
|==========================================================================
| KATEGORI 9 — EDGE CASES
|==========================================================================
*/

it('index menampilkan statusCounts dengan jumlah benar', function () {
    // Buat payout PENDING tambahan
    Payout::factory()->create([
        'mitra_id' => $this->mitra->id,
        'status' => PayoutStatus::PENDING,
        'jumlah' => '300000.00',
    ]);

    $response = $this->actingAs($this->admin)->get(route('admin.payouts.index'));

    $response->assertInertia(fn ($page) => $page
        ->where('statusCounts.pending', 2)  // 1 existing + 1 baru
        ->where('statusCounts.approved', 1)
    );
});

it('approve payout dengan amount = saldo (boundary) tetap sukses', function () {
    // Set saldo = jumlah payout
    $this->wallet->update(['saldo' => '500000.00']);

    $this->actingAs($this->admin)
        ->post(route('admin.payouts.approve', $this->pendingPayout->id))
        ->assertRedirect();

    $this->wallet->refresh();
    expect((float) $this->wallet->saldo)->toBe(0.0);

    $this->pendingPayout->refresh();
    expect($this->pendingPayout->status)->toBe(PayoutStatus::APPROVED);
});
