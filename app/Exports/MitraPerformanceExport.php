<?php

namespace App\Exports;

use App\Models\User;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class MitraPerformanceExport implements FromCollection, WithHeadings, WithMapping
{
    protected $startDate;
    protected $endDate;

    public function __construct($startDate, $endDate)
    {
        $this->startDate = $startDate;
        $this->endDate = $endDate;
    }

    public function collection(): Collection
    {
        return User::where('role', 'mitra')
            ->withCount(['tripMitras as total_trip' => function ($q) {
                $q->whereHas('trip', function ($tq) {
                    $tq->where('status', 'completed')
                       ->whereBetween('tanggal_mulai', [$this->startDate, $this->endDate]);
                });
            }])
            ->withSum(['tripMitras as total_honor' => function ($q) {
                $q->whereHas('trip', function ($tq) {
                    $tq->where('status', 'completed')
                       ->whereBetween('tanggal_mulai', [$this->startDate, $this->endDate]);
                });
            }], 'honor')
            ->orderByDesc('total_honor')
            ->get();
    }

    public function headings(): array
    {
        return ['ID Mitra', 'Nama Mitra', 'Email', 'Total Trip Selesai', 'Total Honor Diterima'];
    }

    public function map($mitra): array
    {
        return [
            $mitra->id,
            $mitra->name,
            $mitra->email,
            $mitra->total_trip ?? 0,
            $mitra->total_honor ?? 0,
        ];
    }
}