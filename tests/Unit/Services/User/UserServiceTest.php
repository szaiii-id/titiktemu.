<?php

use App\Models\Profile;
use App\Models\User;
use App\Repositories\Contracts\ProfileRepositoryInterface;
use App\Repositories\Contracts\UserRepositoryInterface;
use App\Services\User\UserService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

beforeEach(function () {
    // ARRANGE GLOBAL
    $this->userRepository = Mockery::mock(UserRepositoryInterface::class);
    $this->profileRepository = Mockery::mock(ProfileRepositoryInterface::class);

    $this->service = new UserService($this->userRepository, $this->profileRepository);

    // DB::transaction → langsung eksekusi callback
    DB::shouldReceive('transaction')
        ->andReturnUsing(fn ($callback) => $callback());

    // Log facade → no-op
    Log::shouldReceive('info')->andReturnNull();
    Log::shouldReceive('warning')->andReturnNull();
});

afterEach(function () {
    Mockery::close();
});

/*
|==========================================================================
| createAdmin()
|==========================================================================
*/

it('membuat admin baru dengan password eksplisit', function () {
    // ARRANGE
    $data = [
        'name' => 'Admin Satu',
        'username' => 'admin1',
        'email' => 'admin1@example.com',
        'password' => 'SecretPass123!',
        'nama_penyedia_usaha' => 'PT Admin',
        'telepon' => '08123456789',
    ];

    // validateUnique → tidak ada konflik
    $this->userRepository->shouldReceive('emailExists')
        ->once()
        ->with('admin1@example.com', null)
        ->andReturn(false);

    $this->userRepository->shouldReceive('usernameExists')
        ->once()
        ->with('admin1', null)
        ->andReturn(false);

    $createdUser = makeUser([
        'id' => 1,
        'name' => 'Admin Satu',
        'email' => 'admin1@example.com',
        'role' => 'admin',
    ]);

    // createUser → assert payload
    $this->userRepository->shouldReceive('createUser')
        ->once()
        ->with(Mockery::on(function ($payload) {
            return $payload['name'] === 'Admin Satu'
                && $payload['email'] === 'admin1@example.com'
                && $payload['username'] === 'admin1'
                && $payload['password'] === 'SecretPass123!'
                && $payload['role'] === 'admin'
                && $payload['must_change_password'] === true;
        }))
        ->andReturn($createdUser);

    // createForUser → assert payload profile
    $this->profileRepository->shouldReceive('createForUser')
        ->once()
        ->with($createdUser, Mockery::on(function ($profile) {
            return $profile['tipe'] === 'admin'
                && $profile['nama_penyedia_usaha'] === 'PT Admin'
                && $profile['telepon'] === '08123456789'
                && $profile['alamat'] === null; // default null
        }));

    // ACT
    $result = $this->service->createAdmin($data);

    // ASSERT
    expect($result['user'])->toBe($createdUser);
    expect($result['plain_password'])->toBe('SecretPass123!');
});

it('membuat admin baru dengan password auto-generate jika tidak diisi', function () {
    // ARRANGE
    $data = [
        'name' => 'Admin Dua',
        'email' => 'admin2@example.com',
    ];

    $this->userRepository->shouldReceive('emailExists')->andReturn(false);
    // username tidak di-set → usernameExists tidak boleh dipanggil
    $this->userRepository->shouldReceive('usernameExists')->never();

    $createdUser = makeUser(['id' => 2, 'email' => 'admin2@example.com']);

    // Password di-generate → cek bahwa password yang dikirim BUKAN null
    $capturedPassword = null;
    $this->userRepository->shouldReceive('createUser')
        ->once()
        ->with(Mockery::on(function ($payload) use (&$capturedPassword) {
            $capturedPassword = $payload['password'];

            return ! empty($payload['password'])
                && is_string($payload['password'])
                && strlen($payload['password']) >= 12;
        }))
        ->andReturn($createdUser);

    $this->profileRepository->shouldReceive('createForUser')->once();

    // ACT
    $result = $this->service->createAdmin($data);

    // ASSERT
    expect($result['plain_password'])->toBe($capturedPassword);
    expect($result['plain_password'])->not->toBeEmpty();
});

it('createAdmin memanggil repository dalam urutan yang benar', function () {
    // Behavioral: verifikasi urutan panggilan
    $data = ['name' => 'A', 'email' => 'a@b.com', 'username' => 'aaa'];

    $createdUser = makeUser(['id' => 100, 'role' => 'admin']);

    $this->userRepository->shouldReceive('emailExists')
        ->once()->with('a@b.com', null)->andReturn(false)->ordered();

    $this->userRepository->shouldReceive('usernameExists')
        ->once()->with('aaa', null)->andReturn(false)->ordered();

    $this->userRepository->shouldReceive('createUser')
        ->once()->andReturn($createdUser)->ordered();

    $this->profileRepository->shouldReceive('createForUser')
        ->once()->ordered();

    $this->service->createAdmin($data);
});

it('melempar ValidationException jika email admin sudah terpakai', function () {
    // ARRANGE
    $data = ['name' => 'X', 'email' => 'dup@example.com'];

    $this->userRepository->shouldReceive('emailExists')
        ->once()
        ->with('dup@example.com', null)
        ->andReturn(true);

    // Repository create TIDAK boleh dipanggil
    $this->userRepository->shouldReceive('createUser')->never();
    $this->profileRepository->shouldReceive('createForUser')->never();

    // ACT + ASSERT
    expect(fn () => $this->service->createAdmin($data))
        ->toThrow(ValidationException::class);
});

it('melempar ValidationException jika username admin sudah terpakai', function () {
    $data = ['name' => 'X', 'email' => 'new@example.com', 'username' => 'taken'];

    $this->userRepository->shouldReceive('emailExists')->andReturn(false);
    $this->userRepository->shouldReceive('usernameExists')
        ->once()
        ->with('taken', null)
        ->andReturn(true);

    $this->userRepository->shouldReceive('createUser')->never();

    expect(fn () => $this->service->createAdmin($data))
        ->toThrow(ValidationException::class);
});

/*
|==========================================================================
| createMitra()
|==========================================================================
*/

it('membuat mitra baru dengan role mitra dan tipe profile mitra', function () {
    $data = [
        'name' => 'Mitra Satu',
        'email' => 'mitra1@example.com',
        'username' => 'mitra1',
        'password' => 'MitraPass123!',
    ];

    $this->userRepository->shouldReceive('emailExists')->andReturn(false);
    $this->userRepository->shouldReceive('usernameExists')->andReturn(false);

    $createdUser = makeUser(['id' => 10, 'role' => 'mitra']);

    $this->userRepository->shouldReceive('createUser')
        ->once()
        ->with(Mockery::on(fn ($p) => $p['role'] === 'mitra' && $p['must_change_password'] === true))
        ->andReturn($createdUser);

    $this->profileRepository->shouldReceive('createForUser')
        ->once()
        ->with($createdUser, Mockery::on(fn ($p) => $p['tipe'] === 'mitra'));

    $result = $this->service->createMitra($data);

    expect($result['user'])->toBe($createdUser);
    expect($result['plain_password'])->toBe('MitraPass123!');
});

it('melempar ValidationException jika email mitra sudah terpakai', function () {
    $data = ['name' => 'X', 'email' => 'dup@example.com'];

    $this->userRepository->shouldReceive('emailExists')->andReturn(true);
    $this->userRepository->shouldReceive('createUser')->never();

    expect(fn () => $this->service->createMitra($data))
        ->toThrow(ValidationException::class);
});

/*
|==========================================================================
| updateUser()
|==========================================================================
*/

it('update user dengan data baru dan profile baru (profile belum ada)', function () {
    // ARRANGE
    $user = Mockery::mock(User::class)->makePartial();
    $user->forceFill(['id' => 5, 'name' => 'Lama', 'role' => 'mitra']);

    // validateUnique: email & username baru unik (except user id 5)
    $this->userRepository->shouldReceive('emailExists')
        ->once()
        ->with('baru@example.com', 5)
        ->andReturn(false);
    $this->userRepository->shouldReceive('usernameExists')
        ->once()
        ->with('baru', 5)
        ->andReturn(false);

    // updateUser
    $this->userRepository->shouldReceive('updateUser')
        ->once()
        ->with($user, Mockery::on(fn ($p) => $p['name'] === 'Baru'
            && $p['username'] === 'baru'
            && $p['email'] === 'baru@example.com'
        ))
        ->andReturn($user);

    // Profile: user belum punya profile
    $user->shouldReceive('load')->with('profile')->andReturn($user);
    $user->shouldReceive('refresh')->andReturn($user);

    // Karena $user->profile = null, maka createForUser dipanggil
    $user->shouldReceive('getAttribute')->with('profile')->andReturn(null);

    $this->profileRepository->shouldReceive('createForUser')
        ->once()
        ->with($user, Mockery::on(fn ($p) => $p['tipe'] === 'mitra' && $p['alamat'] === 'Jl. Baru'))
        ->andReturn(new Profile);

    // ACT
    $result = $this->service->updateUser(
        $user,
        ['name' => 'Baru', 'username' => 'baru', 'email' => 'baru@example.com'],
        ['alamat' => 'Jl. Baru']
    );

    // ASSERT
    expect($result)->toBe($user);
});

it('update user dan profile yang sudah ada', function () {
    // ARRANGE
    $existingProfile = new Profile;
    $existingProfile->forceFill(['id' => 99, 'tipe' => 'mitra']);

    $user = Mockery::mock(User::class)->makePartial();
    $user->forceFill(['id' => 5, 'name' => 'Lama', 'role' => 'mitra']);
    $user->setRelation('profile', $existingProfile);

    $this->userRepository->shouldReceive('emailExists')->andReturn(false);
    $this->userRepository->shouldReceive('usernameExists')->andReturn(false);

    $this->userRepository->shouldReceive('updateUser')
        ->once()
        ->andReturn($user);

    $user->shouldReceive('load')->with('profile')->andReturn($user);
    $user->shouldReceive('refresh')->andReturn($user);

    // Karena profile sudah ada → updateProfile
    $this->profileRepository->shouldReceive('updateProfile')
        ->once()
        ->with($existingProfile, Mockery::on(fn ($p) => $p['alamat'] === 'Jl. Update'))
        ->andReturn($existingProfile);

    $this->profileRepository->shouldReceive('createForUser')->never();

    // ACT
    $result = $this->service->updateUser(
        $user,
        ['name' => 'Baru'],
        ['alamat' => 'Jl. Update']
    );

    // ASSERT
    expect($result)->toBe($user);
});

it('update user tanpa profileData → profileRepository tidak dipanggil', function () {
    $user = Mockery::mock(User::class)->makePartial();
    $user->forceFill(['id' => 5, 'role' => 'client']);
    $user->setRelation('profile', null);

    $this->userRepository->shouldReceive('emailExists')->andReturn(false);
    $this->userRepository->shouldReceive('usernameExists')->andReturn(false);
    $this->userRepository->shouldReceive('updateUser')->once()->andReturn($user);

    $user->shouldReceive('load')->with('profile')->andReturn($user);
    $user->shouldReceive('refresh')->andReturn($user);

    // profileData kosong → tidak ada update/create profile
    $this->profileRepository->shouldReceive('updateProfile')->never();
    $this->profileRepository->shouldReceive('createForUser')->never();

    $this->service->updateUser($user, ['name' => 'Baru'], []);
});

it('update user melempar ValidationException jika email duplikat', function () {
    $user = Mockery::mock(User::class)->makePartial();
    $user->forceFill(['id' => 5]);

    $this->userRepository->shouldReceive('emailExists')
        ->once()
        ->with('dup@example.com', 5)
        ->andReturn(true);

    $this->userRepository->shouldReceive('updateUser')->never();

    expect(fn () => $this->service->updateUser($user, ['email' => 'dup@example.com']))
        ->toThrow(ValidationException::class);
});

/*
|==========================================================================
| deleteUser()
|==========================================================================
*/

it('menghapus user melalui repository', function () {
    $user = makeUser(['id' => 7, 'email' => 'hapus@example.com', 'role' => 'client']);

    $this->userRepository->shouldReceive('deleteUser')
        ->once()
        ->with($user)
        ->andReturn(true);

    $this->service->deleteUser($user);

    // Assert via mock expectation (jika tidak dipanggil → test gagal)
    expect(true)->toBeTrue();
});

/*
|==========================================================================
| resetPassword()
|==========================================================================
*/

it('reset password user dan set must_change_password = true', function () {
    // ARRANGE
    $user = Mockery::mock(User::class)->makePartial();
    $user->forceFill(['id' => 3, 'email' => 'reset@example.com']);

    $capturedPassword = null;
    $user->shouldReceive('update')
        ->once()
        ->with(Mockery::on(function ($payload) use (&$capturedPassword) {
            $capturedPassword = $payload['password'];

            return $payload['must_change_password'] === true
                && ! empty($payload['password'])
                && strlen($payload['password']) >= 12;
        }))
        ->andReturn(true);

    $user->shouldReceive('refresh')->andReturn($user);

    // ACT
    $result = $this->service->resetPassword($user);

    // ASSERT
    expect($result['user'])->toBe($user);
    expect($result['plain_password'])->toBe($capturedPassword);
    expect($result['plain_password'])->not->toBeEmpty();
});

/*
|==========================================================================
| paginateByRoles() & paginateClients() — Pass-through
|==========================================================================
*/

it('paginateByRoles meneruskan parameter ke repository', function () {
    $paginator = Mockery::mock(LengthAwarePaginator::class);

    $this->userRepository->shouldReceive('paginateByRoles')
        ->once()
        ->with(['admin', 'mitra'], 25, 'budi')
        ->andReturn($paginator);

    $result = $this->service->paginateByRoles(['admin', 'mitra'], 25, 'budi');

    expect($result)->toBe($paginator);
});

it('paginateByRoles menggunakan default perPage = 15 dan search = null', function () {
    $paginator = Mockery::mock(LengthAwarePaginator::class);

    $this->userRepository->shouldReceive('paginateByRoles')
        ->once()
        ->with(['admin'], 15, null)
        ->andReturn($paginator);

    $this->service->paginateByRoles(['admin']);
});

it('paginateByRoles dengan perPage minimum (1) tetap diteruskan', function () {
    // BVA: batas bawah perPage
    $paginator = Mockery::mock(LengthAwarePaginator::class);

    $this->userRepository->shouldReceive('paginateByRoles')
        ->once()
        ->with(['admin'], 1, null)
        ->andReturn($paginator);

    $result = $this->service->paginateByRoles(['admin'], 1);
    expect($result)->toBe($paginator);
});

it('paginateClients meneruskan parameter ke repository', function () {
    $paginator = Mockery::mock(LengthAwarePaginator::class);

    $this->userRepository->shouldReceive('paginateClients')
        ->once()
        ->with(10, 'search-keyword')
        ->andReturn($paginator);

    $result = $this->service->paginateClients(10, 'search-keyword');

    expect($result)->toBe($paginator);
});

/*
|==========================================================================
| BVA — generatePassword()
|==========================================================================
| Menguji batas-batas parameter `length` pada generatePassword().
| Method ini protected, jadi diakses via Reflection.
*/

it('generatePassword dengan panjang default = 12 karakter', function () {
    // BVA: default value
    $reflection = new ReflectionMethod($this->service, 'generatePassword');
    $reflection->setAccessible(true);

    $password = $reflection->invoke($this->service);

    expect(strlen($password))->toBe(12);
});

it('generatePassword dengan length = 0 mengembalikan string kosong', function () {
    // BVA: batas bawah ekstrem
    $reflection = new ReflectionMethod($this->service, 'generatePassword');
    $reflection->setAccessible(true);

    $password = $reflection->invoke($this->service, 0);

    expect($password)->toBe('');
});

it('generatePassword dengan length = 1 mengembalikan 1 karakter', function () {
    // BVA: batas bawah berguna
    $reflection = new ReflectionMethod($this->service, 'generatePassword');
    $reflection->setAccessible(true);

    $password = $reflection->invoke($this->service, 1);

    expect(strlen($password))->toBe(1);
});

it('generatePassword dengan length = 100 mengembalikan 100 karakter', function () {
    // BVA: batas atas
    $reflection = new ReflectionMethod($this->service, 'generatePassword');
    $reflection->setAccessible(true);

    $password = $reflection->invoke($this->service, 100);

    expect(strlen($password))->toBe(100);
});

it('generatePassword menghasilkan string yang unik antar pemanggilan', function () {
    // Edge case: verifikasi randomness
    $reflection = new ReflectionMethod($this->service, 'generatePassword');
    $reflection->setAccessible(true);

    $a = $reflection->invoke($this->service);
    $b = $reflection->invoke($this->service);

    expect($a)->not->toBe($b);
});

/*
|==========================================================================
| Equivalence Partitioning — validateUnique
|==========================================================================
| Partisi: email ada/tidak ada, username ada/tidak ada, exceptUserId null/int.
*/

it('createAdmin melempar ValidationException jika email DAN username duplikat sekaligus', function () {
    // Partisi: dua-duanya konflik — email dicek duluan
    $data = [
        'name' => 'X',
        'email' => 'dup@example.com',
        'username' => 'taken',
    ];

    $this->userRepository->shouldReceive('emailExists')
        ->once()
        ->andReturn(true);

    // usernameExists TIDAK dipanggil karena email sudah throw duluan
    $this->userRepository->shouldReceive('usernameExists')->never();
    $this->userRepository->shouldReceive('createUser')->never();

    expect(fn () => $this->service->createAdmin($data))
        ->toThrow(ValidationException::class);
});

it('createAdmin tidak memanggil usernameExists jika username kosong string', function () {
    // Partisi: username = '' (empty string) → skip
    $data = ['name' => 'X', 'email' => 'a@b.com', 'username' => ''];

    $this->userRepository->shouldReceive('emailExists')->andReturn(false);
    // empty('') = true → usernameExists tidak dipanggil
    $this->userRepository->shouldReceive('usernameExists')->never();
    $this->userRepository->shouldReceive('createUser')
        ->once()
        ->andReturn(makeUser(['id' => 1]));

    $this->profileRepository->shouldReceive('createForUser')->once();

    $this->service->createAdmin($data);
});

/*
|==========================================================================
| Edge Cases — Kombinasi field
|==========================================================================
*/

it('createAdmin dengan semua field profile opsional diisi', function () {
    // Edge: memastikan semua field diteruskan dengan benar
    $data = [
        'name' => 'Admin Full',
        'email' => 'full@example.com',
        'username' => 'adminfull',
        'password' => 'FullPass123!',
        'nama_penyedia_usaha' => 'PT Full',
        'nomor_identitas' => '1234567890',
        'alamat' => 'Jl. Full',
        'telepon' => '021-1234567',
        'provinsi' => 'DKI Jakarta',
        'kota' => 'Jakarta Pusat',
        'kode_pos' => '10110',
        'logo' => 'logos/full.png',
        'deskripsi' => 'Deskripsi lengkap',
    ];

    $this->userRepository->shouldReceive('emailExists')->andReturn(false);
    $this->userRepository->shouldReceive('usernameExists')->andReturn(false);

    $createdUser = makeUser(['id' => 99, 'role' => 'admin']);

    $this->userRepository->shouldReceive('createUser')
        ->once()
        ->andReturn($createdUser);

    $this->profileRepository->shouldReceive('createForUser')
        ->once()
        ->with($createdUser, Mockery::on(function ($profile) use ($data) {
            return $profile['tipe'] === 'admin'
                && $profile['nama_penyedia_usaha'] === $data['nama_penyedia_usaha']
                && $profile['nomor_identitas'] === $data['nomor_identitas']
                && $profile['alamat'] === $data['alamat']
                && $profile['telepon'] === $data['telepon']
                && $profile['provinsi'] === $data['provinsi']
                && $profile['kota'] === $data['kota']
                && $profile['kode_pos'] === $data['kode_pos']
                && $profile['logo'] === $data['logo']
                && $profile['deskripsi'] === $data['deskripsi'];
        }));

    $result = $this->service->createAdmin($data);

    expect($result['user'])->toBe($createdUser);
    expect($result['plain_password'])->toBe('FullPass123!');
});

it('createMitra dengan password auto-generate', function () {
    // Edge: createMitra tanpa password eksplisit
    $data = ['name' => 'Mitra Auto', 'email' => 'mitra-auto@example.com'];

    $this->userRepository->shouldReceive('emailExists')->andReturn(false);
    $this->userRepository->shouldReceive('usernameExists')->never();

    $createdUser = makeUser(['id' => 50, 'role' => 'mitra']);

    $capturedPassword = null;
    $this->userRepository->shouldReceive('createUser')
        ->once()
        ->with(Mockery::on(function ($payload) use (&$capturedPassword) {
            $capturedPassword = $payload['password'];

            return ! empty($payload['password'])
                && strlen($payload['password']) >= 12;
        }))
        ->andReturn($createdUser);

    $this->profileRepository->shouldReceive('createForUser')->once();

    $result = $this->service->createMitra($data);

    expect($result['plain_password'])->toBe($capturedPassword);
});
