<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Http\Requests\Client\UpdateProfileRequest;
use App\Services\User\ClientProfileService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class ProfileController extends Controller
{
    public function __construct(
        protected ClientProfileService $clientProfileService,
    ) {}

    /**
     * Tampilkan halaman profile client.
     */
    public function edit(): InertiaResponse
    {
        return Inertia::render('Client/Profile', [
            'user' => $this->clientProfileService->getProfileData(auth()->user()),
        ]);
    }

    /**
     * Proses update profile client.
     */
    public function update(UpdateProfileRequest $request): RedirectResponse
    {
        $this->clientProfileService->updateProfile(
            user: $request->user(),
            data: $request->validated(),
        );

        return redirect()
            ->route('client.profile')
            ->with('status', 'Profile berhasil diperbarui.');
    }
}
