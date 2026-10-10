<?php

namespace App\Http\Controllers\LandingPage;

use App\Http\Controllers\Controller;
use App\Http\Requests\LandingPage\ContactRequest;
use App\Services\LandingPage\ContactService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Log;

class ContactController extends Controller
{
    public function __construct(
        protected ContactService $contactService
    ) {}

    /**
     * Proses pengiriman pesan kontak.
     */
    public function store(ContactRequest $request): RedirectResponse
    {
        try {
            $this->contactService->send($request->validated());

            return back()->with('status', 'Pesan Anda berhasil terkirim. Tim kami akan segera merespons.');
        } catch (\Throwable $e) {
            Log::error('Contact form failed', [
                'error' => $e->getMessage(),
                'email' => $request->input('email'),
            ]);

            return back()->withErrors([
                'pesan' => 'Maaf, pesan gagal terkirim. Silakan coba lagi atau hubungi kami via email.',
            ])->withInput();
        }
    }
}