<?php

declare(strict_types=1);

/**
 * Automated Sabotage & Rollback Verification Runner (Bilerek Bozma ve Geri Alma Koşucusu)
 *
 * Usage:
 *   php scripts/sabotage-verify.php --phase=1
 *   php scripts/sabotage-verify.php --phase=all
 */

$baseDir = dirname(__DIR__);
$options = getopt('', ['phase::']);
$requestedPhase = $options['phase'] ?? 'all';

$cases = [
    '1' => [
        [
            'name' => 'Phase 1: HealthController status code sabotage (200 -> 500)',
            'file' => $baseDir . '/app/Http/Controllers/Api/HealthController.php',
            'target' => '$httpStatus = 200;',
            'sabotage' => '$httpStatus = 500; // SABOTAGE',
            'test_filter' => 'HealthCheckTest',
        ],
    ],
    '2' => [
        [
            'name' => 'Phase 2A: AuthController judge-access bypass sabotage',
            'file' => $baseDir . '/app/Http/Controllers/Api/AuthController.php',
            'target' => 'if (!$isValidCode && !$isValidMagicToken) {',
            'sabotage' => 'if (false && !$isValidCode && !$isValidMagicToken) { // SABOTAGE',
            'test_filter' => 'AuthAndPermissionTest',
        ],
        [
            'name' => 'Phase 2B: RolePermissionSeeder missing groups.create permission on free role',
            'file' => $baseDir . '/database/seeders/RolePermissionSeeder.php',
            'target' => "'groups.create', // FREE_ROLE_GROUPS_CREATE",
            'sabotage' => "// 'groups.create', // SABOTAGE",
            'test_filter' => 'AuthAndPermissionTest',
        ],
    ],
    '3' => [
        [
            'name' => 'Phase 3: ScenarioController private scenario ownership bypass sabotage',
            'file' => $baseDir . '/app/Http/Controllers/Api/ScenarioController.php',
            'target' => 'if ($scenario->visibility === \'private\' && $scenario->user_id !== $user?->id) {',
            'sabotage' => 'if (false && $scenario->visibility === \'private\' && $scenario->user_id !== $user?->id) { // SABOTAGE',
            'test_filter' => 'GroupAndScenarioSharingTest',
        ],
    ],
    '4' => [
        [
            'name' => 'Phase 4A: AiGatewayService task_role dynamic DB resolution sabotage',
            'file' => $baseDir . '/app/Services/AiGatewayService.php',
            'target' => '->where(\'task_role\', $taskRole)',
            'sabotage' => '->where(\'task_role\', \'__broken_role__\') // SABOTAGE',
            'test_filter' => 'AiGatewayAndTavilyCacheTest',
        ],
        [
            'name' => 'Phase 4B: TavilyDatasheetService persistent cache lookup bypass sabotage',
            'file' => $baseDir . '/app/Services/TavilyDatasheetService.php',
            'target' => 'if ($cached && !$forceRefresh) {',
            'sabotage' => 'if (false && $cached && !$forceRefresh) { // SABOTAGE',
            'test_filter' => 'AiGatewayAndTavilyCacheTest',
        ],
    ],
    '5' => [
        [
            'name' => 'Phase 5: DatabaseSeeder DemoStudioSeeder bypass sabotage',
            'file' => $baseDir . '/database/seeders/DatabaseSeeder.php',
            'target' => 'DemoStudioSeeder::class,',
            'sabotage' => '// DemoStudioSeeder::class, // SABOTAGE',
            'test_filter' => 'DatabaseSeederAndDeploymentConfigTest',
        ],
    ],
];

function runArtisanTest(string $baseDir, string $filter): array
{
    $cmd = sprintf('php "%s/artisan" test --filter=%s', $baseDir, escapeshellarg($filter));
    $descriptorSpec = [
        1 => ['pipe', 'w'],
        2 => ['pipe', 'w'],
    ];
    $process = proc_open($cmd, $descriptorSpec, $pipes, $baseDir);
    if (!is_resource($process)) {
        throw new RuntimeException("Failed to start process: {$cmd}");
    }
    $stdout = stream_get_contents($pipes[1]);
    $stderr = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $exitCode = proc_close($process);

    return [
        'exit_code' => $exitCode,
        'output' => $stdout . "\n" . $stderr,
    ];
}

$phasesToRun = $requestedPhase === 'all' ? array_keys($cases) : [$requestedPhase];
$summary = [];

foreach ($phasesToRun as $phaseKey) {
    if (!isset($cases[$phaseKey])) {
        fwrite(STDERR, "Unknown phase: {$phaseKey}\n");
        exit(1);
    }

    foreach ($cases[$phaseKey] as $case) {
        if (!file_exists($case['file'])) {
            if ($requestedPhase === 'all') {
                continue;
            }
            fwrite(STDERR, "[ERROR] File does not exist for {$case['name']}: {$case['file']}\n");
            exit(1);
        }

        echo "=================================================================\n";
        echo "[SABOTAGE CHECK] {$case['name']}\n";
        echo "=================================================================\n";

        // Step 1: Baseline PASS
        $baseline = runArtisanTest($baseDir, $case['test_filter']);
        if ($baseline['exit_code'] !== 0) {
            fwrite(STDERR, "[FAIL] Baseline test failed before sabotage for {$case['test_filter']}!\n{$baseline['output']}\n");
            exit(1);
        }
        echo "  [1/3] Baseline Test ({$case['test_filter']}): PASS (exit 0)\n";

        $originalContent = file_get_contents($case['file']);
        if ($originalContent === false || !str_contains($originalContent, $case['target'])) {
            fwrite(STDERR, "[FAIL] Target string not found in {$case['file']}:\n  Expected: {$case['target']}\n");
            exit(1);
        }

        $sabotagedExitCode = 0;
        try {
            // Step 2: Inject Sabotage and expect FAIL (non-zero exit code)
            $sabotagedContent = str_replace($case['target'], $case['sabotage'], $originalContent);
            file_put_contents($case['file'], $sabotagedContent);

            $sabotageRun = runArtisanTest($baseDir, $case['test_filter']);
            $sabotagedExitCode = $sabotageRun['exit_code'];

            if ($sabotagedExitCode === 0) {
                throw new RuntimeException(
                    "[DECORATIVE TEST DETECTED] Test {$case['test_filter']} STILL PASSED (exit 0) while sabotaged!"
                );
            }
            echo "  [2/3] Sabotage Injected -> Test Caught Failure: FAIL AS EXPECTED (exit {$sabotagedExitCode})\n";
        } finally {
            // Step 3: Always Rollback
            file_put_contents($case['file'], $originalContent);
        }

        // Step 4: Verify Rollback PASS
        $rollbackRun = runArtisanTest($baseDir, $case['test_filter']);
        if ($rollbackRun['exit_code'] !== 0) {
            fwrite(STDERR, "[FAIL] Rollback test failed for {$case['test_filter']}!\n{$rollbackRun['output']}\n");
            exit(1);
        }
        echo "  [3/3] Rollback Restored -> Test Verified: PASS (exit 0)\n\n";

        $summary[] = [
            'case' => $case['name'],
            'baseline_exit' => 0,
            'sabotage_exit' => $sabotagedExitCode,
            'rollback_exit' => 0,
        ];
    }
}

echo "SUMMARY: " . count($summary) . " sabotage & rollback checkpoint(s) verified successfully.\n";
exit(0);
