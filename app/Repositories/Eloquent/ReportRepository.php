<?php

namespace App\Repositories\Eloquent;

use App\Models\Booking;
use App\Models\DailyReport;
use App\Models\MitraWallet;
use App\Models\Payout;
use App\Models\TripMitra;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ReportRepository
{
    /**
     * Ambil data pendapatan (Revenue).
     */
    public function getRevenueData(string $startDate, string $endDate): array
    {
        $totalRevenue = Booking::whereIn('status', ['confirmed', 'completed'])
            ->whereBetween('created_at', [$startDate.' 00:00:00', $endDate.' 23:59:59'])
            ->sum('total_harga');

        $totalHonor = TripMitra::whereHas('trip', function ($q) use ($startDate, $endDate) {
            $q->where('status', 'completed')
                ->whereBetween('tanggal_mulai', [$startDate, $endDate]);
        })->sum('honor');

        $transactions = Booking::with(['client:id,name', 'package:id,nama'])
            ->whereIn('status', ['confirmed', 'completed'])
            ->whereBetween('created_at', [$startDate.' 00:00:00', $endDate.' 23:59:59'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($b) => [
                'kode' => $b->kode,
                'tanggal' => $b->created_at->format('Y-m-d'),
                'client' => $b->client->name ?? '-',
                'paket' => $b->package->nama ?? '-',
                'total' => $b->total_harga,
                'status' => is_object($b->status) ? $b->status->value : $b->status,
            ]);

        return [
            'total_revenue' => $totalRevenue,
            'total_honor' => $totalHonor,
            'gross_profit' => $totalRevenue - $totalHonor,
            'transactions' => $transactions,
        ];
    }

    /**
     * Ambil data kinerja mitra.
     */
    public function getMitraPerformanceData(string $startDate, string $endDate): array
    {
        $mitras = User::where('role', 'mitra')
            ->withCount(['tripMitras as total_trip' => function ($q) use ($startDate, $endDate) {
                $q->whereHas('trip', function ($tq) use ($startDate, $endDate) {
                    $tq->where('status', 'completed')
                        ->whereBetween('tanggal_mulai', [$startDate, $endDate]);
                });
            }])
            ->withSum(['tripMitras as total_honor' => function ($q) use ($startDate, $endDate) {
                $q->whereHas('trip', function ($tq) use ($startDate, $endDate) {
                    $tq->where('status', 'completed')
                        ->whereBetween('tanggal_mulai', [$startDate, $endDate]);
                });
            }], 'honor')
            ->orderByDesc('total_honor')
            ->get()
            ->map(fn ($m) => [
                'id' => $m->id,
                'name' => $m->name,
                'email' => $m->email,
                'total_trip' => $m->total_trip ?? 0,
                'total_honor' => (float) ($m->total_honor ?? 0),
            ]);

        return [
            'total_mitra' => $mitras->count(),
            'total_trip_completed' => $mitras->sum('total_trip'),
            'mitras' => $mitras,
        ];
    }

    /**
     * Ambil data laporan harian.
     */
    public function getDailyReportData(string $startDate, string $endDate): array
    {
        $reports = DailyReport::with(['tripDay.trip', 'mitra:id,name'])
            ->whereBetween('created_at', [$startDate.' 00:00:00', $endDate.' 23:59:59'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'trip_kode' => $r->tripDay->trip->kode ?? '-',
                'mitra' => $r->mitra->name ?? '-',
                'hari_ke' => $r->tripDay->hari_ke ?? '-',
                'tanggal' => $r->created_at->format('Y-m-d'),
                'status' => is_object($r->status) ? $r->status->value : $r->status,
                'catatan' => $r->catatan ?? '-',
            ]);

        return [
            'total_reports' => $reports->count(),
            'pending_verify' => $reports->where('status', 'submitted')->count(),
            'verified' => $reports->where('status', 'verified')->count(),
            'reports' => $reports,
        ];
    }

    /**
     * Ambil data payout.
     */
    public function getPayoutData(string $startDate, string $endDate): array
    {
        $payouts = Payout::with(['mitra:id,name'])
            ->whereBetween('created_at', [$startDate.' 00:00:00', $endDate.' 23:59:59'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'kode' => $p->kode,
                'mitra' => $p->mitra->name ?? '-',
                'tanggal' => $p->created_at->format('Y-m-d'),
                'jumlah' => $p->jumlah,
                'status' => is_object($p->status) ? $p->status->value : $p->status,
            ]);

        return [
            'total_dicairkan' => $payouts->where('status', 'paid')->sum('jumlah'),
            'total_pending' => $payouts->whereIn('status', ['pending', 'approved'])->sum('jumlah'),
            'total_saldo_mengendap' => MitraWallet::sum('saldo'),
            'payouts' => $payouts,
        ];
    }

    /**
     * Ambil data pendapatan bulanan (6 bulan terakhir).
     */
    public function getMonthlyRevenue(): array
    {
        $sixMonthsAgo = now()->subMonths(5)->startOfMonth();

        $isSqlite = DB::connection()->getDriverName() === 'sqlite';
        $dateFormat = $isSqlite
            ? "strftime('%Y-%m', created_at)"
            : "TO_CHAR(created_at, 'YYYY-MM')";

        $data = Booking::selectRaw("$dateFormat as bulan, SUM(total_harga) as total")
            ->whereIn('status', ['confirmed', 'completed'])
            ->where('created_at', '>=', $sixMonthsAgo)
            ->groupBy('bulan')
            ->orderBy('bulan')
            ->pluck('total', 'bulan')
            ->toArray();

        $result = [];
        for ($i = 5; $i >= 0; $i--) {
            $date = now()->subMonths($i);
            $key = $date->format('Y-m');
            $result[] = [
                'bulan' => $date->translatedFormat('M'),
                'total' => (float) ($data[$key] ?? 0),
            ];
        }

        return $result;
    }
}
