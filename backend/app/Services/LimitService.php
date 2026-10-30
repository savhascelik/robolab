<?php

namespace App\Services;

use App\Models\RoleLimit;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

class LimitService
{
    private const CACHE_TTL = 1800; // 30 minutes

    public const DEFAULT_MAX_AGENT_ROUNDS = 10;

    public const HARD_MAX_AGENT_ROUNDS = 30;

    private const DEFAULT_LIMITS = [
        RoleLimit::RESOURCE_AI_USAGE => [
            'initial_credit_balance' => 250,
            'daily_token_limit' => 250000,
            'monthly_token_limit' => 2500000,
            'max_tokens_per_request' => 16384,
        ],
        RoleLimit::RESOURCE_SCENARIOS => [
            'max_saved_scenarios' => 25,
            'max_components_per_scenario' => 60,
        ],
        RoleLimit::RESOURCE_GROUPS => [
            'max_owned_groups' => 5,
            'max_joined_groups' => 20,
        ],
        RoleLimit::RESOURCE_AI_LAB => [
            'daily_ai_requests' => 50,
            'max_agent_rounds' => 10,
            'allow_code_mode' => 1,
        ],
        RoleLimit::RESOURCE_COMPONENTS => [
            'daily_datasheet_syntheses' => 25,
        ],
    ];

    /**
     * Get the highest limit value across all roles assigned to the user.
     * -1 represents unlimited.
     */
    public function getUserLimit(User $user, string $resourceType, string $limitKey): int
    {
        if ($user->hasRole('admin')) {
            if ($limitKey === 'initial_credit_balance') {
                return 10000;
            }
            if ($limitKey === 'max_agent_rounds') {
                return 20;
            }
            if ($limitKey === 'allow_code_mode') {
                return 1;
            }
            return -1;
        }

        $roles = $user->roles;
        if ($roles->isEmpty()) {
            return self::DEFAULT_LIMITS[$resourceType][$limitKey] ?? 0;
        }

        $maxLimit = null;

        foreach ($roles as $role) {
            $value = $this->getRoleLimit($role->id, $resourceType, $limitKey);

            if ($value === -1) {
                return -1;
            }

            if ($maxLimit === null || $value > $maxLimit) {
                $maxLimit = $value;
            }
        }

        return $maxLimit ?? (self::DEFAULT_LIMITS[$resourceType][$limitKey] ?? 0);
    }

    public function getRoleLimit(int $roleId, string $resourceType, string $limitKey): int
    {
        $cacheKey = "role_limit:{$roleId}:{$resourceType}:{$limitKey}";

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($roleId, $resourceType, $limitKey) {
            $limit = RoleLimit::query()
                ->where('role_id', $roleId)
                ->where('resource_type', $resourceType)
                ->where('limit_key', $limitKey)
                ->first();

            return $limit ? $limit->limit_value : (self::DEFAULT_LIMITS[$resourceType][$limitKey] ?? 0);
        });
    }

    public function canPerformAction(User $user, string $resourceType, string $limitKey, int $currentUsage): bool
    {
        $limit = $this->getUserLimit($user, $resourceType, $limitKey);

        if ($limit === -1) {
            return true;
        }

        return $currentUsage < $limit;
    }

    /**
     * Checks whether the user is allowed to execute the given Flownie Agent Loop round
     * against `ai_lab.max_agent_rounds` and any user-approved dynamic round extension
     * (`askUser` with `reason = 'extend_rounds'`).
     *
     * @return array{allowed: bool, limit: int, base_limit: int, round: int, remaining_rounds: int, extension_applied: bool, reason: string|null, message: string|null}
     */
    public function canExecuteAgentRound(
        User $user,
        int $round,
        ?int $approvedMaxRounds = null,
        bool $roundExtensionGranted = false
    ): array {
        $baseMaxRounds = $this->getUserLimit($user, RoleLimit::RESOURCE_AI_LAB, 'max_agent_rounds');
        if ($baseMaxRounds === -1) {
            $effectiveCap = $approvedMaxRounds !== null && $approvedMaxRounds > 0
                ? min(self::HARD_MAX_AGENT_ROUNDS, $approvedMaxRounds)
                : self::DEFAULT_MAX_AGENT_ROUNDS;

            return [
                'allowed' => true,
                'limit' => -1,
                'base_limit' => -1,
                'round' => $round,
                'remaining_rounds' => max(0, $effectiveCap - $round),
                'extension_applied' => $roundExtensionGranted,
                'reason' => null,
                'message' => null,
            ];
        }

        $effectiveMax = max(1, $baseMaxRounds);
        $extensionApplied = false;

        if (($approvedMaxRounds !== null && $approvedMaxRounds > $effectiveMax) || $roundExtensionGranted) {
            $requested = $approvedMaxRounds !== null && $approvedMaxRounds > 0
                ? $approvedMaxRounds
                : ($effectiveMax + 5);
            $effectiveMax = min(self::HARD_MAX_AGENT_ROUNDS, max($effectiveMax, $requested));
            $extensionApplied = true;
        }

        $allowed = $round <= $effectiveMax;

        return [
            'allowed' => $allowed,
            'limit' => $effectiveMax,
            'base_limit' => $baseMaxRounds,
            'round' => $round,
            'remaining_rounds' => max(0, $effectiveMax - $round),
            'extension_applied' => $extensionApplied,
            'reason' => $allowed ? null : 'max_agent_rounds_exceeded',
            'message' => $allowed ? null : "Maximum agent rounds ({$effectiveMax}) reached for this run.",
        ];
    }

    public function getUserAllLimits(User $user): array
    {
        $summary = [];
        foreach (self::DEFAULT_LIMITS as $resourceType => $keys) {
            $summary[$resourceType] = [];
            foreach (array_keys($keys) as $limitKey) {
                $summary[$resourceType][$limitKey] = $this->getUserLimit($user, $resourceType, $limitKey);
            }
        }

        return $summary;
    }

    /**
     * Static helper used by GroupController, ScenarioController, and CustomComponentController
     * to check creation quotas against RoleLimit variables.
     *
     * @return array{allowed: bool, limit: int, used: int, remaining: int, reason: string|null, message: string|null}
     */
    public static function canCreate(string $resourceType, User $user): array
    {
        /** @var self $service */
        $service = app(self::class);

        [$mappedResource, $mappedKey, $usedCount] = match ($resourceType) {
            RoleLimit::RESOURCE_STUDY_GROUP, RoleLimit::RESOURCE_GROUPS => [
                RoleLimit::RESOURCE_GROUPS,
                'max_owned_groups',
                $user->ownedGroups()->count(),
            ],
            RoleLimit::RESOURCE_CIRCUIT_SCENARIO, RoleLimit::RESOURCE_SCENARIOS => [
                RoleLimit::RESOURCE_SCENARIOS,
                'max_saved_scenarios',
                $user->scenarios()->count(),
            ],
            RoleLimit::RESOURCE_CUSTOM_COMPONENT, RoleLimit::RESOURCE_COMPONENTS => [
                RoleLimit::RESOURCE_COMPONENTS,
                'daily_datasheet_syntheses',
                $user->customComponents()->whereDate('created_at', now()->toDateString())->count(),
            ],
            default => [
                $resourceType,
                RoleLimit::LIMIT_MAX_DAILY,
                0,
            ],
        };

        $limit = $service->getUserLimit($user, $mappedResource, $mappedKey);
        if ($limit === -1) {
            return [
                'allowed' => true,
                'limit' => -1,
                'used' => $usedCount,
                'current' => $usedCount,
                'remaining' => -1,
                'unlimited' => true,
                'reason' => null,
                'message' => null,
            ];
        }

        $allowed = $usedCount < $limit;

        return [
            'allowed' => $allowed,
            'limit' => $limit,
            'used' => $usedCount,
            'current' => $usedCount,
            'remaining' => max(0, $limit - $usedCount),
            'unlimited' => false,
            'reason' => $allowed ? null : 'total_limit_reached',
            'message' => $allowed ? null : "Quota limit reached for {$mappedResource}.{$mappedKey} ({$usedCount}/{$limit}).",
        ];
    }

    public static function getLimitInfo(string $resourceType, User $user): array
    {
        $quota = self::canCreate($resourceType, $user);

        return [
            'resource_type' => $resourceType,
            'limits' => [
                'max_total' => $quota['limit'],
                'max_total_unlimited' => $quota['unlimited'],
            ],
            'usage' => [
                'total' => $quota['used'],
            ],
            'used' => $quota['used'],
            'limit' => $quota['limit'],
            'remaining' => $quota['remaining'],
            'unlimited' => $quota['unlimited'],
            'can_create' => $quota['allowed'],
            'reason' => $quota['reason'],
            'message' => $quota['message'],
        ];
    }

    public static function getUsageOverview(User $user): array
    {
        /** @var self $service */
        $service = app(self::class);
        /** @var AiCreditService $creditService */
        $creditService = app(AiCreditService::class);

        $roleName = $user->getRoleNames()->first() ?? 'free';
        $scenariosQuota = self::canCreate(RoleLimit::RESOURCE_SCENARIOS, $user);
        $groupsQuota = self::canCreate(RoleLimit::RESOURCE_GROUPS, $user);
        $componentsQuota = self::canCreate(RoleLimit::RESOURCE_COMPONENTS, $user);
        $credits = $creditService->getBalanceSummary($user);

        return [
            'role' => $roleName,
            'resources' => [
                'scenarios' => [
                    'label' => '3D Circuit Workspaces',
                    'icon' => 'scenario',
                    'used' => $scenariosQuota['used'],
                    'limit' => $scenariosQuota['limit'],
                    'remaining' => $scenariosQuota['remaining'],
                    'unlimited' => $scenariosQuota['unlimited'],
                    'can_create' => $scenariosQuota['allowed'],
                    'percentage' => $scenariosQuota['unlimited']
                        ? 0
                        : min(100, (int) round(($scenariosQuota['used'] / max(1, $scenariosQuota['limit'])) * 100)),
                ],
                'groups' => [
                    'label' => 'Study Groups',
                    'icon' => 'group',
                    'used' => $groupsQuota['used'],
                    'limit' => $groupsQuota['limit'],
                    'remaining' => $groupsQuota['remaining'],
                    'unlimited' => $groupsQuota['unlimited'],
                    'can_create' => $groupsQuota['allowed'],
                    'percentage' => $groupsQuota['unlimited']
                        ? 0
                        : min(100, (int) round(($groupsQuota['used'] / max(1, $groupsQuota['limit'])) * 100)),
                ],
                'custom_components' => [
                    'label' => 'Daily Datasheet Syntheses',
                    'icon' => 'component',
                    'used' => $componentsQuota['used'],
                    'limit' => $componentsQuota['limit'],
                    'remaining' => $componentsQuota['remaining'],
                    'unlimited' => $componentsQuota['unlimited'],
                    'can_create' => $componentsQuota['allowed'],
                    'percentage' => $componentsQuota['unlimited']
                        ? 0
                        : min(100, (int) round(($componentsQuota['used'] / max(1, $componentsQuota['limit'])) * 100)),
                ],
            ],
            'ai_limits' => [
                'max_components_per_scenario' => $service->getUserLimit($user, RoleLimit::RESOURCE_SCENARIOS, 'max_components_per_scenario'),
                'daily_ai_requests' => $service->getUserLimit($user, RoleLimit::RESOURCE_AI_LAB, 'daily_ai_requests'),
                'max_agent_rounds' => $service->getUserLimit($user, RoleLimit::RESOURCE_AI_LAB, 'max_agent_rounds'),
                'allow_code_mode' => (bool) $service->getUserLimit($user, RoleLimit::RESOURCE_AI_LAB, 'allow_code_mode'),
            ],
            'credits' => $credits,
        ];
    }
}
