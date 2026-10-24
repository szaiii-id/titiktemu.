<?php

namespace App\Exports;

use App\Models\DailyReport;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class DailyReportExport implements FromCollection, WithHeadings, WithMapping
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
        return DailyReport::with(['tripDay.trip', 'mitra:id,name'])
            ->whereBetween('created_at', [$this->startDate . ' 00:00:00', $this->endDate . ' 23:59:59'])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function headings(): array
    {
        return ['ID Laporan', 'Kode Trip', 'Nama Mitra', 'Hari Ke-', 'Tanggal', 'Status', 'Catatan'];
    }

    public function map($report): array
    {
        return [
            $report->id,
            $report->tripDay->trip->kode ?? '-',
            $report->mitra->name ?? '-',
            $report->tripDay->hari_ke ?? '-',
            $report->created_at->format('Y-m-d'),
            is_object($report->status) ? $report->status->value : $report->status,
            $report->catatan ?? '-',
        ];
    }
}