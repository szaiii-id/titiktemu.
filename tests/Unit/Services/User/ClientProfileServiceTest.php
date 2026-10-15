<?php

use App\Models\User;
use App\Repositories\Contracts\UserRepositoryInterface;
use App\Services\User\ClientProfileService;
use Illuminate\Support\Facades\Log;

beforeEach(function () {
    $this->userRepository = Mockery::mock(UserRepositoryInterface::class);
    $this->service = new ClientProfileService($this->userRepository);

    // ✅ FIX: gunakan zeroOrMoreTimes() agar tidak konflik dengan test spesifik
    // yang ingin memverifikasi argumen Log::info.
    Log::shouldReceive('info')->zeroOrMoreTimes()->andReturnNull();
});

afterEach(function () {
    Mockery::close();
});

/*
|==========================================================================
| getProfileData() — Struktur Output & Happy Path
|==========================================================================
*/

it('getProfileData mengembalikan struktur array yang benar', function () {
    // ARRANGE
    $user = makeUser([
        'id' => 1,
        'name' => 'Budi Santoso',
        'username' => 'budisantoso',
        'email' => 'budi@example.com',
        'role' => 'client',
    ]);

    // ACT
    $result = $this->service->getProfileData($user);

    // ASSERT
    expect($result)->toBeArray();
    expect(array_keys($result))->toBe(['id', 'name', 'username', 'email', 'role']);
});

it('getProfileData mengembalikan nilai yang sesuai dengan atribut user', function () {
    // ARRANGE
    $user = makeUser([
        'id' => 42,
        'name' => 'Budi Santoso',
        'username' => 'budisantoso',
        'email' => 'budi@example.com',
        'role' => 'client',
    ]);

    // ACT
    $result = $this->service->getProfileData($user);

    // ASSERT
    expect($result['id'])->toBe(42);
    expect($result['name'])->toBe('Budi Santoso');
    expect($result['username'])->toBe('budisantoso');
    expect($result['email'])->toBe('budi@example.com');
    expect($result['role'])->toBe('client');
});

it('getProfileData mengembalikan username = null jika user tidak punya username', function () {
    // Equivalence: username = null (partisi nullable)
    $user = makeUser([
        'id' => 1,
        'name' => 'Google User',
        'username' => null,
        'email' => 'google@example.com',
        'role' => 'client',
    ]);

    $result = $this->service->getProfileData($user);

    expect($result['username'])->toBeNull();
    expect($result)->toHaveKey('username'); // key tetap ada
});

it('getProfileData mengembalikan tipe data yang benar', function () {
    // Structural: verifikasi tipe data setiap field
    $user = makeUser([
        'id' => 1,
        'name' => 'Budi',
        'username' => 'budi',
        'email' => 'budi@example.com',
        'role' => 'client',
    ]);

    $result = $this->service->getProfileData($user);

    expect($result['id'])->toBeInt();
    expect($result['name'])->toBeString();
    expect($result['username'])->toBeString();
    expect($result['email'])->toBeString();
    expect($result['role'])->toBeString();
});

it('getProfileData TIDAK memanggil repository sama sekali', function () {
    // Behavioral: pure function
    $user = makeUser([
        'id' => 1,
        'name' => 'Budi',
        'username' => 'budi',
        'email' => 'budi@example.com',
        'role' => 'client',
    ]);

    $this->userRepository->shouldNotReceive('updateUser');
    $this->userRepository->shouldNotReceive('findById');
    $this->userRepository->shouldNotReceive('createUser');

    $this->service->getProfileData($user);

    expect(true)->toBeTrue();
});

/*
|==========================================================================
| getProfileData() — Equivalence Partitioning role
|==========================================================================
*/

it('getProfileData dengan role = admin tetap mengembalikan role admin', function () {
    // Partisi: role admin (meski service ini "client", tapi tidak ada validasi)
    $user = makeUser(['id' => 1, 'role' => 'admin']);

    $result = $this->service->getProfileData($user);

    expect($result['role'])->toBe('admin');
});

it('getProfileData dengan role = mitra tetap mengembalikan role mitra', function () {
    $user = makeUser(['id' => 1, 'role' => 'mitra']);

    $result = $this->service->getProfileData($user);

    expect($result['role'])->toBe('mitra');
});

it('getProfileData dengan role = null mengembalikan null', function () {
    // Edge: role kosong
    $user = makeUser(['id' => 1, 'role' => null]);

    $result = $this->service->getProfileData($user);

    expect($result['role'])->toBeNull();
});

/*
|==========================================================================
| updateProfile() — Happy Path
|==========================================================================
*/

it('updateProfile memanggil repository dengan name dan username', function () {
    // ARRANGE
    $user = makeUser(['id' => 1, 'name' => 'Lama', 'username' => 'lama']);

    $updated = makeUser(['id' => 1, 'name' => 'Baru', 'username' => 'baru']);

    $this->userRepository
        ->shouldReceive('updateUser')
        ->once()
        ->with($user, [
            'name' => 'Baru',
            'username' => 'baru',
        ])
        ->andReturn($updated);

    // ACT
    $result = $this->service->updateProfile($user, [
        'name' => 'Baru',
        'username' => 'baru',
    ]);

    // ASSERT
    expect($result)->toBe($updated);
});

it('updateProfile mengembalikan User instance', function () {
    // Structural: verifikasi tipe return
    $user = makeUser(['id' => 1]);
    $updated = makeUser(['id' => 1, 'name' => 'Baru']);

    $this->userRepository
        ->shouldReceive('updateUser')
        ->once()
        ->andReturn($updated);

    $result = $this->service->updateProfile($user, ['name' => 'Baru']);

    expect($result)->toBeInstanceOf(User::class);
});

/*
|==========================================================================
| updateProfile() — Equivalence Partitioning username
|==========================================================================
*/

it('updateProfile dengan username = null → dikirim null ke repository', function () {
    // Partisi: username = null
    $user = makeUser(['id' => 1]);
    $updated = makeUser(['id' => 1]);

    $this->userRepository
        ->shouldReceive('updateUser')
        ->once()
        ->with($user, [
            'name' => 'Baru',
            'username' => null,
        ])
        ->andReturn($updated);

    $this->service->updateProfile($user, [
        'name' => 'Baru',
        'username' => null,
    ]);
});

it('updateProfile dengan username key TIDAK ada → dikirim null (default)', function () {
    // Partisi: key absen → null via `?? null`
    $user = makeUser(['id' => 1]);
    $updated = makeUser(['id' => 1]);

    $this->userRepository
        ->shouldReceive('updateUser')
        ->once()
        ->with($user, [
            'name' => 'Baru',
            'username' => null,
        ])
        ->andReturn($updated);

    $this->service->updateProfile($user, ['name' => 'Baru']);
});

it('updateProfile dengan username = "" (string kosong) → dikirim "" ke repository', function () {
    // Edge: empty string bukan null → `?? null` tidak menggantikan
    $user = makeUser(['id' => 1]);
    $updated = makeUser(['id' => 1]);

    $this->userRepository
        ->shouldReceive('updateUser')
        ->once()
        ->with($user, [
            'name' => 'Baru',
            'username' => '',
        ])
        ->andReturn($updated);

    $this->service->updateProfile($user, [
        'name' => 'Baru',
        'username' => '',
    ]);
});

/*
|==========================================================================
| updateProfile() — Filter Field (Equivalence)
|==========================================================================
*/

it('updateProfile hanya mengirim name & username → field lain di-drop', function () {
    // Equivalence: field yang di-whitelist vs tidak
    $user = makeUser(['id' => 1]);
    $updated = makeUser(['id' => 1]);

    $this->userRepository
        ->shouldReceive('updateUser')
        ->once()
        ->with($user, Mockery::on(function ($payload) {
            // Hanya 2 key yang dikirim
            return array_keys($payload) === ['name', 'username']
                && $payload['name'] === 'Baru'
                && $payload['username'] === 'baru';
        }))
        ->andReturn($updated);

    $this->service->updateProfile($user, [
        'name' => 'Baru',
        'username' => 'baru',
        'email' => 'harus-dibuang@example.com',
        'password' => 'harus-dibuang',
        'role' => 'admin',
        'google_id' => 'harus-dibuang',
        'must_change_password' => true,
    ]);
});

it('updateProfile TIDAK menyertakan email/role/password dalam payload', function () {
    // Behavioral: strict verification
    $user = makeUser(['id' => 1]);
    $updated = makeUser(['id' => 1]);

    $this->userRepository
        ->shouldReceive('updateUser')
        ->once()
        ->with($user, Mockery::on(function ($payload) {
            return ! array_key_exists('email', $payload)
                && ! array_key_exists('role', $payload)
                && ! array_key_exists('password', $payload)
                && ! array_key_exists('google_id', $payload)
                && ! array_key_exists('must_change_password', $payload);
        }))
        ->andReturn($updated);

    $this->service->updateProfile($user, [
        'name' => 'Baru',
        'username' => 'baru',
        'email' => 'x@y.com',
        'role' => 'admin',
        'password' => 'secret',
    ]);
});

/*
|==========================================================================
| updateProfile() — Edge Cases
|==========================================================================
*/

it('updateProfile dengan name = "" (string kosong) → tetap diteruskan', function () {
    // Edge: tidak ada validasi di service, validasi di Form Request
    $user = makeUser(['id' => 1]);
    $updated = makeUser(['id' => 1]);

    $this->userRepository
        ->shouldReceive('updateUser')
        ->once()
        ->with($user, Mockery::on(fn ($p) => $p['name'] === ''))
        ->andReturn($updated);

    $this->service->updateProfile($user, ['name' => '']);
});

it('updateProfile dengan name panjang 1000 karakter (BVA atas)', function () {
    // BVA: panjang ekstrem
    $longName = str_repeat('a', 1000);
    $user = makeUser(['id' => 1]);
    $updated = makeUser(['id' => 1]);

    $this->userRepository
        ->shouldReceive('updateUser')
        ->once()
        ->with($user, Mockery::on(fn ($p) => $p['name'] === $longName))
        ->andReturn($updated);

    $this->service->updateProfile($user, ['name' => $longName]);
});

it('updateProfile dengan data kosong tetap memanggil repository', function () {
    // Edge: data = [] → service akan error karena akses $data['name']
    // Ini bukan kasus yang divalidasi service — validasi di Form Request
    $user = makeUser(['id' => 1]);

    // Karena $data['name'] tidak ada, PHP akan throw error
    // Kita gunakan `?? null` implicit? Tidak — service langsung akses $data['name']
    // Maka test ini kita expect error / tidak boleh dilakukan.
    // Skip: service mengasumsikan 'name' selalu ada.
})->skip('Service mengasumsikan "name" selalu ada — validasi di Form Request');

/*
|==========================================================================
| updateProfile() — Behavioral / Mocking
|==========================================================================
*/

it('updateProfile memanggil updateUser tepat 1x', function () {
    // Behavioral: verifikasi jumlah panggilan
    $user = makeUser(['id' => 1]);
    $updated = makeUser(['id' => 1]);

    $this->userRepository->shouldReceive('updateUser')->once()->andReturn($updated);

    $this->service->updateProfile($user, ['name' => 'Baru']);
});

it('updateProfile TIDAK memanggil method repository lain', function () {
    // Behavioral: strict verification
    $user = makeUser(['id' => 1]);
    $updated = makeUser(['id' => 1]);

    $this->userRepository->shouldReceive('updateUser')->once()->andReturn($updated);

    $this->userRepository->shouldNotReceive('createUser');
    $this->userRepository->shouldNotReceive('createClient');
    $this->userRepository->shouldNotReceive('deleteUser');
    $this->userRepository->shouldNotReceive('findById');
    $this->userRepository->shouldNotReceive('findByEmail');

    $this->service->updateProfile($user, ['name' => 'Baru']);
});

/*
|==========================================================================
| Logging — Behavioral
|==========================================================================
*/

it('updateProfile memanggil Log::info dengan user_id', function () {
    // Behavioral: verifikasi logging
    $user = makeUser(['id' => 77]);
    $updated = makeUser(['id' => 77]);

    $this->userRepository->shouldReceive('updateUser')->once()->andReturn($updated);

    // ✅ FIX: gunakan Log::spy() agar menggantikan mock default dari beforeEach.
    // Log::spy() akan "meng-override" expectation default dan memungkinkan
    // verifikasi argumen via shouldHaveReceived().
    Log::spy();

    // ACT
    $this->service->updateProfile($user, ['name' => 'Baru']);

    // ASSERT
    Log::shouldHaveReceived('info')
        ->once()
        ->with('Client update profile', Mockery::on(function ($context) {
            return $context['user_id'] === 77;
        }));
});

it('getProfileData TIDAK memanggil Log::info', function () {
    // Behavioral: getProfileData tidak boleh log apapun
    $user = makeUser(['id' => 1]);

    // ✅ FIX: gunakan spy agar tidak konflik dengan mock default di beforeEach
    Log::spy();

    $this->service->getProfileData($user);

    Log::shouldNotHaveReceived('info');
});

/*
|==========================================================================
| Integration — getProfileData + updateProfile
|==========================================================================
*/

it('updateProfile lalu getProfileData mengembalikan data terbaru', function () {
    // Integration test: dua method berinteraksi via User instance yang sama
    $user = makeUser([
        'id' => 1,
        'name' => 'Lama',
        'username' => 'lama',
        'email' => 'x@y.com',
        'role' => 'client',
    ]);

    $updated = makeUser([
        'id' => 1,
        'name' => 'Baru',
        'username' => 'baru',
        'email' => 'x@y.com',
        'role' => 'client',
    ]);

    $this->userRepository->shouldReceive('updateUser')->once()->andReturn($updated);

    $this->service->updateProfile($user, ['name' => 'Baru', 'username' => 'baru']);
    $result = $this->service->getProfileData($updated);

    expect($result['name'])->toBe('Baru');
    expect($result['username'])->toBe('baru');
    expect($result['email'])->toBe('x@y.com');
    expect($result['role'])->toBe('client');
});
