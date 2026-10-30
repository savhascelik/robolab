<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $checks = [
            'status' => 'ok',
            'service' => 'circuit-lab-api',
            'timestamp' => now()->toIso8601String(),
            'services' => [],
        ];

        $httpStatus = 200;

        // 1. Database check
        try {
            DB::connection()->getPdo();
            $checks['services']['database'] = 'ok';
        } catch (\Throwable $e) {
            $checks['services']['database'] = 'error';
            $checks['status'] = 'degraded';
            $httpStatus = 500;
        }

        // 2. Cache check
        try {
            $probeKey = 'health_check_probe';
            Cache::put($probeKey, 'ok', 10);
            $checks['services']['cache'] = Cache::get($probeKey) === 'ok' ? 'ok' : 'error';
            if ($checks['services']['cache'] !== 'ok') {
                $checks['status'] = 'degraded';
                $httpStatus = 500;
            }
        } catch (\Throwable $e) {
            $checks['services']['cache'] = 'error';
            $checks['status'] = 'degraded';
            $httpStatus = 500;
        }

        // 3. Storage check
        $storageWritable = is_writable(storage_path('app')) && is_writable(storage_path('logs'));
        $checks['services']['storage'] = $storageWritable ? 'ok' : 'error';
        if (!$storageWritable) {
            $checks['status'] = 'degraded';
            $httpStatus = 500;
        }

        // 4. AI Gateway & Tavily configuration readiness
        $checks['services']['ai_config'] = [
            'default_provider' => config('ai.default_provider', 'nebius'),
            'nebius_base_url' => config('ai.nebius.base_url'),
            'cloudflare_gateway_enabled' => (bool) config('ai.cloudflare_gateway.enabled'),
            'nebius_key_configured' => !empty(config('ai.nebius.api_key')),
            'tavily_key_configured' => !empty(config('ai.tavily.api_key')),
        ];

        return response()->json($checks, $httpStatus);
    }
}
