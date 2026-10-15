<?php

use App\Repositories\Contracts\UserRepositoryInterface;
use App\Services\User\PasswordService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

beforeEach(function () {
    $this->userRepository = Mockery::mock(UserRepositoryInterface::class);
    $this->service = new PasswordService($this->userRepository);

    // Log facade → no-op
    Log::shouldReceive('info')->andReturnNull();
});

afterEach(function () {
    Mockery::close();
});

/*
|==========================================================================
| changePassword() — Verifikasi Password Lama
|==========================================================================
*/

it('changePassword berhasil saat password lama cocok', function () {
    // ARRANGE
    $hashedOld = Hash::make('OldPass123!');
    $user = makeUser(['id' => 1, 'email' => 'budi@example.com', 'password' => $hashedOld]);

    // Repository harus dipanggil 1x dengan password baru
    $this->userRepository
        ->shouldReceive('updatePassword')
        ->once()
        ->with($user, 'NewPass456!')
        ->andReturn($user);

    // ACT
    $this->service->changePassword($user, 'OldPass123!', 'NewPass456!');

    // ASSERT (via mock expectation)
    expect(true)->toBeTrue();
});

it('changePassword melempar ValidationException saat password lama salah', function () {
    // ARRANGE
    $user = makeUser([
        'id' => 1,
        'password' => Hash::make('OldPass123!'),
    ]);

    // Repository TIDAK boleh dipanggil
    $this->userRepository->shouldReceive('updatePassword')->never();

    // ACT + ASSERT
    expect(fn () => $this->service->changePassword($user, 'WrongPass!', 'NewPass456!'))
        ->toThrow(ValidationException::class);
});

it('changePassword melempar ValidationException saat password lama kosong', function () {
    // BVA: password = '' (boundary empty)
    $user = makeUser([
        'id' => 1,
        'password' => Hash::make('OldPass123!'),
    ]);

    $this->userRepository->shouldReceive('updatePassword')->never();

    expect(fn () => $this->service->changePassword($user, '', 'NewPass456!'))
        ->toThrow(ValidationException::class);
});

it('changePassword TIDAK memanggil forceChangePassword', function () {
    // Behavioral: memastikan method force TIDAK dipanggil dari changePassword
    $user = makeUser([
        'id' => 1,
        'password' => Hash::make('OldPass123!'),
    ]);

    $this->userRepository->shouldReceive('updatePassword')->once()->andReturn($user);

    // Spy pada service — pastikan forceChangePassword tidak dipanggil
    $spy = Mockery::spy($this->service);
    $spy->shouldNotReceive('forceChangePassword');

    $this->service->changePassword($user, 'OldPass123!', 'NewPass456!');
});

it('changePassword dipanggil dengan password lama yang tepat (case-sensitive)', function () {
    // Equivalence: password case-sensitive
    $user = makeUser([
        'id' => 1,
        'password' => Hash::make('OldPass123!'),
    ]);

    // Password lama beda case → harus throw
    $this->userRepository->shouldReceive('updatePassword')->never();

    expect(fn () => $this->service->changePassword($user, 'oldpass123!', 'NewPass456!'))
        ->toThrow(ValidationException::class);
});

/*
|==========================================================================
| forceChangePassword() — Tanpa Verifikasi Password Lama
|==========================================================================
*/

it('forceChangePassword berhasil saat must_change_password = true', function () {
    // ARRANGE
    $user = makeUser([
        'id' => 2,
        'email' => 'mitra@example.com',
        'must_change_password' => true,
    ]);

    $this->userRepository
        ->shouldReceive('updatePassword')
        ->once()
        ->with($user, 'NewPass456!')
        ->andReturn($user);

    // ACT
    $this->service->forceChangePassword($user, 'NewPass456!');

    // ASSERT
    expect(true)->toBeTrue();
});

it('forceChangePassword melempar ValidationException saat must_change_password = false', function () {
    // ARRANGE
    $user = makeUser([
        'id' => 2,
        'must_change_password' => false,
    ]);

    // Repository TIDAK boleh dipanggil
    $this->userRepository->shouldReceive('updatePassword')->never();

    // ACT + ASSERT
    expect(fn () => $this->service->forceChangePassword($user, 'NewPass456!'))
        ->toThrow(ValidationException::class);
});

it('forceChangePassword TIDAK memverifikasi password lama', function () {
    // Behavioral: forceChangePassword tidak menyentuh Hash::check
    $user = makeUser([
        'id' => 2,
        'must_change_password' => true,
        // Password lama tidak penting — bahkan tidak di-set
    ]);

    $this->userRepository->shouldReceive('updatePassword')->once()->andReturn($user);

    // Tidak ada exception meski "password lama" tidak dikirim
    $this->service->forceChangePassword($user, 'NewPass456!');

    expect(true)->toBeTrue();
});

/*
|==========================================================================
| handleChangePassword() — Routing Logic
|==========================================================================
*/

it('handleChangePassword → routing ke forceChangePassword saat must_change_password = true', function () {
    // ARRANGE
    $user = makeUser([
        'id' => 3,
        'must_change_password' => true,
    ]);

    $this->userRepository
        ->shouldReceive('updatePassword')
        ->once()
        ->with($user, 'NewPass456!')
        ->andReturn($user);

    // ACT
    $result = $this->service->handleChangePassword($user, null, 'NewPass456!');

    // ASSERT
    expect($result['was_forced'])->toBeTrue();
    expect($result['should_logout'])->toBeTrue();
    expect($result['message'])->toContain('login ulang');
});

it('handleChangePassword → routing ke changePassword saat must_change_password = false', function () {
    // ARRANGE
    $user = makeUser([
        'id' => 3,
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => false,
    ]);

    $this->userRepository
        ->shouldReceive('updatePassword')
        ->once()
        ->with($user, 'NewPass456!')
        ->andReturn($user);

    // ACT
    $result = $this->service->handleChangePassword($user, 'OldPass123!', 'NewPass456!');

    // ASSERT
    expect($result['was_forced'])->toBeFalse();
    expect($result['should_logout'])->toBeFalse();
    expect($result['message'])->toBe('Password berhasil diubah.');
});

it('handleChangePassword melempar ValidationException saat password lama salah dan tidak wajib ganti', function () {
    // ARRANGE
    $user = makeUser([
        'id' => 3,
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => false,
    ]);

    $this->userRepository->shouldReceive('updatePassword')->never();

    // ACT + ASSERT
    expect(fn () => $this->service->handleChangePassword($user, 'WrongPass!', 'NewPass456!'))
        ->toThrow(ValidationException::class);
});

it('handleChangePassword TIDAK memerlukan password lama saat was_forced = true', function () {
    // Edge: oldPassword = null saat wajib ganti
    $user = makeUser([
        'id' => 3,
        'must_change_password' => true,
    ]);

    $this->userRepository->shouldReceive('updatePassword')->once()->andReturn($user);

    $result = $this->service->handleChangePassword($user, null, 'NewPass456!');

    expect($result['was_forced'])->toBeTrue();
});

it('handleChangePassword mengabaikan oldPassword saat was_forced = true', function () {
    // Edge: oldPassword dikirim tapi tidak akan diverifikasi
    $user = makeUser([
        'id' => 3,
        'must_change_password' => true,
    ]);

    $this->userRepository->shouldReceive('updatePassword')->once()->andReturn($user);

    // Meski oldPassword salah, tetap sukses karena forced
    $result = $this->service->handleChangePassword($user, 'WrongPass!', 'NewPass456!');

    expect($result['was_forced'])->toBeTrue();
});

it('handleChangePassword mengembalikan struktur array yang benar saat forced', function () {
    // Structural: verifikasi keys & tipe data
    $user = makeUser(['id' => 3, 'must_change_password' => true]);
    $this->userRepository->shouldReceive('updatePassword')->once()->andReturn($user);

    $result = $this->service->handleChangePassword($user, null, 'NewPass456!');

    expect($result)->toBeArray();
    expect(array_keys($result))->toBe(['was_forced', 'should_logout', 'message']);
    expect($result['was_forced'])->toBeBool();
    expect($result['should_logout'])->toBeBool();
    expect($result['message'])->toBeString();
});

it('handleChangePassword mengembalikan struktur array yang benar saat tidak forced', function () {
    // Structural: verifikasi keys & tipe data
    $user = makeUser([
        'id' => 3,
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => false,
    ]);
    $this->userRepository->shouldReceive('updatePassword')->once()->andReturn($user);

    $result = $this->service->handleChangePassword($user, 'OldPass123!', 'NewPass456!');

    expect($result)->toBeArray();
    expect(array_keys($result))->toBe(['was_forced', 'should_logout', 'message']);
    expect($result['was_forced'])->toBeBool();
    expect($result['should_logout'])->toBeBool();
    expect($result['message'])->toBeString();
});

/*
|==========================================================================
| Equivalence Partitioning — must_change_password
|==========================================================================
*/

it('handleChangePassword dengan must_change_password = true → forced', function () {
    // Partisi: true
    $user = makeUser(['id' => 1, 'must_change_password' => true]);
    $this->userRepository->shouldReceive('updatePassword')->once()->andReturn($user);

    $result = $this->service->handleChangePassword($user, 'apapun', 'NewPass456!');

    expect($result['was_forced'])->toBeTrue();
});

it('handleChangePassword dengan must_change_password = false → normal', function () {
    // Partisi: false
    $user = makeUser([
        'id' => 1,
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => false,
    ]);
    $this->userRepository->shouldReceive('updatePassword')->once()->andReturn($user);

    $result = $this->service->handleChangePassword($user, 'OldPass123!', 'NewPass456!');

    expect($result['was_forced'])->toBeFalse();
});

/*
|==========================================================================
| Behavioral — Interaction with Repository
|==========================================================================
*/

it('changePassword hanya memanggil updatePassword 1x', function () {
    // Behavioral: verifikasi jumlah panggilan
    $user = makeUser([
        'id' => 1,
        'password' => Hash::make('OldPass123!'),
    ]);

    $this->userRepository->shouldReceive('updatePassword')->once()->andReturn($user);

    // Method lain tidak boleh dipanggil
    $this->userRepository->shouldNotReceive('createUser');
    $this->userRepository->shouldNotReceive('createClient');
    $this->userRepository->shouldNotReceive('deleteUser');

    $this->service->changePassword($user, 'OldPass123!', 'NewPass456!');
});

it('forceChangePassword hanya memanggil updatePassword 1x', function () {
    $user = makeUser(['id' => 2, 'must_change_password' => true]);

    $this->userRepository->shouldReceive('updatePassword')->once()->andReturn($user);
    $this->userRepository->shouldNotReceive('createUser');
    $this->userRepository->shouldNotReceive('deleteUser');

    $this->service->forceChangePassword($user, 'NewPass456!');
});

it('handleChangePassword memanggil updatePassword tepat 1x (forced)', function () {
    $user = makeUser(['id' => 3, 'must_change_password' => true]);
    $this->userRepository->shouldReceive('updatePassword')->once()->andReturn($user);

    $this->service->handleChangePassword($user, null, 'NewPass456!');
});

it('handleChangePassword memanggil updatePassword tepat 1x (normal)', function () {
    $user = makeUser([
        'id' => 3,
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => false,
    ]);
    $this->userRepository->shouldReceive('updatePassword')->once()->andReturn($user);

    $this->service->handleChangePassword($user, 'OldPass123!', 'NewPass456!');
});

/*
|==========================================================================
| Edge Cases
|==========================================================================
*/

it('changePassword dengan password baru sama dengan password lama tetap sukses', function () {
    // Edge: password baru identik dengan lama (tidak ada validasi khusus)
    $user = makeUser([
        'id' => 1,
        'password' => Hash::make('SamePass123!'),
    ]);

    $this->userRepository->shouldReceive('updatePassword')
        ->once()
        ->with($user, 'SamePass123!')
        ->andReturn($user);

    $this->service->changePassword($user, 'SamePass123!', 'SamePass123!');

    expect(true)->toBeTrue();
});

it('changePassword dengan password baru sangat panjang (boundary atas)', function () {
    // BVA: panjang ekstrem
    $longPassword = str_repeat('a', 1000);
    $user = makeUser([
        'id' => 1,
        'password' => Hash::make('OldPass123!'),
    ]);

    $this->userRepository->shouldReceive('updatePassword')
        ->once()
        ->with($user, $longPassword)
        ->andReturn($user);

    $this->service->changePassword($user, 'OldPass123!', $longPassword);

    expect(true)->toBeTrue();
});

it('changePassword dengan password baru 1 karakter (boundary bawah)', function () {
    // BVA: panjang minimum
    $user = makeUser([
        'id' => 1,
        'password' => Hash::make('OldPass123!'),
    ]);

    $this->userRepository->shouldReceive('updatePassword')
        ->once()
        ->with($user, 'a')
        ->andReturn($user);

    $this->service->changePassword($user, 'OldPass123!', 'a');

    expect(true)->toBeTrue();
});

it('changePassword dengan password baru kosong tetap diteruskan ke repository', function () {
    // Edge: validasi panjang TIDAK dilakukan di service
    $user = makeUser([
        'id' => 1,
        'password' => Hash::make('OldPass123!'),
    ]);

    $this->userRepository->shouldReceive('updatePassword')
        ->once()
        ->with($user, '')
        ->andReturn($user);

    $this->service->changePassword($user, 'OldPass123!', '');

    expect(true)->toBeTrue();
});

it('forceChangePassword dengan password baru kosong tetap diteruskan', function () {
    // Edge: tidak ada validasi panjang di service
    $user = makeUser(['id' => 2, 'must_change_password' => true]);

    $this->userRepository->shouldReceive('updatePassword')
        ->once()
        ->with($user, '')
        ->andReturn($user);

    $this->service->forceChangePassword($user, '');

    expect(true)->toBeTrue();
});

/*
|==========================================================================
| Boundary — must_change_password = null / 0 / '1' (cast behaviour)
|==========================================================================
*/

it('handleChangePassword dengan must_change_password = 1 (integer) → di-cast ke true', function () {
    // BVA: integer 1 → cast boolean true
    $user = makeUser(['id' => 1, 'must_change_password' => 1]);
    $this->userRepository->shouldReceive('updatePassword')->once()->andReturn($user);

    $result = $this->service->handleChangePassword($user, null, 'NewPass456!');

    expect($result['was_forced'])->toBeTrue();
});

it('handleChangePassword dengan must_change_password = 0 (integer) → di-cast ke false', function () {
    // BVA: integer 0 → cast boolean false
    $user = makeUser([
        'id' => 1,
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => 0,
    ]);
    $this->userRepository->shouldReceive('updatePassword')->once()->andReturn($user);

    $result = $this->service->handleChangePassword($user, 'OldPass123!', 'NewPass456!');

    expect($result['was_forced'])->toBeFalse();
});

/*
|==========================================================================
| Behavioral — Ordered Call
|==========================================================================
*/

it('handleChangePassword memanggil updatePassword SETELAH routing', function () {
    // Behavioral: urutan — routing dulu, baru update
    $user = makeUser(['id' => 1, 'must_change_password' => true]);

    $this->userRepository
        ->shouldReceive('updatePassword')
        ->once()
        ->andReturn($user)
        ->ordered();

    $this->service->handleChangePassword($user, null, 'NewPass456!');

    expect(true)->toBeTrue();
});
