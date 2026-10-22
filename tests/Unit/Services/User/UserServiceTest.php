<?php

use App\Models\Profile;
use App\Models\User;
use App\Repositories\Contracts\ProfileRepositoryInterface;
use App\Repositories\Contracts\UserRepositoryInterface;
use App\Services\User\UserService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
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
    $data = [
        'name' => 'Admin Satu',
        'username' => 'admin1',
        'email' => 'admin1@example.com',
        'password' => 'SecretPass123!',
        'nama_penyedia_usaha' => 'PT Admin',
        'telepon' => '08123456789',
    ];

    $this->userRepository->shouldReceive('emailExists')->once()->with('admin1@example.com', null)->andReturn(false);
    $this->userRepository->shouldReceive('usernameExists')->once()->with('admin1', null)->andReturn(false);

    $createdUser = makeUser(['id' => 1, 'name' => 'Admin Satu', 'email' => 'admin1@example.com', 'role' => 'admin']);

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

    $this->profileRepository->shouldReceive('createForUser')
        ->once()
        ->with($createdUser, Mockery::on(function ($profile) {
            return $profile['tipe'] === 'admin'
                && $profile['nama_penyedia_usaha'] === 'PT Admin'
                && $profile['telepon'] === '08123456789'
                && $profile['alamat'] === null;
        }));

    $result = $this->service->createAdmin($data);

    expect($result['user'])->toBe($createdUser);
    expect($result['plain_password'])->toBe('SecretPass123!');
});

it('membuat admin baru dengan password auto-generate jika tidak diisi', function () {
    $data = ['name' => 'Admin Dua', 'email' => 'admin2@example.com'];

    $this->userRepository->shouldReceive('emailExists')->andReturn(false);
    $this->userRepository->shouldReceive('usernameExists')->never();

    $createdUser = makeUser(['id' => 2, 'email' => 'admin2@example.com']);

    $capturedPassword = null;
    $this->userRepository->shouldReceive('createUser')
        ->once()
        ->with(Mockery::on(function ($payload) use (&$capturedPassword) {
            $capturedPassword = $payload['password'];

            return ! empty($payload['password']) && is_string($payload['password']) && strlen($payload['password']) >= 12;
        }))
        ->andReturn($createdUser);

    $this->profileRepository->shouldReceive('createForUser')->once();

    $result = $this->service->createAdmin($data);

    expect($result['plain_password'])->toBe($capturedPassword);
    expect($result['plain_password'])->not->toBeEmpty();
});

it('createAdmin memanggil repository dalam urutan yang benar', function () {
    $data = ['name' => 'A', 'email' => 'a@b.com', 'username' => 'aaa'];
    $createdUser = makeUser(['id' => 100, 'role' => 'admin']);

    $this->userRepository->shouldReceive('emailExists')->once()->with('a@b.com', null)->andReturn(false)->ordered();
    $this->userRepository->shouldReceive('usernameExists')->once()->with('aaa', null)->andReturn(false)->ordered();
    $this->userRepository->shouldReceive('createUser')->once()->andReturn($createdUser)->ordered();
    $this->profileRepository->shouldReceive('createForUser')->once()->ordered();

    $this->service->createAdmin($data);
});

it('melempar ValidationException jika email admin sudah terpakai', function () {
    $data = ['name' => 'X', 'email' => 'dup@example.com'];

    $this->userRepository->shouldReceive('emailExists')->once()->with('dup@example.com', null)->andReturn(true);
    $this->userRepository->shouldReceive('createUser')->never();
    $this->profileRepository->shouldReceive('createForUser')->never();

    expect(fn () => $this->service->createAdmin($data))->toThrow(ValidationException::class);
});

it('melempar ValidationException jika username admin sudah terpakai', function () {
    $data = ['name' => 'X', 'email' => 'new@example.com', 'username' => 'taken'];

    $this->userRepository->shouldReceive('emailExists')->andReturn(false);
    $this->userRepository->shouldReceive('usernameExists')->once()->with('taken', null)->andReturn(true);
    $this->userRepository->shouldReceive('createUser')->never();

    expect(fn () => $this->service->createAdmin($data))->toThrow(ValidationException::class);
});

/*
|==========================================================================
| createMitra()
|==========================================================================
*/

it('membuat mitra baru dengan role mitra dan tipe profile mitra', function () {
    $data = ['name' => 'Mitra Satu', 'email' => 'mitra1@example.com', 'username' => 'mitra1', 'password' => 'MitraPass123!'];

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

    expect(fn () => $this->service->createMitra($data))->toThrow(ValidationException::class);
});

/*
|==========================================================================
| updateUser()
|==========================================================================
*/

it('update user dengan data baru dan profile baru (profile belum ada)', function () {
    $user = Mockery::mock(User::class)->makePartial();
    $user->forceFill(['id' => 5, 'name' => 'Lama', 'role' => 'mitra']);

    $this->userRepository->shouldReceive('emailExists')->once()->with('baru@example.com', 5)->andReturn(false);
    $this->userRepository->shouldReceive('usernameExists')->once()->with('baru', 5)->andReturn(false);

    $this->userRepository->shouldReceive('updateUser')
        ->once()
        ->with($user, Mockery::on(fn ($p) => $p['name'] === 'Baru' && $p['username'] === 'baru' && $p['email'] === 'baru@example.com'))
        ->andReturn($user);

    $user->shouldReceive('load')->with('profile')->andReturn($user);
    $user->shouldReceive('refresh')->andReturn($user);
    $user->shouldReceive('getAttribute')->with('profile')->andReturn(null);

    $this->profileRepository->shouldReceive('createForUser')
        ->once()
        ->with($user, Mockery::on(fn ($p) => $p['tipe'] === 'mitra' && $p['alamat'] === 'Jl. Baru'))
        ->andReturn(new Profile);

    $result = $this->service->updateUser(
        $user,
        ['name' => 'Baru', 'username' => 'baru', 'email' => 'baru@example.com'],
        ['alamat' => 'Jl. Baru']
    );

    expect($result)->toBe($user);
});

it('update user dan profile yang sudah ada', function () {
    $existingProfile = new Profile;
    $existingProfile->forceFill(['id' => 99, 'tipe' => 'mitra']);

    $user = Mockery::mock(User::class)->makePartial();
    $user->forceFill(['id' => 5, 'name' => 'Lama', 'role' => 'mitra']);
    $user->setRelation('profile', $existingProfile);

    $this->userRepository->shouldReceive('emailExists')->andReturn(false);
    $this->userRepository->shouldReceive('usernameExists')->andReturn(false);
    $this->userRepository->shouldReceive('updateUser')->once()->andReturn($user);

    $user->shouldReceive('load')->with('profile')->andReturn($user);
    $user->shouldReceive('refresh')->andReturn($user);

    $this->profileRepository->shouldReceive('updateProfile')
        ->once()
        ->with($existingProfile, Mockery::on(fn ($p) => $p['alamat'] === 'Jl. Update'))
        ->andReturn($existingProfile);

    $this->profileRepository->shouldReceive('createForUser')->never();

    $result = $this->service->updateUser($user, ['name' => 'Baru'], ['alamat' => 'Jl. Update']);

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

    $this->profileRepository->shouldReceive('updateProfile')->never();
    $this->profileRepository->shouldReceive('createForUser')->never();

    $this->service->updateUser($user, ['name' => 'Baru'], []);
});

it('update user melempar ValidationException jika email duplikat', function () {
    $user = Mockery::mock(User::class)->makePartial();
    $user->forceFill(['id' => 5]);

    $this->userRepository->shouldReceive('emailExists')->once()->with('dup@example.com', 5)->andReturn(true);
    $this->userRepository->shouldReceive('updateUser')->never();

    expect(fn () => $this->service->updateUser($user, ['email' => 'dup@example.com']))->toThrow(ValidationException::class);
});

/*
|==========================================================================
| deleteUser()
|==========================================================================
*/

it('menghapus user melalui repository', function () {
    // ✅ FIX: Gunakan Mockery::mock langsung
    $user = Mockery::mock(User::class)->makePartial();
    $user->forceFill([
        'id' => 7,
        'email' => 'hapus@example.com',
        'role' => 'client',
    ]);

    // ✅ FIX: Mock class HasMany, bukan objek kosong
    $payoutsMock = Mockery::mock(HasMany::class);
    $payoutsMock->shouldReceive('delete')->once()->andReturn(true);
    $user->shouldReceive('payouts')->andReturn($payoutsMock);

    $tripMitrasMock = Mockery::mock(HasMany::class);
    $tripMitrasMock->shouldReceive('delete')->once()->andReturn(true);
    $user->shouldReceive('tripMitras')->andReturn($tripMitrasMock);

    $mitraWalletMock = Mockery::mock(HasOne::class);
    $mitraWalletMock->shouldReceive('exists')->once()->andReturn(false);
    $user->shouldReceive('mitraWallet')->andReturn($mitraWalletMock);

    $dailyReportsMock = Mockery::mock(HasMany::class);
    $dailyReportsMock->shouldReceive('each')->once()->andReturnUsing(function ($callback) {
        // Tidak ada report, jadi callback tidak dipanggil
    });
    $user->shouldReceive('dailyReports')->andReturn($dailyReportsMock);

    $this->userRepository->shouldReceive('deleteUser')->once()->with($user)->andReturn(true);

    $this->service->deleteUser($user);

    expect(true)->toBeTrue();
});

/*
|==========================================================================
| resetPassword()
|==========================================================================
*/

it('reset password user dan set must_change_password = true', function () {
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

    $result = $this->service->resetPassword($user);

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
        ->once()->with(['admin', 'mitra'], 25, 'budi')->andReturn($paginator);

    expect($this->service->paginateByRoles(['admin', 'mitra'], 25, 'budi'))->toBe($paginator);
});

it('paginateByRoles menggunakan default perPage = 15 dan search = null', function () {
    $paginator = Mockery::mock(LengthAwarePaginator::class);

    $this->userRepository->shouldReceive('paginateByRoles')
        ->once()->with(['admin'], 15, null)->andReturn($paginator);

    $this->service->paginateByRoles(['admin']);
});

it('paginateByRoles dengan perPage minimum (1) tetap diteruskan', function () {
    $paginator = Mockery::mock(LengthAwarePaginator::class);

    $this->userRepository->shouldReceive('paginateByRoles')
        ->once()->with(['admin'], 1, null)->andReturn($paginator);

    expect($this->service->paginateByRoles(['admin'], 1))->toBe($paginator);
});

it('paginateClients meneruskan parameter ke repository', function () {
    $paginator = Mockery::mock(LengthAwarePaginator::class);

    $this->userRepository->shouldReceive('paginateClients')
        ->once()->with(10, 'search-keyword')->andReturn($paginator);

    expect($this->service->paginateClients(10, 'search-keyword'))->toBe($paginator);
});

/*
|==========================================================================
| BVA — generatePassword()
|==========================================================================
*/

it('generatePassword dengan panjang default = 12 karakter', function () {
    $reflection = new ReflectionMethod($this->service, 'generatePassword');
    $reflection->setAccessible(true);
    expect(strlen($reflection->invoke($this->service)))->toBe(12);
});

it('generatePassword dengan length = 0 mengembalikan string kosong', function () {
    $reflection = new ReflectionMethod($this->service, 'generatePassword');
    $reflection->setAccessible(true);
    expect($reflection->invoke($this->service, 0))->toBe('');
});

it('generatePassword dengan length = 1 mengembalikan 1 karakter', function () {
    $reflection = new ReflectionMethod($this->service, 'generatePassword');
    $reflection->setAccessible(true);
    expect(strlen($reflection->invoke($this->service, 1)))->toBe(1);
});

it('generatePassword dengan length = 100 mengembalikan 100 karakter', function () {
    $reflection = new ReflectionMethod($this->service, 'generatePassword');
    $reflection->setAccessible(true);
    expect(strlen($reflection->invoke($this->service, 100)))->toBe(100);
});

it('generatePassword menghasilkan string yang unik antar pemanggilan', function () {
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
*/

it('createAdmin melempar ValidationException jika email DAN username duplikat sekaligus', function () {
    $data = ['name' => 'X', 'email' => 'dup@example.com', 'username' => 'taken'];

    $this->userRepository->shouldReceive('emailExists')->once()->andReturn(true);
    $this->userRepository->shouldReceive('usernameExists')->never();
    $this->userRepository->shouldReceive('createUser')->never();

    expect(fn () => $this->service->createAdmin($data))->toThrow(ValidationException::class);
});

it('createAdmin tidak memanggil usernameExists jika username kosong string', function () {
    $data = ['name' => 'X', 'email' => 'a@b.com', 'username' => ''];

    $this->userRepository->shouldReceive('emailExists')->andReturn(false);
    $this->userRepository->shouldReceive('usernameExists')->never();
    $this->userRepository->shouldReceive('createUser')->once()->andReturn(makeUser(['id' => 1]));
    $this->profileRepository->shouldReceive('createForUser')->once();

    $this->service->createAdmin($data);
});

/*
|==========================================================================
| Edge Cases — Kombinasi field
|==========================================================================
*/

it('createAdmin dengan semua field profile opsional diisi', function () {
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
    $this->userRepository->shouldReceive('createUser')->once()->andReturn($createdUser);

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
    $data = ['name' => 'Mitra Auto', 'email' => 'mitra-auto@example.com'];

    $this->userRepository->shouldReceive('emailExists')->andReturn(false);
    $this->userRepository->shouldReceive('usernameExists')->never();

    $createdUser = makeUser(['id' => 50, 'role' => 'mitra']);

    $capturedPassword = null;
    $this->userRepository->shouldReceive('createUser')
        ->once()
        ->with(Mockery::on(function ($payload) use (&$capturedPassword) {
            $capturedPassword = $payload['password'];

            return ! empty($payload['password']) && strlen($payload['password']) >= 12;
        }))
        ->andReturn($createdUser);

    $this->profileRepository->shouldReceive('createForUser')->once();

    $result = $this->service->createMitra($data);

    expect($result['plain_password'])->toBe($capturedPassword);
});
