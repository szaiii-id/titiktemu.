<?php

namespace App\Exports;

use App\Models\DailyReport;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class DailyReportExport implements FromCollection, WithHeadings, WithMapping
{
    protected string $startDate;

    protected string $endDate;

    public function __construct(string $startDate, string $endDate)
    {
        $this->startDate = $startDate;
        $this->endDate = $endDate;
    }

    /**
     * @return Collection<int, DailyReport>
     */
    public function collection(): Collection
    {
        return DailyReport::with(['tripDay.trip', 'mitra:id,name'])
            ->whereBetween('created_at', [$this->startDate.' 00:00:00', $this->endDate.' 23:59:59'])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function headings(): array
    {
        return ['ID Laporan', 'Kode Trip', 'Nama Mitra', 'Hari Ke-', 'Tanggal', 'Status', 'Catatan'];
    }

    /**
     * @param  DailyReport  $report
     * @return array<int, mixed>
     */
    public function map($report): array
    {
        return [
            $report->id,
            $report->tripDay->trip->kode ?? '-',
            $report->mitra->name ?? '-',
            $report->tripDay->hari_ke ?? '-',
            $report->created_at->format('Y-m-d'),
            $report->status, // ✅ FIX: Hapus ->value karena ini string biasa
            $report->catatan ?? '-',
        ];
    }
}
