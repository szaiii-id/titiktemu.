<?php

namespace App\Http\Controllers;

use App\Models\AppNotification;
use App\Services\Notification\NotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class NotificationController extends Controller
{
    public function __construct(protected NotificationService $notificationService) {}

    public function index(Request $request): InertiaResponse
    {
        $notifs = $this->notificationService->paginateForUser($request->user(), 20);

        return Inertia::render('Notifications/Index', [
            'notifications' => $notifs,
            'unreadCount' => $this->notificationService->unreadCount($request->user()),
        ]);
    }

    public function markAsRead(Request $request, AppNotification $notification): RedirectResponse
    {
        abort_unless($notification->user_id === $request->user()->id, 403);
        $this->notificationService->markAsRead($notification);

        return redirect()->back();
    }

    public function markAllAsRead(Request $request): RedirectResponse
    {
        $this->notificationService->markAllAsRead($request->user());

        return redirect()->back()->with('status', 'Semua notifikasi sudah dibaca.');
    }
}
