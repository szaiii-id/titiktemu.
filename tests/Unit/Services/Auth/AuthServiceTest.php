<?php

use App\Models\User;
use App\Repositories\Contracts\UserRepositoryInterface;
use App\Services\Auth\AuthService;
use Illuminate\Contracts\Session\Session;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Contracts\User as SocialiteUser;

beforeEach(function () {
    $this->userRepository = Mockery::mock(UserRepositoryInterface::class);
    $this->authService = new AuthService($this->userRepository);
});

afterEach(function () {
    Mockery::close();
});

/*
|--------------------------------------------------------------------------
| registerClient()
|--------------------------------------------------------------------------
*/

it('mendaftarkan client dan langsung login', function () {
    $data = [
        'name' => 'Budi Santoso',
        'email' => 'budi@example.com',
        'username' => 'budisantoso',
        'password' => 'password123',
    ];

    $user = new User(['name' => 'Budi Santoso', 'email' => 'budi@example.com']);

    $this->userRepository
        ->shouldReceive('createClient')
        ->once()
        ->with($data)
        ->andReturn($user);

    Auth::shouldReceive('login')
        ->once()
        ->with($user);

    $result = $this->authService->registerClient($data);

    expect($result)->toBe($user);
});

/*
|--------------------------------------------------------------------------
| login() — Happy Path & Negative Path
|--------------------------------------------------------------------------
*/

it('berhasil login dengan kredensial yang benar', function () {
    $hashedPassword = Hash::make('password123');
    $user = new User([
        'email' => 'budi@example.com',
        'password' => $hashedPassword,
    ]);

    $this->userRepository
        ->shouldReceive('findByEmailOrUsername')
        ->once()
        ->with('budi@example.com')
        ->andReturn($user);

    Auth::shouldReceive('login')
        ->once()
        ->with($user, false);

    $result = $this->authService->login('budi@example.com', 'password123');

    expect($result)->toBe($user);
});

it('melempar ValidationException jika password salah', function () {
    $user = new User([
        'email' => 'budi@example.com',
        'password' => Hash::make('password123'),
    ]);

    $this->userRepository
        ->shouldReceive('findByEmailOrUsername')
        ->once()
        ->andReturn($user);

    Auth::shouldReceive('login')->never();

    expect(fn () => $this->authService->login('budi@example.com', 'password-salah'))
        ->toThrow(ValidationException::class);
});

it('melempar ValidationException jika user tidak ditemukan', function () {
    $this->userRepository
        ->shouldReceive('findByEmailOrUsername')
        ->once()
        ->andReturn(null);

    Auth::shouldReceive('login')->never();

    expect(fn () => $this->authService->login('tidak-ada@example.com', 'apapun'))
        ->toThrow(ValidationException::class);
});

it('login dengan remember = true memanggil Auth::login dengan parameter remember', function () {
    $user = new User([
        'email' => 'budi@example.com',
        'password' => Hash::make('password123'),
    ]);

    $this->userRepository
        ->shouldReceive('findByEmailOrUsername')
        ->once()
        ->andReturn($user);

    Auth::shouldReceive('login')
        ->once()
        ->with($user, true);

    $this->authService->login('budi@example.com', 'password123', true);
});

/*
|--------------------------------------------------------------------------
| handleGoogleLogin() — Edge Cases
|--------------------------------------------------------------------------
*/

it('login google dengan user yang sudah terdaftar via Google ID', function () {
    $googleUser = Mockery::mock(SocialiteUser::class);
    $googleUser->shouldReceive('getId')->andReturn('google-123');
    $googleUser->shouldReceive('getEmail')->andReturn('budi@example.com');
    $googleUser->shouldReceive('getName')->andReturn('Budi');

    $user = new User(['email' => 'budi@example.com', 'google_id' => 'google-123']);

    $this->userRepository
        ->shouldReceive('findByGoogleId')
        ->once()
        ->with('google-123')
        ->andReturn($user);

    $this->userRepository->shouldReceive('findByEmail')->never();
    $this->userRepository->shouldReceive('createClient')->never();

    Auth::shouldReceive('login')->once()->with($user);

    $result = $this->authService->handleGoogleLogin($googleUser);

    expect($result)->toBe($user);
});

it('menautkan google_id ke user lama yang terdaftar via email', function () {
    $googleUser = Mockery::mock(SocialiteUser::class);
    $googleUser->shouldReceive('getId')->andReturn('google-456');
    $googleUser->shouldReceive('getEmail')->andReturn('budi@example.com');
    $googleUser->shouldReceive('getName')->andReturn('Budi');

    $user = Mockery::mock(User::class);
    $user->shouldReceive('update')
        ->once()
        ->with(['google_id' => 'google-456']);

    $this->userRepository
        ->shouldReceive('findByGoogleId')
        ->once()
        ->andReturn(null);

    $this->userRepository
        ->shouldReceive('findByEmail')
        ->once()
        ->with('budi@example.com')
        ->andReturn($user);

    $this->userRepository->shouldReceive('createClient')->never();

    Auth::shouldReceive('login')->once()->with($user);

    $this->authService->handleGoogleLogin($googleUser);
});

it('membuat client baru jika google user benar-benar baru', function () {
    $googleUser = Mockery::mock(SocialiteUser::class);
    $googleUser->shouldReceive('getId')->andReturn('google-789');
    $googleUser->shouldReceive('getEmail')->andReturn('baru@example.com');
    $googleUser->shouldReceive('getName')->andReturn('User Baru');

    $this->userRepository
        ->shouldReceive('findByGoogleId')
        ->once()
        ->andReturn(null);

    $this->userRepository
        ->shouldReceive('findByEmail')
        ->once()
        ->andReturn(null);

    $newUser = new User(['email' => 'baru@example.com']);

    $this->userRepository
        ->shouldReceive('createClient')
        ->once()
        ->with(Mockery::on(function ($data) {
            return $data['email'] === 'baru@example.com'
                && $data['google_id'] === 'google-789'
                && $data['password'] === null
                && preg_match('/^baru\d{3}$/', $data['username']);
        }))
        ->andReturn($newUser);

    Auth::shouldReceive('login')->once()->with($newUser);

    $result = $this->authService->handleGoogleLogin($googleUser);

    expect($result)->toBe($newUser);
});

/*
|--------------------------------------------------------------------------
| logout()
|--------------------------------------------------------------------------
*/

it('logout memanggil Auth::logout dan invalidate session', function () {
    // ✅ HAPUS mock Auth::user() — AuthService::logout() tidak memanggilnya
    Auth::shouldReceive('logout')->once();

    $session = Mockery::mock(Session::class);
    $session->shouldReceive('invalidate')->once();
    $session->shouldReceive('regenerateToken')->once();

    $request = Request::create('/');
    $request->setLaravelSession($session);

    $this->app->instance('request', $request);

    $this->authService->logout();
});
