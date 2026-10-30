<?php

namespace App\Services;

use App\Models\User;

/**
 * Flownie Hardware AI FunctionFilter (`FunctionFilter.php`).
 *
 * Adapted from `flownie-backend/app/Services/FunctionFilter.php` for the 3D Hardware Workbench.
 * Manages Progressive Tool Disclosure (`CORE_TOOLS`), mode filtering (`edit` vs `Inspect`),
 * and Spatie permission gating (`ai.search_tools`, `ai.code_mode`, `ai.generate_circuit`).
 */
class FunctionFilter
{
    /**
     * Core discovery & execution tools exposed to the hardware agent.
     *
     * @var array<int, string>
     */
    public const CORE_TOOL_NAMES = [
        // 1. Progressive Discovery Chain
        'searchCapabilities',
        'getComponentSchema',
        'getFunctionSchema',
        'inspectCircuitState',
        'searchCanvasComponents',
        'describeCanvasComponent',
        // 2. Dynamic Capability Dispatcher
        'callCapability',
        // 3. Frequent Core Hardware & Code Mode Tools
        'executeCode',
        'createCircuitBatch',
        'addComponent',
        'connectPins',
        'connectWire',
        'writeArduinoCode',
        'compileAndRunSimulation',
        'askUser',
    ];

    /**
     * Valid inner capability names that can be invoked via `callCapability({ name, args })`.
     *
     * @var array<int, string>
     */
    public const CALLABLE_INNER_CAPABILITIES = [
        'searchCapabilities',
        'getComponentSchema',
        'getFunctionSchema',
        'inspectCircuitState',
        'searchCanvasComponents',
        'describeCanvasComponent',
        'setBoard',
        'addComponent',
        'removeComponent',
        'clearAddedComponents',
        'connectPins',
        'connectWire',
        'writeArduinoCode',
        'setCode',
        'compileAndRunSimulation',
        'startSimulation',
        'stopSimulation',
        'createCircuitBatch',
        'executeCode',
        'askUser',
    ];

    /**
     * Read-only discovery tools allowed in inspect/plan mode.
     *
     * @var array<int, string>
     */
    public const READ_ONLY_TOOLS = [
        'searchCapabilities',
        'getComponentSchema',
        'getFunctionSchema',
        'inspectCircuitState',
        'searchCanvasComponents',
        'describeCanvasComponent',
        'askUser',
    ];

    /**
     * Registered 3D Custom Component Studio (`StudioModelingSDK.js`) tools exposed to
     * `POST /api/v1/ai/studio-modeling`.
     *
     * @var array<int, string>
     */
    public const STUDIO_TOOL_NAMES = [
        'getComponentSnapshot',
        'getPartBounds',
        'listMaterialPresets',
        'setComponentMeta',
        'setComponentDimensions',
        'setCadScript',
        'clearParts',
        'addPart',
        'updatePart',
        'removePart',
        'duplicatePart',
        'attachPart',
        'setPartMaterial',
        'setPartModifier',
        'addPin',
        'addPinRow',
        'updatePin',
        'removePin',
        'setInternalDipoles',
        'setPinInputSignal',
        'setPinVoltage',
        'setEvaluateScript',
        'setTestControls',
        'stepComponentPhysics',
        'testComponentBehavior',
        'validateStudioComponent',
        'captureViewportReport',
        'saveComponentDraft',
        'setCameraView',
        'setXRayMode',
        'selectPart',
        'executeStudioCode',
    ];

    /**
     * Checks whether the authenticated user has permission to invoke AI Hardware Architect / Copilot endpoints.
     */
    public function canUseAi(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        return $user->hasRole('admin')
            || $user->hasPermissionTo('ai.copilot')
            || $user->hasPermissionTo('ai.search_tools')
            || $user->hasPermissionTo('ai.code_mode')
            || $user->hasPermissionTo('ai.generate_circuit')
            || $user->hasPermissionTo('components.synthesize_ai');
    }

    /**
     * Partitions requested Studio Modeling SDK tool calls into `allowed` and `rejected` lists.
     *
     * @param  array<int, array<string, mixed>>  $toolCalls
     * @return array{allowed: array<int, array<string, mixed>>, rejected: array<int, array<string, mixed>>}
     */
    public function partitionStudioToolCalls(?User $user, array $toolCalls): array
    {
        $canUseStudioAi = $this->canUseAi($user);
        $allowed = [];
        $rejected = [];

        foreach ($toolCalls as $call) {
            if (! is_array($call)) {
                continue;
            }

            $rawName = trim((string) ($call['name'] ?? ''));
            $normalizedName = str_starts_with($rawName, 'studio.')
                ? substr($rawName, 7)
                : $rawName;

            if ($normalizedName === '' || ! in_array($normalizedName, self::STUDIO_TOOL_NAMES, true)) {
                $rejected[] = [
                    'name' => $rawName ?: 'unknown',
                    'target_name' => $normalizedName ?: 'unknown',
                    'reason' => "Unknown studio tool '{$rawName}'. Must be one of StudioModelingSDK tools.",
                ];
                continue;
            }

            if (! $canUseStudioAi) {
                $rejected[] = [
                    'name' => $rawName,
                    'target_name' => $normalizedName,
                    'reason' => "User lacks AI Studio permission for '{$normalizedName}'.",
                ];
                continue;
            }

            $call['name'] = $normalizedName;
            $call['args'] = is_array($call['args'] ?? $call['arguments'] ?? null)
                ? ($call['args'] ?? $call['arguments'])
                : [];
            $allowed[] = $call;
        }

        return [
            'allowed' => array_values($allowed),
            'rejected' => array_values($rejected),
        ];
    }

    /**
     * Resolves both the outer tool name and any nested target inside `callCapability({ name, args })`,
     * matching `flownie-frontend/services/gemini/agent/capabilityGate.ts`.
     *
     * @param  array<string, mixed>  $call
     * @return array{outer_name: string, target_name: string, is_wrapped: bool}
     */
    public function resolveCallTarget(array $call): array
    {
        $outerName = trim((string) ($call['name'] ?? ''));
        if ($outerName === 'callCapability') {
            $rawArgs = $call['args'] ?? $call['arguments'] ?? [];
            $args = is_array($rawArgs) ? $rawArgs : [];
            $innerName = trim((string) ($args['name'] ?? $args['capability'] ?? ''));
            if (str_starts_with($innerName, 'sdk.')) {
                $innerName = substr($innerName, 4);
            }

            return [
                'outer_name' => $outerName,
                'target_name' => $innerName,
                'is_wrapped' => true,
            ];
        }

        return [
            'outer_name' => $outerName,
            'target_name' => $outerName,
            'is_wrapped' => false,
        ];
    }

    /**
     * Partitions requested tool calls into `allowed` and `rejected` lists so the frontend
     * `observationBuilder` can explain rejected calls (`⛔ Tool not permitted`) to the model.
     *
     * @param  array<int, array<string, mixed>>  $toolCalls
     * @return array{allowed: array<int, array<string, mixed>>, rejected: array<int, array<string, mixed>>}
     */
    public function partitionToolCalls(User $user, array $toolCalls, string $mode = 'edit'): array
    {
        $canMutateHardware = $user->hasRole('admin')
            || $user->hasPermissionTo('ai.code_mode')
            || $user->hasPermissionTo('ai.generate_circuit');

        $allowed = [];
        $rejected = [];

        foreach ($toolCalls as $call) {
            if (! is_array($call)) {
                continue;
            }

            $resolved = $this->resolveCallTarget($call);
            $outerName = $resolved['outer_name'];
            $targetName = $resolved['target_name'];

            if ($outerName === '' || ! in_array($outerName, self::CORE_TOOL_NAMES, true)) {
                $rejected[] = [
                    'name' => $outerName ?: 'unknown',
                    'target_name' => $targetName ?: 'unknown',
                    'reason' => "Unknown tool '{$outerName}'. Use searchCapabilities or one of the registered core tools.",
                ];
                continue;
            }

            if ($resolved['is_wrapped']) {
                if ($targetName === '' || ! in_array($targetName, self::CALLABLE_INNER_CAPABILITIES, true)) {
                    $rejected[] = [
                        'name' => $outerName,
                        'target_name' => $targetName ?: 'empty',
                        'reason' => "callCapability target '{$targetName}' is not a valid CircuitSDK capability.",
                    ];
                    continue;
                }
            }

            if ($mode === 'inspect' && ! in_array($targetName, self::READ_ONLY_TOOLS, true)) {
                $rejected[] = [
                    'name' => $outerName,
                    'target_name' => $targetName,
                    'reason' => "Tool '{$targetName}' is blocked in read-only 'inspect' mode.",
                ];
                continue;
            }

            $isMutatingTarget = ! in_array($targetName, self::READ_ONLY_TOOLS, true);
            if ($isMutatingTarget && ! $canMutateHardware) {
                $rejected[] = [
                    'name' => $outerName,
                    'target_name' => $targetName,
                    'reason' => "User lacks 'ai.code_mode' / 'ai.generate_circuit' permission for '{$targetName}'.",
                ];
                continue;
            }

            $allowed[] = $call;
        }

        return [
            'allowed' => array_values($allowed),
            'rejected' => array_values($rejected),
        ];
    }

    /**
     * Filters requested tool declarations or tool calls based on user permissions and agent mode.
     *
     * @param  array<int, array<string, mixed>>  $toolCalls
     * @return array<int, array<string, mixed>>
     */
    public function filterAllowedToolCalls(User $user, array $toolCalls, string $mode = 'edit'): array
    {
        return $this->partitionToolCalls($user, $toolCalls, $mode)['allowed'];
    }
}
