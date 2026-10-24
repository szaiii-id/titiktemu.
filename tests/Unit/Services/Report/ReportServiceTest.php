<?php

use App\Exports\DailyReportExport;
use App\Exports\MitraPerformanceExport;
use App\Exports\PayoutExport;
use App\Exports\RevenueExport;
use App\Models\Trip;
use App\Models\User;
use App\Repositories\Eloquent\ReportRepository;
use App\Services\Report\ReportService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/*
|==========================================================================
| SETUP
|==========================================================================
*/

beforeEach(function () {
    $this->reportRepository = Mockery::mock(ReportRepository::class);
    $this->service = new ReportService($this->reportRepository);
});

afterEach(function () {
    Mockery::close();
});

/*
|==========================================================================
| KATEGORI 1 — BEHAVIORAL / INTERACTION TESTING
|==========================================================================
*/

it('getRevenueData memanggil repository dengan parameter yang benar', function () {
    $expected = ['total_revenue' => 1000000, 'total_honor' => 200000, 'gross_profit' => 800000, 'transactions' => []];

    $this->reportRepository
        ->shouldReceive('getRevenueData')
        ->once()
        ->with('2026-01-01', '2026-01-31')
        ->andReturn($expected);

    $result = $this->service->getRevenueData('2026-01-01', '2026-01-31');

    expect($result)->toBe($expected);
});

it('getMitraPerformanceData memanggil repository dengan parameter yang benar', function () {
    $expected = ['total_mitra' => 10, 'total_trip_completed' => 50, 'mitras' => []];

    $this->reportRepository
        ->shouldReceive('getMitraPerformanceData')
        ->once()
        ->with('2026-01-01', '2026-01-31')
        ->andReturn($expected);

    $result = $this->service->getMitraPerformanceData('2026-01-01', '2026-01-31');

    expect($result)->toBe($expected);
});

it('getDailyReportData memanggil repository dengan parameter yang benar', function () {
    $expected = ['total_reports' => 30, 'pending_verify' => 5, 'verified' => 25, 'reports' => []];

    $this->reportRepository
        ->shouldReceive('getDailyReportData')
        ->once()
        ->with('2026-01-01', '2026-01-31')
        ->andReturn($expected);

    $result = $this->service->getDailyReportData('2026-01-01', '2026-01-31');

    expect($result)->toBe($expected);
});

it('getPayoutData memanggil repository dengan parameter yang benar', function () {
    $expected = ['total_dicairkan' => 5000000, 'total_pending' => 1000000, 'total_saldo_mengendap' => 2000000, 'payouts' => []];

    $this->reportRepository
        ->shouldReceive('getPayoutData')
        ->once()
        ->with('2026-01-01', '2026-01-31')
        ->andReturn($expected);

    $result = $this->service->getPayoutData('2026-01-01', '2026-01-31');

    expect($result)->toBe($expected);
});

it('getMonthlyRevenue memanggil repository tanpa parameter', function () {
    $expected = [
        ['bulan' => 'Jan', 'total' => 1000000],
        ['bulan' => 'Feb', 'total' => 2000000],
    ];

    $this->reportRepository
        ->shouldReceive('getMonthlyRevenue')
        ->once()
        ->andReturn($expected);

    $result = $this->service->getMonthlyRevenue();

    expect($result)->toBe($expected);
});

/*
|==========================================================================
| KATEGORI 2 — EXPORT PDF (BEHAVIORAL)
|==========================================================================
*/

it('exportRevenuePdf memanggil getRevenueData dan Pdf::loadView', function () {
    $this->reportRepository
        ->shouldReceive('getRevenueData')
        ->once()
        ->with('2026-01-01', '2026-01-31')
        ->andReturn(['total_revenue' => 1000000]);

    $response = new Response('pdf-content');

    $pdfMock = Mockery::mock(\Barryvdh\DomPDF\PDF::class);
    $pdfMock->shouldReceive('setPaper')->once()->with('a4', 'landscape')->andReturnSelf();
    $pdfMock->shouldReceive('stream')->once()->andReturn($response);

    Pdf::shouldReceive('loadView')
        ->once()
        ->with('reports.revenue-pdf', Mockery::on(fn ($data) => isset($data['data']['total_revenue'])))
        ->andReturn($pdfMock);

    $result = $this->service->exportRevenuePdf('2026-01-01', '2026-01-31');

    expect($result)->toBe($response);
});

it('exportMitraPdf memanggil getMitraPerformanceData dan Pdf::loadView', function () {
    $this->reportRepository
        ->shouldReceive('getMitraPerformanceData')
        ->once()
        ->with('2026-01-01', '2026-01-31')
        ->andReturn(['total_mitra' => 10]);

    $response = new Response('pdf-content');

    $pdfMock = Mockery::mock(\Barryvdh\DomPDF\PDF::class);
    $pdfMock->shouldReceive('setPaper')->once()->with('a4', 'portrait')->andReturnSelf();
    $pdfMock->shouldReceive('stream')->once()->andReturn($response);

    Pdf::shouldReceive('loadView')
        ->once()
        ->with('reports.mitra-performance-pdf', Mockery::on(fn ($data) => isset($data['data']['total_mitra'])))
        ->andReturn($pdfMock);

    $result = $this->service->exportMitraPdf('2026-01-01', '2026-01-31');

    expect($result)->toBe($response);
});

it('exportDailyPdf memanggil getDailyReportData dan Pdf::loadView', function () {
    $this->reportRepository
        ->shouldReceive('getDailyReportData')
        ->once()
        ->with('2026-01-01', '2026-01-31')
        ->andReturn(['total_reports' => 30]);

    $response = new Response('pdf-content');

    $pdfMock = Mockery::mock(\Barryvdh\DomPDF\PDF::class);
    $pdfMock->shouldReceive('setPaper')->once()->with('a4', 'landscape')->andReturnSelf();
    $pdfMock->shouldReceive('stream')->once()->andReturn($response);

    Pdf::shouldReceive('loadView')
        ->once()
        ->with('reports.daily-reports-pdf', Mockery::on(fn ($data) => isset($data['data']['total_reports'])))
        ->andReturn($pdfMock);

    $result = $this->service->exportDailyPdf('2026-01-01', '2026-01-31');

    expect($result)->toBe($response);
});

it('exportPayoutPdf memanggil getPayoutData dan Pdf::loadView', function () {
    $this->reportRepository
        ->shouldReceive('getPayoutData')
        ->once()
        ->with('2026-01-01', '2026-01-31')
        ->andReturn(['total_dicairkan' => 5000000]);

    $response = new Response('pdf-content');

    $pdfMock = Mockery::mock(\Barryvdh\DomPDF\PDF::class);
    $pdfMock->shouldReceive('setPaper')->once()->with('a4', 'landscape')->andReturnSelf();
    $pdfMock->shouldReceive('stream')->once()->andReturn($response);

    Pdf::shouldReceive('loadView')
        ->once()
        ->with('reports.payout-pdf', Mockery::on(fn ($data) => isset($data['data']['total_dicairkan'])))
        ->andReturn($pdfMock);

    $result = $this->service->exportPayoutPdf('2026-01-01', '2026-01-31');

    expect($result)->toBe($response);
});

/*
|==========================================================================
| KATEGORI 3 — EXPORT EXCEL (BEHAVIORAL)
|==========================================================================
*/

it('exportRevenueExcel memanggil Excel::download dengan RevenueExport', function () {
    $response = Mockery::mock(BinaryFileResponse::class);

    Excel::shouldReceive('download')
        ->once()
        ->with(Mockery::type(RevenueExport::class), Mockery::type('string'))
        ->andReturn($response);

    $result = $this->service->exportRevenueExcel('2026-01-01', '2026-01-31');

    expect($result)->toBe($response);
});

it('exportMitraExcel memanggil Excel::download dengan MitraPerformanceExport', function () {
    $response = Mockery::mock(BinaryFileResponse::class);

    Excel::shouldReceive('download')
        ->once()
        ->with(Mockery::type(MitraPerformanceExport::class), Mockery::type('string'))
        ->andReturn($response);

    $result = $this->service->exportMitraExcel('2026-01-01', '2026-01-31');

    expect($result)->toBe($response);
});

it('exportDailyExcel memanggil Excel::download dengan DailyReportExport', function () {
    $response = Mockery::mock(BinaryFileResponse::class);

    Excel::shouldReceive('download')
        ->once()
        ->with(Mockery::type(DailyReportExport::class), Mockery::type('string'))
        ->andReturn($response);

    $result = $this->service->exportDailyExcel('2026-01-01', '2026-01-31');

    expect($result)->toBe($response);
});

it('exportPayoutExcel memanggil Excel::download dengan PayoutExport', function () {
    $response = Mockery::mock(BinaryFileResponse::class);

    Excel::shouldReceive('download')
        ->once()
        ->with(Mockery::type(PayoutExport::class), Mockery::type('string'))
        ->andReturn($response);

    $result = $this->service->exportPayoutExcel('2026-01-01', '2026-01-31');

    expect($result)->toBe($response);
});

/*
|==========================================================================
| KATEGORI 4 — MANIFEST TRIP (NEGATIVE PATH & POSITIVE PATH)
|==========================================================================
*/

it('exportTripManifest throw 403 jika user adalah mitra yang tidak di-assign', function () {
    $trip = Mockery::mock(Trip::class);
    $trip->shouldReceive('mitras->where->exists')
        ->andReturn(false);

    $mitra = new User;
    $mitra->forceFill(['id' => 99, 'role' => 'mitra']);

    expect(fn () => $this->service->exportTripManifest($trip, $mitra))
        ->toThrow(\Symfony\Component\HttpKernel\Exception\HttpException::class);
});

it('exportTripManifest throw 403 jika user bukan admin dan bukan mitra', function () {
    $trip = Mockery::mock(Trip::class);
    $trip->shouldNotReceive('mitras');

    $client = new User;
    $client->forceFill(['id' => 99, 'role' => 'client']);

    expect(fn () => $this->service->exportTripManifest($trip, $client))
        ->toThrow(\Symfony\Component\HttpKernel\Exception\HttpException::class);
});

it('exportTripManifest berhasil untuk admin', function () {
    $trip = Mockery::mock(Trip::class);
    $trip->shouldReceive('load')
        ->once()
        ->with(['booking.client', 'booking.participants', 'package', 'mitras.mitra', 'days.dailyReports'])
        ->andReturnSelf();
    $trip->shouldReceive('getAttribute')->with('kode')->andReturn('TRP-2026-001');

    $admin = new User;
    $admin->forceFill(['id' => 1, 'role' => 'admin']);

    $response = new Response('pdf-content');

    $pdfMock = Mockery::mock(\Barryvdh\DomPDF\PDF::class);
    $pdfMock->shouldReceive('setPaper')->once()->with('a4', 'portrait')->andReturnSelf();
    $pdfMock->shouldReceive('stream')->once()->andReturn($response);

    Pdf::shouldReceive('loadView')
        ->once()
        ->with('reports.trip-manifest', Mockery::on(fn ($data) => $data['trip'] === $trip))
        ->andReturn($pdfMock);

    $result = $this->service->exportTripManifest($trip, $admin);

    expect($result)->toBe($response);
});

it('exportTripManifest berhasil untuk mitra yang di-assign', function () {
    $trip = Mockery::mock(Trip::class);
    $trip->shouldReceive('mitras->where->exists')
        ->once()
        ->andReturn(true);
    $trip->shouldReceive('load')->once()->andReturnSelf();
    $trip->shouldReceive('getAttribute')->with('kode')->andReturn('TRP-2026-001');

    $mitra = new User;
    $mitra->forceFill(['id' => 50, 'role' => 'mitra']);

    $response = new Response('pdf-content');

    $pdfMock = Mockery::mock(\Barryvdh\DomPDF\PDF::class);
    $pdfMock->shouldReceive('setPaper')->once()->andReturnSelf();
    $pdfMock->shouldReceive('stream')->once()->andReturn($response);

    Pdf::shouldReceive('loadView')->once()->andReturn($pdfMock);

    $result = $this->service->exportTripManifest($trip, $mitra);

    expect($result)->toBe($response);
});

/*
|==========================================================================
| KATEGORI 5 — EDGE CASES
|==========================================================================
*/

it('exportRevenuePdf menghasilkan nama file dengan tanggal hari ini', function () {
    $this->reportRepository
        ->shouldReceive('getRevenueData')
        ->once()
        ->andReturn([]);

    $response = new Response('pdf-content');

    $pdfMock = Mockery::mock(\Barryvdh\DomPDF\PDF::class);
    $pdfMock->shouldReceive('setPaper')->once()->andReturnSelf();
    $pdfMock->shouldReceive('stream')
        ->once()
        ->with(Mockery::on(fn ($filename) => str_starts_with($filename, 'Laporan-Pendapatan-')))
        ->andReturn($response);

    Pdf::shouldReceive('loadView')->once()->andReturn($pdfMock);

    $result = $this->service->exportRevenuePdf('2026-01-01', '2026-01-31');

    expect($result)->toBe($response);
});

it('exportTripManifest menghasilkan nama file dengan kode trip', function () {
    $trip = Mockery::mock(Trip::class);
    $trip->shouldReceive('load')->andReturnSelf();
    $trip->shouldReceive('getAttribute')->with('kode')->andReturn('TRP-2026-001');

    $admin = new User;
    $admin->forceFill(['role' => 'admin']);

    $response = new Response('pdf-content');

    $pdfMock = Mockery::mock(\Barryvdh\DomPDF\PDF::class);
    $pdfMock->shouldReceive('setPaper')->once()->andReturnSelf();
    $pdfMock->shouldReceive('stream')
        ->once()
        ->with('Itinerary-dan-Peserta-TRP-2026-001.pdf')
        ->andReturn($response);

    Pdf::shouldReceive('loadView')->once()->andReturn($pdfMock);

    $result = $this->service->exportTripManifest($trip, $admin);

    expect($result)->toBe($response);
});