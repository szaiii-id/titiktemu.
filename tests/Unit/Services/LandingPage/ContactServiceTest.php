<?php

use App\Services\LandingPage\ContactService;
use Illuminate\Support\Facades\Mail;

beforeEach(function () {
    config(['mail.contact_recipient' => 'admin@titiktemu.test']);
    $this->service = new ContactService();
});

/*
|--------------------------------------------------------------------------
| Happy Path
|--------------------------------------------------------------------------
*/

it('mengirim email ke recipient yang dikonfigurasi', function () {
    $capturedTo = [];

    Mail::shouldReceive('raw')
        ->once()
        ->andReturnUsing(function ($body, $callback) use (&$capturedTo) {
            $message = new \Illuminate\Mail\Message(new \Symfony\Component\Mime\Email());
            $callback($message);
            $capturedTo = array_map(
                fn ($addr) => $addr->getAddress(),
                $message->getTo()
            );
        });

    $this->service->send([
        'nama' => 'Budi Santoso',
        'email' => 'budi@example.com',
        'pesan' => 'Saya ingin bertanya tentang kerja sama.',
    ]);

    expect($capturedTo)->toBeArray()->toContain('admin@titiktemu.test');
});

it('menyusun body email dengan data yang benar', function () {
    $capturedBody = null;

    Mail::shouldReceive('raw')
        ->once()
        ->andReturnUsing(function ($body, $callback) use (&$capturedBody) {
            $capturedBody = $body;
            $message = new \Illuminate\Mail\Message(new \Symfony\Component\Mime\Email());
            $callback($message);
        });

    $data = [
        'nama' => 'Andi Wijaya',
        'email' => 'andi@example.com',
        'pesan' => 'Mohon info lebih lanjut soal layanan.',
    ];

    $this->service->send($data);

    expect(str_contains($capturedBody, $data['nama']))->toBeTrue();
    expect(str_contains($capturedBody, $data['email']))->toBeTrue();
    expect(str_contains($capturedBody, $data['pesan']))->toBeTrue();
    expect(str_contains($capturedBody, 'Pesan kontak baru dari halaman landing Titiktemu'))->toBeTrue();
});

it('menyertakan subject dengan nama pengirim', function () {
    $capturedSubject = null;

    Mail::shouldReceive('raw')
        ->once()
        ->andReturnUsing(function ($body, $callback) use (&$capturedSubject) {
            $message = new \Illuminate\Mail\Message(new \Symfony\Component\Mime\Email());
            $callback($message);

            // Gunakan method yang benar: getSymfonyMessage()
            $capturedSubject = $message->getSymfonyMessage()->getSubject();
        });

    $this->service->send([
        'nama' => 'Citra Dewi',
        'email' => 'citra@example.com',
        'pesan' => 'Ada pertanyaan tentang sistem.',
    ]);

    expect($capturedSubject)->toBe('Pesan Kontak Baru — Citra Dewi');
});

/*
|--------------------------------------------------------------------------
| Behavioral / Interaction Testing
|--------------------------------------------------------------------------
*/

it('memanggil Mail::raw tepat satu kali', function () {
    Mail::shouldReceive('raw')->once();

    $this->service->send([
        'nama' => 'Test',
        'email' => 'test@example.com',
        'pesan' => 'Pesan percobaan minimal sepuluh karakter.',
    ]);
});

it('menggunakan recipient dari konfigurasi, bukan hardcode', function () {
    config(['mail.contact_recipient' => 'lain@titiktemu.test']);

    $capturedTo = [];

    Mail::shouldReceive('raw')
        ->once()
        ->andReturnUsing(function ($body, $callback) use (&$capturedTo) {
            $message = new \Illuminate\Mail\Message(new \Symfony\Component\Mime\Email());
            $callback($message);
            $capturedTo = array_map(
                fn ($addr) => $addr->getAddress(),
                $message->getTo()
            );
        });

    $this->service->send([
        'nama' => 'Test',
        'email' => 'test@example.com',
        'pesan' => 'Pesan percobaan minimal sepuluh karakter.',
    ]);

    expect($capturedTo)->toBeArray()->toContain('lain@titiktemu.test');
});

/*
|--------------------------------------------------------------------------
| Edge Cases
|--------------------------------------------------------------------------
*/

it('menyusun format waktu dengan locale Indonesia', function () {
    app()->setLocale('id');

    $capturedBody = null;

    Mail::shouldReceive('raw')
        ->once()
        ->andReturnUsing(function ($body, $callback) use (&$capturedBody) {
            $capturedBody = $body;
            $message = new \Illuminate\Mail\Message(new \Symfony\Component\Mime\Email());
            $callback($message);
        });

    $this->service->send([
        'nama' => 'Test',
        'email' => 'test@example.com',
        'pesan' => 'Pesan percobaan minimal sepuluh karakter.',
    ]);

    expect(preg_match('/\w+, \d{2} \w+ \d{4} \d{2}:\d{2} WIB/u', $capturedBody))
        ->toBe(1);
});

it('tidak mengubah data input yang dikirim', function () {
    $capturedBody = null;

    Mail::shouldReceive('raw')
        ->once()
        ->andReturnUsing(function ($body, $callback) use (&$capturedBody) {
            $capturedBody = $body;
            $message = new \Illuminate\Mail\Message(new \Symfony\Component\Mime\Email());
            $callback($message);
        });

    $data = [
        'nama' => 'Nama Panjang Dengan Spasi',
        'email' => 'email.dengan.titik@example.co.id',
        'pesan' => "Pesan dengan\nbaris baru dan karakter khusus: @#$%^&*()",
    ];

    $this->service->send($data);

    expect(str_contains($capturedBody, $data['nama']))->toBeTrue();
    expect(str_contains($capturedBody, $data['email']))->toBeTrue();
    expect(str_contains($capturedBody, $data['pesan']))->toBeTrue();
});