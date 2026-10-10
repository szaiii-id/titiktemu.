<?php

use App\Models\User;
use App\Services\LandingPage\ContactService;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Mockery\MockInterface;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| Happy Path — Contract / API Schema
|--------------------------------------------------------------------------
*/

it('berhasil mengirim pesan kontak dengan data valid', function () {
    $this->mock(ContactService::class, function (MockInterface $mock) {
        $mock->shouldReceive('send')
            ->once()
            ->with([
                'nama' => 'Budi Santoso',
                'email' => 'budi@example.com',
                'pesan' => 'Saya ingin bertanya tentang kerja sama.',
            ]);
    });

    $response = $this->from('/')->post('/contact', [
        'nama' => 'Budi Santoso',
        'email' => 'budi@example.com',
        'pesan' => 'Saya ingin bertanya tentang kerja sama.',
    ]);

    $response->assertRedirect('/');
    $response->assertSessionHas('status', 'Pesan Anda berhasil terkirim. Tim kami akan segera merespons.');
    $response->assertSessionHasNoErrors();
});

it('berhasil mengirim pesan kontak dengan pesan panjang', function () {
    $this->mock(ContactService::class, function (MockInterface $mock) {
        $mock->shouldReceive('send')->once();
    });

    $response = $this->from('/')->post('/contact', [
        'nama' => 'Budi Santoso',
        'email' => 'budi@example.com',
        'pesan' => str_repeat('Ini pesan panjang. ', 100),
    ]);

    $response->assertRedirect('/');
    $response->assertSessionHas('status');
});

/*
|--------------------------------------------------------------------------
| Negative Path — Validasi
|--------------------------------------------------------------------------
*/

it('gagal jika nama kosong', function () {
    $this->mock(ContactService::class, function (MockInterface $mock) {
        $mock->shouldNotReceive('send');
    });

    $response = $this->from('/')->post('/contact', [
        'nama' => '',
        'email' => 'budi@example.com',
        'pesan' => 'Saya ingin bertanya tentang kerja sama.',
    ]);

    $response->assertRedirect('/');
    $response->assertSessionHasErrors('nama');
});

it('gagal jika email kosong', function () {
    $this->mock(ContactService::class, function (MockInterface $mock) {
        $mock->shouldNotReceive('send');
    });

    $response = $this->from('/')->post('/contact', [
        'nama' => 'Budi Santoso',
        'email' => '',
        'pesan' => 'Saya ingin bertanya tentang kerja sama.',
    ]);

    $response->assertSessionHasErrors('email');
});

it('gagal jika format email tidak valid', function () {
    $this->mock(ContactService::class, function (MockInterface $mock) {
        $mock->shouldNotReceive('send');
    });

    $response = $this->post('/contact', [
        'nama' => 'Budi Santoso',
        'email' => 'bukan-email',
        'pesan' => 'Saya ingin bertanya tentang kerja sama.',
    ]);

    $response->assertSessionHasErrors('email');
});

it('gagal jika pesan kosong', function () {
    $this->mock(ContactService::class, function (MockInterface $mock) {
        $mock->shouldNotReceive('send');
    });

    $response = $this->post('/contact', [
        'nama' => 'Budi Santoso',
        'email' => 'budi@example.com',
        'pesan' => '',
    ]);

    $response->assertSessionHasErrors('pesan');
});

it('gagal jika pesan kurang dari 10 karakter', function () {
    $this->mock(ContactService::class, function (MockInterface $mock) {
        $mock->shouldNotReceive('send');
    });

    $response = $this->post('/contact', [
        'nama' => 'Budi Santoso',
        'email' => 'budi@example.com',
        'pesan' => 'Halo',
    ]);

    $response->assertSessionHasErrors('pesan');
});

it('gagal jika pesan lebih dari 5000 karakter', function () {
    $this->mock(ContactService::class, function (MockInterface $mock) {
        $mock->shouldNotReceive('send');
    });

    $response = $this->post('/contact', [
        'nama' => 'Budi Santoso',
        'email' => 'budi@example.com',
        'pesan' => str_repeat('a', 5001),
    ]);

    $response->assertSessionHasErrors('pesan');
});

it('gagal jika nama lebih dari 255 karakter', function () {
    $this->mock(ContactService::class, function (MockInterface $mock) {
        $mock->shouldNotReceive('send');
    });

    $response = $this->post('/contact', [
        'nama' => str_repeat('a', 256),
        'email' => 'budi@example.com',
        'pesan' => 'Saya ingin bertanya tentang kerja sama.',
    ]);

    $response->assertSessionHasErrors('nama');
});

/*
|--------------------------------------------------------------------------
| Error Handling & Recovery — Level Sistem
|--------------------------------------------------------------------------
*/

it('mengembalikan error yang ramah jika ContactService gagal', function () {
    $this->mock(ContactService::class, function (MockInterface $mock) {
        $mock->shouldReceive('send')
            ->once()
            ->andThrow(new Exception('Brevo API down'));
    });

    Log::shouldReceive('error')
        ->once()
        ->with('Contact form failed', Mockery::on(function ($context) {
            return $context['error'] === 'Brevo API down'
                && $context['email'] === 'budi@example.com';
        }));

    $response = $this->from('/')->post('/contact', [
        'nama' => 'Budi Santoso',
        'email' => 'budi@example.com',
        'pesan' => 'Saya ingin bertanya tentang kerja sama.',
    ]);

    $response->assertRedirect('/');
    $response->assertSessionHasErrors('pesan');
    $response->assertSessionMissing('status');

    $response->assertSessionHasInput('nama', 'Budi Santoso');
    $response->assertSessionHasInput('email', 'budi@example.com');
});

it('tidak menyimpan status sukses jika ContactService gagal', function () {
    $this->mock(ContactService::class, function (MockInterface $mock) {
        $mock->shouldReceive('send')->once()->andThrow(new Exception('SMTP timeout'));
    });

    Log::shouldReceive('error')->once();

    $response = $this->from('/')->post('/contact', [
        'nama' => 'Budi Santoso',
        'email' => 'budi@example.com',
        'pesan' => 'Saya ingin bertanya tentang kerja sama.',
    ]);

    $response->assertSessionMissing('status');
});

/*
|--------------------------------------------------------------------------
| Security — Guest & Authenticated
|--------------------------------------------------------------------------
*/

it('guest bisa mengirim pesan kontak', function () {
    $this->mock(ContactService::class, function (MockInterface $mock) {
        $mock->shouldReceive('send')->once();
    });

    $response = $this->post('/contact', [
        'nama' => 'Guest User',
        'email' => 'guest@example.com',
        'pesan' => 'Saya guest dan ingin bertanya.',
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('status');
});

it('user yang sudah login juga bisa mengirim pesan kontak', function () {
    $this->mock(ContactService::class, function (MockInterface $mock) {
        $mock->shouldReceive('send')->once();
    });

    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/contact', [
        'nama' => 'Budi Santoso',
        'email' => 'budi@example.com',
        'pesan' => 'Saya user login dan ingin bertanya.',
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('status');
});

/*
|--------------------------------------------------------------------------
| Rate Limiting & Throttling
|--------------------------------------------------------------------------
*/

it('memblokir pengiriman setelah 3 kali dalam 1 menit', function () {
    // ============================================================
    // PENTING: Rate limiter 'contact' di-define di AppServiceProvider
    // dengan limit 3 per menit (default).
    //
    // Karena kita menggunakan named limiter `throttle:contact`, test
    // ini akan MENGUJI BEHAVIOR throttle yang sebenarnya.
    //
    // TAPI — karena E2E menggunakan env
    // `AUTH_THROTTLE_CONTACT_TEST_OVERRIDE=1000`, kita perlu
    // memastikan env tersebut TIDAK di-set di test ini.
    //
    // Solusi: Override rate limiter langsung di test.
    // ============================================================

    // Override rate limiter 'contact' untuk test ini — limit 3
    RateLimiter::for('contact', function ($request) {
        return Limit::perMinute(3)->by($request->ip());
    });

    // Clear rate limiter dulu
    RateLimiter::clear('127.0.0.1');

    $this->mock(ContactService::class, function (MockInterface $mock) {
        $mock->shouldReceive('send')->times(3);
    });

    // 3 kali pertama — berhasil
    for ($i = 0; $i < 3; $i++) {
        $this->post('/contact', [
            'nama' => 'Budi Santoso',
            'email' => 'budi@example.com',
            'pesan' => 'Pesan percobaan minimal sepuluh karakter.',
        ]);
    }

    // Percobaan ke-4 — harus diblokir (429)
    $response = $this->post('/contact', [
        'nama' => 'Budi Santoso',
        'email' => 'budi@example.com',
        'pesan' => 'Pesan percobaan minimal sepuluh karakter.',
    ]);

    $response->assertStatus(429);
})->group('rate-limit');

/*
|--------------------------------------------------------------------------
| Data Integrity — Sanitasi Input
|--------------------------------------------------------------------------
*/

it('menerima pesan dengan karakter khusus dan baris baru', function () {
    $this->mock(ContactService::class, function (MockInterface $mock) {
        $mock->shouldReceive('send')
            ->once()
            ->with(Mockery::on(function ($data) {
                return str_contains($data['pesan'], "\n")
                    && str_contains($data['pesan'], '@#$%^&*()');
            }));
    });

    $response = $this->post('/contact', [
        'nama' => 'Budi Santoso',
        'email' => 'budi@example.com',
        'pesan' => "Baris pertama.\nBaris kedua dengan @#$%^&*()",
    ]);

    $response->assertRedirect();
    $response->assertSessionHasNoErrors();
});

it('menerima email dengan subdomain dan tanda plus', function () {
    $this->mock(ContactService::class, function (MockInterface $mock) {
        $mock->shouldReceive('send')->once();
    });

    $response = $this->post('/contact', [
        'nama' => 'Budi Santoso',
        'email' => 'budi+tag@mail.example.co.id',
        'pesan' => 'Saya ingin bertanya tentang kerja sama.',
    ]);

    $response->assertSessionHasNoErrors();
});
