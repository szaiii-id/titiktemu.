<?php

use App\Models\AppNotification;
use App\Models\User;
use App\Services\Notification\NotificationService;
use Mockery\MockInterface;

/*
|==========================================================================
| SETUP
|==========================================================================
| Untuk method yang panggil `AppNotification::create()` / `::where()`
| (static model), kita pakai pendekatan:
|
| 1. `Mockery::mock(AppNotification::class)->makePartial()` → instance mock
|    (untuk markAsRead, yang pakai instance).
|
| 2. `Mockery::mock('alias:App\Models\AppNotification')` → untuk static
|    (create, where). TAPI alias mock hanya bisa sekali per process.
|
| Solusi: pisahkan test yang butuh alias ke file terpisah, ATAU gunakan
| `markTestSkipped()` untuk static-heavy method dan tunggu feature test.
|==========================================================================
*/

beforeEach(function () {
    $this->service = new NotificationService;

    $this->user = new User;
    $this->user->forceFill([
        'id' => 5,
        'name' => 'Test User',
        'email' => 'test@example.com',
        'role' => 'client',
    ]);
});

afterEach(function () {
    Mockery::close();
});

/*
|==========================================================================
| HELPERS
|==========================================================================
*/

function makeNotificationMock(array $attrs = []): MockInterface
{
    $notif = Mockery::mock(AppNotification::class)->makePartial();
    $notif->forceFill(array_merge([
        'id' => 1,
        'user_id' => 5,
        'tipe' => 'booking_confirmed',
        'judul' => 'Test',
        'pesan' => 'Message',
        'data' => [],
        'read_at' => null,
    ], $attrs));

    return $notif;
}

/*
|==========================================================================
| markAsRead() — UNIT TEST MURNI (instance mock)
|==========================================================================
*/

it('markAsRead update read_at jika belum dibaca', function () {
    $notif = makeNotificationMock(['read_at' => null]);
    $notif->shouldReceive('isRead')->once()->andReturn(false);
    $notif->shouldReceive('update')
        ->once()
        ->with(Mockery::on(fn ($attrs) => $attrs['read_at'] !== null));

    $this->service->markAsRead($notif);

    // Jika update tidak dipanggil → test gagal
    expect(true)->toBeTrue();
});

it('markAsRead TIDAK update jika sudah dibaca', function () {
    $notif = makeNotificationMock(['read_at' => now()]);
    $notif->shouldReceive('isRead')->once()->andReturn(true);
    $notif->shouldReceive('update')->never();  // ← tidak boleh dipanggil

    $this->service->markAsRead($notif);

    expect(true)->toBeTrue();
});

/*
|==========================================================================
| create() — SKIP (butuh alias mock)
|==========================================================================
| Method `create()` panggil `AppNotification::create()` static.
| Tidak bisa di-mock bersih tanpa `alias:`. Kita skip di unit test —
| tunggu Feature Test.
|==========================================================================
*/

it('create() — butuh alias mock, skip di unit test', function () {
    $this->markTestSkipped(
        'create() panggil AppNotification::create() static — test di Feature Test.'
    );
});

/*
|==========================================================================
| paginateForUser() — SKIP
|==========================================================================
*/

it('paginateForUser() — butuh alias mock, skip di unit test', function () {
    $this->markTestSkipped(
        'paginateForUser() panggil AppNotification::where() static — test di Feature Test.'
    );
});

/*
|==========================================================================
| unreadCount() — SKIP
|==========================================================================
*/

it('unreadCount() — butuh alias mock, skip di unit test', function () {
    $this->markTestSkipped(
        'unreadCount() panggil AppNotification::where() static — test di Feature Test.'
    );
});

/*
|==========================================================================
| markAllAsRead() — SKIP
|==========================================================================
*/

it('markAllAsRead() — butuh alias mock, skip di unit test', function () {
    $this->markTestSkipped(
        'markAllAsRead() panggil AppNotification::where() static — test di Feature Test.'
    );
});
