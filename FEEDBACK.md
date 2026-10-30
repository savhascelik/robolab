# Nebius Token Factory — Engineering Feedback Report

**Project:** RoboLab / CircuitLab 3D ([https://robolab.createforkids.com](https://robolab.createforkids.com))  
**Endpoint Used:** `https://api.tokenfactory.nebius.com/v1/chat/completions`  
**Models Evaluated in Production:**
- `nvidia/nemotron-3-super-120b-a12b` (`architect` & `datasheet_synth` roles)
- `Qwen/Qwen3-30B-A3B-Instruct-2507` (`fast_diagnose` role)

This document summarizes our hands-on engineering experience integrating **Nebius Token Factory** into RoboLab's multi-round hardware agent and 3D CAD component studio (`/studio`), based on **49 logged API calls** recorded in our backend `ai_usage_logs` table between October 28 and October 30, 2026.

---

## 1. What Worked Really Well

### 1.1. Drop-In OpenAI Compatibility & Multi-Model Routing
Routing between `nvidia/nemotron-3-super-120b-a12b` and `Qwen/Qwen3-30B-A3B-Instruct-2507` required zero SDK changes—just a single HTTP client in [`backend/app/Services/AiGatewayService.php`](./backend/app/Services/AiGatewayService.php) posting to `https://api.tokenfactory.nebius.com/v1/chat/completions`.

### 1.2. Spatial & Code Synthesis Quality on `nvidia/nemotron-3-super-120b-a12b`
In RoboLab, the LLM does not return chat prose—it writes executable JavaScript against two domain-specific APIs:
1. **`CircuitSDK` (`circuit.*`)** for spawning boards, wiring pins, and writing Arduino/ESP32 C++ firmware.
2. **`StudioModelingSDK` (`studio.*`)** for assembling 3D CAD primitives (`addPart`, `attach: { to, side, offset }`, `addPinRow`) and writing electrical transfer functions (`setEvaluateScript`).

`nvidia/nemotron-3-super-120b-a12b` handled relative 3D coordinate offsets (`[x, y, z]` on top of PCB surfaces) and pin-to-pin electrical logic remarkably well on the first pass, passing our automated `studio.testComponentBehavior()` self-test without needing retry loops on standard actuator/sensor prompts.

### 1.3. Low-Latency Diagnostics on `Qwen/Qwen3-30B-A3B-Instruct-2507`
Offloading single-pass fault explanations (`POST /api/v1/ai/diagnose`) to `Qwen/Qwen3-30B-A3B-Instruct-2507` gave us a **`1,068 ms`** end-to-end turnaround (`50` prompt tokens, `166` completion tokens), which feels instantaneous inside the workbench HUD when a student causes a short circuit.

---

## 2. Friction Points We Hit (and How We Solved Them)

### 2.1. `<think>` Tags & `reasoning_content` vs. `response_format: { "type": "json_object" }`
**What happened:**  
Even when passing `"response_format": { "type": "json_object" }`, reasoning-capable models on Token Factory occasionally emit `<think>...</think>` prefixes inside `choices[0].message.content`, wrap the JSON in ` ```json ... ``` ` fences, or place output inside `choices[0].message.reasoning_content` when `max_tokens` is tight.

**How we fixed it in [`AiGatewayService.php`](./backend/app/Services/AiGatewayService.php#L195-L202):**
1. Before calling `json_decode()`, `extractJsonObject()` strips `<think>.*?</think>` blocks (`preg_replace('/<think>.*?<\/think>/is', '', $trimmed)`), unwraps markdown fences, and falls back to slicing between the first `{` and last `}`.
2. If `message.content` yields an empty object, we inspect `message.reasoning_content` as a secondary extraction source.
3. Setting `"max_tokens" => 2500` prevented mid-JSON truncation on complex 3D CAD component definitions.

### 2.2. Multi-Round Prompt Growth & 28s Timeout Spikes (`ai_usage_logs` IDs `#41` and `#46`)
**What happened:**  
During multi-round agent conversations, full 3D circuit snapshots caused prompt sizes to grow from `~1,400` tokens on Round 1 up to `17,909 – 18,112` tokens by Round 5+.
- At `1,485` prompt tokens / `335` completion tokens (`log #25`), `nemotron-3-super-120b-a12b` responded in **`2,724 ms`**.
- At `18,112` prompt tokens / `3,479` completion tokens (`log #39`), latency reached **`24,926 ms`**.
- Two requests (`log #41` at `4,734` prompt tokens and `log #46` at `12,686` prompt tokens) hit our initial HTTP client timeout at **`28,007 ms`** (`status = ai_provider_exception`).

**How we fixed it:**
1. **Progressive Tool Discovery (`frontend/src/core/ai/capabilityIndex.js`):** Instead of sending all hardware schemas on every turn, we only expose 4 lightweight discovery tools (`searchCapabilities`, `getComponentSchema`, `getFunctionSchema`, `inspectCircuitState`), cutting initial prompt tokens by ~70%.
2. **Observation Clamping (`frontend/src/core/ai/observationBuilder.js`):** Clamped round observations to a hard 48 KB budget (`MAX_OBSERVATION_BYTES`).
3. **Gateway Timeout Tuning (`AiGatewayService.php`):** Increased the HTTP timeout for `nemotron-3-super-120b-a12b` to `90s` with a `15s` connect timeout.

### 2.3. Endpoint & Model ID Normalization
**What happened:**  
Older Nebius documentation and community snippets sometimes reference `https://api.studio.nebius.com/v1` or inconsistent model ID casing.
- We added automatic URL normalization in `AiGatewayService.php` (`api.studio.nebius.com` -> `https://api.tokenfactory.nebius.com/v1`) so existing `.env` configurations never break.

---

## 3. Actionable Suggestions for the Nebius Token Factory Team

1. **Strict JSON Mode Guarantee with Reasoning Models:**  
   When `response_format: { "type": "json_object" }` is specified on `nvidia/nemotron-3-super-120b-a12b`, always route `<think>` tokens exclusively into `message.reasoning_content` and guarantee that `message.content` begins with `{` and ends with `}`. Additionally, separating the token budget (`max_reasoning_tokens` vs. `max_completion_tokens`) would prevent reasoning chains from starving the final JSON payload.
2. **Document `chat_template_kwargs.enable_thinking` in the Model Card UI:**  
   For latency-sensitive agent loops that only need structured tool/code emission, surfacing `chat_template_kwargs: { "enable_thinking": false }` directly in the Token Factory playground snippet generator would save developers hours of benchmarking.
3. **Automatic Prompt Prefix Caching Metrics in `usage`:**  
   In multi-round agentic loops (like our 5-round hardware synthesis where the system prompt and tool definitions stay identical across turns), exposing `prompt_tokens_details.cached_tokens` in the response JSON would help developers optimize prefix layout for lower TTFT.
