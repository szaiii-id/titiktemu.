<?php

namespace App\Http\Controllers\Mitra;

use App\Http\Controllers\Controller;
use App\Http\Requests\Mitra\UpdateProfileRequest;
use App\Services\User\ProfileService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class ProfileController extends Controller
{
    public function __construct(
        protected ProfileService $profileService,
    ) {}

    /**
     * Tampilkan halaman edit profile mitra.
     */
    public function edit(): InertiaResponse
    {
        $user = auth()->user()->load('profile');

        return Inertia::render('Mitra/Profile', [
            'profile' => $user->profile,
        ]);
    }

    /**
     * Proses update profile mitra (termasuk upload logo).
     */
    public function update(UpdateProfileRequest $request): RedirectResponse
    {
        $this->profileService->updateProfile(
            user: $request->user(),
            data: $request->validated(),
        );

        return redirect()
            ->route('mitra.profile.edit')
            ->with('status', 'Profile berhasil diperbarui.');
    }
}
