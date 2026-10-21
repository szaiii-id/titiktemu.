<?php

use App\Enums\WalletTransactionType;
use App\Models\MitraWallet;
use App\Models\User;
use App\Models\WalletTransaction;
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

    $this->otherMitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    $this->client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    // Wallet mitra utama
    $this->wallet = MitraWallet::factory()->create([
        'mitra_id' => $this->mitra->id,
        'saldo' => '500000.00',
        'total_pendapatan' => '1500000.00',
        'total_dicairkan' => '1000000.00',
    ]);

    // Transaksi untuk mitra utama
    $this->transaction = WalletTransaction::factory()->create([
        'wallet_id' => $this->wallet->id,
        'tipe' => WalletTransactionType::CREDIT,
        'jumlah' => '500000.00',
        'saldo_setelah' => '500000.00',
        'kategori' => 'honor_trip',
        'deskripsi' => 'Honor trip TRP-001',
    ]);

    // Wallet mitra lain (tidak boleh muncul)
    $otherWallet = MitraWallet::factory()->create([
        'mitra_id' => $this->otherMitra->id,
        'saldo' => '999999.00',
    ]);
    WalletTransaction::factory()->create([
        'wallet_id' => $otherWallet->id,
        'deskripsi' => 'Honor mitra lain',
    ]);
});

/*
|==========================================================================
| KATEGORI 1 — CONTRACT / API SCHEMA
|==========================================================================
*/

it('GET /mitra/wallet merender Inertia component Mitra/Wallet/Index', function () {
    $response = $this->actingAs($this->mitra)->get(route('mitra.wallet.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Mitra/Wallet/Index')
        ->has('wallet')
        ->has('transactions')
    );
});

it('wallet memiliki struktur yang benar', function () {
    $response = $this->actingAs($this->mitra)->get(route('mitra.wallet.index'));

    $response->assertInertia(fn ($page) => $page
        ->has('wallet.id')
        ->has('wallet.saldo')
        ->has('wallet.total_pendapatan')
        ->has('wallet.total_dicairkan')
    );
});

it('transactions memiliki struktur paginator', function () {
    $response = $this->actingAs($this->mitra)->get(route('mitra.wallet.index'));

    $response->assertInertia(fn ($page) => $page
        ->has('transactions.data')
        ->has('transactions.total')
        ->has('transactions.per_page')
        ->has('transactions.current_page')
    );
});

/*
|==========================================================================
| KATEGORI 2 — SECURITY & AUTHORIZATION
|==========================================================================
*/

it('guest di-redirect ke login saat akses /mitra/wallet', function () {
    $this->get(route('mitra.wallet.index'))->assertRedirect(route('login'));
});

it('admin tidak bisa akses /mitra/wallet (redirect ke dashboard admin)', function () {
    $this->actingAs($this->admin)
        ->get(route('mitra.wallet.index'))
        ->assertRedirect(route('admin.dashboard'));
});

it('client tidak bisa akses /mitra/wallet (redirect ke dashboard client)', function () {
    $this->actingAs($this->client)
        ->get(route('mitra.wallet.index'))
        ->assertRedirect(route('client.dashboard'));
});

it('mitra dengan must_change_password = true di-redirect ke change-password', function () {
    $mitra = User::factory()->mitra()->create(['must_change_password' => true]);

    $this->actingAs($mitra)
        ->get(route('mitra.wallet.index'))
        ->assertRedirect(route('password.change'));
});

/*
|==========================================================================
| KATEGORI 3 — DATA INTEGRITY: Wallet
|==========================================================================
*/

it('wallet menampilkan data milik mitra yang login', function () {
    $response = $this->actingAs($this->mitra)->get(route('mitra.wallet.index'));

    $response->assertInertia(fn ($page) => $page
        ->where('wallet.id', $this->wallet->id)
        ->where('wallet.saldo', '500000.00')
        ->where('wallet.total_pendapatan', '1500000.00')
        ->where('wallet.total_dicairkan', '1000000.00')
    );
});

it('wallet tidak menampilkan data mitra lain', function () {
    $response = $this->actingAs($this->otherMitra)->get(route('mitra.wallet.index'));

    $response->assertOk();

    $page = json_decode($response->getContent(), true);
    $walletId = $page['props']['wallet']['id'] ?? null;

    expect($walletId)->not->toBe($this->wallet->id);
});

/*
|==========================================================================
| KATEGORI 4 — DATA INTEGRITY: Transactions
|==========================================================================
*/

it('transactions hanya menampilkan transaksi milik mitra', function () {
    $response = $this->actingAs($this->mitra)->get(route('mitra.wallet.index'));

    $response->assertInertia(fn ($page) => $page
        ->has('transactions.data', 1)
        ->where('transactions.data.0.id', $this->transaction->id)
    );
});

it('transactions tidak menampilkan transaksi mitra lain', function () {
    $response = $this->actingAs($this->mitra)->get(route('mitra.wallet.index'));

    $response->assertOk();

    $page = json_decode($response->getContent(), true);
    $transactions = $page['props']['transactions']['data'] ?? [];

    $descriptions = collect($transactions)->pluck('deskripsi')->all();

    expect($descriptions)->not->toContain('Honor mitra lain');
});

it('transactions diurutkan dari created_at desc', function () {
    // Buat transaksi lebih baru
    $newTransaction = WalletTransaction::factory()->create([
        'wallet_id' => $this->wallet->id,
        'deskripsi' => 'Transaksi baru',
        'created_at' => now()->addHour(),
    ]);

    $response = $this->actingAs($this->mitra)->get(route('mitra.wallet.index'));

    $response->assertInertia(fn ($page) => $page
        ->where('transactions.data.0.id', $newTransaction->id)
        ->where('transactions.data.1.id', $this->transaction->id)
    );
});

/*
|==========================================================================
| KATEGORI 5 — ROUTE MIDDLEWARE
|==========================================================================
*/

it('route mitra.wallet.index pakai middleware auth, password.changed, role:mitra', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'mitra.wallet.index');

    expect($route)->not->toBeNull();
    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:mitra');
});

/*
|==========================================================================
| KATEGORI 6 — EDGE CASES
|==========================================================================
*/

it('wallet otomatis dibuat jika mitra belum punya wallet', function () {
    $mitraBaru = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($mitraBaru)->get(route('mitra.wallet.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('wallet.saldo', '0.00')
        ->has('transactions.data', 0)
    );

    // Wallet baru tercipta di DB
    $this->assertDatabaseHas('mitra_wallets', [
        'mitra_id' => $mitraBaru->id,
        'saldo' => 0,
    ]);
});

it('transactions kosong jika belum ada transaksi', function () {
    $mitraBaru = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);
    MitraWallet::factory()->create([
        'mitra_id' => $mitraBaru->id,
    ]);

    $response = $this->actingAs($mitraBaru)->get(route('mitra.wallet.index'));

    $response->assertInertia(fn ($page) => $page
        ->has('transactions.data', 0)
    );
});

/*
|==========================================================================
| HELPER — Extract Inertia Props
|==========================================================================
*/

function getInertiaProps($response): array
{
    $page = json_decode($response->getContent(), true);

    return $page['props'] ?? [];
}
