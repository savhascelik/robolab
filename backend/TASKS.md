# Backend (Laravel 12 API, RBAC, Gruplar & AI Gateway) — Faz Faz Görev Planı (`TASKS.md`)

> **Konum:** `C:\laragon\www\hackathon\webmcp2\yeniproje\fikirler\nebius\backend`  
> **Mimari İlham:** `flownie-backend` (`Laravel 12` + `Sanctum` + `spatie/laravel-permission` + `RoleLimit` + Çoklu Model AI Paketi + Dokploy Hazırlığı)  
> **Mühendislik Kuralı:** Hiçbir faz, otomatik birim/entegrasyon testi yazılmadan ve **Bilerek Bozma (`Sabotage -> FAIL`) + Geri Alma (`Rollback -> PASS`)** kontrol noktasından geçmeden tamamlanmış sayılmaz.

---

## Mimari İlkeler
1. **İnce API & AI Gateway (Thin Backend):** 3B sahne ve devre fiziği istemcide (tarayıcıda) çalışır; Laravel backend yalnızca `/api/v1/*` üzerinden kimlik doğrulama, rol/izin/limit denetimi, çalışma grupları, devre/komponent paylaşımı ve güvenli AI (Nebius Token Factory + Tavily) orkestrasyonunu yönetir.
2. **Öğretmen/Öğrenci Kısıtlaması Yok — Rol & İzin + Kota Modeli:**
   * Kullanıcılar "öğretmen" veya "öğrenci" diye ayrılmaz; herkes grup kurabilir, devre paylaşabilir ve komponent üretebilir.
   * `spatie/laravel-permission` ve `RoleLimit` (`flownie-backend` modeli) ile kullanıcı paketleri (`unverified`, `free`, `pro`, `judge`, `admin`) tanımlanır.
   * **Hackathon Jüri Rolü (`judge`):** Tek tıkla (veya erişim kodu / Magic Link ile) giriş yapan jüri üyesine otomatik `judge` rolü atanır; tüm izinler açık olur ve güvenli günlük AI/Tavily kotası tanımlanır.
3. **Genişletilebilir AI Paketi (`App\Services\AiGateway`):**
   * Yarışma için **Nebius Token Factory (`Nemotron 3 Ultra / Super / Nano`)** ve **Tavily Datasheet Search** varsayılan sağlayıcıdır.
   * Ancak `ai_models` ve `ai_usage_ledger` tabloları (`flownie-backend` yapısına benzer şekilde) ileride farklı sağlayıcıları ve kredi paketlerini destekleyecek şekilde soyutlanır (`AiProviderInterface`).

---

## Faz 1: Laravel 12 İskeleti, Sağlık Kontrolü (`/api/health`) ve Sabotaj Test Altyapısı
- [x] **Task 1.1:** `backend/` dizininde Laravel API iskeletini, `laravel/sanctum`, `spatie/laravel-permission` ve PHPUnit test altyapısını kur (`.env.example` ve `config/ai.php` içinde SQLite/MySQL, Redis/Cache, `NEBIUS_API_KEY`, `TAVILY_API_KEY`, Cloudflare AI Gateway ve `JUDGE_ACCESS_CODE` tanımları).
- [x] **Task 1.2:** `flownie-backend` uyumlu `/api/health` uç noktasını (`database`, `cache`, `storage`, `ai_config` kontrolleri) ve merkezi JSON hata/yanıt zarfını (`ApiResponse`) oluştur.
- [x] **Task 1.3:** Backend için otomatik **Bilerek Bozma ve Geri Alma (`scripts/sabotage-verify.php`)** test koşucusunu yaz.
- [x] **🛑 Kontrol Noktası 1 (Test & Sabotaj) — DOĞRULANDI:**
  * **Test:** `php artisan test --filter=HealthCheckTest` (`2 passed, 19 assertions, 455ms`)
  * **Bilerek Bozma (Sabotaj):** `/api/health` içindeki HTTP durum kodunu kasıtlı boz (`200` -> `500`), testin **FAIL (`exit 1`)** verdiğini kanıtla.
  * **Geri Alma (Rollback):** Kodu geri al ve testin **PASS (`exit 0`)** geçtiğini doğrula.

---

## Faz 2: Kimlik Doğrulama (`Sanctum`), Rol/İzin (`Spatie`) ve Sıfır Sürtünmeli Jüri Girişi
- [x] **Task 2.1:** `User` ve `UserProfile` modellerini (`ui_preferences`, `avatar_url`, `bio`, `username`) oluştur; kullanıcı oluşturulduğunda varsayılan profil ve `free` rolünün otomatik atanmasını sağla.
- [x] **Task 2.2:** `RolePermissionSeeder` ve `RoleLimitSeeder` sınıflarını (`flownie-backend` mimarisiyle) oluştur:
  * **Roller:** `unverified`, `free`, `pro`, `judge` (Hackathon Jürisi), `admin`.
  * **İzinler:**
    * `scenarios.view`, `scenarios.create`, `scenarios.edit`, `scenarios.delete`, `scenarios.publish`, `scenarios.fork`
    * `groups.view`, `groups.create`, `groups.manage`, `groups.invite`, `groups.join`
    * `components.view`, `components.synthesize_ai`, `components.publish`
    * `ai.copilot`, `ai.circuit_builder`, `ai.datasheet_search`
    * `admin.access`
  * **Limitler (`role_limits` tablosu):** Her rol için maksimum grup sayısı, maksimum kayıtlı devre sayısı, maksimum özel AI komponent sayısı ve günlük AI istek limiti (`LimitService`).
- [x] **Task 2.3:** `AuthController` ve `UserSettingsController` uçlarını kodla:
  * `POST /api/v1/auth/register`
  * `POST /api/v1/auth/login`
  * `POST /api/v1/auth/judge-access` *(Jüri erişim kodu veya `?judge_token=...` Magic Link ile form doldurmadan tek tıkla `judge` rolünde gerçek Sanctum token üretimi)*
  * `GET /api/v1/auth/me` *(Kullanıcı bilgisi + `roles` + `permissions` + `limits` + `ui_preferences` + `allowed_boards` tek pakette döner)*
  * `POST /api/v1/auth/logout`
  * `GET/PUT /api/v1/user/settings` *(Frontend'deki `RemoteApiSettingsAdapter` ile %100 uyumlu kullanıcı ayar senkronizasyonu)*
- [x] **🛑 Kontrol Noktası 2 (Test & Sabotaj) — DOĞRULANDI:**
  * **Test:** `php artisan test --filter=AuthAndPermissionTest` (`5 passed, 43 assertions, 1359ms`)
  * **Bilerek Bozma (Sabotaj):**
    1. `judge-access` uç noktasında yanlış erişim koduna `200 OK` döndürecek şekilde doğrulamayı boz -> Testin **FAIL (`exit 1`)** verdiğini kanıtla.
    2. `RolePermissionSeeder` içinde `free` rolünün `groups.create` iznini kaldır -> Testin **FAIL (`exit 1`)** verdiğini kanıtla.
  * **Geri Alma (Rollback):** Değişiklikleri geri al ve tüm Auth/RBAC testlerinin **PASS (`exit 0`)** geçtiğini doğrula.

---

## Faz 3: Özgür Çalışma Grupları (`Groups`) ve Devre/Komponent Paylaşım & Fork Sistemi
- [x] **Task 3.1:** Çalışma Grupları (`study_groups` ve `study_group_members`) tablolarını ve `GroupController` uçlarını oluştur:
  * Herkes (`free`, `pro`, `judge`) kendi çalışma grubunu (sınıf, kulüp, takım veya açık atölye) kurabilir (`POST /api/v1/groups`).
  * Benzersiz davet kodu (`invite_code`, örn. `LAB-XXXX99`) üretimi ve tek tıkla gruba katılma (`POST /api/v1/groups/join`).
  * Grup içi paylaşılan devrelerin ve özel komponentlerin listelenmesi (`GET /api/v1/groups/{slug}`).
- [x] **Task 3.2:** 3B Devre Senaryoları (`circuit_scenarios` tablosu) ve `ScenarioController` uçlarını oluştur:
  * Frontend'deki `CircuitScenarioSchema v2` JSON yapısını (`boards`, `components`, `connections`, `code`, `custom_components`) saklar.
  * Görünürlük seçenekleri: `private`, `group` (seçili gruplarla paylaşılan), `public` (topluluk vitrini).
  * **Tek Tıkla Klonlama (`POST /api/v1/scenarios/{idOrSlug}/fork`):** Bir kullanıcının veya grup üyesinin paylaşılan devreyi kendi çalışma alanına kopyalayıp (`remixed_from_id`) üzerinde değişiklik yapabilmesi.
- [x] **Task 3.3:** Topluluk & Grup Özel Komponent Kütüphanesi (`custom_components` tablosu ve `CustomComponentController`):
  * AI + Tavily ile üretilen yeni 3B komponentlerin (`pinout`, `electrical_specs`, `internal_dipoles`, `mesh_recipe`) kaydedilmesi ve grup/topluluk içinde yeniden kullanılması.
- [x] **🛑 Kontrol Noktası 3 (Test & Sabotaj) — DOĞRULANDI:**
  * **Test:** `php artisan test --filter=GroupAndScenarioSharingTest` (`3 passed, 30 assertions, 918ms` — ayrıca yarı-açık uçlarda Sanctum guard önbellekleme sızıntısını önleyen `ResetSanctumGuardPerRequest` katmanı eklendi)
  * **Bilerek Bozma (Sabotaj):** `ScenarioController::show` içinde `private` devre sahiplik kontrolünü devre dışı bırak -> Başka kullanıcının özel devreyi okuyabildiğini yakalayan güvenlik testinin **FAIL (`exit 1`)** verdiğini kanıtla.
  * **Geri Alma (Rollback):** Sahiplik kontrolünü geri al ve **PASS (`exit 0`)** doğrula.

---

## Faz 4: OpenAI-Uyumlu & Cloudflare AI Gateway Destekli Evrensel AI Paketi (`AiGatewayService` + `Tavily` Cache)
- [x] **Task 4.1:** **OpenAI-Compatible + Cloudflare AI Gateway** mimarisine sahip `ai_models` ve `ai_usage_logs` tablolarını ve `AiModelSeeder` sınıfını oluştur:
  * **Neden Bu Mimari?** Nebius Token Factory (`https://api.tokenfactory.nebius.com/v1`), Cloudflare AI Gateway (`https://gateway.ai.cloudflare.com/v1/{account}/{gateway}/...`), Google Gemini OpenAI ucu (`https://generativelanguage.googleapis.com/v1beta/openai`), OpenRouter ve yerel Ollama **birebir aynı OpenAI `/v1/chat/completions` protokolünü** konuşur.
  * `ai_models` tablosunda her model şu dinamik alanları taşır:
    * `provider_slug` (`nebius`, `cloudflare_aig`, `openai`, `gemini_compat`, `openrouter`, `ollama`)
    * `base_url` (Varsayılan: `https://api.tokenfactory.nebius.com/v1` veya `.env`'de tanımlıysa **Cloudflare AI Gateway** URL'si)
    * `model_id` (Örn: `nvidia/NVIDIA-Nemotron-3-Ultra-253B-v1`, `nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-v1`, `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-v1`, `nvidia/NVIDIA-Nemotron-Nano-12B-v2-VL`)
    * `task_role` (`architect` | `fast_diagnose` | `datasheet_synth` | `vision`) — **Görev bazlı model ataması!** Hangi görevde hangi modelin çalışacağı kodda sabit yazılmaz, veritabanından okunur.
    * `default_extra_payload` (JSON — örn. Nemotron Nano için `{"chat_template_kwargs": {"enable_thinking": false}}`)
  * **Sonradan Sıfır Kod Değişikliğiyle Model Değişimi:** Yarışma sırasında aktif modeller Nebius `Nemotron` ailesidir; yarışma sonrasında veya istenilen herhangi bir anda tek satır kod değiştirmeden veritabanından (`PUT /api/v1/ai/models/{id}/activate` veya `.env` üzerinden) herhangi bir görev `Gemini`, `OpenAI`, `Claude (OpenRouter)` veya `Cloudflare AI Gateway` arkasına geçirilebilir.
  * **BYOK (Kendi Anahtarını Getir) + Cloudflare AI Gateway Header Desteği:** İstek başlığında (`X-User-Ai-Key`, `X-User-Ai-Base-Url`, `X-User-Tavily-Key`) veya sunucu `.env` dosyasında `CF_AIG_TOKEN` (`cf-aig-authorization`) varsa otomatik iletilir.
- [x] **Task 4.2:** `TavilyDatasheetService` sınıfını ve **Kalıcı Önbellek (`datasheet_caches` tablosu)** katmanını yaz:
  * Kullanıcı sahnede olmayan bir komponent istediğinde (örn. `"MPU6050"`, `"DHT22"`, `"BH1750"`), önce yerel veritabanı önbelleğine bakar.
  * Önbellekte yoksa Tavily API ile gerçek datasheet/pinout verisini çeker, önbelleğe yazar (böylece 1.000'lik Tavily kotası asla boşa harcanmaz) ve o an `datasheet_synth` görevine atanmış aktif model ile 3B komponent + elektriksel dipol şemasına dönüştürür.
- [x] **Task 4.3:** `AiLabController` uçlarını oluştur:
  * `GET /api/v1/ai/models` *(Aktif görev-model eşleşmelerini listeler)*
  * `PUT /api/v1/ai/models/{id}/activate` *(Çalışma zamanında sıfır kod değişikliğiyle aktif model/sağlayıcı/Gateway değiştirir)*
  * `POST /api/v1/ai/build-circuit` *(Doğal dilden tam 3B devre + kablo bağlantıları + çalışan Arduino/ESP32/Jetson kodu üretir)*
  * `POST /api/v1/ai/synthesize-component` *(Tavily + aktif AI modeli ile gerçek datasheet'ten yeni 3B komponent sentezler)*
  * `POST /api/v1/ai/diagnose-circuit` *(Sahnedeki mevcut `CircuitFlowSolver` hatalarını ve kodu analiz edip `fast_diagnose` modeliyle `<2 sn` içinde hızlı onarım önerisi ve sahne aksiyonu döndürür)*
- [x] **🛑 Kontrol Noktası 4 (Test & Sabotaj) — DOĞRULANDI:**
  * **Test:** `php artisan test --filter=AiGatewayAndTavilyCacheTest` (`4 passed, 31 assertions, 1046ms`)
  * **Bilerek Bozma (Sabotaj):** `AiGatewayService` içinde görev-model (`task_role`) çözümlemesini (4A) ve `TavilyDatasheetService` içinde cache okuma satırını (4B) devre dışı bırak -> Her iki testin de **FAIL (`exit 1`)** verdiğini kanıtla.
  * **Geri Alma (Rollback):** Kodu geri al ve **PASS (`exit 0`)** doğrula.

---

## Faz 5: Dokploy Dağıtım Paketi (`Dockerfile`, `dokploy.json`) ve Uçtan Uca API Denetimi
- [x] **Task 5.1:** `flownie-backend` yapısına uygun üretim `Dockerfile` (Nginx + PHP-FPM + OPcache), `docker/start.sh` (otomatik `migrate --force` ve `db:seed`) ve CORS yapılandırmasını hazırla.
- [x] **Task 5.2:** Jüri demosu için başlangıç verilerini (`DatabaseSeeder`: Hazır Jüri hesabı, örnek "Açık Donanım Atölyesi" grubu, 3 hazır paylaşılmış devre ve önbelleğe alınmış 5 popüler Tavily sensör datasheet'i) tohumla.
- [x] **🛑 Kontrol Noktası 5 (Tam Sistem Sabotaj Doğrulaması) — DOĞRULANDI:**
  * Tüm backend test süitini (`php artisan test`: `18 passed, 165 assertions, 2416ms`) ve `php scripts/sabotage-verify.php --phase=all` betiğini koşturarak 5 fazdaki toplam **7 sabotaj ve geri alma kontrol noktasının** tamamının (`PASS exit 0 -> SABOTAGE FAIL exit 1 -> ROLLBACK PASS exit 0`) hatasız geçtiğini kanıtla.
