<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ListClientRequest;
use App\Services\User\UserService;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class ClientController extends Controller
{
    public function __construct(
        protected UserService $userService,
    ) {}

    /**
     * Daftar client (read-only) dengan search & pagination.
     */
    public function index(ListClientRequest $request): InertiaResponse
    {
        $clients = $this->userService->paginateClients(
            perPage: (int) $request->validated('per_page', 15),
            search: $request->validated('search'),
        );

        return Inertia::render('Admin/Clients/Index', [
            'clients' => $clients,
            'filters' => [
                'search' => $request->validated('search'),
                'per_page' => (int) $request->validated('per_page', 15),
            ],
        ]);
    }
}
