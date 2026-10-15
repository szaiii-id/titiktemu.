<?php

namespace App\Http\Controllers\Mitra;

use App\Http\Controllers\Controller;
use App\Http\Requests\Mitra\UpdatePasswordRequest;
use App\Services\User\PasswordService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class PasswordController extends Controller
{
    public function __construct(
        protected PasswordService $passwordService,
    ) {}

    /**
     * Tampilkan halaman ganti password mitra.
     */
    public function edit(): InertiaResponse
    {
        return Inertia::render('Mitra/Password');
    }

    /**
     * Proses ganti password mitra (verifikasi password lama).
     */
    public function update(UpdatePasswordRequest $request): RedirectResponse
    {
        $this->passwordService->changePassword(
            user: $request->user(),
            oldPassword: $request->validated('old_password'),
            newPassword: $request->validated('password'),
        );

        return redirect()
            ->route('mitra.password.edit')
            ->with('status', 'Password berhasil diubah.');
    }
}
