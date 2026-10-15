<?php

use App\Repositories\Contracts\ProfileRepositoryInterface;
use App\Services\User\ProfileService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

beforeEach(function () {
    $this->profileRepository = Mockery::mock(ProfileRepositoryInterface::class);
    $this->service = new ProfileService($this->profileRepository);

    Storage::fake('public');
    Carbon::setTestNow('2026-10-13 19:53:00');

    // Log facade → no-op
    Log::shouldReceive('info')->zeroOrMoreTimes()->andReturnNull();
    Log::shouldReceive('warning')->zeroOrMoreTimes()->andReturnNull();
});

afterEach(function () {
    Mockery::close();
    Carbon::setTestNow();
});

/*
|==========================================================================
| SECURITY — Defense in Depth (Layer 2 & 3 di Service)
|==========================================================================
| Test ini memverifikasi bahwa service VALIDASI ULANG input file,
| bahkan jika FormRequest di-bypass (misal service dipanggil langsung).
*/

it('uploadLogo MENOLAK file .svg meskipun MIME type di-spoof', function () {
    // Attacker bisa spoof MIME type di header. Service harus cek EKSTENSI.
    $user = makeUserWithProfile(['id' => 1], makeProfile(['logo' => null]));

    $file = UploadedFile::fake()->create('malicious.svg', 100, 'image/png');

    expect(fn () => $this->service->uploadLogo($user, $file))
        ->toThrow(ValidationException::class);

    // File tidak boleh tersimpan
    Storage::disk('public')->assertMissing('logos/1_20261013195300.svg');
});

it('uploadLogo MENOLAK file .php meskipun MIME type di-spoof', function () {
    // Attacker spoof MIME type image/png di file .php
    $user = makeUserWithProfile(['id' => 1], makeProfile(['logo' => null]));

    $file = UploadedFile::fake()->create('shell.php', 100, 'image/png');

    expect(fn () => $this->service->uploadLogo($user, $file))
        ->toThrow(ValidationException::class);
});

it('uploadLogo MENOLAK file .html meskipun MIME type di-spoof', function () {
    $user = makeUserWithProfile(['id' => 1], makeProfile(['logo' => null]));

    $file = UploadedFile::fake()->create('evil.html', 100, 'image/png');

    expect(fn () => $this->service->uploadLogo($user, $file))
        ->toThrow(ValidationException::class);
});

it('uploadLogo MENOLAK file dengan MIME type text/html meski ekstensi .png', function () {
    // Attacker: rename .html → .png, tapi MIME tetap text/html
    $user = makeUserWithProfile(['id' => 1], makeProfile(['logo' => null]));

    $file = UploadedFile::fake()->create('fake.png', 100, 'text/html');

    expect(fn () => $this->service->uploadLogo($user, $file))
        ->toThrow(ValidationException::class);
});

it('uploadLogo MENERIMA file .jpg dengan MIME type image/jpeg', function () {
    $user = makeUserWithProfile(['id' => 1], makeProfile(['logo' => null]));

    $file = UploadedFile::fake()->image('logo.jpg', 100, 100);

    $path = $this->service->uploadLogo($user, $file);

    expect($path)->toBe('logos/1_20261013195300.jpg');
    Storage::disk('public')->assertExists($path);
});

it('uploadLogo MENERIMA file .jpeg dengan MIME type image/jpeg', function () {
    $user = makeUserWithProfile(['id' => 1], makeProfile(['logo' => null]));

    $file = UploadedFile::fake()->image('logo.jpeg', 100, 100);

    $path = $this->service->uploadLogo($user, $file);

    expect($path)->toBe('logos/1_20261013195300.jpeg');
});

it('uploadLogo MENERIMA file .png dengan MIME type image/png', function () {
    $user = makeUserWithProfile(['id' => 1], makeProfile(['logo' => null]));

    $file = UploadedFile::fake()->image('logo.png', 100, 100);

    $path = $this->service->uploadLogo($user, $file);

    expect($path)->toBe('logos/1_20261013195300.png');
});

it('uploadLogo MENERIMA file .webp dengan MIME type image/webp', function () {
    $user = makeUserWithProfile(['id' => 1], makeProfile(['logo' => null]));

    $file = UploadedFile::fake()->image('logo.webp', 100, 100);

    $path = $this->service->uploadLogo($user, $file);

    expect($path)->toBe('logos/1_20261013195300.webp');
});

/*
|==========================================================================
| SECURITY — Case Insensitive Extension
|==========================================================================
*/

it('uploadLogo MENERIMA ekstensi uppercase .PNG', function () {
    // Ekstensi harus case-insensitive
    $user = makeUserWithProfile(['id' => 1], makeProfile(['logo' => null]));

    $file = UploadedFile::fake()->image('logo.PNG', 100, 100);

    $path = $this->service->uploadLogo($user, $file);

    // Service normalize extension ke lowercase
    expect($path)->toBe('logos/1_20261013195300.png');
});

it('uploadLogo MENOLAK ekstensi uppercase .SVG', function () {
    // .SVG juga harus ditolak (case-insensitive)
    $user = makeUserWithProfile(['id' => 1], makeProfile(['logo' => null]));

    $file = UploadedFile::fake()->create('malicious.SVG', 100, 'image/png');

    expect(fn () => $this->service->uploadLogo($user, $file))
        ->toThrow(ValidationException::class);
});
