# Telemetry & Performance Measurements

All numbers in this document come from two verifiable sources in this repository:
1. **Cloud LLM Telemetry:** Real production rows recorded in `backend/storage/database/database.sqlite` (`ai_usage_logs` table, IDs `#1` through `#49`).
2. **Deterministic Physics & 3D CAD Benchmarks:** Measured directly on Node.js v24.19.0 against `CircuitFlowSolver`, `DisjointNetSet`, and `StudioModelingSDK`.

---

## 1. Nebius Token Factory LLM Telemetry (`ai_usage_logs`)

### 1.1. Summary by Model & Task Role (Live Nebius Calls, `ID #12 – #49`)

| Task Role | Nebius Model ID | Calls (`n`) | Success Rate | Prompt Tokens (Min / Med / Max) | Completion Tokens (Min / Med / Max) | Latency `ms` (Min / Med / P90 / Max) | Avg Output Speed |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **`architect`** (Multi-Round Circuit & 3D Studio Synthesis) | `nvidia/nemotron-3-super-120b-a12b` | 36 | 91.7% (33/36)* | 903 / 4,378 / 18,112 | 241 / 926 / 3,479 | **2,233 ms** / **5,459 ms** / **12,990 ms** / **24,926 ms** | ~138 tok/s |
| **`datasheet_synth`** (Datasheet-to-3D Spec) | `nvidia/nemotron-3-super-120b-a12b` | 1 | 100% (1/1) | 49 | 1,141 | **6,550 ms** | ~174 tok/s |
| **`fast_diagnose`** (Live Fault Diagnostics) | `Qwen/Qwen3-30B-A3B-Instruct-2507` | 1 | 100% (1/1) | 50 | 166 | **1,068 ms** | ~155 tok/s |

*\*Note on the 3 failed calls (`#24`, `#41`, `#46`): `#24` (`10,011 ms`) and `#41` / `#46` (`28,007 ms`) occurred before we raised the HTTP client timeout from 28s to 90s and clamped multi-round observations to 48 KB in `AiGatewayService.php`.*

---

### 1.2. Representative Production Log Sample (`ai_usage_logs`)

Below is an unaltered sample of logged calls from `App\Models\AiUsageLog`:

| Log ID | Timestamp (UTC) | Task Role | Model ID | Prompt Tokens | Completion Tokens | Latency (`ms`) | Est. Cost (USD)* | Status |
| :---: | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `#12` | `2026-10-29 19:50:11` | `architect` | `nvidia/nemotron-3-super-120b-a12b` | 903 | 397 | `2,658` | `$0.00042` | `success` |
| `#13` | `2026-10-29 19:58:25` | `architect` | `nvidia/nemotron-3-super-120b-a12b` | 3,138 | 2,622 | `11,611` | `$0.00220` | `success` |
| `#14` | `2026-10-29 19:58:29` | `architect` | `nvidia/nemotron-3-super-120b-a12b` | 3,877 | 545 | `3,529` | `$0.00110` | `success` |
| `#16` | `2026-10-29 19:58:44` | `architect` | `nvidia/nemotron-3-super-120b-a12b` | 6,225 | 1,770 | `9,275` | `$0.00231` | `success` |
| `#18` | `2026-10-29 20:41:28` | `architect` | `nvidia/nemotron-3-super-120b-a12b` | 1,251 | 434 | `3,114` | `$0.00051` | `success` |
| `#20` | `2026-10-29 20:41:44` | `architect` | `nvidia/nemotron-3-super-120b-a12b` | 2,731 | 325 | `2,233` | `$0.00074` | `success` |
| `#25` | `2026-10-29 23:52:59` | `architect` | `nvidia/nemotron-3-super-120b-a12b` | 1,485 | 335 | `2,724` | `$0.00050` | `success` |
| `#29` | `2026-10-29 23:53:37` | `architect` | `nvidia/nemotron-3-super-120b-a12b` | 6,166 | 427 | `3,186` | `$0.00149` | `success` |
| `#34` | `2026-10-29 23:54:16` | `architect` | `nvidia/nemotron-3-super-120b-a12b` | 15,156 | 649 | `4,865` | `$0.00342` | `success` |
| `#39` | `2026-10-30 00:06:52` | `architect` | `nvidia/nemotron-3-super-120b-a12b` | 18,112 | 3,479 | `24,926` | `$0.00571` | `success` |
| `#44` | `2026-10-30 00:12:46` | `architect` | `nvidia/nemotron-3-super-120b-a12b` | 17,497 | 868 | `6,616` | `$0.00402` | `success` |
| `#47` | `2026-10-30 10:52:38` | `architect` | `nvidia/nemotron-3-super-120b-a12b` | 1,748 | 2,192 | `22,223` | `$0.00166` | `success` |
| `#48` | `2026-10-30 12:20:49` | `fast_diagnose` | `Qwen/Qwen3-30B-A3B-Instruct-2507` | 50 | 166 | `1,068` | `$0.00004` | `success` |
| `#49` | `2026-10-30 12:20:55` | `datasheet_synth` | `nvidia/nemotron-3-super-120b-a12b` | 49 | 1,141 | `6,550` | `$0.00069` | `success` |

*\*Cost calculated using Nebius Token Factory rates (`$0.20 / 1M` input, `$0.60 / 1M` output for `Nemotron-3-Super-120B`; `$0.06 / 1M` input, `$0.24 / 1M` output for 30B-A3B).*  
**Total cost across all 38 live Nebius calls during development & testing:** **`~$0.064 USD` (6.4 cents)**.

---

## 2. Deterministic Physics & 3D CAD Engine vs. Cloud LLM

A core architectural principle of RoboLab is **never calling an LLM for work that a deterministic physics solver can compute locally at 60 FPS**.

| Subsystem | Execution Layer | Operation | Measured Latency | Frame / Session Budget |
| :--- | :--- | :--- | :---: | :--- |
| **`CircuitFlowSolver.solve()`** | Browser (JS / Union-Find) | 1 closed-loop electrical + breadboard netlist step (`1,000` iterations avg) | **`0.0174 ms`** | `16.67 ms` (60 FPS) — uses **0.10%** of frame |
| **`StudioModelingSDK.testComponentBehavior()`** | Browser (`/studio` Sandbox) | Compile 3D CAD `parts[]` + PBR materials + 2.54mm pins + run closed-loop `evaluate()` self-test | **`7.405 ms`** | `< 50 ms` interactive UI budget |
| **Tavily Datasheet Cache Hit** | Backend (`DatasheetCache` SQLite) | Lookup cached sensor pinout & voltage limits (30-day TTL) | **`~1.8 ms`** | Saves `1` Tavily credit + `~6.5s` LLM synth |
| **`Qwen/Qwen3-30B-A3B-Instruct-2507`** | Nebius Token Factory | Natural-language fault explanation (`fast_diagnose`) | **`1,068 ms`** | `< 2,000 ms` HUD target |
| **`nvidia/nemotron-3-super-120b-a12b`** | Nebius Token Factory | Single-turn 3D Studio CAD synthesis or Code Mode circuit step (median) | **`5,459 ms`** | `< 10,000 ms` interactive agent turn |

---

## 3. Reproducing the Local Benchmarks

You can reproduce the deterministic solver and 3D Studio self-test timings on any machine with Node.js 20+:

```bash
cd frontend
node tests/architecture.test.js
# Runs all 49 architecture, inheritance, closed-loop electrical solver, Code Mode, and /studio tests (~2.8s total)
```
