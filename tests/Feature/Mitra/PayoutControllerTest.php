<?php

use App\Enums\PayoutStatus;
use App\Models\MitraWallet;
use App\Models\Payout;
use App\Models\User;
use App\Services\Wallet\PayoutService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;

uses(RefreshDatabase::class);

beforeEach(function () {
    if (method_exists($this, 'withoutVite')) {
        $this->withoutVite();
    }

    $this->admin = User::factory()->admin()->create(['must_change_password' => false]);
    $this->mitra = User::factory()->mitra()->create(['must_change_password' => false]);
    $this->otherMitra = User::factory()->mitra()->create(['must_change_password' => false]);
    $this->client = User::factory()->client()->create(['must_change_password' => false]);

    $this->wallet = MitraWallet::factory()->create([
        'mitra_id' => $this->mitra->id,
        'saldo' => '1000000.00',
        'total_pendapatan' => '2000000.00',
        'total_dicairkan' => '0.00',
    ]);

    // Payout untuk INDEX — requested_at kemarin agar tidak memblokir store hari ini
    $this->payout = Payout::factory()->create([
        'mitra_id' => $this->mitra->id,
        'jumlah' => '500000.00',
        'bank_tujuan' => 'BCA',
        'no_rekening' => '1234567890',
        'nama_pemilik' => 'Mitra Test',
        'status' => PayoutStatus::PENDING,
        'requested_at' => now()->subDay(),
    ]);

    MitraWallet::factory()->create([
        'mitra_id' => $this->otherMitra->id,
        'saldo' => '500000.00',
    ]);
    Payout::factory()->create([
        'mitra_id' => $this->otherMitra->id,
        'status' => PayoutStatus::PENDING,
        'requested_at' => now()->subDay(),
    ]);
});

/* ===== KATEGORI 1 — CONTRACT ===== */

it('GET /mitra/payouts merender Inertia component Mitra/Payouts/Index', function () {
    $this->actingAs($this->mitra)->get(route('mitra.payouts.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Mitra/Payouts/Index')
            ->has('payouts')
            ->has('statusCounts')
        );
});

it('GET /mitra/payouts/create merender Inertia component Mitra/Payouts/Create', function () {
    $this->actingAs($this->mitra)->get(route('mitra.payouts.create'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Mitra/Payouts/Create')
            ->has('wallet')
            ->has('minimumPayout')
        );
});

it('store payout redirect ke mitra.payouts.index dengan status', function () {
    $response = $this->actingAs($this->mitra)->post(route('mitra.payouts.store'), [
        'jumlah' => 200000,
        'bank_tujuan' => 'BCA',
        'no_rekening' => '1234567890',
        'nama_pemilik' => 'Mitra Test',
    ]);

    $response->assertRedirect(route('mitra.payouts.index'));
    $response->assertSessionHas('status');
});

/* ===== KATEGORI 2 — SECURITY ===== */

it('guest di-redirect ke login saat akses /mitra/payouts', function () {
    $this->get(route('mitra.payouts.index'))->assertRedirect(route('login'));
});

it('admin tidak bisa akses /mitra/payouts (redirect ke dashboard admin)', function () {
    $this->actingAs($this->admin)->get(route('mitra.payouts.index'))
        ->assertRedirect(route('admin.dashboard'));
});

it('client tidak bisa akses /mitra/payouts (redirect ke dashboard client)', function () {
    $this->actingAs($this->client)->get(route('mitra.payouts.index'))
        ->assertRedirect(route('client.dashboard'));
});

it('mitra dengan must_change_password = true di-redirect ke change-password', function () {
    $mitra = User::factory()->mitra()->create(['must_change_password' => true]);
    $this->actingAs($mitra)->get(route('mitra.payouts.index'))
        ->assertRedirect(route('password.change'));
});

/* ===== KATEGORI 3 — INDEX ===== */

it('index hanya menampilkan payout milik mitra', function () {
    $this->actingAs($this->mitra)->get(route('mitra.payouts.index'))
        ->assertInertia(fn ($page) => $page
            ->has('payouts.data', 1)
            ->where('payouts.data.0.id', $this->payout->id)
        );
});

it('index menampilkan statusCounts dengan jumlah benar', function () {
    $this->actingAs($this->mitra)->get(route('mitra.payouts.index'))
        ->assertInertia(fn ($page) => $page->where('statusCounts.pending', 1));
});

/* ===== KATEGORI 4 — CREATE ===== */

it('create menampilkan wallet mitra', function () {
    $this->actingAs($this->mitra)->get(route('mitra.payouts.create'))
        ->assertInertia(fn ($page) => $page
            ->where('wallet.id', $this->wallet->id)
            ->where('wallet.saldo', '1000000.00')
        );
});

it('create menampilkan minimumPayout dari constant', function () {
    $this->actingAs($this->mitra)->get(route('mitra.payouts.create'))
        ->assertInertia(fn ($page) => $page
            ->where('minimumPayout', PayoutService::MINIMUM_PAYOUT)
        );
});

/* ===== KATEGORI 5 — STORE ===== */

it('store payout sukses buat record di DB', function () {
    $this->actingAs($this->mitra)->post(route('mitra.payouts.store'), [
        'jumlah' => 200000,
        'bank_tujuan' => 'BCA',
        'no_rekening' => '1234567890',
        'nama_pemilik' => 'Mitra Test',
    ]);

    $this->assertDatabaseHas('payouts', [
        'mitra_id' => $this->mitra->id,
        'jumlah' => 200000,
        'bank_tujuan' => 'BCA',
        'status' => PayoutStatus::PENDING->value,
    ]);
});

it('store payout TIDAK debit saldo wallet (hanya saat approve)', function () {
    $saldoBefore = (float) $this->wallet->saldo;

    $this->actingAs($this->mitra)->post(route('mitra.payouts.store'), [
        'jumlah' => 200000,
        'bank_tujuan' => 'BCA',
        'no_rekening' => '1234567890',
        'nama_pemilik' => 'Mitra Test',
    ]);

    $this->wallet->refresh();
    expect((float) $this->wallet->saldo)->toBe($saldoBefore);
});

it('store payout dengan catatan disimpan', function () {
    $this->actingAs($this->mitra)->post(route('mitra.payouts.store'), [
        'jumlah' => 200000,
        'bank_tujuan' => 'BCA',
        'no_rekening' => '1234567890',
        'nama_pemilik' => 'Mitra Test',
        'catatan' => 'Mohon cepat',
    ]);

    $this->assertDatabaseHas('payouts', [
        'mitra_id' => $this->mitra->id,
        'catatan' => 'Mohon cepat',
    ]);
});

/* ===== KATEGORI 6 — ERROR HANDLING ===== */

it('store payout validasi jumlah < MINIMUM_PAYOUT ditolak', function () {
    $this->actingAs($this->mitra)->post(route('mitra.payouts.store'), [
        'jumlah' => 50000,
        'bank_tujuan' => 'BCA',
        'no_rekening' => '1234567890',
        'nama_pemilik' => 'Mitra Test',
    ])->assertSessionHasErrors('jumlah');
});

it('store payout validasi jumlah > saldo ditolak', function () {
    $this->actingAs($this->mitra)->post(route('mitra.payouts.store'), [
        'jumlah' => 5000000,
        'bank_tujuan' => 'BCA',
        'no_rekening' => '1234567890',
        'nama_pemilik' => 'Mitra Test',
    ])->assertSessionHasErrors('jumlah');
});

it('store payout gagal jika sudah ada pending hari ini', function () {
    Payout::factory()->create([
        'mitra_id' => $this->mitra->id,
        'jumlah' => '100000.00',
        'bank_tujuan' => 'BCA',
        'no_rekening' => '1234567890',
        'nama_pemilik' => 'Mitra Test',
        'status' => PayoutStatus::PENDING,
        'requested_at' => now(),        // hari ini → memblokir
    ]);

    $this->actingAs($this->mitra)->post(route('mitra.payouts.store'), [
        'jumlah' => 200000,
        'bank_tujuan' => 'BCA',
        'no_rekening' => '1234567890',
        'nama_pemilik' => 'Mitra Test',
    ])->assertSessionHasErrors('payout');
});

it('store payout validasi bank_tujuan required ditolak', function () {
    $this->actingAs($this->mitra)->post(route('mitra.payouts.store'), [
        'jumlah' => 200000,
        'bank_tujuan' => '',
        'no_rekening' => '1234567890',
        'nama_pemilik' => 'Mitra Test',
    ])->assertSessionHasErrors('bank_tujuan');
});

it('store payout validasi no_rekening required ditolak', function () {
    $this->actingAs($this->mitra)->post(route('mitra.payouts.store'), [
        'jumlah' => 200000,
        'bank_tujuan' => 'BCA',
        'no_rekening' => '',
        'nama_pemilik' => 'Mitra Test',
    ])->assertSessionHasErrors('no_rekening');
});

/* ===== KATEGORI 7 — ROUTE MIDDLEWARE ===== */

it('route mitra.payouts.index pakai middleware auth, password.changed, role:mitra', function () {
    $route = collect(Route::getRoutes())->first(fn ($r) => $r->getName() === 'mitra.payouts.index');
    expect($route)->not->toBeNull();
    expect($route->gatherMiddleware())
        ->toContain('auth')
        ->toContain('password.changed')
        ->toContain('role:mitra');
});

it('route mitra.payouts.store pakai middleware auth, password.changed, role:mitra', function () {
    $route = collect(Route::getRoutes())->first(fn ($r) => $r->getName() === 'mitra.payouts.store');
    expect($route)->not->toBeNull();
    expect($route->gatherMiddleware())
        ->toContain('auth')
        ->toContain('password.changed')
        ->toContain('role:mitra');
});

/* ===== KATEGORI 8 — BVA ===== */

it('store payout sukses dengan jumlah TEPAT MINIMUM_PAYOUT (boundary bawah)', function () {
    $this->actingAs($this->mitra)->post(route('mitra.payouts.store'), [
        'jumlah' => PayoutService::MINIMUM_PAYOUT,
        'bank_tujuan' => 'BCA',
        'no_rekening' => '1234567890',
        'nama_pemilik' => 'Mitra Test',
    ])->assertRedirect();

    $this->assertDatabaseHas('payouts', [
        'mitra_id' => $this->mitra->id,
        'jumlah' => PayoutService::MINIMUM_PAYOUT,
    ]);
});

it('store payout sukses dengan jumlah TEPAT saldo (boundary atas)', function () {
    $this->actingAs($this->mitra)->post(route('mitra.payouts.store'), [
        'jumlah' => 1000000,
        'bank_tujuan' => 'BCA',
        'no_rekening' => '1234567890',
        'nama_pemilik' => 'Mitra Test',
    ])->assertRedirect();
});

it('store payout gagal dengan jumlah > saldo (boundary atas + 1)', function () {
    $this->actingAs($this->mitra)->post(route('mitra.payouts.store'), [
        'jumlah' => 1000001,
        'bank_tujuan' => 'BCA',
        'no_rekening' => '1234567890',
        'nama_pemilik' => 'Mitra Test',
    ])->assertSessionHasErrors('jumlah');
});

/* ===== KATEGORI 9 — EDGE CASE ===== */

it('create untuk mitra baru tanpa wallet otomatis buat wallet', function () {
    $mitraBaru = User::factory()->mitra()->create(['must_change_password' => false]);

    $this->actingAs($mitraBaru)->get(route('mitra.payouts.create'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('wallet.saldo', '0.00'));
});
