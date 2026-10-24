<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Manifest Trip - <?php echo e($trip->kode); ?></title>
    <style>
        body { font-family: sans-serif; font-size: 12px; color: #333; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 20px; }
        .header p { margin: 5px 0 0; color: #666; }
        
        .section-title { font-size: 14px; font-weight: bold; background-color: #f3f4f6; padding: 8px; margin-top: 20px; margin-bottom: 10px; border-left: 4px solid #ec4899; }
        
        .info-table { width: 100%; margin-bottom: 20px; }
        .info-table td { padding: 5px; vertical-align: top; }
        .info-table td:first-child { font-weight: bold; width: 150px; }
        
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .data-table th, .data-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .data-table th { background-color: #f9fafb; font-weight: bold; }
        .data-table tr:nth-child(even) { background-color: #f9fafb; }
        
        .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; color: white; }
        .badge-success { background-color: #10b981; }
        .badge-warning { background-color: #f59e0b; }
        .badge-danger { background-color: #ef4444; }
        
        .footer { margin-top: 30px; text-align: right; font-size: 10px; color: #888; }
    </style>
</head>
<body>

    <!-- Header -->
    <div class="header">
        <h1>TITIKTEMU TRAVEL</h1>
        <p>Manifest Peserta & Itinerary Perjalanan</p>
    </div>

    <!-- Info Trip -->
    <div class="section-title">Informasi Perjalanan</div>
    <table class="info-table">
        <tr>
            <td>Kode Trip</td>
            <td>: <?php echo e($trip->kode); ?></td>
        </tr>
        <tr>
            <td>Nama Paket</td>
            <td>: <?php echo e($trip->package->nama ?? 'Paket Dihapus'); ?></td>
        </tr>
        <tr>
            <td>Tanggal</td>
            <td>: <?php echo e($trip->tanggal_mulai->format('d M Y')); ?> s/d <?php echo e($trip->tanggal_selesai->format('d M Y')); ?></td>
        </tr>
        <tr>
            <td>Status Trip</td>
            <td>: <?php echo e(strtoupper($trip->status->value ?? $trip->status)); ?></td>
        </tr>
        <tr>
            <td>Mitra Bertugas</td>
            <td>: 
                <?php $__currentLoopData = $trip->mitras; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $tm): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                    <?php echo e($tm->mitra->name); ?> (<?php echo e(ucfirst($tm->role->value)); ?>)
                    <?php if(!$loop->last): ?>, <?php endif; ?>
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
            </td>
        </tr>
    </table>

    <!-- Manifest Peserta -->
    <div class="section-title">Daftar Peserta (Manifest)</div>
    <table class="data-table">
        <thead>
            <tr>
                <th width="5%">No</th>
                <th width="30%">Nama Peserta</th>
                <th width="10%">Umur</th>
                <th width="25%">No. HP</th>
                <th width="30%">Catatan Khusus</th>
            </tr>
        </thead>
        <tbody>
            <?php $__empty_1 = true; $__currentLoopData = $trip->booking->participants; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $index => $p): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
                <tr>
                    <td><?php echo e($index + 1); ?></td>
                    <td><?php echo e($p->nama); ?></td>
                    <td><?php echo e($p->umur ?? '-'); ?></td>
                    <td><?php echo e($p->no_hp ?? '-'); ?></td>
                    <td><?php echo e($p->catatan ?? '-'); ?></td>
                </tr>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
                <tr>
                    <td colspan="5" style="text-align: center;">Tidak ada peserta terdaftar.</td>
                </tr>
            <?php endif; ?>
        </tbody>
    </table>

    <!-- Itinerary & Laporan Harian -->
    <div class="section-title">Itinerary & Laporan Harian</div>
    <?php $__currentLoopData = $trip->days; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $day): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
        <table class="data-table" style="margin-bottom: 15px;">
            <thead>
                <tr>
                    <th colspan="2" style="background-color: #e5e7eb;">
                        Hari ke-<?php echo e($day->hari_ke); ?> (<?php echo e($day->tanggal->format('d M Y')); ?>)
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td width="20%" style="font-weight: bold;">Kegiatan</td>
                    <td><?php echo e($day->judul); ?></td>
                </tr>
                <tr>
                    <td style="font-weight: bold;">Deskripsi</td>
                    <td><?php echo e($day->deskripsi ?? '-'); ?></td>
                </tr>
                <tr>
                    <td style="font-weight: bold;">Status Laporan</td>
                    <td>
                        <?php if($day->dailyReports->isEmpty()): ?>
                            <span class="badge badge-warning">Belum ada laporan</span>
                        <?php else: ?>
                            <?php $report = $day->dailyReports->first(); ?>
                            <?php if($report->status === 'verified'): ?>
                                <span class="badge badge-success">Terverifikasi</span>
                            <?php else: ?>
                                <span class="badge badge-warning">Menunggu Verifikasi</span>
                            <?php endif; ?>
                            <br>
                            <span style="font-size: 10px; color: #555;">Catatan Mitra: <?php echo e($report->catatan ?? '-'); ?></span>
                        <?php endif; ?>
                    </td>
                </tr>
            </tbody>
        </table>
    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>

    <!-- Footer -->
    <div class="footer">
        Dicetak pada: <?php echo e(now()->translatedFormat('d F Y, H:i')); ?> WITA
    </div>

</body>
</html><?php /**PATH /home/z-code/project/siperjaka/resources/views/reports/trip-manifest.blade.php ENDPATH**/ ?>