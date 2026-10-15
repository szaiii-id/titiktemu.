<?php

namespace App\Http\Controllers\Mitra;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class DashboardController extends Controller
{
    /**
     * Tampilkan dashboard mitra.
     */
    public function index(): InertiaResponse
    {
        return Inertia::render('Mitra/Dashboard');
    }
}
