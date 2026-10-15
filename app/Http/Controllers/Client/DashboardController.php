<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class DashboardController extends Controller
{
    /**
     * Tampilkan dashboard client.
     */
    public function index(): InertiaResponse
    {
        return Inertia::render('Client/Dashboard');
    }
}
