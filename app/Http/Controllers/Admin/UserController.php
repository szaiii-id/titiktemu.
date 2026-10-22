<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CreateUserRequest;
use App\Http\Requests\Admin\ListUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Models\User;
use App\Services\User\UserService;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class UserController extends Controller
{
    public function __construct(
        protected UserService $userService,
    ) {}

    /**
     * Daftar user (admin + mitra) dengan search & pagination.
     */
    public function index(ListUserRequest $request): InertiaResponse
    {
        $users = $this->userService->paginateByRoles(
            roles: ['admin', 'mitra'],
            perPage: (int) $request->validated('per_page', 15),
            search: $request->validated('search'),
        );

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
            'filters' => [
                'search' => $request->validated('search'),
                'per_page' => (int) $request->validated('per_page', 15),
            ],
        ]);
    }

    /**
     * Form pilih role (step 1).
     */
    public function create(): InertiaResponse
    {
        return Inertia::render('Admin/Users/Create');
    }

    /**
     * Proses buat user baru (admin / mitra).
     */
    public function store(CreateUserRequest $request): RedirectResponse
    {
        // FIX PHPStan: cast ke string + handle default arm
        $role = (string) $request->validated('role');

        $result = match ($role) {
            'admin' => $this->userService->createAdmin($request->validated()),
            'mitra' => $this->userService->createMitra($request->validated()),
            default => throw ValidationException::withMessages([
                'role' => ['Role tidak valid. Hanya admin atau mitra yang diizinkan.'],
            ]),
        };

        // Simpan kredensial di session flash (hanya bisa dilihat 1x)
        return redirect()
            ->route('admin.users.index')
            ->with('credentials', [
                'role' => $result['user']->role,
                'name' => $result['user']->name,
                'email' => $result['user']->email,
                'username' => $result['user']->username,
                'password' => $result['plain_password'],
            ])
            ->with('status', 'User berhasil dibuat.');
    }

    /**
     * Form edit user.
     */
    public function edit(User $user): InertiaResponse
    {
        // Cegah edit client dari sini (client read-only)
        abort_if($user->role === 'client', 404);

        $user->load('profile');

        return Inertia::render('Admin/Users/Edit', [
            'user' => $user,
        ]);
    }

    /**
     * Proses update user.
     */
    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        abort_if($user->role === 'client', 404);

        $this->userService->updateUser(
            user: $user,
            data: $request->validated(),
            profileData: $request->validated('profile', []),
        );

        return redirect()
            ->route('admin.users.index')
            ->with('status', 'User berhasil diperbarui.');
    }

    /**
     * Hapus user.
     */
    public function destroy(User $user): RedirectResponse
    {
        abort_if($user->role === 'client', 404);
        abort_if($user->id === auth()->id(), 403, 'Anda tidak dapat menghapus akun sendiri.');

        try {
            $this->userService->deleteUser($user);

            return redirect()
                ->route('admin.users.index')
                ->with('status', 'User berhasil dihapus.');

        } catch (QueryException $e) {
            Log::error('Gagal hapus user: QueryException', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $e->getMessage(),
                'sql' => $e->getSql(),
                'admin_id' => auth()->id(),
            ]);

            return back()->with(
                'error',
                'User tidak bisa dihapus karena masih terhubung ke data lain. '
                .'Periksa relasi trip, laporan, atau wallet terlebih dahulu.'
            );
        }
    }

    /**
     * Reset password user, tampilkan kredensial baru.
     */
    public function resetPassword(User $user): RedirectResponse
    {
        abort_if($user->role === 'client', 404);

        $result = $this->userService->resetPassword($user);

        return redirect()
            ->route('admin.users.index')
            ->with('credentials', [
                'role' => $result['user']->role,
                'name' => $result['user']->name,
                'email' => $result['user']->email,
                'username' => $result['user']->username,
                'password' => $result['plain_password'],
            ])
            ->with('status', 'Password berhasil direset.');
    }
}
