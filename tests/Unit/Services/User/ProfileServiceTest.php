<?php

use App\Models\User;
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

    // Disk 'public' → in-memory, tidak sentuh filesystem nyata
    Storage::fake('public');

    // Log facade → no-op (tapi tetap tercatat untuk assertion)
    Log::shouldReceive('info')->zeroOrMoreTimes()->andReturnNull();
    Log::shouldReceive('warning')->zeroOrMoreTimes()->andReturnNull();
});

afterEach(function () {
    Mockery::close();
    Carbon::setTestNow();
});

/*
|==========================================================================
| updateProfile() — Validasi & Happy Path
|==========================================================================
*/

it('melempar ValidationException jika user tidak punya profile', function () {
    $user = makeUserWithProfile(['id' => 1], null);

    $this->profileRepository->shouldReceive('updateProfile')->never();

    expect(fn () => $this->service->updateProfile($user, ['alamat' => 'Jl. Baru']))
        ->toThrow(ValidationException::class);
});

it('update profile tanpa logo → hanya field yang diizinkan yang diupdate', function () {
    $profile = makeProfile(['id' => 10, 'tipe' => 'mitra']);
    $user = makeUserWithProfile(['id' => 1, 'role' => 'mitra'], $profile);

    $data = [
        'nama_penyedia_usaha' => 'PT Baru',
        'alamat' => 'Jl. Merdeka No. 1',
        'telepon' => '08123456789',
        'field_terlarang' => 'harus dibuang',
        'user_id' => 999,
        'tipe' => 'admin',
    ];

    $this->profileRepository->shouldReceive('updateProfile')
        ->once()
        ->with($profile, Mockery::on(function ($filtered) {
            return $filtered === [
                'nama_penyedia_usaha' => 'PT Baru',
                'alamat' => 'Jl. Merdeka No. 1',
                'telepon' => '08123456789',
            ];
        }))
        ->andReturn($profile);

    $result = $this->service->updateProfile($user, $data);

    expect($result)->toBe($profile);
});

it('update profile dengan data kosong → repository dipanggil dengan array kosong', function () {
    $profile = makeProfile(['id' => 10, 'tipe' => 'mitra']);
    $user = makeUserWithProfile(['id' => 1], $profile);

    $this->profileRepository->shouldReceive('updateProfile')
        ->once()
        ->with($profile, [])
        ->andReturn($profile);

    $this->service->updateProfile($user, []);

    expect(true)->toBeTrue();
});

/*
|==========================================================================
| updateProfile() — Upload Logo (Happy Path)
|==========================================================================
*/

it('update profile dengan upload logo PNG → file tersimpan & path dikirim ke repository', function () {
    Carbon::setTestNow('2026-10-13 19:53:00');

    $profile = makeProfile(['id' => 10, 'tipe' => 'mitra', 'logo' => null]);
    $user = makeUserWithProfile(['id' => 5], $profile);

    $file = UploadedFile::fake()->image('logo.png', 100, 100);

    $this->profileRepository->shouldReceive('updateProfile')
        ->once()
        ->with($profile, Mockery::on(function ($filtered) {
            return isset($filtered['logo'])
                && $filtered['logo'] === 'logos/5_20261013195300.png';
        }))
        ->andReturn($profile);

    $this->service->updateProfile($user, [
        'nama_penyedia_usaha' => 'PT Baru',
        'logo' => $file,
    ]);

    Storage::disk('public')->assertExists('logos/5_20261013195300.png');
});

it('update profile dengan upload logo → menghapus logo lama di storage', function () {
    Carbon::setTestNow('2026-10-13 19:53:00');

    Storage::disk('public')->put('logos/old_logo.png', 'old-content');
    Storage::disk('public')->assertExists('logos/old_logo.png');

    $profile = makeProfile(['id' => 10, 'tipe' => 'mitra', 'logo' => 'logos/old_logo.png']);
    $user = makeUserWithProfile(['id' => 5], $profile);

    $file = UploadedFile::fake()->image('new.png', 100, 100);

    $this->profileRepository->shouldReceive('updateProfile')
        ->once()
        ->andReturn($profile);

    $this->service->updateProfile($user, ['logo' => $file]);

    Storage::disk('public')->assertMissing('logos/old_logo.png');
    Storage::disk('public')->assertExists('logos/5_20261013195300.png');
});

it('update profile dengan upload logo → tidak error jika logo lama tidak ada di storage', function () {
    Carbon::setTestNow('2026-10-13 19:53:00');

    $profile = makeProfile(['id' => 10, 'logo' => 'logos/sudah_hilang.png']);
    $user = makeUserWithProfile(['id' => 5], $profile);

    $file = UploadedFile::fake()->image('new.png', 100, 100);

    $this->profileRepository->shouldReceive('updateProfile')
        ->once()
        ->andReturn($profile);

    $this->service->updateProfile($user, ['logo' => $file]);

    Storage::disk('public')->assertExists('logos/5_20261013195300.png');
});

/*
|==========================================================================
| updateProfile() — Logo bukan UploadedFile
|==========================================================================
*/

it('update profile dengan field logo berisi string → field logo dibuang', function () {
    $profile = makeProfile(['id' => 10, 'logo' => null]);
    $user = makeUserWithProfile(['id' => 5], $profile);

    $data = [
        'nama_penyedia_usaha' => 'PT Baru',
        'logo' => 'logos/lama.png',
    ];

    $this->profileRepository->shouldReceive('updateProfile')
        ->once()
        ->with($profile, Mockery::on(function ($filtered) {
            return ! array_key_exists('logo', $filtered)
                && $filtered['nama_penyedia_usaha'] === 'PT Baru';
        }))
        ->andReturn($profile);

    $this->service->updateProfile($user, $data);
});

it('update profile dengan logo = null → field logo dibuang', function () {
    $profile = makeProfile(['id' => 10, 'logo' => 'logos/lama.png']);
    $user = makeUserWithProfile(['id' => 1], $profile);

    $this->profileRepository->shouldReceive('updateProfile')
        ->once()
        ->with($profile, Mockery::on(fn ($f) => ! array_key_exists('logo', $f)))
        ->andReturn($profile);

    $this->service->updateProfile($user, [
        'nama_penyedia_usaha' => 'PT Baru',
        'logo' => null,
    ]);
});

it('update profile dengan logo array → field logo dibuang', function () {
    $profile = makeProfile(['id' => 10, 'logo' => null]);
    $user = makeUserWithProfile(['id' => 1], $profile);

    $this->profileRepository->shouldReceive('updateProfile')
        ->once()
        ->with($profile, Mockery::on(fn ($f) => ! array_key_exists('logo', $f)))
        ->andReturn($profile);

    $this->service->updateProfile($user, [
        'nama_penyedia_usaha' => 'PT Baru',
        'logo' => ['bukan', 'file'],
    ]);
});

it('update profile tanpa key logo → field logo tidak disertakan', function () {
    $profile = makeProfile(['id' => 10, 'logo' => null]);
    $user = makeUserWithProfile(['id' => 1], $profile);

    $this->profileRepository->shouldReceive('updateProfile')
        ->once()
        ->with($profile, Mockery::on(fn ($f) => ! array_key_exists('logo', $f)))
        ->andReturn($profile);

    $this->service->updateProfile($user, ['nama_penyedia_usaha' => 'PT Baru']);
});

/*
|==========================================================================
| uploadLogo() — SECURITY: Blok Extension
|==========================================================================
| Service harus menolak ekstensi yang tidak di whitelist, bahkan jika
| MIME type di-spoof oleh attacker.
*/

it('uploadLogo MENOLAK file .svg meskipun MIME type di-spoof', function () {
    // SECURITY: SVG bisa berisi <script> → stored XSS
    $user = makeUserWithProfile(['id' => 1], makeProfile(['logo' => null]));

    $file = UploadedFile::fake()->create('malicious.svg', 100, 'image/png');

    expect(fn () => $this->service->uploadLogo($user, $file))
        ->toThrow(ValidationException::class);

    Storage::disk('public')->assertMissing('logos/1_20261013195300.svg');
});

it('uploadLogo MENOLAK file .SVG uppercase', function () {
    $user = makeUserWithProfile(['id' => 1], makeProfile(['logo' => null]));

    $file = UploadedFile::fake()->create('malicious.SVG', 100, 'image/png');

    expect(fn () => $this->service->uploadLogo($user, $file))
        ->toThrow(ValidationException::class);
});

it('uploadLogo MENOLAK file .php meskipun MIME type di-spoof', function () {
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

it('uploadLogo MENOLAK file .gif (GIF tidak di whitelist)', function () {
    $user = makeUserWithProfile(['id' => 1], makeProfile(['logo' => null]));

    $file = UploadedFile::fake()->image('logo.gif', 100, 100);

    expect(fn () => $this->service->uploadLogo($user, $file))
        ->toThrow(ValidationException::class);
});

it('uploadLogo MENOLAK file tanpa ekstensi', function () {
    $user = makeUserWithProfile(['id' => 9], makeProfile(['logo' => null]));

    $file = UploadedFile::fake()->create('filetanpaekstensi', 100, 'application/octet-stream');

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

/*
|==========================================================================
| uploadLogo() — Happy Path (Format Valid)
|==========================================================================
*/

it('uploadLogo MENERIMA file .jpg dengan MIME image/jpeg', function () {
    Carbon::setTestNow('2026-10-13 19:53:00');

    $user = makeUserWithProfile(['id' => 1], makeProfile(['logo' => null]));

    $file = UploadedFile::fake()->image('logo.jpg', 100, 100);

    $path = $this->service->uploadLogo($user, $file);

    expect($path)->toBe('logos/1_20261013195300.jpg');
    Storage::disk('public')->assertExists($path);
});

it('uploadLogo MENERIMA file .jpeg', function () {
    Carbon::setTestNow('2026-10-13 19:53:00');

    $user = makeUserWithProfile(['id' => 7], makeProfile(['logo' => null]));

    $file = UploadedFile::fake()->image('logo.jpeg', 200, 200);

    $path = $this->service->uploadLogo($user, $file);

    expect($path)->toBe('logos/7_20261013195300.jpeg');
    Storage::disk('public')->assertExists($path);
});

it('uploadLogo MENERIMA file .png', function () {
    Carbon::setTestNow('2026-10-13 19:53:00');

    $user = makeUserWithProfile(['id' => 8], makeProfile(['logo' => null]));

    $file = UploadedFile::fake()->image('logo.png', 100, 100);

    $path = $this->service->uploadLogo($user, $file);

    expect($path)->toBe('logos/8_20261013195300.png');
});

it('uploadLogo MENERIMA file .webp', function () {
    Carbon::setTestNow('2026-10-13 19:53:00');

    $user = makeUserWithProfile(['id' => 8], makeProfile(['logo' => null]));

    $file = UploadedFile::fake()->image('logo.webp', 100, 100);

    $path = $this->service->uploadLogo($user, $file);

    expect($path)->toBe('logos/8_20261013195300.webp');
});

it('uploadLogo MENERIMA ekstensi uppercase .PNG (di-normalize ke lowercase)', function () {
    Carbon::setTestNow('2026-10-13 19:53:00');

    $user = makeUserWithProfile(['id' => 31], makeProfile(['logo' => null]));

    $file = UploadedFile::fake()->image('LOGO.PNG', 50, 50);

    $path = $this->service->uploadLogo($user, $file);

    // Service normalize extension ke lowercase
    expect($path)->toBe('logos/31_20261013195300.png');
});

/*
|==========================================================================
| uploadLogo() — Delete Logo Lama
|==========================================================================
*/

it('uploadLogo menghapus logo lama user jika ada di storage', function () {
    Carbon::setTestNow('2026-10-13 19:53:00');

    Storage::disk('public')->put('logos/old.png', 'old-data');

    $profile = makeProfile(['id' => 10, 'logo' => 'logos/old.png']);
    $user = makeUserWithProfile(['id' => 5], $profile);

    $file = UploadedFile::fake()->image('new.png', 100, 100);

    $this->service->uploadLogo($user, $file);

    Storage::disk('public')->assertMissing('logos/old.png');
    Storage::disk('public')->assertExists('logos/5_20261013195300.png');
});

it('uploadLogo tidak error jika user tidak punya profile', function () {
    Carbon::setTestNow('2026-10-13 19:53:00');

    $user = makeUserWithProfile(['id' => 11], null);

    $file = UploadedFile::fake()->image('logo.png', 100, 100);

    $path = $this->service->uploadLogo($user, $file);

    expect($path)->toBe('logos/11_20261013195300.png');
});

/*
|==========================================================================
| BVA — Timestamp & User ID
|==========================================================================
*/

it('uploadLogo dengan waktu berbeda menghasilkan nama file berbeda', function () {
    $user = makeUserWithProfile(['id' => 30], makeProfile(['logo' => null]));
    $file = UploadedFile::fake()->image('logo.png', 50, 50);

    Carbon::setTestNow('2026-10-13 10:00:00');
    $path1 = $this->service->uploadLogo($user, $file);

    Carbon::setTestNow('2026-10-13 10:00:01');
    $path2 = $this->service->uploadLogo($user, $file);

    expect($path1)->not->toBe($path2);
    expect($path1)->toContain('20261013100000');
    expect($path2)->toContain('20261013100001');
});

it('uploadLogo dengan user id = 0', function () {
    Carbon::setTestNow('2026-10-13 19:53:00');

    $user = makeUserWithProfile(['id' => 0], makeProfile(['logo' => null]));
    $file = UploadedFile::fake()->image('logo.png', 50, 50);

    $path = $this->service->uploadLogo($user, $file);

    expect($path)->toBe('logos/0_20261013195300.png');
});

/*
|==========================================================================
| Equivalence Partitioning — Whitelist field
|==========================================================================
*/

it('update profile dengan SEMUA field whitelist → semuanya lolos filter', function () {
    $profile = makeProfile(['id' => 10]);
    $user = makeUserWithProfile(['id' => 1], $profile);

    $allAllowed = [
        'nama_penyedia_usaha' => 'PT A',
        'nomor_identitas' => '123456',
        'alamat' => 'Jl. A',
        'telepon' => '0812',
        'provinsi' => 'DKI',
        'kota' => 'Jakarta',
        'kode_pos' => '12345',
        'deskripsi' => 'Deskripsi',
    ];

    $this->profileRepository->shouldReceive('updateProfile')
        ->once()
        ->with($profile, $allAllowed)
        ->andReturn($profile);

    $this->service->updateProfile($user, $allAllowed);
});

it('update profile dengan field di luar whitelist → hanya field valid yang lolos', function () {
    $profile = makeProfile(['id' => 10]);
    $user = makeUserWithProfile(['id' => 1], $profile);

    $this->profileRepository->shouldReceive('updateProfile')
        ->once()
        ->with($profile, Mockery::on(function ($f) {
            $expectedKeys = ['nama_penyedia_usaha', 'alamat'];

            return array_keys($f) === $expectedKeys
                && ! isset($f['field_terlarang'])
                && ! isset($f['user_id'])
                && ! isset($f['tipe'])
                && ! isset($f['meta']);
        }))
        ->andReturn($profile);

    $this->service->updateProfile($user, [
        'nama_penyedia_usaha' => 'PT A',
        'alamat' => 'Jl. A',
        'field_terlarang' => 'X',
        'user_id' => 999,
        'tipe' => 'admin',
        'meta' => ['foo' => 'bar'],
    ]);
});

/*
|==========================================================================
| Behavioral — Repository Interaction
|==========================================================================
*/

it('updateProfile memanggil repository TEPAT 1x', function () {
    $profile = makeProfile(['id' => 10]);
    $user = makeUserWithProfile(['id' => 1], $profile);

    $this->profileRepository->shouldReceive('updateProfile')
        ->once()
        ->with($profile, Mockery::any())
        ->andReturn($profile);

    $this->profileRepository->shouldNotReceive('createForUser');
    $this->profileRepository->shouldNotReceive('findByUserId');

    $this->service->updateProfile($user, ['alamat' => 'Jl. A']);
});

it('uploadLogo TIDAK memanggil repository sama sekali', function () {
    Carbon::setTestNow('2026-10-13 19:53:00');

    $user = makeUserWithProfile(['id' => 20], makeProfile(['logo' => null]));
    $file = UploadedFile::fake()->image('logo.png', 50, 50);

    $this->profileRepository->shouldNotReceive('updateProfile');
    $this->profileRepository->shouldNotReceive('createForUser');
    $this->profileRepository->shouldNotReceive('findByUserId');

    $this->service->uploadLogo($user, $file);
});

it('updateProfile TIDAK memanggil repository saat profile null (strict)', function () {
    $user = makeUserWithProfile(['id' => 1], null);

    $this->profileRepository->shouldNotReceive('updateProfile');
    $this->profileRepository->shouldNotReceive('createForUser');

    expect(fn () => $this->service->updateProfile($user, ['alamat' => 'X']))
        ->toThrow(ValidationException::class);
});

/*
|==========================================================================
| SECURITY — Logging Audit Trail
|==========================================================================
| Menggunakan Log::spy() untuk menghindari konflik dengan mock default
| di beforeEach (zeroOrMoreTimes).
*/

it('uploadLogo MENOLAK file .svg DAN mencatat warning ke log', function () {
    $user = makeUserWithProfile(['id' => 1], makeProfile(['logo' => null]));
    $file = UploadedFile::fake()->create('malicious.svg', 100, 'image/png');

    Log::spy();

    // ACT
    expect(fn () => $this->service->uploadLogo($user, $file))
        ->toThrow(ValidationException::class);

    // ASSERT: verifikasi log warning dicatat dengan konteks benar
    Log::shouldHaveReceived('warning')
        ->once()
        ->with('Logo upload ditolak: ekstensi tidak diizinkan', Mockery::on(function ($ctx) {
            return $ctx['user_id'] === 1
                && $ctx['extension'] === 'svg'
                && $ctx['original'] === 'malicious.svg';
        }));
});

it('uploadLogo MENCATAT info ke log saat sukses', function () {
    Carbon::setTestNow('2026-10-13 19:53:00');

    $user = makeUserWithProfile(['id' => 1], makeProfile(['logo' => null]));
    $file = UploadedFile::fake()->image('logo.png', 100, 100);

    Log::spy();

    // ACT
    $this->service->uploadLogo($user, $file);

    // ASSERT
    Log::shouldHaveReceived('info')
        ->once()
        ->with('Logo mitra berhasil diupload', Mockery::on(function ($ctx) {
            return $ctx['user_id'] === 1
                && $ctx['filename'] === '1_20261013195300.png'
                && $ctx['mime'] === 'image/png'
                && $ctx['old_logo'] === null;
        }));
});

/*
|==========================================================================
| Boundary — Field kosong vs field terisi
|==========================================================================
*/

it('updateProfile dengan field bernilai string kosong tetap dikirim ke repository', function () {
    $profile = makeProfile(['id' => 10]);
    $user = makeUserWithProfile(['id' => 1], $profile);

    $this->profileRepository->shouldReceive('updateProfile')
        ->once()
        ->with($profile, Mockery::on(function ($f) {
            return array_key_exists('alamat', $f)
                && $f['alamat'] === '';
        }))
        ->andReturn($profile);

    $this->service->updateProfile($user, ['alamat' => '']);
});

it('updateProfile dengan field bernilai string "0" tetap dikirim ke repository', function () {
    $profile = makeProfile(['id' => 10]);
    $user = makeUserWithProfile(['id' => 1], $profile);

    $this->profileRepository->shouldReceive('updateProfile')
        ->once()
        ->with($profile, Mockery::on(fn ($f) => $f['kode_pos'] === '0'))
        ->andReturn($profile);

    $this->service->updateProfile($user, ['kode_pos' => '0']);
});
