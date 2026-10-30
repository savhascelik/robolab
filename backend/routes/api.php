<?php

use App\Http\Controllers\Api\AiLabController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CreditController;
use App\Http\Controllers\Api\CustomComponentController;
use App\Http\Controllers\Api\GroupController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\LimitController;
use App\Http\Controllers\Api\ScenarioController;
use App\Http\Controllers\Api\UserSettingsController;
use App\Http\Controllers\Api\WebhookController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Public Health Check Endpoint (Dokploy & Monitoring)
Route::get('/health', HealthController::class);

Route::prefix('v1')->group(function () {
    // Public Health Check Alias (/api/v1/health)
    Route::get('/health', HealthController::class);

    // Public Auth Routes (with brute-force protection)
    Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:15,1');
    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:15,1');

    // Public Whop Webhook & Credit Packages Catalog
    Route::get('/credits/packages', [CreditController::class, 'packages']);
    Route::post('/webhooks/whop', [WebhookController::class, 'handleWhop']);

    // Public / Semi-Public Read Routes (inspects Bearer token if present via request->user('sanctum'))
    Route::get('/groups', [GroupController::class, 'index']);
    Route::get('/groups/{slugOrId}', [GroupController::class, 'show']);

    Route::get('/scenarios', [ScenarioController::class, 'index']);
    Route::get('/scenarios/{idOrSlug}', [ScenarioController::class, 'show']);
    Route::get('/projects', [ScenarioController::class, 'index']);
    Route::get('/projects/{idOrSlug}', [ScenarioController::class, 'show']);

    Route::get('/components', [CustomComponentController::class, 'index']);
    Route::get('/components/{idOrSlug}', [CustomComponentController::class, 'show']);
    Route::get('/custom-components', [CustomComponentController::class, 'index']);
    Route::get('/custom-components/{idOrSlug}', [CustomComponentController::class, 'show']);

    Route::get('/ai/models', [AiLabController::class, 'models']);
    Route::post('/ai/studio-modeling', [AiLabController::class, 'studioModeling'])->middleware('throttle:60,1');

    // Authenticated Routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::get('/auth/user', [AuthController::class, 'me']);
        Route::put('/auth/profile', [AuthController::class, 'updateProfile']);
        Route::put('/auth/password', [AuthController::class, 'updatePassword']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        Route::get('/user/settings', [UserSettingsController::class, 'show']);
        Route::put('/user/settings', [UserSettingsController::class, 'update']);

        // Role Limits & Quotas (Flownie LimitController)
        Route::get('/limits', [LimitController::class, 'index']);
        Route::get('/limits/overview', [LimitController::class, 'overview']);
        Route::get('/limits/{resourceType}', [LimitController::class, 'show']);
        Route::get('/limits/{resourceType}/can-create', [LimitController::class, 'canCreate']);

        // AI Credits & Whop Top-Up Routes
        Route::get('/credits/balance', [CreditController::class, 'balance']);
        Route::get('/credits/orders', [CreditController::class, 'orders']);
        Route::get('/credits/orders/{orderNumber}', [CreditController::class, 'orderStatus']);
        Route::post('/credits/checkout', [CreditController::class, 'createCheckout']);

        // Open Study Groups (Everyone can create & join)
        Route::post('/groups', [GroupController::class, 'store']);
        Route::post('/groups/join', [GroupController::class, 'join']);

        // Circuit Scenarios / User Workspaces & Forking
        Route::post('/scenarios', [ScenarioController::class, 'store']);
        Route::put('/scenarios/{idOrSlug}', [ScenarioController::class, 'update']);
        Route::delete('/scenarios/{idOrSlug}', [ScenarioController::class, 'destroy']);
        Route::post('/scenarios/{idOrSlug}/fork', [ScenarioController::class, 'fork']);

        Route::post('/projects', [ScenarioController::class, 'store']);
        Route::put('/projects/{idOrSlug}', [ScenarioController::class, 'update']);
        Route::delete('/projects/{idOrSlug}', [ScenarioController::class, 'destroy']);
        Route::post('/projects/{idOrSlug}/fork', [ScenarioController::class, 'fork']);

        // Custom 3D Components
        Route::post('/components', [CustomComponentController::class, 'store']);
        Route::delete('/components/{idOrSlug}', [CustomComponentController::class, 'destroy']);
        Route::post('/custom-components', [CustomComponentController::class, 'store']);
        Route::delete('/custom-components/{idOrSlug}', [CustomComponentController::class, 'destroy']);

        // AI Lab & Multi-Round Flownie Agent Loop
        Route::middleware('throttle:60,1')->group(function () {
            Route::post('/ai/build-circuit', [AiLabController::class, 'buildCircuit']);
            Route::post('/ai/synthesize-component', [AiLabController::class, 'synthesizeComponent']);
            Route::post('/ai/diagnose-circuit', [AiLabController::class, 'diagnoseCircuit']);
            Route::post('/ai/agent-turn', [AiLabController::class, 'agentTurn']);
        });
    });
});

// Direct alias for Frontend RemoteApiSettingsAdapter (/api/user/settings)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user/settings', [UserSettingsController::class, 'show']);
    Route::put('/user/settings', [UserSettingsController::class, 'update']);
    Route::get('/user', [AuthController::class, 'me']);
});
