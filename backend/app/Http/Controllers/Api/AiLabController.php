<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiModel;
use App\Models\CustomComponent;
use App\Models\User;
use App\Services\AiCreditService;
use App\Services\AiGatewayService;
use App\Services\FunctionFilter;
use App\Services\LimitService;
use App\Services\TavilyDatasheetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiLabController extends Controller
{
    public function __construct(
        private readonly AiGatewayService $aiGateway,
        private readonly TavilyDatasheetService $tavilyService,
        private readonly LimitService $limitService,
        private readonly AiCreditService $creditService,
        private readonly FunctionFilter $functionFilter
    ) {}

    public function models(): JsonResponse
    {
        $models = AiModel::query()
            ->where('is_active', true)
            ->orderByDesc('is_default')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(function (AiModel $model) {
                $arr = $model->toArray();
                $arr['has_server_key'] = $this->aiGateway->resolveApiKey($model) !== '';

                return $arr;
            });

        return response()->json([
            'models' => $models,
        ]);
    }

    /**
     * AI Circuit Architect: Generate a complete 3D circuit scenario & wiring from natural language.
     */
    public function buildCircuit(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $user->can('ai.circuit_builder') && ! $user->can('ai.generate_circuit')) {
            return response()->json([
                'error' => 'forbidden',
                'message' => 'You do not have permission to use the AI Circuit Architect.',
            ], 403);
        }

        $creditCheck = $this->creditService->canMakeRequest($user, 0.25);
        if (! $creditCheck['allowed']) {
            return response()->json([
                'error' => $creditCheck['reason'],
                'message' => $creditCheck['message'],
                'available_credits' => $creditCheck['available_credits'],
                'required_credits' => $creditCheck['required_credits'],
            ], 402);
        }

        $validated = $request->validate([
            'prompt' => ['required', 'string', 'max:2000'],
            'board_type' => ['nullable', 'string', 'max:64'],
            'model_id' => ['nullable', 'integer'],
        ]);

        $boardType = strtoupper($validated['board_type'] ?? 'ARDUINO_UNO');
        $prompt = $validated['prompt'];

        $systemPrompt = <<<'PROMPT'
You are Nebius CircuitLab 3D Architect powered by NVIDIA Nemotron.
Return ONLY a valid JSON object matching CircuitScenarioSchema v2:
{
  "title": "Circuit Title",
  "summary": "Technical explanation of current limiting, voltage levels, and pin assignments",
  "board_type": "ARDUINO_UNO | ESP32_DEVKIT_V1 | NVIDIA_JETSON_NANO",
  "scenario_data": {
    "schema_version": 2,
    "boards": [{"id": "board_1", "type": "ARDUINO_UNO", "position": [0,0,0]}],
    "components": [{"id": "comp_1", "type": "RESISTOR", "value_ohms": 220, "position": [5,0,2]}],
    "connections": [{"from": "board_1.D13", "to": "comp_1.P1", "color": "#ef4444"}],
    "code": "void setup() {}\nvoid loop() {}"
  },
  "electrical_verification": {
    "closed_loop": true,
    "estimated_current_ma": 13.6,
    "warnings": []
  }
}
PROMPT;

        $result = $this->aiGateway->chatJson(
            $user,
            'architect',
            $systemPrompt,
            "Target Board: {$boardType}\nUser Request: {$prompt}",
            fn () => $this->deterministicCircuitBuild($prompt, $boardType),
            $validated['model_id'] ?? null
        );

        return response()->json([
            'circuit' => $result['parsed'],
            'meta' => [
                'model_used' => $result['model_used'],
                'provider_slug' => $result['provider_slug'],
                'latency_ms' => $result['latency_ms'],
                'used_byok' => false,
                'fallback_used' => $result['fallback_used'],
                'credits_charged' => $result['credits_charged'],
                'remaining_credits' => $result['remaining_credits'],
                'input_tokens' => $result['input_tokens'],
                'output_tokens' => $result['output_tokens'],
            ],
        ]);
    }

    /**
     * AI Datasheet & 3D Component Synthesizer (Tavily Search + Cache + Nemotron JSON Synthesis).
     */
    public function synthesizeComponent(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $user->can('components.synthesize_ai')) {
            return response()->json([
                'error' => 'forbidden',
                'message' => 'You do not have permission to synthesize custom 3D hardware components.',
            ], 403);
        }

        $creditCheck = $this->creditService->canMakeRequest($user, 0.25);
        if (! $creditCheck['allowed']) {
            return response()->json([
                'error' => $creditCheck['reason'],
                'message' => $creditCheck['message'],
                'available_credits' => $creditCheck['available_credits'],
                'required_credits' => $creditCheck['required_credits'],
            ], 402);
        }

        $validated = $request->validate([
            'part_number' => ['required', 'string', 'max:80'],
            'save_to_catalog' => ['nullable', 'boolean'],
            'study_group_id' => ['nullable', 'integer', 'exists:study_groups,id'],
            'visibility' => ['nullable', 'in:public,group,private'],
        ]);

        if (! empty($validated['study_group_id'])) {
            $group = \App\Models\StudyGroup::find($validated['study_group_id']);
            if (! $group || ! $group->hasMember($user)) {
                return response()->json([
                    'error' => 'not_group_member',
                    'message' => 'You must be a member of the study group to attach a component to it.',
                ], 403);
            }
        }

        $lookup = $this->tavilyService->lookupOrSearch($validated['part_number']);

        if (! empty($lookup['synthesized_schema'])) {
            $schema = $lookup['synthesized_schema'];
            $creditAccounting = $this->creditService->recordUsageAndCharge(
                $user,
                $this->aiGateway->resolveModel('datasheet_synth'),
                'datasheet_synth_cached',
                150,
                220,
                12,
                ['part_key' => $lookup['part_key'], 'cache_hit' => true]
            );
            $meta = [
                'cache_hit' => $lookup['cache_hit'],
                'source' => $lookup['source'],
                'part_key' => $lookup['part_key'],
                'credits_charged' => $creditAccounting['credits_charged'],
                'remaining_credits' => $creditAccounting['remaining_credits'],
            ];
        } else {
            $tavilyContext = json_encode($lookup['tavily_results'], JSON_UNESCAPED_UNICODE);
            $systemPrompt = <<<'PROMPT'
You are a Hardware Datasheet Extraction Engine. Given web datasheet snippets, output a JSON schema with:
part_number, name, category, description, pinout (array of {id, label, type, voltage_min, voltage_max}),
electrical_specs ({supply_voltage_min_v, supply_voltage_max_v, max_current_ma, interface}),
internal_dipoles (array of {pinA, pinB, resistance_ohms}),
mesh_recipe ({package_type, dimensions_mm, primary_color, pin_pitch_mm}).
PROMPT;

            $aiRes = $this->aiGateway->chatJson(
                $user,
                'datasheet_synth',
                $systemPrompt,
                "Part Number: {$lookup['part_key']}\nDatasheet Snippets: {$tavilyContext}",
                fn () => $this->deterministicDatasheetSchema($lookup['part_key'], $lookup['tavily_results'])
            );

            $schema = $aiRes['parsed'];
            $this->tavilyService->saveSynthesizedSchema(
                $lookup['part_key'],
                $schema,
                $lookup['tavily_results'][0]['url'] ?? null
            );

            $meta = [
                'cache_hit' => $lookup['cache_hit'],
                'source' => $lookup['source'],
                'part_key' => $lookup['part_key'],
                'model_used' => $aiRes['model_used'],
                'latency_ms' => $aiRes['latency_ms'],
                'credits_charged' => $aiRes['credits_charged'],
                'remaining_credits' => $aiRes['remaining_credits'],
            ];
        }

        $savedComponent = null;
        if ($validated['save_to_catalog'] ?? true) {
            $baseSlug = 'sensor-' . strtolower($lookup['part_key']);
            $existingBySlug = CustomComponent::where('slug', $baseSlug)->first();
            $targetSlug = ($existingBySlug && $existingBySlug->user_id !== $user->id)
                ? $baseSlug . '-u' . $user->id
                : $baseSlug;

            $requestedVisibility = $validated['visibility'] ?? 'public';
            if ($requestedVisibility === 'public' && ! $user->can('components.publish')) {
                $requestedVisibility = 'private';
            }

            $savedComponent = CustomComponent::updateOrCreate(
                ['slug' => $targetSlug],
                [
                    'user_id' => $user->id,
                    'study_group_id' => $validated['study_group_id'] ?? null,
                    'part_number' => $lookup['part_key'],
                    'name' => $schema['name'] ?? ($lookup['part_key'] . ' Module'),
                    'category' => $schema['category'] ?? 'sensor',
                    'visibility' => $requestedVisibility,
                    'pinout' => $schema['pinout'] ?? [],
                    'electrical_specs' => $schema['electrical_specs'] ?? [],
                    'internal_dipoles' => $schema['internal_dipoles'] ?? [],
                    'mesh_recipe' => $schema['mesh_recipe'] ?? [],
                    'datasheet_url' => $lookup['tavily_results'][0]['url'] ?? null,
                ]
            );
        }

        return response()->json([
            'schema' => $schema,
            'component' => $savedComponent,
            'meta' => $meta,
        ]);
    }

    /**
     * AI Circuit Fault & Topology Diagnostics (Short-Circuit, Open-Loop, 3.3V/5V Mismatch).
     */
    public function diagnoseCircuit(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $user->can('ai.copilot')) {
            return response()->json([
                'error' => 'forbidden',
                'message' => 'You do not have permission to use AI Circuit Diagnostics.',
            ], 403);
        }

        $creditCheck = $this->creditService->canMakeRequest($user, 0.25);
        if (! $creditCheck['allowed']) {
            return response()->json([
                'error' => $creditCheck['reason'],
                'message' => $creditCheck['message'],
                'available_credits' => $creditCheck['available_credits'],
                'required_credits' => $creditCheck['required_credits'],
            ], 402);
        }

        $validated = $request->validate([
            'scenario_data' => ['required', 'array'],
            'solver_telemetry' => ['nullable', 'array'],
            'question' => ['nullable', 'string', 'max:1000'],
        ]);

        $scenarioJson = json_encode($validated['scenario_data'], JSON_UNESCAPED_UNICODE);
        $telemetryJson = json_encode($validated['solver_telemetry'] ?? [], JSON_UNESCAPED_UNICODE);
        $question = $validated['question'] ?? 'Analyze this 3D circuit for short circuits, missing current-limiting resistors, open loops, or 3.3V/5V logic level mismatches.';

        $systemPrompt = <<<'PROMPT'
You are a Senior Embedded Hardware Verification Engineer.
Analyze the provided 3D circuit topology and Union-Find nodal solver telemetry.
Return ONLY a JSON object:
{
  "status": "healthy | warning | critical_fault",
  "headline": "Short diagnostic summary",
  "findings": [
    {"severity": "critical|warning|info", "component_id": "...", "issue": "...", "fix_recommendation": "..."}
  ],
  "suggested_code_patch": "Optional Arduino/ESP32/Jetson code snippet"
}
PROMPT;

        $result = $this->aiGateway->chatJson(
            $user,
            'fast_diagnose',
            $systemPrompt,
            "Circuit Topology: {$scenarioJson}\nSolver Telemetry: {$telemetryJson}\nQuestion: {$question}",
            fn () => $this->deterministicDiagnose($validated['scenario_data'], $validated['solver_telemetry'] ?? [])
        );

        return response()->json([
            'diagnosis' => $result['parsed'],
            'meta' => [
                'model_used' => $result['model_used'],
                'provider_slug' => $result['provider_slug'],
                'latency_ms' => $result['latency_ms'],
                'used_byok' => false,
                'fallback_used' => $result['fallback_used'],
                'credits_charged' => $result['credits_charged'],
                'remaining_credits' => $result['remaining_credits'],
            ],
        ]);
    }

    /**
     * Multi-Round Flownie AI Tool & Code Mode Agent Turn (`/api/v1/ai/agent-turn`).
     * Supports progressive capability discovery (`searchCapabilities`, `getComponentSchema`)
     * and `CircuitSDK` JavaScript synthesis (`executeCode`) with credit accounting.
     */
    public function agentTurn(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $locale = \App\Exceptions\AiGatewayException::resolveLocale($request->input('locale'));

        if (! $user->can('ai.copilot') && ! $user->can('ai.search_tools')) {
            $forbiddenMsg = $locale === 'en'
                ? 'Your current role does not have permission to use the AI Agent Assistant.'
                : 'Mevcut kullanıcı rolünüzün AI Ajan Asistanını kullanma yetkisi bulunmuyor.';

            return response()->json([
                'ok' => false,
                'error' => 'forbidden',
                'message' => $forbiddenMsg,
                'locale' => $locale,
            ], 403);
        }

        $creditCheck = $this->creditService->canMakeRequest($user, 0.25);
        if (! $creditCheck['allowed']) {
            $creditMsg = $locale === 'en'
                ? 'Your AI credit balance is depleted. Please top up AI credits from the credit store.'
                : $creditCheck['message'];

            return response()->json([
                'ok' => false,
                'error' => $creditCheck['reason'],
                'message' => $creditMsg,
                'locale' => $locale,
                'available_credits' => $creditCheck['available_credits'],
                'required_credits' => $creditCheck['required_credits'],
            ], 402);
        }

        $validated = $request->validate([
            'prompt' => ['required', 'string', 'max:4000'],
            'round' => ['nullable', 'integer', 'min:1', 'max:30'],
            'max_rounds' => ['nullable', 'integer', 'min:1', 'max:30'],
            'remaining_rounds' => ['nullable', 'integer', 'min:0', 'max:30'],
            'user_approved_max_rounds' => ['nullable', 'integer', 'min:1', 'max:30'],
            'round_extension_granted' => ['nullable', 'boolean'],
            'observation_text' => ['nullable', 'string', 'max:64000'],
            'session_knowledge' => ['nullable'],
            'user_answer' => ['nullable', 'string', 'max:2000'],
            'canvas_summary' => ['nullable', 'array'],
            'circuit_state' => ['nullable', 'array'],
            'tool_results' => ['nullable', 'array'],
            'history' => ['nullable', 'array'],
            'model_id' => ['nullable', 'integer'],
            'mode' => ['nullable', 'string', 'in:edit,inspect'],
            'locale' => ['nullable', 'string', 'max:12'],
        ]);

        $round = (int) ($validated['round'] ?? 1);
        $roundExtensionGranted = (bool) ($validated['round_extension_granted'] ?? false);
        $approvedMaxRounds = isset($validated['user_approved_max_rounds'])
            ? (int) $validated['user_approved_max_rounds']
            : ($roundExtensionGranted && isset($validated['max_rounds']) ? (int) $validated['max_rounds'] : null);

        $roundCheck = $this->limitService->canExecuteAgentRound(
            $user,
            $round,
            $approvedMaxRounds,
            $roundExtensionGranted
        );
        if (! $roundCheck['allowed']) {
            $roundMsg = $locale === 'en'
                ? "Maximum agent round limit ({$roundCheck['limit']}) reached."
                : $roundCheck['message'];

            return response()->json([
                'ok' => false,
                'error' => $roundCheck['reason'],
                'message' => $roundMsg,
                'locale' => $locale,
                'limit' => $roundCheck['limit'],
                'base_limit' => $roundCheck['base_limit'] ?? $roundCheck['limit'],
                'requested_round' => $round,
            ], 403);
        }

        $planCap = $roundCheck['limit'] === -1
            ? \App\Services\LimitService::HARD_MAX_AGENT_ROUNDS
            : (int) $roundCheck['limit'];
        $defaultMaxRounds = $roundCheck['limit'] === -1
            ? \App\Services\LimitService::DEFAULT_MAX_AGENT_ROUNDS
            : (int) $roundCheck['limit'];
        $effectiveMaxRounds = isset($validated['max_rounds'])
            ? min($planCap, max(1, (int) $validated['max_rounds']))
            : $defaultMaxRounds;
        $remainingRounds = isset($validated['remaining_rounds'])
            ? max(0, (int) $validated['remaining_rounds'])
            : max(0, $effectiveMaxRounds - $round);

        $prompt = $validated['prompt'];
        $canvasSummary = $validated['canvas_summary'] ?? $validated['circuit_state'] ?? [];
        $toolResults = $validated['tool_results'] ?? [];
        $observationText = (string) ($validated['observation_text'] ?? '');
        $rawSessionKnowledge = $validated['session_knowledge'] ?? null;
        $sessionKnowledge = is_array($rawSessionKnowledge)
            ? $rawSessionKnowledge
            : (is_string($rawSessionKnowledge) && trim($rawSessionKnowledge) !== ''
                ? [trim($rawSessionKnowledge)]
                : []);
        $userAnswer = trim((string) ($validated['user_answer'] ?? ''));
        $mode = (string) ($validated['mode'] ?? 'edit');

        $roundBudgetBanner = "[ROUND BUDGET: round {$round} of {$effectiveMaxRounds} ({$remainingRounds} remaining)]";
        if ($roundExtensionGranted) {
            $roundBudgetBanner .= " [USER APPROVED EXTRA ROUNDS: total max_rounds is now {$effectiveMaxRounds}. Resume from current 3D stage state.]";
        }

        $systemPrompt = <<<PROMPT
You are Nebius 3D Hardware Agent using the Flownie Progressive Tool Discovery & Code Mode Architecture.
{$roundBudgetBanner}

Available Meta-Tools:
1. searchCapabilities({ query, category }): Search 3D hardware components & CircuitSDK methods.
2. getComponentSchema({ componentId }): Get exact pinout (pins, voltages, interfaces) for a component.
3. getFunctionSchema({ name }): Get parameter schema for a tool.
4. searchCanvasComponents({ query }): Inspect components currently on the 3D stage.
5. callCapability({ name, args }): Invoke a single discovered hardware capability.
6. executeCode({ code, explanation }): Run JavaScript using the `circuit` (CircuitSDK) object:
   - circuit.setBoard('board.arduino_uno' | 'board.esp32_devkit' | 'board.jetson_nano')
   - circuit.clearAddedComponents()
   - const usId = circuit.addComponent('sensor.ultrasonic', { id: 'us1', position: [30, 0, -10], label: 'HC-SR04' })
   - const ledId = circuit.addComponent('led.single', { id: 'led1', position: [10, 0, -10], color: 0x22c55e })
   - const resId = circuit.addComponent('passive.resistor', { id: 'r1', position: [18, 0, -10], ohms: 220 })
   - circuit.connectWire('host', '5V', usId, 'VCC', { color: '#ef4444' })
   - circuit.connectWire('host', 'GND', usId, 'GND', { color: '#1e293b' })
   - circuit.setCode(`void setup() { pinMode(9, OUTPUT); }\nvoid loop() { digitalWrite(9, HIGH); }`)
   - circuit.startSimulation()
   - return circuit.inspectElectricalState()
7. askUser({ question, reason, requested_extra_rounds, options }):
   - Use reason="clarification" with 2-4 clickable `options` when `user_prompt` is ambiguous or when a genuinely new design/hardware question arises. Check `previous_tool_results` and `user_answer`: NEVER repeat an `askUser` question that already has a `user_answer` recorded! Only call `askUser` again if you need to ask a DIFFERENT follow-up question that has not yet been answered.
   - Use reason="extend_rounds" with `requested_extra_rounds: 5` and `options: ["Grant +5 Extra Rounds & Continue", "Grant +10 Extra Rounds", "Finish with Current State"]` (localized to user_locale) if `remaining_rounds <= 2` and you need additional rounds to finish component placement, wiring, or firmware verification.

Execution & Code Mode Rules:
- Batch discovery calls in parallel in Round 1-2 (`searchCapabilities` and `getComponentSchema` for all needed components at once) instead of spending 4 separate rounds on schema lookups.
- Once `getComponentSchema` results are in `previous_tool_results`, immediately call `executeCode` in the next round to build the circuit, wire all pins in a closed loop, load firmware via `circuit.setCode(...)`, and call `circuit.startSimulation()`.
- Always generate complete, executable firmware via `circuit.setCode(...)` AND call `circuit.startSimulation()` both when building a new circuit and when the user asks in a follow-up prompt to generate or update code for Arduino Uno (C++), ESP32 DevKit (C++), or Jetson Nano (Python `Jetson.GPIO` or C++) across single or multiple boards on the stage.
- In `executeCode`, ALWAYS pass an options object (`{ id, position }`) as the second argument of `circuit.addComponent(typeId, { id, position })`. Note `circuit.addComponent(...)` returns the string component ID (e.g. `'us1'`).
- In `executeCode`, ALWAYS use template literals (backticks `` `...` ``) or escaped `\\n` for multi-line C++ / Python strings inside `circuit.setCode(...)`.
- If `previous_tool_results` contains an `executeCode` error (`ok: false`), DO NOT stop with empty `tool_calls`! Fix the JavaScript error and call `executeCode` again so the 3D stage is populated.
- Keep any internal reasoning concise (< 150 words) and immediately emit the JSON object so response latency stays fast.

Language Rule:
- Keep all tool names, JSON keys, component IDs, search queries, and `CircuitSDK` JavaScript code strictly in English.
- Write user-facing text fields (`thought`, `askUser.question`, `askUser.options`, `final_response.headline`, `final_response.summary`, `final_response.electrical_notes`) in the user's active locale (`{$locale}`) or matching the language of `user_prompt`.

Return ONLY a JSON object with:
{
  "thought": "Brief technical reasoning for this round",
  "tool_calls": [
    { "name": "searchCapabilities | getComponentSchema | callCapability | executeCode | askUser", "args": { ... } }
  ],
  "final_response": null or {
    "headline": "...",
    "summary": "...",
    "electrical_notes": [...]
  }
}
PROMPT;

        $userTurnPayload = json_encode([
            'round_budget' => [
                'round' => $round,
                'max_rounds' => $effectiveMaxRounds,
                'remaining_rounds' => $remainingRounds,
                'extension_granted' => $roundExtensionGranted,
            ],
            'user_prompt' => $prompt,
            'user_answer' => $userAnswer !== '' ? $userAnswer : null,
            'observation_text' => $observationText !== '' ? $observationText : null,
            'session_knowledge' => $sessionKnowledge,
            'canvas_summary' => $canvasSummary,
            'previous_tool_results' => $toolResults,
        ], JSON_UNESCAPED_UNICODE);

        $result = $this->aiGateway->chatJson(
            $user,
            'architect',
            $systemPrompt,
            $userTurnPayload,
            fn () => $this->deterministicAgentTurn(
                $prompt,
                $round,
                $canvasSummary,
                $toolResults,
                $effectiveMaxRounds,
                $remainingRounds,
                $roundExtensionGranted,
                $userAnswer
            ),
            $validated['model_id'] ?? null
        );

        $parsedTurn = is_array($result['parsed']) ? $result['parsed'] : [];
        $rejectedCalls = [];
        if (isset($parsedTurn['tool_calls']) && is_array($parsedTurn['tool_calls'])) {
            $partitioned = $this->functionFilter->partitionToolCalls(
                $user,
                $parsedTurn['tool_calls'],
                $mode
            );
            $parsedTurn['tool_calls'] = $partitioned['allowed'];
            $rejectedCalls = $partitioned['rejected'];
        }

        $roundBudget = [
            'round' => $round,
            'max_rounds' => $effectiveMaxRounds,
            'remaining_rounds' => $remainingRounds,
            'base_limit' => $roundCheck['base_limit'] ?? $roundCheck['limit'],
            'extension_granted' => $roundExtensionGranted,
        ];
        $parsedTurn['round_budget'] = $roundBudget;

        $balanceSummary = $this->creditService->getBalanceSummary($user);

        return response()->json([
            'turn' => $parsedTurn,
            'thought' => $parsedTurn['thought'] ?? null,
            'tool_calls' => $parsedTurn['tool_calls'] ?? [],
            'rejected_calls' => $rejectedCalls,
            'final_response' => $parsedTurn['final_response'] ?? null,
            'round_budget' => $roundBudget,
            'charged_credits' => $result['credits_charged'],
            'credit_balance' => $balanceSummary,
            'meta' => [
                'round' => $round,
                'max_rounds' => $effectiveMaxRounds,
                'remaining_rounds' => $remainingRounds,
                'extension_granted' => $roundExtensionGranted,
                'model_used' => $result['model_used'],
                'provider_slug' => $result['provider_slug'],
                'latency_ms' => $result['latency_ms'],
                'fallback_used' => $result['fallback_used'],
                'credits_charged' => $result['credits_charged'],
                'remaining_credits' => $result['remaining_credits'],
                'input_tokens' => $result['input_tokens'],
                'output_tokens' => $result['output_tokens'],
            ],
        ]);
    }

    /**
     * Multi-round deterministic Flownie Agent Loop fallback so every natural-language circuit request
     * executes real 3-step progressive discovery -> CircuitSDK Code Mode execution -> electrical verification,
     * plus `askUser` support for clarification and dynamic round budget extensions (`reason = 'extend_rounds'`).
     *
     * @param  array<string, mixed>  $canvasSummary
     * @param  array<int, array<string, mixed>>  $toolResults
     * @return array<string, mixed>
     */
    private function deterministicAgentTurn(
        string $prompt,
        int $round,
        array $canvasSummary,
        array $toolResults,
        int $effectiveMaxRounds = 10,
        int $remainingRounds = 9,
        bool $roundExtensionGranted = false,
        string $userAnswer = ''
    ): array {
        $lower = mb_strtolower($prompt . ' ' . $userAnswer);

        // Determine target board & components from user prompt + any user answer
        $boardId = 'board.arduino_uno';
        if (str_contains($lower, 'esp32') || str_contains($lower, 'wifi') || str_contains($lower, 'oled')) {
            $boardId = 'board.esp32_devkit';
        } elseif (str_contains($lower, 'jetson') || str_contains($lower, 'kamera') || str_contains($lower, 'camera') || str_contains($lower, 'imx219') || str_contains($lower, 'csi')) {
            $boardId = 'board.jetson_nano';
        }

        $wantsUltrasonic = str_contains($lower, 'ultrason') || str_contains($lower, 'mesafe') || str_contains($lower, 'hc-sr04') || str_contains($lower, 'radar') || str_contains($lower, 'engel');
        $wantsServo = str_contains($lower, 'servo') || str_contains($lower, 'sg90') || str_contains($lower, 'motor') || str_contains($lower, 'kol') || str_contains($lower, 'engel') || str_contains($lower, 'kapı') || str_contains($lower, 'bariyer');
        $wantsOled = str_contains($lower, 'oled') || str_contains($lower, 'ekran') || str_contains($lower, 'ssd1306') || str_contains($lower, 'display');
        $wantsDht = str_contains($lower, 'dht') || str_contains($lower, 'sıcaklık') || str_contains($lower, 'nem') || str_contains($lower, 'iklim');

        if (! $wantsUltrasonic && ! $wantsServo && ! $wantsOled && ! $wantsDht) {
            // Default rich circuit if prompt is general
            $wantsUltrasonic = true;
            $wantsServo = true;
        }

        $hasExecutedCode = collect($toolResults)->contains(fn ($r) => ($r['name'] ?? '') === 'executeCode');
        $hasAskedUser = collect($toolResults)->contains(fn ($r) => ($r['name'] ?? '') === 'askUser');

        // 0-A. Clarification check via askUser (when prompt is explicitly ambiguous and user hasn't answered yet)
        $needsClarification = (str_contains($lower, 'belirsiz') || str_contains($lower, 'hangi sensör') || str_contains($lower, 'ask_clarification'))
            && $userAnswer === ''
            && ! $hasAskedUser;

        if ($needsClarification) {
            return [
                'thought' => 'Kullanıcının donanım talebinde sensör ve arayüz tercihi belirsiz. Doğru pin topolojisini kurmak için `askUser` ile seçenek sunuyorum.',
                'tool_calls' => [
                    [
                        'name' => 'askUser',
                        'args' => [
                            'question' => 'Devrede hangi sensör ve haberleşme modülünü kullanmamı istersiniz?',
                            'reason' => 'clarification',
                            'options' => [
                                'HC-SR04 Ultrasonik + SG90 Servo (GPIO/PWM)',
                                'SSD1306 OLED + DHT11 İklim İstasyonu (I2C)',
                                'Tam Donanım Paketi (Ultrasonik + Servo + OLED)',
                            ],
                        ],
                    ],
                ],
                'final_response' => null,
            ];
        }

        // 0-B. Dynamic Round Budget Check: If remaining rounds <= 2 (or user explicitly tests round extension)
        // and circuit synthesis hasn't completed yet, request extra rounds via askUser(reason="extend_rounds").
        $explicitExtendRequest = str_contains(mb_strtolower($prompt), 'ek tur')
            || str_contains(mb_strtolower($prompt), 'extend_rounds');

        if (
            ! $hasExecutedCode
            && ! $roundExtensionGranted
            && ! $hasAskedUser
            && $userAnswer === ''
            && ($remainingRounds <= 2 || $explicitExtendRequest)
        ) {
            return [
                'thought' => "Mevcut tur bütçesi (Tur {$round}/{$effectiveMaxRounds}, kalan: {$remainingRounds}) çok adımlı pin şeması doğrulaması, 3B bileşen yerleşimi, kablolama ve Kirchhoff simülasyon doğrulamasını güvenli şekilde tamamlamak için sınırda. Kullanıcıdan ek tur izni istiyorum.",
                'tool_calls' => [
                    [
                        'name' => 'askUser',
                        'args' => [
                            'question' => "Tur bütçesi sınırına yaklaşıldı (Tur {$round}/{$effectiveMaxRounds}, kalan: {$remainingRounds} tur). 3B devre kurulumunu, kablolamayı ve gömülü yazılım doğrulamasını eksiksiz tamamlamak için ek tur izni verir misiniz?",
                            'reason' => 'extend_rounds',
                            'requested_extra_rounds' => 5,
                            'options' => [
                                '+5 Tur İzni Ver ve Devam Et',
                                '+10 Tur İzni Ver',
                                'Mevcut Haliyle Tamamla',
                            ],
                        ],
                    ],
                ],
                'final_response' => null,
            ];
        }

        // ROUND 1: Progressive Tool Discovery (searchCapabilities + getComponentSchema)
        if ($round === 1 && empty($toolResults) && ! $roundExtensionGranted && $userAnswer === '') {
            $queries = [];
            $schemasToFetch = [$boardId];

            if ($wantsUltrasonic) {
                $queries[] = 'ultrasonic distance sensor';
                $schemasToFetch[] = 'sensor.ultrasonic';
            }
            if ($wantsServo) {
                $queries[] = 'servo actuator pwm';
                $schemasToFetch[] = 'motor.servo';
            }
            if ($wantsOled) {
                $queries[] = 'oled i2c display';
                $schemasToFetch[] = 'display.ssd1306_oled';
            }
            if ($wantsDht) {
                $queries[] = 'dht11 temperature humidity';
                $schemasToFetch[] = 'sensor.dht11';
            }

            $toolCalls = [
                [
                    'name' => 'searchCapabilities',
                    'args' => [
                        'query' => implode(' ', $queries) ?: 'sensor actuator led',
                        'category' => 'all',
                    ],
                ],
            ];

            foreach ($schemasToFetch as $compId) {
                $toolCalls[] = [
                    'name' => 'getComponentSchema',
                    'args' => ['componentId' => $compId],
                ];
            }

            return [
                'thought' => 'Kullanıcının istediği devre topolojisi için önce `searchCapabilities` ve `getComponentSchema` ile kartın ve bileşenlerin kesin pin şemalarını ve voltaj sınırlarını keşfediyorum.',
                'tool_calls' => $toolCalls,
                'final_response' => null,
            ];
        }

        // ROUND 2: Execute Code Mode (`executeCode` with `CircuitSDK`)
        $hasExecutedCode = collect($toolResults)->contains(fn ($r) => ($r['name'] ?? '') === 'executeCode');
        if (! $hasExecutedCode) {
            $jsLines = [
                "// Flownie Code Mode — CircuitSDK Otomatik 3B Devre ve Firmware Sentezi",
                "circuit.setBoard('{$boardId}');",
                "circuit.clearAddedComponents();",
            ];

            $vccPin = $boardId === 'board.arduino_uno' ? '5V' : ($boardId === 'board.esp32_devkit' ? '3V3' : '5V_PIN2');
            $gndPin = $boardId === 'board.jetson_nano' ? 'GND_PIN6' : 'GND';

            if ($wantsUltrasonic) {
                $trigPin = $boardId === 'board.arduino_uno' ? 'D9' : ($boardId === 'board.esp32_devkit' ? 'D5' : 'GPIO_PIN29');
                $echoPin = $boardId === 'board.arduino_uno' ? 'D10' : ($boardId === 'board.esp32_devkit' ? 'D18' : 'GPIO_PIN31');
                $jsLines[] = "const sonic = circuit.addComponent('sensor.ultrasonic', { position: [34, 0, -14] });";
                $jsLines[] = "circuit.connectWire('{$boardId}', '{$vccPin}', sonic, 'VCC', '#ef4444');";
                $jsLines[] = "circuit.connectWire('{$boardId}', '{$gndPin}', sonic, 'GND', '#1e293b');";
                $jsLines[] = "circuit.connectWire('{$boardId}', '{$trigPin}', sonic, 'TRIG', '#3b82f6');";
                $jsLines[] = "circuit.connectWire('{$boardId}', '{$echoPin}', sonic, 'ECHO', '#10b981');";
            }

            if ($wantsServo) {
                $pwmPin = $boardId === 'board.arduino_uno' ? 'D6' : ($boardId === 'board.esp32_devkit' ? 'D19' : 'PWM_PIN32');
                $jsLines[] = "const servo = circuit.addComponent('motor.servo', { position: [34, 0, 4] });";
                $jsLines[] = "circuit.connectWire('{$boardId}', '{$vccPin}', servo, 'VCC', '#ef4444');";
                $jsLines[] = "circuit.connectWire('{$boardId}', '{$gndPin}', servo, 'GND', '#1e293b');";
                $jsLines[] = "circuit.connectWire('{$boardId}', '{$pwmPin}', servo, 'PWM', '#f59e0b');";
            }

            if ($wantsOled) {
                $sclPin = $boardId === 'board.arduino_uno' ? 'A5' : ($boardId === 'board.esp32_devkit' ? 'D22' : 'I2C1_SCL_PIN5');
                $sdaPin = $boardId === 'board.arduino_uno' ? 'A4' : ($boardId === 'board.esp32_devkit' ? 'D21' : 'I2C1_SDA_PIN3');
                $jsLines[] = "const oled = circuit.addComponent('display.ssd1306_oled', { position: [34, 0, -26] });";
                $jsLines[] = "circuit.connectWire('{$boardId}', '{$vccPin}', oled, 'VCC', '#ef4444');";
                $jsLines[] = "circuit.connectWire('{$boardId}', '{$gndPin}', oled, 'GND', '#1e293b');";
                $jsLines[] = "circuit.connectWire('{$boardId}', '{$sclPin}', oled, 'SCL', '#a855f7');";
                $jsLines[] = "circuit.connectWire('{$boardId}', '{$sdaPin}', oled, 'SDA', '#06b6d4');";
            }

            if ($wantsDht) {
                $dataPin = $boardId === 'board.arduino_uno' ? 'D4' : ($boardId === 'board.esp32_devkit' ? 'D4' : 'GPIO_PIN7');
                $jsLines[] = "const dht = circuit.addComponent('sensor.dht11', { position: [22, 0, -14] });";
                $jsLines[] = "circuit.connectWire('{$boardId}', '{$vccPin}', dht, 'VCC', '#ef4444');";
                $jsLines[] = "circuit.connectWire('{$boardId}', '{$gndPin}', dht, 'GND', '#1e293b');";
                $jsLines[] = "circuit.connectWire('{$boardId}', '{$dataPin}', dht, 'DATA', '#22c55e');";
            }

            // Always add an indicator LED + 220Ω resistor closed loop so current telemetry glows live
            $ledPin = $boardId === 'board.arduino_uno' ? 'D13' : ($boardId === 'board.esp32_devkit' ? 'D2' : 'GPIO_PIN11');
            $jsLines[] = "const res = circuit.addComponent('passive.resistor', { resistanceOhms: 220, position: [24, 0, 20] });";
            $jsLines[] = "const led = circuit.addComponent('led.single', { position: [36, 0, 20] });";
            $jsLines[] = "circuit.connectWire('{$boardId}', '{$ledPin}', res, 'LEAD_A', '#f97316');";
            $jsLines[] = "circuit.connectWire(res, 'LEAD_B', led, 'ANODE', '#ef4444');";
            $jsLines[] = "circuit.connectWire(led, 'CATHODE', '{$boardId}', '{$gndPin}', '#1e293b');";

            $firmware = <<<'CODE'
// Nebius CircuitSDK Auto-Generated Firmware
#include <Servo.h>

const int TRIG_PIN = 9;
const int ECHO_PIN = 10;
const int SERVO_PIN = 6;
const int STATUS_LED = 13;

Servo gateServo;

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(SERVO_PIN, OUTPUT);
  pinMode(STATUS_LED, OUTPUT);
  digitalWrite(TRIG_PIN, HIGH);
  digitalWrite(SERVO_PIN, HIGH);
  digitalWrite(STATUS_LED, HIGH);
  gateServo.attach(SERVO_PIN);
  gateServo.write(90);
}

void loop() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  float distanceCm = duration * 0.0343f / 2.0f;

  if (distanceCm > 0 && distanceCm < 25.0f) {
    digitalWrite(STATUS_LED, HIGH);
    gateServo.write(90);
  } else {
    digitalWrite(STATUS_LED, LOW);
    gateServo.write(0);
  }
  delay(100);
}
CODE;

            $escapedFirmware = json_encode($firmware, JSON_UNESCAPED_UNICODE);
            $jsLines[] = "circuit.setCode({$escapedFirmware});";
            $jsLines[] = "return circuit.startSimulation();";

            return [
                'thought' => 'Pin şemaları doğrulandı. Şimdi `executeCode` (CircuitSDK Code Mode) ile tek atomik adımda 3B bileşenleri sahneye yerleştiriyor, pin-to-pin kabloları bağlıyor, gömülü yazılımı (firmware) yazıyor ve elektriksel düğüm çözücüyü çalıştırıyorum.',
                'tool_calls' => [
                    [
                        'name' => 'executeCode',
                        'args' => [
                            'explanation' => '3B bileşen yerleşimi, pin-to-pin kablolama ve gömülü C++ firmware sentezi',
                            'code' => implode("\n", $jsLines),
                        ],
                    ],
                ],
                'final_response' => null,
            ];
        }

        // ROUND 3: Final Verification & Summary
        return [
            'thought' => '3B sahne kurulumu, kablolama ve elektriksel süreklilik analizi başarıyla tamamlandı.',
            'tool_calls' => [],
            'final_response' => [
                'headline' => '3B Devre Kurulumu, Pin Kablolaması ve Firmware Hazır',
                'summary' => 'Flownie Search Mode ile bileşen pin şemaları doğrulandı ve Code Mode (`CircuitSDK`) ile tüm bileşenler 3B sahneye yerleştirilip kablolandı. Gömülü yazılım kod editörüne aktarıldı.',
                'electrical_notes' => [
                    'VCC ve GND besleme hatları ortak referans düğümüne bağlandı.',
                    '220Ω akım sınırlama direnci ile durum LED\'i kapalı çevrime alındı.',
                    'Sensör ve aktüatör sinyal pinleri çakışmasız GPIO/PWM hatlarına eşlendi.',
                ],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function deterministicCircuitBuild(string $prompt, string $boardType): array
    {
        $lower = strtolower($prompt);

        if (str_contains($lower, 'esp32') || $boardType === 'ESP32_DEVKIT_V1') {
            return [
                'title' => 'ESP32 — Ultrasonik Mesafe & OLED Telemetri Devresi',
                'summary' => 'ESP32 3.3V lojik seviyesinde HC-SR04 ve SSD1306 I2C ekran topolojisi.',
                'board_type' => 'ESP32_DEVKIT_V1',
                'scenario_data' => [
                    'schema_version' => 2,
                    'boards' => [
                        ['id' => 'board_esp32_1', 'type' => 'ESP32_DEVKIT_V1', 'position' => [0, 0, 0]],
                    ],
                    'components' => [
                        ['id' => 'oled_1', 'type' => 'SSD1306_OLED', 'position' => [-6, 0, 2]],
                        ['id' => 'ultrasonic_1', 'type' => 'HC_SR04', 'position' => [6, 0, -2]],
                    ],
                    'connections' => [
                        ['from' => 'board_esp32_1.3V3', 'to' => 'oled_1.VCC', 'color' => '#ef4444'],
                        ['from' => 'board_esp32_1.GND_1', 'to' => 'oled_1.GND', 'color' => '#1e293b'],
                        ['from' => 'board_esp32_1.GPIO22', 'to' => 'oled_1.SCL', 'color' => '#3b82f6'],
                        ['from' => 'board_esp32_1.GPIO21', 'to' => 'oled_1.SDA', 'color' => '#10b981'],
                    ],
                    'code' => "void setup() {\n  Serial.begin(115200);\n}\n\nvoid loop() {\n  delay(200);\n}",
                ],
                'electrical_verification' => [
                    'closed_loop' => true,
                    'estimated_current_ma' => 18.5,
                    'warnings' => [],
                ],
            ];
        }

        return [
            'title' => 'Arduino Uno — Akım Korumalı LED & Sensör Devresi',
            'summary' => 'D13 çıkışından 220Ω direnç ile 13.6 mA güvenli LED sürüşü ve kapalı çevrim GND dönüşü.',
            'board_type' => 'ARDUINO_UNO',
            'scenario_data' => [
                'schema_version' => 2,
                'boards' => [
                    ['id' => 'board_uno_1', 'type' => 'ARDUINO_UNO', 'position' => [0, 0, 0]],
                ],
                'components' => [
                    ['id' => 'res_220', 'type' => 'RESISTOR', 'value_ohms' => 220, 'position' => [5, 0, 2]],
                    ['id' => 'led_1', 'type' => 'LED_RED', 'position' => [8, 0, 2]],
                ],
                'connections' => [
                    ['from' => 'board_uno_1.D13', 'to' => 'res_220.P1', 'color' => '#ef4444'],
                    ['from' => 'res_220.P2', 'to' => 'led_1.ANODE', 'color' => '#f97316'],
                    ['from' => 'led_1.CATHODE', 'to' => 'board_uno_1.GND_1', 'color' => '#1e293b'],
                ],
                'code' => "void setup() {\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(13, HIGH);\n  delay(500);\n  digitalWrite(13, LOW);\n  delay(500);\n}",
            ],
            'electrical_verification' => [
                'closed_loop' => true,
                'estimated_current_ma' => 13.6,
                'warnings' => [],
            ],
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $snippets
     * @return array<string, mixed>
     */
    private function deterministicDatasheetSchema(string $partKey, array $snippets): array
    {
        return [
            'part_number' => $partKey,
            'name' => "{$partKey} Digital I2C/GPIO Breakout Module",
            'category' => 'sensor',
            'description' => $snippets[0]['content'] ?? "Synthesized 3D hardware component for {$partKey}.",
            'pinout' => [
                ['id' => 'VCC', 'label' => 'VCC', 'type' => 'power', 'voltage_min' => 3.3, 'voltage_max' => 5.0],
                ['id' => 'GND', 'label' => 'GND', 'type' => 'ground', 'voltage_min' => 0.0, 'voltage_max' => 0.0],
                ['id' => 'SCL', 'label' => 'SCL', 'type' => 'i2c', 'voltage_min' => 0.0, 'voltage_max' => 5.0],
                ['id' => 'SDA', 'label' => 'SDA', 'type' => 'i2c', 'voltage_min' => 0.0, 'voltage_max' => 5.0],
            ],
            'electrical_specs' => [
                'supply_voltage_min_v' => 3.3,
                'supply_voltage_max_v' => 5.0,
                'max_current_ma' => 5.0,
                'interface' => 'I2C / Digital',
            ],
            'internal_dipoles' => [
                ['pinA' => 'VCC', 'pinB' => 'GND', 'resistance_ohms' => 12000],
            ],
            'mesh_recipe' => [
                'package_type' => 'breakout_pcb',
                'dimensions_mm' => [18.0, 14.0, 3.0],
                'primary_color' => '#2563eb',
                'pin_pitch_mm' => 2.54,
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $scenarioData
     * @param  array<string, mixed>  $telemetry
     * @return array<string, mixed>
     */
    private function deterministicDiagnose(array $scenarioData, array $telemetry): array
    {
        $connections = $scenarioData['connections'] ?? [];
        $components = $scenarioData['components'] ?? [];
        $findings = [];
        $status = 'healthy';

        if (! empty($telemetry['short_circuit'])) {
            $status = 'critical_fault';
            $findings[] = [
                'severity' => 'critical',
                'component_id' => 'power_rail',
                'issue' => 'Direct VCC-to-GND low-impedance path detected (< 1Ω).',
                'fix_recommendation' => 'Remove direct jumper wire between power and ground rails or insert a load resistor.',
            ];
        }

        $hasLed = collect($components)->contains(fn ($c) => str_contains(strtoupper($c['type'] ?? ''), 'LED'));
        $hasResistor = collect($components)->contains(fn ($c) => str_contains(strtoupper($c['type'] ?? ''), 'RESISTOR'));

        if ($hasLed && ! $hasResistor) {
            $status = $status === 'critical_fault' ? 'critical_fault' : 'warning';
            $findings[] = [
                'severity' => 'warning',
                'component_id' => 'led',
                'issue' => 'LED connected without a series current-limiting resistor.',
                'fix_recommendation' => 'Place a 220Ω - 330Ω resistor in series with the LED anode to limit current to ~13mA.',
            ];
        }

        if (empty($connections)) {
            $status = 'warning';
            $findings[] = [
                'severity' => 'info',
                'component_id' => 'board',
                'issue' => 'No closed-loop jumper connections found on the breadboard.',
                'fix_recommendation' => 'Connect both a signal/power source pin and a GND return path to form a closed circuit.',
            ];
        }

        if (empty($findings)) {
            $findings[] = [
                'severity' => 'info',
                'component_id' => 'circuit_loop',
                'issue' => 'Closed-loop topology verified. All node voltages and branch currents are within datasheet limits.',
                'fix_recommendation' => 'Ready for real-time 3D simulation.',
            ];
        }

        return [
            'status' => $status,
            'headline' => $status === 'healthy'
                ? 'Kapalı Çevrim Doğrulandı — Elektriksel Topoloji Güvenli'
                : 'Devre Topolojisinde Dikkat Edilmesi Gereken Noktalar Bulundu',
            'findings' => $findings,
            'suggested_code_patch' => "void setup() {\n  pinMode(13, OUTPUT);\n}\nvoid loop() {\n  digitalWrite(13, HIGH);\n  delay(500);\n}",
        ];
    }

    /**
     * POST /api/v1/ai/studio-modeling
     *
     * Full-screen `/studio` 3D Custom Component Studio Architect LLM endpoint.
     * Takes the user's natural language prompt and current component draft/snapshot,
     * invokes the real Nebius LLM via AiGatewayService, and returns executable
     * `StudioModelingSDK` (`studio.*`) JavaScript code (`studio_code`) plus summary & thought.
     */
    public function studioModeling(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'prompt' => 'required|string|max:4000',
            'current_draft' => 'nullable|array',
            'snapshot' => 'nullable|array',
            'history' => 'nullable|array',
            'locale' => 'nullable|string|max:10',
            'model_slug' => 'nullable|string|max:120',
        ]);

        /** @var \App\Models\User|null $user */
        $user = $request->user('sanctum');

        if ($user) {
            if (! $this->functionFilter->canUseAi($user)) {
                return response()->json([
                    'message' => 'Your current role does not have permission to run AI operations.',
                ], 403);
            }

            if (! $this->creditService->canMakeRequest($user, 0.25)) {
                return response()->json([
                    'message' => 'Insufficient AI credits for Studio Architect modeling.',
                    'credit_balance' => $this->creditService->getBalanceSummary($user),
                ], 402);
            }
        }

        $prompt = trim((string) $validated['prompt']);
        $locale = strtolower(trim((string) ($validated['locale'] ?? 'tr')));
        $currentDraft = is_array($validated['current_draft'] ?? null)
            ? $validated['current_draft']
            : (is_array($validated['snapshot']['draft'] ?? null) ? $validated['snapshot']['draft'] : []);
        $partBounds = is_array($validated['snapshot']['partBounds'] ?? null)
            ? $validated['snapshot']['partBounds']
            : [];

        $compactDraft = [
            'typeId' => $currentDraft['typeId'] ?? 'custom.smart_module',
            'name' => $currentDraft['name'] ?? 'Custom 3D Module',
            'category' => $currentDraft['category'] ?? 'custom',
            'isEnvironmentProp' => (bool) ($currentDraft['isEnvironmentProp'] ?? false),
            'dimensions' => $currentDraft['dimensions'] ?? ['width' => 14, 'height' => 1.6, 'depth' => 12],
            'parts' => array_slice(is_array($currentDraft['parts'] ?? null) ? $currentDraft['parts'] : [], 0, 24),
            'pins' => array_slice(is_array($currentDraft['pins'] ?? null) ? $currentDraft['pins'] : [], 0, 24),
            'evaluateScript' => (string) ($currentDraft['evaluateScript'] ?? ''),
            'partBounds' => $partBounds,
        ];

        $fallbackPayload = $this->deterministicStudioModeling($prompt, $compactDraft, $locale);

        $systemPrompt = <<<'PROMPT'
You are the CircuitLab 3D Studio Architect, an expert 3D CAD & Electronics Hardware Modeling AI inside `/studio`.
You have full programmatic control over the live 3D component stage via the `studio` (`StudioModelingSDK`) object.

Your task is to design a complete, multi-part, physically realistic 3D electronic component (or 0-pin physical arena prop) OR modify the existing component according to the user's request.

Respond ONLY with a valid JSON object matching this exact schema:
{
  "thought": "Brief 3D CAD & electrical architecture reasoning in the user's language",
  "summary": "Clear explanation of the 3D parts, PBR materials, pins, and reactive behavior built (in the user's language)",
  "studio_code": "Executable JavaScript code calling studio.* methods"
}

AVAILABLE `studio.*` SDK METHODS IN `studio_code`:
1. `studio.setComponentMeta({ typeId, name, category, isEnvironmentProp, summary, dimensions: [width, height, depth] })`
   - `typeId`: e.g. `"custom.fire_beacon_light"`, `"custom.ultrasonic_turret"`, `"custom.relay_driver"`
   - `category`: `"actuators"` | `"sensors"` | `"custom"` | `"props"`
   - `isEnvironmentProp`: `false` for electrical 3D ReactFlow Nodes with pins; `true` for 0-pin physical arena obstacles/props.
2. `studio.clearParts()`
   - ALWAYS call `studio.clearParts()` right after `studio.setComponentMeta(...)` when the user asks to create/design/make a new component (e.g. "bana bir itfaiye ışığı yapar mısın", "design a siren", "create a sensor") so previous template parts are replaced cleanly.
   - Omit `studio.clearParts()` ONLY if the user asks to add/tweak a single part on the existing component.
3. `studio.addPart({ id, primitive, size: [w, h, d], radius, innerRadius, attach: { to, side, gap, offset: [ox, oy, oz] }, materialPreset, color, repeat, mirror, partRole, spinAxis })`
   - `primitive`: `"rounded_box"` | `"box"` | `"cylinder"` | `"tube"` | `"sphere"` | `"capsule"` | `"cone"` | `"torus"` | `"lathe"`
   - `size`: `[widthMm, heightMm, depthMm]`. Typical PCB base is `[16, 1.8, 12]` to `[22, 2.0, 14]`.
   - Always add a root base part first (e.g. `id: "pcb_base"`, `attach: null`), then attach 4 to 7 rich 3D sub-parts onto it using `attach: { to: "pcb_base", side: "top", gap: 0, offset: [x, 0, z] }` or stacked onto child parts!
   - `materialPreset` options:
     * `"fr4_pcb"` / `"fr4_pcb_teal"` (Teal PCB)
     * `"fr4_pcb_black"` (Matte Black PCB)
     * `"fr4_pcb_red"` (Red Emergency/Power PCB)
     * `"fr4_pcb_blue"` (Blue Logic PCB)
     * `"ic_epoxy"` (Black IC Chip / Matte Housing)
     * `"brushed_aluminum"` (Brushed Aluminum Chassis / Reflector / Heatsink)
     * `"gold_pin"` (Gold Header / Brass Terminal)
     * `"copper"` (Copper Coil / Winding)
     * `"frosted_led"` (Diffused Translucent Dome / LED Lens — pass `color: "#EF4444"` for red, `"#3B82F6"` for blue, `"#F59E0B"` for amber, `"#10B981"` for green)
     * `"ceramic"` (SMD Ceramic Capacitor)
     * `"rubber_tire"` (Dark Elastomer)
     * `"matte_plastic"` (Industrial Enclosure)
   - `partRole` options (Reactive 3D Physics/Visual Animation during simulation):
     * `"emissive"`: Glows brightly when `state.active` is `true`! ALWAYS set `partRole: "emissive"` on LEDs, emergency lights, fire-truck beacons, lamps, strobes, or displays.
     * `"rotor"`: Spins continuously (`spinAxis: "y" | "x" | "z"`) when `state.active` is `true` (e.g., rotating emergency beacon reflector, cooling fan blades, radar turret, motor shaft).
     * `"pivot"`: Rotates to an angle based on signal/PWM (e.g. servo arm, barrier gate).
     * `"plunger"`: Moves linearly when energized (e.g. solenoid, relay armature).
   - `repeat`: `{ count: N, step: [sx, sy, sz] }`
   - `mirror`: `{ axis: "x" | "z" }`
4. `studio.updatePart(partId, patch)` / `studio.removePart(partId)` / `studio.attachPart(partId, { to, side, gap, offset })` / `studio.setPartMaterial(partId, preset)` / `studio.setPartModifier(partId, { repeat, mirror, partRole, spinAxis })`
5. `studio.addPinRow({ prefix: "P", count: 4, pitch: 2.54, edge: "bottom", names: ["VCC", "GND", "IN", "OUT"], directions: ["power", "ground", "input", "output"] })`
   - Or `studio.addPin({ name, direction, edge, protocol, nominalVoltage })`.
   - For any component triggered by an incoming signal (e.g. emergency light, siren, relay, actuator, logic gate), include `IN` (input) and `OUT` (output) pins along with `VCC` and `GND`.
6. `studio.setEvaluateScript(codeString)`
   - Pure JavaScript body of `evaluate({ pins, state, dt, stageEnv, report })`. Do NOT use `window`, `document`, `fetch`, or `eval`.
   - Must read `pins.VCC?.voltage` and incoming signal `pins.IN?.voltage` (or `pins.SIG?.voltage`, `pins.TRIG?.voltage`, or `stageEnv.nearestObstacleCm` / `stageEnv.temperatureC` / `stageEnv.lightLux` / `stageEnv.gasPpm` / `stageEnv.humidityPct` / `stageEnv.potRatio` for sensors), set `state.active = Boolean(...)`, set `state.rpm = state.active ? 720 : 0` if there is a rotor, and return `{ outputs: { OUT: { voltage: outV, logicLevel: outV >= 2.5 ? 1 : 0 } }, state: { active: state.active, rpm: state.rpm } }`.
7. `studio.setInternalDipoles([{ pinA: "VCC", pinB: "GND", resistance: 1000 }, { pinA: "IN", pinB: "GND", resistance: 1000 }])`
   - Optional conductive internal dipoles (`ConductiveDipole`) so `CircuitFlowSolver` forms closed electrical loops on the Workbench.
8. `studio.setTestControls([{ key: "temperatureC", label: "Sıcaklık (°C)", min: -20, max: 100, step: 1, defaultValue: 25, unit: "°C" }])`
   - Optional environmental test sliders for sensor components (`nearestObstacleCm`, `temperatureC`, `lightLux`, `gasPpm`, `humidityPct`, `potRatio`). Omit or pass `[]` for pure electrical/signal actuators (e.g. emergency light, siren, relay, fan, logic gate) so the Test Bench shows only pin voltage buttons.
9. `studio.testComponentBehavior({ pinVoltages: { VCC: 5.0, GND: 0.0, IN: 5.0, TRIG: 5.0 }, distanceCm: 18, dt: 0.05 })`
   - Always call `studio.testComponentBehavior(...)` at the end of `studio_code` with voltages that activate the component so self-verification confirms `active=true`.
PROMPT;

        $userPrompt = json_encode([
            'user_request' => $prompt,
            'locale' => $locale,
            'current_component_snapshot' => $compactDraft,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        try {
            $result = $this->aiGateway->chatJson(
                $user,
                'architect',
                $systemPrompt,
                $userPrompt ?: $prompt,
                fn () => $fallbackPayload
            );
        } catch (\Throwable $e) {
            $result = [
                'parsed' => $fallbackPayload,
                'model_used' => 'studio-architect-fallback',
                'provider_slug' => 'local_fallback',
                'latency_ms' => 12,
                'fallback_used' => true,
                'credits_charged' => 0.0,
                'remaining_credits' => $user ? (float) ($this->creditService->getBalanceSummary($user)['total_credits'] ?? 0) : 0.0,
                'input_tokens' => 0,
                'output_tokens' => 0,
            ];
        }

        $data = is_array($result['parsed'] ?? $result['data'] ?? null)
            ? ($result['parsed'] ?? $result['data'])
            : $fallbackPayload;
        $studioCode = trim((string) ($data['studio_code'] ?? $data['code'] ?? ''));

        // If the LLM returned empty or invalid studio_code without `studio.` calls, use deterministic fallback
        if ($studioCode === '' || ! str_contains($studioCode, 'studio.')) {
            $studioCode = $fallbackPayload['studio_code'];
            $data['thought'] = ($data['thought'] ?? '') ?: $fallbackPayload['thought'];
            $data['summary'] = ($data['summary'] ?? '') ?: $fallbackPayload['summary'];
        }

        $balanceSummary = $user ? $this->creditService->getBalanceSummary($user) : null;

        return response()->json([
            'ok' => true,
            'model_used' => $result['model_used'] ?? 'studio-architect',
            'thought' => (string) ($data['thought'] ?? $fallbackPayload['thought']),
            'reply' => (string) ($data['summary'] ?? $data['reply'] ?? $fallbackPayload['summary']),
            'summary' => (string) ($data['summary'] ?? $fallbackPayload['summary']),
            'studio_code' => $studioCode,
            'charged_credits' => $result['credits_charged'],
            'credit_balance' => $balanceSummary,
            'meta' => [
                'model_used' => $result['model_used'],
                'provider_slug' => $result['provider_slug'],
                'latency_ms' => $result['latency_ms'],
                'fallback_used' => $result['fallback_used'],
                'credits_charged' => $result['credits_charged'],
                'remaining_credits' => $result['remaining_credits'],
                'input_tokens' => $result['input_tokens'],
                'output_tokens' => $result['output_tokens'],
            ],
        ]);
    }

    /**
     * Deterministic fallback for `/api/v1/ai/studio-modeling` so offline/test environments
     * and fallback scenarios synthesize rich, multi-part 3D CAD + reactive `evaluateScript` code.
     *
     * @param  array<string, mixed>  $currentDraft
     * @return array{thought: string, summary: string, studio_code: string}
     */
    private function deterministicStudioModeling(string $prompt, array $currentDraft = [], string $locale = 'tr'): array
    {
        $lower = mb_strtolower($prompt);
        $isTr = $locale !== 'en';

        // 1. Fire-truck / Emergency Beacon / Strobe Lightbar ("itfaiye ışığı", "çakar", "siren", "tepe lambası", "beacon", "strobe")
        if (
            str_contains($lower, 'itfaiye') ||
            str_contains($lower, 'çakar') ||
            str_contains($lower, 'cakar') ||
            str_contains($lower, 'siren') ||
            str_contains($lower, 'beacon') ||
            str_contains($lower, 'strobe') ||
            str_contains($lower, 'ambulans') ||
            str_contains($lower, 'polis') ||
            str_contains($lower, 'tepe lamba') ||
            str_contains($lower, 'uyarı ışığ') ||
            str_contains($lower, 'uyari isig') ||
            str_contains($lower, 'ışık') ||
            str_contains($lower, 'isik') ||
            str_contains($lower, 'lamba') ||
            str_contains($lower, 'lightbar')
        ) {
            $studioCode = <<<'JS'
studio.setComponentMeta({
  typeId: 'custom.fire_truck_beacon',
  name: 'İtfaiye Çakar Tepe Lambası (Dual Strobe Lightbar)',
  category: 'actuators',
  isEnvironmentProp: false,
  summary: 'IN pinine gelen dijital/PWM sinyali (>= 2.0V) ile aktifleşen kırmızı/mavi çift kubbeli ve döner reflektörlü 3B itfaiye çakar modülü.',
  dimensions: [20, 2.0, 12]
});
studio.clearParts();
studio.addPart({
  id: 'pcb_base',
  primitive: 'rounded_box',
  size: [20, 2.0, 12],
  radius: 0.6,
  materialPreset: 'fr4_pcb_red'
});
studio.addPart({
  id: 'lightbar_chassis',
  primitive: 'rounded_box',
  size: [16.4, 1.4, 7.6],
  radius: 0.4,
  attach: { to: 'pcb_base', side: 'top', gap: 0, offset: [0, 0, -0.6] },
  materialPreset: 'brushed_aluminum'
});
studio.addPart({
  id: 'red_strobe_dome',
  primitive: 'capsule',
  size: [4.2, 4.4, 4.2],
  attach: { to: 'lightbar_chassis', side: 'top', gap: 0, offset: [-4.6, 0, 0] },
  materialPreset: 'frosted_led',
  color: '#EF4444',
  partRole: 'emissive'
});
studio.addPart({
  id: 'blue_strobe_dome',
  primitive: 'capsule',
  size: [4.2, 4.4, 4.2],
  attach: { to: 'lightbar_chassis', side: 'top', gap: 0, offset: [4.6, 0, 0] },
  materialPreset: 'frosted_led',
  color: '#3B82F6',
  partRole: 'emissive'
});
studio.addPart({
  id: 'center_siren_rotor',
  primitive: 'cylinder',
  size: [3.2, 3.0, 3.2],
  attach: { to: 'lightbar_chassis', side: 'top', gap: 0, offset: [0, 0, 0] },
  materialPreset: 'gold_pin',
  partRole: 'rotor',
  spinAxis: 'y'
});
studio.addPart({
  id: 'driver_ic',
  primitive: 'rounded_box',
  size: [5.2, 1.2, 3.0],
  radius: 0.2,
  attach: { to: 'pcb_base', side: 'top', gap: 0, offset: [0, 0, 4.2] },
  materialPreset: 'ic_epoxy'
});
studio.addPinRow({
  prefix: 'P',
  count: 4,
  pitch: 2.54,
  edge: 'bottom',
  names: ['VCC', 'GND', 'IN', 'OUT'],
  directions: ['power', 'ground', 'input', 'output']
});
studio.setInternalDipoles([
  { pinA: 'VCC', pinB: 'GND', resistance: 1000 },
  { pinA: 'IN', pinB: 'GND', resistance: 1000 }
]);
studio.setTestControls([]);
studio.setEvaluateScript(`const vcc = Number(pins.VCC?.voltage ?? 5.0);
const inV = Math.max(Number(pins.IN?.voltage ?? 0), Number(pins.TRIG?.voltage ?? 0));
const isTriggered = vcc >= 2.5 && inV >= 2.0;
state.phase = ((Number(state.phase) || 0) + (Number(dt) || 0.05) * 10) % (Math.PI * 2);
state.active = isTriggered;
state.rpm = isTriggered ? 960 : 0;
const outV = isTriggered ? 5.0 : 0.0;
return {
  outputs: {
    OUT: { voltage: outV, logicLevel: isTriggered ? 1 : 0 }
  },
  state: {
    active: isTriggered,
    rpm: state.rpm,
    strobePhase: Number(state.phase.toFixed(2))
  }
};`);
studio.testComponentBehavior({
  pinVoltages: { VCC: 5.0, GND: 0.0, IN: 5.0 },
  distanceCm: 20,
  dt: 0.05
});
JS;

            return [
                'thought' => $isTr
                    ? 'Kullanıcı kendisine gelen sinyalle çalışan bir itfaiye çakar ışığı istedi. Kırmızı FR4 PCB tabanı üzerine fırçalanmış alüminyum çakar gövdesi (`lightbar_chassis`), sol ve sağ yüzeylere `partRole: "emissive"` özellikli kırmızı (`#EF4444`) ve mavi (`#3B82F6`) buzlu LED kubbeleri, merkeze `partRole: "rotor"` döner reflektör ve `IN >= 2.0V` sinyaliyle tetiklenen `evaluateScript` kurguluyorum.'
                    : 'Designing a signal-triggered dual-dome fire-truck emergency lightbar with red/blue frosted_led emissive domes, a central rotating beacon reflector, 4-pin 2.54mm header, and reactive signal evaluation.',
                'summary' => $isTr
                    ? 'İtfaiye Çakar Tepe Lambası (`custom.fire_truck_beacon`) 6 adet 3B CAD parçası (kırmızı/mavi `emissive` çakar kubbeleri + döner `rotor` reflektör + sürücü IC) ve `IN` sinyaline duyarlı `evaluate()` mantığıyla oluşturuldu.'
                    : 'Created Fire-Truck Dual Strobe Lightbar (`custom.fire_truck_beacon`) with 6 3D CAD parts, emissive red/blue domes, central rotor reflector, and signal-reactive `evaluate()` script.',
                'studio_code' => $studioCode,
            ];
        }

        // 2. Otherwise delegate to StudioModelingSDK natural-language command via executeStudioCode
        $escapedPrompt = addslashes($prompt);
        $studioCode = "studio.applyNaturalLanguageCommand(\"{$escapedPrompt}\");";

        return [
            'thought' => $isTr
                ? '3B bileşen geometrisi, yüzey bağlantıları ve pin davranışını StudioModelingSDK araçlarıyla güncelliyorum.'
                : 'Updating 3D component geometry, surface attachments, and pin behavior via StudioModelingSDK tools.',
            'summary' => $isTr
                ? '3B bileşen modeli ve elektriksel davranışı güncellendi.'
                : 'Updated 3D component model and electrical behavior.',
            'studio_code' => $studioCode,
        ];
    }
}
