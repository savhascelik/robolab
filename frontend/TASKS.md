# Frontend (3B Donanım Çalışma Masası, Gerçek Devre/Kod Motoru & Komut İskelesi) — Faz Faz Görev Planı (`TASKS.md`)

> **Konum:** `C:\laragon\www\hackathon\webmcp2\yeniproje\fikirler\nebius\frontend`  
> **Kaynak Çekirdek:** `C:\laragon\www\hackathon\learn-arduino-3d` *(Orijinal klasöre dokunulmaz; sağlam 3B/OOP/Elektrik çekirdeği buraya taşınıp eski arayüzden tamamen arındırıldı)*  
> **Tasarım Referansı:** **Spline 3D / Figma Canvas / Linear / Teenage Engineering** (Tam ekran 3B çalışma alanı, alt-ortada yüzen birleşik araç + komut iskelesi, yalnızca çağrıldığında açılan rafine paneller, sıfır yapay AI gradyanı/parıltı ikonu).  
> **Doğrulama Özeti:** `npm test` -> **46/46 PASS** (`tests/architecture.test.js`); `node tests/sabotage-verify.js --phase=all` -> **11/11 Sabotaj & Rollback Kontrol Noktası PASS**.

---

## Tasarım ve Mühendislik İlkeleri

1. **"AI Klişesi" Yasağı (Zero AI Slop):**
   * Mor-pembe-camgöbeği neon gradyanlar (`linear-gradient(purple, pink)`), sahte parıltı/sihirli değnek ikonları (`✨`, `🪄`, `🤖`) ve sohbet balonu kalabalığı **kesinlikle kullanılmaz**.
   * İkonografi tamamen teknik ve endüstriyel çizgisel vektörlerden (`1.5px stroke` teknik şematik semboller: entegre devre, osiloskop dalgası, terminal, kablo düğümü, multimetre probu) oluşur.
2. **Tuval-Öncelikli Mimari (Canvas-First & Progressive Disclosure):**
   * Ekran açıldığında merkezde **yalnızca 3B Donanım Masası (Kartlar ve Parçalar)** ile **Alt-Ortada Yüzen Birleşik Araç & Komut İskelesi (`BottomFloatingDock`)** ve **Üstte İnce Durum/Proje Kapsülü (`TopContextPill`)** görünür.
   * **Kod Editörü**, **Örnek Devreler & Gruplar**, **Komponent Kütüphanesi / Datasheet Sentezleyici** ve **Oturum/Ayarlar** varsayılan olarak **kapalıdır**; kullanıcı yalnızca ihtiyaç duyduğunda (`Dock` butonları veya kısayollarla) açılır ve açıldığında katmanlı, ince kenarlıklı (`1px solid`), yüksek kontrastlı paneller/modallar olarak gelir.
3. **Gerçek Elektronik Renk Sistemi + Karanlık / Aydınlık Mod (`Dark` & `Light` Theme):**
   * **Karanlık Mod (Varsayılan — Industrial Carbon):** Tuval `#0B0C0E`, yüzen yüzeyler `rgba(20, 22, 25, 0.84)` (`backdrop-filter: blur(20px)`), kenarlıklar `#262930` (`1px`), metin `#F3F4F6` / `#9CA3AF`.
   * **Aydınlık Mod (Technical Drafting Paper):** Tuval `#F3F2EE`, yüzen yüzeyler `rgba(255, 255, 255, 0.88)`, kenarlıklar `#E2E4E9`, metin `#111827` / `#4B5563`.
   * **Vurgu Renkleri (Gerçek Sinyal Renkleri):** `5V Güç Kırmızısı (#EF4444)`, `3.3V Amber (#F59E0B)`, `Dijital Sinyal Zümrüt (#10B981)`, `I2C/Veri Kobalt (#3B82F6)`, `Topraklama Kaya Grisi (#64748B)`.
4. **Tam Yerelleştirme (`TR` / `EN`) ve Ölçülebilir Sabotaj Testi:**
   * Tüm arayüz metinleri, hata teşhisleri ve araç ipuçları merkezi `I18nService` (`tr` / `en`) üzerinden çalışır; sabit metin yazılmaz.
   * Her faz, otomatik birim/entegrasyon testi (`npm test`) ve **Bilerek Bozma (`Sabotage -> FAIL`) + Geri Alma (`Rollback -> PASS`)** kontrol noktasından geçmeden tamamlanmış sayılmaz.

---

## Faz 1: Çekirdeğin Taşınması, Eski Arayüzün Sökülmesi ve Yeni "Tuval + Alt İskele" Tasarım Sistemi — TAMAMLANDI
- [x] **Task 1.1:** `learn-arduino-3d` içindeki sağlam 3B/OOP/Elektrik çekirdeğini (`src/core/`, `src/hardware/`, `src/stage/`, `vendor/`, `tests/`) `nebius/frontend/` dizinine taşı; eski arayüz CSS/HTML kalıntılarını (`#clock`, `#minimap`, `#lesson-list`, sabit sağ/sol paneller, ders şeritleri) tamamen temizle (`index.html`, `src/styles/main.css`).
- [x] **Task 1.2:** **Tema (`ThemeService`: Dark/Light) ve Yerelleştirme (`I18nService`: TR/EN) Altyapısı:**
  * `src/core/theme/ThemeService.js` ile CSS değişken tabanlı (`--bg-canvas`, `--surface-floating`, `--border-hairline`, `--text-primary`, `--signal-5v`, `--signal-3v3`, `--signal-ok`) gerçek Karanlık ve Aydınlık mod desteği kuruldu.
  * `BoardStage.applyThemeTokens()` ile 3B sahne zemini ve ışıklandırması aktif temaya (`Dark Carbon #0B0C0E` <-> `Light Drafting Studio #F3F2EE`) göre dinamik uyarlandı.
- [x] **Task 1.3:** **Alt-Orta Yüzen İskele (`BottomFloatingDock.js`) ve İnce Üst Kapsül (`TopContextPill.js`):**
  * `src/ui/workbench/BottomFloatingDock.js` ve `src/ui/workbench/TopContextPill.js` inşa edildi (sıfır yapay parıltı/gradyan, gerçek elektronik sinyal renkleri).
- [x] **🛑 Kontrol Noktası 1 (Test & Sabotaj) — DOĞRULANDI:**
  * **Test:** `tests/architecture.test.js` (Test 19) -> PASS.
  * **Bilerek Bozma & Geri Alma:** `node tests/sabotage-verify.js --phase=1` -> `Baseline PASS -> Sabotage CAUGHT (exit 1) -> Rollback PASS`.

---

## Faz 2: İhtiyaç Halinde Açılan Kod Çekmecesi (`CodeDrawer`) ve Gerçek Kod ↔ `CircuitFlowSolver` Bağlantısı — TAMAMLANDI
- [x] **Task 2.1:** Alt iskeleden `[Kod]` (`Ctrl+E`) ile açılıp kapanan, varsayılan olarak kapalı (`isOpen === false`), satır numaralı, yazılabilir **`src/ui/workbench/CodeDrawerController.js`** paneli oluşturuldu.
- [x] **Task 2.2:** Yazılan C++/Python kodunu ayrıştırıp doğrudan `BaseHostBoard` pinlerini süren ve her adımda `CircuitFlowSolver.solve()` çalıştıran **`src/sim/LiveCodeRuntime.js`** motoru yazıldı (`pinMode`, `digitalWrite`, `analogWrite`, `servo.write`, `tone`, `Serial.println`, `GPIO.output`).
- [x] **Task 2.3:** Komponentlerin yalnızca **gerçekten kablo bağlıysa ve kapalı devre oluşuyorsa** çalışması sağlandı (kablo koparılırsa LED anında `brightness === 0` olur; kodda pin `13` -> `8` değiştirildiğinde Pin 13 söner ve Pin 8'e bağlı devre sürülür).
- [x] **🛑 Kontrol Noktası 2 (Test & Sabotaj) — DOĞRULANDI:**
  * **Test:** `tests/architecture.test.js` (Test 20) -> PASS.
  * **Bilerek Bozma & Geri Alma:** `node tests/sabotage-verify.js --phase=2` -> `Baseline PASS -> Sabotage CAUGHT (exit 1) -> Rollback PASS`.

---

## Faz 3: 3B NVIDIA Jetson Nano Kartı (`JetsonNanoBoard.js`) ve Açılır Parça Kataloğu / Dinamik Parça Fabrikası — TAMAMLANDI
- [x] **Task 3.1:** `BaseSBCBoard` sınıfından miras alan prosedürel **3B `src/hardware/boards/JetsonNanoBoard.js` (`board.jetson_nano`)** modeli inşa edildi ve `ComponentRegistry` içine kaydedildi (Yeşil taşıyıcı PCB, siyah eloksallı soğutucu blok, 40-pin J41 `3.3V` GPIO başlığı, `maxVoltage = 3.6V`, CSI kamera portu, Gigabit Ethernet ve USB 3.0 kulesi).
- [x] **Task 3.2:** Alt iskeleden `[+ Parça]` tıklandığında açılan **`src/ui/workbench/ComponentPalettePopover.js`** ve **Dinamik Özel Komponent Fabrikası (`src/core/components/DynamicComponentBuilder.js`)** yazıldı (`BME280`, `MPU6050`, `INA219`, `BH1750`, `DHT22` ve özel JSON şemalarından çalışma zamanında gerçek `ElectricalPin` + `ConductiveDipole` + 3B mesh üretimi).
- [x] **Task 3.3:** `HardwareComponent.setXRayMode(enabled)` ve `BoardStage.setXRayMode(enabled)` ile iç iletken yolları (`Dipole X-Ray`) görünümü eklendi.
- [x] **🛑 Kontrol Noktası 3 (Test & Sabotaj) — DOĞRULANDI:**
  * **Test:** `tests/architecture.test.js` (Test 21) -> PASS.
  * **Bilerek Bozma & Geri Alma:** `node tests/sabotage-verify.js --phase=3` -> `Baseline PASS -> Sabotage CAUGHT (exit 1) -> Rollback PASS`.

---

## Faz 4: Alt İskele Komut Satırı ↔ Sahne Aksiyon Yürütücüsü (`StageAiCommandExecutor.js`) — TAMAMLANDI
- [x] **Task 4.1:** Alt iskeledeki komut satırından gelen yapılandırılmış planları 3B sahnede yürüten ve her işlem öncesi atomik `ScenarioSerializer` + kod anlık görüntüsü alıp tek tıkla geri döndüren **`src/core/ai/StageAiCommandExecutor.js`** yazıldı (`setHostBoard`, `spawnComponent`, `registerCustomComponent`, `connectPins`, `smartConnect`, `updateCode`, `startSimulation`, `stopSimulation`, `undoLastTransaction`).
- [x] **Task 4.2:** **`src/core/ai/BackendApiClient.js`** ve **`src/ui/workbench/DiagnosticHudCard.js`** ile doğal dil devre kurulumu ve `<2 sn` elektriksel arıza teşhisi (`overvoltage`, `overcurrent`, `short_circuit`) bağlandı.
- [x] **🛑 Kontrol Noktası 4 (Test & Sabotaj) — DOĞRULANDI:**
  * **Test:** `tests/architecture.test.js` (Test 22) -> PASS.
  * **Bilerek Bozma & Geri Alma:** `node tests/sabotage-verify.js --phase=4` -> `Baseline PASS -> Sabotage CAUGHT (exit 1) -> Rollback PASS`.

---

## Faz 5: İhtiyaç Halinde Açılan Örnek Projeler, Çalışma Grupları ve Jüri Giriş Modalı — TAMAMLANDI
- [x] **Task 5.1:** **Örnek Projeler & Çalışma Grupları Modalı (`src/ui/workbench/ProjectsAndGroupsModal.js`):**
  * Varsayılan olarak kapalı (`isOpen === false`), 3 hazır 3B referans devre (`Arduino Uno — Akıllı Kavşak & Servo Bariyer`, `ESP32 — Sera Telemetri & Özel DHT22 Sensör`, `NVIDIA Jetson Nano — Edge AI Termal Watchdog`), `Açık Donanım Atölyesi` (`LAB-NEBIUS26`) çalışma grubu, grup oluşturma/katılma, aktif sahneyi `customComponents[]` ile paylaşma ve tek tıkla forklama.
- [x] **Task 5.2:** **Oturum, Tek Tıkla Jüri Girişi & Ayarlar Modalı (`src/ui/workbench/AuthAndSettingsModal.js`):**
  * Varsayılan olarak kapalı (`isOpen === false`), tek tıkla **Hackathon Jüri Girişi**, standart giriş/kayıt, OpenAI-uyumlu AI çıkarım modeli seçici (`Nemotron 70B`, `Qwen 2.5 Coder 32B`, `DeepSeek R1`) ve isteğe bağlı `BYOK` anahtar yönetimi.
  * Tüm bileşenler **`src/main.js`** (`initSpatialWorkbench()`) içinde birleştirildi.
- [x] **🛑 Kontrol Noktası 5 (Uçtan Uca Entegrasyon & Sabotaj Doğrulaması) — DOĞRULANDI:**
  * **Test:** `tests/architecture.test.js` (Test 23) -> PASS (`23/23 Architecture & Inheritance Tests Passed`).
  * **Bilerek Bozma & Geri Alma:** `node tests/sabotage-verify.js --phase=5` -> `Baseline PASS -> Sabotage CAUGHT (exit 1) -> Rollback PASS`.

---

## Faz 6: 3B Robotik & Edge AI Vitrin Landing Page (İki Ayrı 3B Sahne: Otonom Sumo Robotu & NVIDIA Jetson Nano Kamera Robotu) — TAMAMLANDI
- [x] **Task 6.1:** **Sahne 01 — Uzaktan Yaklaşan ve Parçalarına Ayrılan Otonom Mini-Sumo Robotu (`src/stage/showcase/SumoRobotShowcaseScene.js`):**
  * Dohyo ring pistinde uzaktan (`z = -115` -> `z = 0`) tekerlek dönüş kinematiği ve frenleme ataletiyle yaklaşan, hedefe vardığında **8 katmanlı 3B CAD Patlatılmış Görünüme (`explodeProgress: 0 -> 1`)** ayrılan bağımsız WebGL sahnesi (`CNC Taban Şasisi + TCRT5000`, `22° Sertleştirilmiş Çelik Dozer Bıçağı`, `Sol/Sağ N20 Redüktörlü Motor + Silikon Tekerlek`, `3S LiPo Batarya`, `L298N H-Köprü Sürücü`, `Arduino Uno R3 Kontrolcü`, `Çift HC-SR04 Ultrasonik Radar + Karbon Zırh`).
  * Yaklaşma (`0%–100%`) ve patlatma (`0%–100%`) sürgüleri, 8 parçalı etkileşimli BOM denetçisi ve tek tıkla **"Sumo Robot Devresini 3B Atölyede Aç"** aktarımı (`getWorkbenchProject()`).
- [x] **Task 6.2:** **Sahne 02 — NVIDIA Jetson Nano Edge AI Kamera Robotu (`src/stage/showcase/JetsonVisionRobotShowcaseScene.js`):**
  * Sumo robotundan **tamamen ayrı ikinci bir 3B WebGL sahnesi** olarak; Mecanum omni-tekerlekli gezgin şasi üzerinde gerçek `JetsonNanoBoard` (`board.jetson_nano`, 128-çekirdek Maxwell soğutucu blok, 40-pin 3.3V J41 GPIO, 15-pin MIPI CSI-2 şerit kablo), **2 Eksenli Pan/Tilt Servo Gimbal Kulesi (`panPivot`, `tiltPivot`)**, **Sony IMX219 8MP 160° Geniş Açı Kamera Modülü** ve 3B hedef işaretçisini canlı takip eden **3B Optik Görüş Konisi (`Vision Frustum Cone`)**.
  * Kamera `Pan (-60°..+60°)` / `Tilt (-25°..+30°)` sürgüleri, `3B Görüş Konisi (FOV)` anahtarı, 8 katmanlı CAD patlatma sürgüsü ve tek tıkla **"Jetson Kamera Robotunu 3B Atölyede Aç"** aktarımı (`getWorkbenchProject()`).
- [x] **Task 6.3:** **Vitrin Landing Kontrolcüsü (`src/ui/landing/LandingShowcaseController.js`) & Çalışma Masası Geçişi:**
  * Tam `TR` / `EN` yerelleştirme ve `Dark` / `Light` endüstriyel tema uyumu; üst barda ve `TopContextPill` içinde (`#btn-open-showcase`) vitrin ile 3B çalışma masası arasında kesintisiz geçiş.
- [x] **🛑 Kontrol Noktası 6 (İki Ayrı 3B Robot Sahnesi & Sabotaj Doğrulaması) — DOĞRULANDI:**
  * **Test:** `tests/architecture.test.js` (Test 24) -> PASS (`24/24 Architecture & Inheritance Tests Passed`).
  * **Bilerek Bozma & Geri Alma:** `node tests/sabotage-verify.js --phase=all` -> **7/7 Sabotaj & Rollback Kontrol Noktası PASS (`exit 0`)**.

---

## Faz 7 — Modüler 3B Robotik Bileşen Kütüphanesi (OOP Miras Hiyerarşisi), Kompozit Robotlar ve Vitrin-Atölye Ortak Bileşen Mimarisi
- [x] **7.1 Soyut (Abstract) Ara Taban Sınıflarının (`src/core/components/base/`) Genişletilmesi:**
  - Her somut bileşen doğrudan `HardwareComponent`'tan değil, kendi ailesine ait soyut bir `Base*` sınıfından miras alacak (`new.target === Base*` koruması zorunlu):
    - `BaseMotorDriver` (`extends HardwareComponent`, `abstract.motor_driver`): Çift kanallı H-Köprüsü sürücüleri (`ENA`, `IN1..IN4`, `ENB`, `OUT1..OUT4`, `12V`, `GND`, `5V`) için PWM/yön kod çözme ve iletim dipolü modeli.
    - `BasePowerModule` (`extends HardwareComponent`, `abstract.power_module`): LiPo batarya paketleri ve DC-DC/INA219 güç telemetri modülleri için hücre sayısı, nominal voltaj, deşarj kapasitesi ve iç kaynak/şönt dipol modeli.
    - `BaseVisionSensor` (`extends BaseSensor`, `abstract.vision_sensor`): Optik/CSI-2 kamera modülleri için çözünürlük, FPS, görüş açısı (FOV), MIPI CSI-2 / I2C pin modeli ve 3B FOV frustum geometrisi (`createFovFrustumGroup()`).
    - `BaseDisplayModule` (`extends HardwareComponent`, `abstract.display_module`): I2C/SPI grafik ekranlar (`SSD1306 OLED`) için I2C pin modeli ve canlı tuval (canvas) telemetri dokusu güncellemesi.
    - `BaseChassisPart` (`extends HardwareComponent`, `abstract.chassis_part`): CNC şasi plakası, dozer bıçağı, karbon zırh kep ve CSI şerit kablo gibi yapısal robot alt parçaları için montaj noktaları ve şasi topraklama köprüleri.
    - `BaseRobotAssembly` (`extends HardwareComponent`, `abstract.robot_assembly`): Alt bileşenlerini `ComponentRegistry` üzerinden gerçek `HardwareComponent` örnekleri olarak oluşturan, `setExplodeProgress(0..1)` ve `setApproachProgress(0..1)` / `setCameraPanTilt(pan, tilt)` destekleyen kompozit robot taban sınıfı.
- [x] **7.2 Yüksek İşçilikli (High-Craft) Somut 3B Donanım Bileşenleri & Kompozit Robotların Üretimi (`src/hardware/`):**
  - **Motorlar (`extends BaseMotor`):**
    - `N20GearmotorWheelComponent` (`motor.n20_gearmotor`): Pirinç 1:50 redüktör kutusu, fırçalı DC gövde, CNC alüminyum jant ve dişli silikon lastik.
    - `MecanumWheelMotorComponent` (`motor.mecanum_wheel`): Enkoderli yüksek torklu redüktörlü motor ve 45° açılı 8 makaralı Mecanum omni-tekerlek.
    - `PanTiltCameraGimbalComponent` (`motor.pan_tilt_gimbal`): Çift MG90S mikro servo 2 eksenli (`panPivot`, `tiltPivot`) alüminyum kamera tareti.
  - **Sürücüler (`extends BaseMotorDriver`) & Güç (`extends BasePowerModule`):**
    - `L298NDualBridgeDriver` (`driver.l298n_dual`): Kırmızı çift katmanlı FR4 PCB (serigrafi dokulu), siyah eloksal dikey soğutucu blok, 3x mavi klemens, 2x elektrolitik kapasitör, 8x SMD diyot ve 6-pin lojik header.
    - `LiPoBatteryPack3S` (`power.lipo_3s_1300mah`): 3S 11.1V 1300mAh 75C LiPo batarya paketi (özel etiket dokulu), sarı XT60 güç soketi ve JST-XH balans kablosu.
    - `Ina219PowerTelemetryBay` (`power.ina219_buck_bay`): Çift 18650 lityum pil yuvası + 5V/4A senkron buck regülatör + INA219 I2C akım/gerilim sensörü.
  - **Sensörler & Ekranlar (`extends BaseVisionSensor` / `BaseDistanceSensor` / `BaseAnalogSensor` / `BaseDisplayModule`):**
    - `Imx219CsiCameraModule` (`sensor.imx219_csi`, `extends BaseVisionSensor`): Sony IMX219 8MP 160° geniş açılı cam mercek, çift IR gece görüş aydınlatıcısı, serigrafi dokulu PCB ve MIPI CSI-2 konektörü.
    - `Vl53l1xLaserTofComponent` (`sensor.vl53l1x_tof`, `extends BaseDistanceSensor`): Altın çerçeveli SPAD lazer açıklıklı Time-of-Flight mesafe sensörü.
    - `Tcrt5000LineSensorArray` (`sensor.tcrt5000_line`, `extends BaseAnalogSensor`): 4x TCRT5000 IR LED/fototransistör çifti, LM393 komparatör, trimpot ve durum LED'li Dohyo sınır algılayıcı dizisi.
    - `Ssd1306OledDisplayComponent` (`display.ssd1306_oled`, `extends BaseDisplayModule`): 0.96" 128x64 I2C OLED telemetri ekranı (canlı yüksek kontrastlı tuval dokulu).
  - **Yapısal Parçalar (`extends BaseChassisPart`) & Kompozit Robotlar (`extends BaseRobotAssembly`):**
    - `SumoChassisPlateComponent` (`robotics.sumo_chassis_plate`), `SumoDozerBladeComponent` (`robotics.sumo_dozer_blade`), `SumoCarbonArmorHoodComponent` (`robotics.sumo_armor_hood`), `MecanumRoverChassisDeckComponent` (`robotics.jetson_rover_chassis`), `CsiRibbonHarnessComponent` (`robotics.csi_ribbon_harness`).
    - `AutonomousSumoRobotComponent` (`robot.autonomous_sumo`) ve `JetsonVisionRoverComponent` (`robot.jetson_vision_rover`).
- [x] **7.3 Silindirik Geometri (`cyl`) İmza Hatası Düzeltmesi ve Vitrin Sahnelerinin `ComponentRegistry` ile Birleştirilmesi:**
  - `GeometryFactory.js` içindeki `cyl(rt, rb, h, segs, material, x, y, z)` imza sırasına uymayan tüm çağrılar (`JetsonNanoBoard.js`, `SumoRobotShowcaseScene.js`, `JetsonVisionRobotShowcaseScene.js`) düzeltilerek tekerlek, mercek, ultrasonik tüp ve kapasitör geometrilerinin eksiksiz WebGL üretimi garanti altına alınacak.
  - `SumoRobotShowcaseScene` ve `JetsonVisionRobotShowcaseScene` içindeki 8'er alt parça doğrudan `ComponentRegistry` üzerinden gerçek `HardwareComponent` örnekleriyle (`reg.create(...)`) oluşturulacak; böylece vitrindeki her parça atölyede (Workbench) tek başına veya kompozit robot olarak çağrılıp kullanılabilecek.
- [x] **Kontrol Noktası 7 (Sabotaj & Geri Alma):**
  - *Bozma:* Yeni robotik bileşenlerden birini (`L298NDualBridgeDriver`) soyut ara sınıfı (`BaseMotorDriver`) yerine doğrudan `HardwareComponent`'tan miras alacak şekilde boz veya vitrin sahnesinin `ComponentRegistry` bağlantısını kopar.
  - *Test:* `npm test` (`Test 25`) çalışır; çok katmanlı OOP miras kuralı ve vitrin-atölye bileşen ortaklığı ihlalini yakalayıp kırmızı (`exit 1`) döner.
  - *Geri Alma:* `BaseMotorDriver` mirasını ve `ComponentRegistry` entegrasyonunu geri yükle; `npm test` (`25/25 PASS`) ve `node tests/sabotage-verify.js --phase=all` (`7/7 PASS`) yeşil döner.

---

## Faz 8 — Atölye Etkileşimi: Breadboard ↔ Komponent Mıknatıs Etkisi (Magnetic Tie-Point Snapping) & Seçili Komponentten Sahnedeki Herhangi Bir Komponente Bağlama
- [x] **Task 8.1:** **Breadboard ↔ Komponent Mıknatıs Algoritması (`GizmoMath.computeBreadboardMagneticSnap` & `StageTransformController`):**
  * Bir komponent (`led.single`, `passive.resistor`, `button.tactile`, `sensor.*` vb.) sahnede bulunan bir `BreadboardComponent` (`board.breadboard`) üzerine veya yakın yakalama yarıçapına (`snapRadius <= 6.5mm`) sürüklendiğinde:
    * Komponentin bacaklarını (`ANODE`/`CATHODE`, `LEAD_A`/`LEAD_B`, `TERMINAL_A`/`TERMINAL_B`, `VCC`/`GND` vb.) breadboard üzerindeki en yakın `2.54mm` delik koordinatlarına (`A1..E15`, `F1..J15`, güç rayları `PLUS_*`/`MINUS_*`) matematiksel olarak hizala ve 3B konumunu (`[x, y, z]`) mıknatısla kilitle.
    * `comp.snappedBreadboardBinding = { breadboardId, pinMappings: [{ pinName, tiePointName, distanceMm }] }` bilgisini kaydet ve `#gizmo-hud` üzerinde canlı **`🧲 Breadboard: A5 • B5`** mıknatıs rozeti göster.
- [x] **Task 8.2:** **Breadboard Mıknatıs Soketlerinin `CircuitFlowSolver` Tarafından Otomatik İletimi:**
  * `CircuitFlowSolver.solve()` çalışırken, breadboard üzerine mıknatıslanmış komponentlerin bacaklarını (`comp.snappedBreadboardBinding.pinMappings`) doğrudan ilgili breadboard delik uçlarıyla (`dsu.union(compPinEndpoint, tiePointEndpoint)`) birleştir. Böylece aynı 5'li breadboard şeridine (örn. `B9` ve `D9`) mıknatıslanan direnç ve LED bacakları ekstra ara kablo gerektirmeden breadboard iç şeridi üzerinden akım iletsin.
- [x] **Task 8.3:** **Seçili Komponenti Sahnedeki İstediğimiz Komponente Bağlama (`#gizmo-hud` Quick Target Strip & `⚡ Akıllı Bağla`):**
  * Bir komponent seçildiğinde açılan `#gizmo-hud` içinde hem **1'e 1 sahne tıklama modu (`⚡ Akıllı Bağla` / `toggleQuickConnect`)** hem de sahnedeki diğer tüm uyumlu komponentleri doğrudan listeleyen **Hızlı Hedef Komponent Şeridi (`.gizmo-target-strip` / `data-quick-target-id`)** sunulsun; kullanıcı seçili komponentten istediği hedef komponente tek tıkla (`quickConnectTo(targetComp)`) veya 3B sahnede üzerine tıklayarak anında kablo çekebilsin.
- [x] **🛑 Kontrol Noktası 8 (Breadboard Mıknatıs Etkisi & Hızlı Hedef Bağlama Sabotaj Doğrulaması):**
  * *Test:* `tests/architecture.test.js` (Test 26) -> Breadboard yakınına taşınan komponentin `2.54mm` deliklere mıknatıslanması (`snapped === true`), aynı şeritteki iki komponentin `CircuitFlowSolver` üzerinden kapalı çevrim akım iletmesi ve `quickConnectTo` ile seçili komponentin sahnedeki hedefe bağlanması.
  * *Bilerek Bozma & Geri Alma:* `GizmoMath.computeBreadboardMagneticSnap` veya `CircuitFlowSolver` breadboard soket köprüsü devre dışı bırakıldığında Test 26 kırmızı (`exit 1`) verir; geri alındığında yeşil (`exit 0`) döner.

---

## Faz 9 — Renk Kodlu Giriş/Pin Hover Belirginleştirme & Kablo Çekerken Uyumlu Girişlerin Parlaması (`PinHudOverlay` & `main.css`)
- [x] **Task 9.1:** **6 Elektriksel Sınıfa Göre Renk Kodlu Pin Noktaları ve Hover Hap Etiketleri (`PinHudOverlay.js` & `src/styles/main.css`):**
  * Komponentlerin üzerindeki girişlerin/pinlerin elektriksel sınıflarına göre (`POWER` Kırmızı `#ef4444`, `GND` Arduvaz `#64748b`, `PWM` Mor `#8b5cf6`, `ANALOG` Zümrüt `#10b981`, `PROTOCOL` Kehribar `#f59e0b`, `DIGITAL_IO` Mavi `#3b82f6`) renk kodlu nokta (`.pin-hud-dot`) ve üzerine gelindiğinde (`is-hovered`) yumuşak geçişle açılan detaylı hap etiket (`.pin-hud-pill`: Pin adı + Tür rozeti + Voltaj) tasarımının `main.css` içerisine Koyu/Açık (Dark/Light) tema uyumlu olarak işlenmesi.
- [x] **Task 9.2:** **Kablo Çekilirken (`InteractiveWireTool` Dragging) Bağlanabilir Girişlerin Kendini Göstermesi & Mıknatıslı Eğri:**
  * Herhangi bir pinden kablo çekilmeye başlandığında (`wireDragState`), sahnedeki tüm komponentlerin bağlanabilir uyumlu girişlerinin (`.is-compatible`) otomatik olarak görünür hale gelmesi, aynı elektriksel sınıftaki girişlerin (`.is-same-class`) ve en yakın uyumlu hedefin (`.is-nearest-compatible`, `.is-nearest-primary`) parlayan halka animasyonuyla (`pinCompatiblePulse`, `pinPrimaryBeacon`) kendini belli etmesi; uyumsuz/kısa devre yapacak pinlerin ise (`.is-incompatible`) soluklaştırılması.
- [x] **🛑 Kontrol Noktası 9 (Renk Kodlu Pin Hover & Kablo Çekme Uyumlu Giriş Vurgusu Sabotaj Doğrulaması):**
  * *Test:* `tests/architecture.test.js` (Test 27) -> Pin renk kategorileri, kablo çekilirken `PinHudOverlay` üzerinde uyumlu hedef pinlerin `.is-compatible` / `.is-nearest-primary` sınıflarıyla açılması ve `main.css` stil kurallarının doğrulaması.
  * *Bilerek Bozma & Geri Alma:* `SmartPinMatcher.classifyPinVisualCategory` veya `PinHudOverlay` kablo çekme hedef görünürlüğü bozulduğunda Test 27 kırmızı (`exit 1`) verir; geri alındığında yeşil (`exit 0`) döner.

---

## Faz 10 — Bağlantı / Akım Çözücü (`SmartPinMatcher` & `CircuitFlowSolver`) Robotik, H-Köprüsü ve I2C Algoritmik Doğrulaması
- [x] **Task 10.1:** **`SmartPinMatcher` Robotik, H-Köprüsü, I2C ve Ultrasonik Eşleştirme Kuralları:**
  * `I2C` (`SDA ↔ SDA`/`A4`, `SCL ↔ SCL`/`A5`), `H-Bridge Motor Çıkışı` (`OUT1..OUT4 ↔ Motor VCC/GND`), `PWM Hız Kontrolü` (`ENA/ENB ↔ MCU PWM`), `Ultrasonik` (`TRIG/ECHO ↔ Digital GPIO`), `Güç Dağıtımı` (`3S LiPo 11.1V ↔ L298N 12V`, `INA219 5V_OUT ↔ Jetson 5V`) ve `Breadboard` (`TIE_STRIP`, `RAIL_PLUS`, `RAIL_MINUS`) eşleştirme puanlarının (`scorePinPair`) ve renk sınıflarının iyileştirilmesi.
- [x] **Task 10.2:** **`BaseMotorDriver` (`L298N`) Kanal Çıkış Sürüşü ve `CircuitFlowSolver` Kapalı Çevrim H-Köprüsü İletimi:**
  * `BaseMotorDriver` (`L298NDualBridgeDriver`) besleme (`12V`/`5V` ve `GND`) aldığında ve `ENA`/`ENB` PWM sinyali sürüldüğünde, `OUT1`/`OUT3` pinlerini aktif kanal çıkış gerilimiyle (`VCC_SOURCE`) ve `OUT2`/`OUT4` pinlerini dönüş referansıyla (`GND_REF`) sürerek `OUT1..OUT4` uçlarına bağlı `N20GearmotorWheelComponent` veya `DCMotorComponent` motorlarının gerçek kapalı çevrim (`closedLoop: true`) akımla dönmesini sağla.
- [x] **🛑 Kontrol Noktası 10 (H-Köprüsü & Çözücü Algoritması Sabotaj Doğrulaması):**
  * *Test:* `tests/architecture.test.js` (Test 28) -> `Arduino Uno + 3S LiPo + L298N + N20 Motor` topolojisinde `CircuitFlowSolver.solve()` kapalı çevrim akım (`totalCurrentMa > 0`) ve motor dönüşü (`motor.state.energized === true`) doğrulaması.
  * *Bilerek Bozma & Geri Alma:* `BaseMotorDriver` kanal çıkışı bozulduğunda Test 28 kırmızı (`exit 1`) verir; geri alındığında yeşil (`exit 0`) döner.

---

## Faz 11 — 14+ Hazır 3D Komponent, OOP Miras Bütünlüğü ve Sumo & Jetson Sahnelerinin Atölyede Tam Kapalı Çevrim Çalışması
- [x] **Task 11.1:** **Sumo & Jetson Sahne Ön-Ayarlarının (`getWorkbenchProject()`) Tam Kapalı Çevrim Kablolaması:**
  * `SumoRobotShowcaseScene.getWorkbenchProject()` ve `JetsonVisionRobotShowcaseScene.getWorkbenchProject()` projelerine eksiksiz güç (`12V`/`5V`/`3.3V`), ortak toprak (`GND`), H-köprüsü motor çıkış (`OUT1..OUT4 → N20 Motorlar`) ve I2C/PWM/Ultrasonik bağlantıları eklenerek `/workbench?preset=sumo` ve `/workbench?preset=jetson` açıldığında `CircuitFlowSolver`'ın anında sıfır arızalı kapalı çevrim (`closedLoopCount > 0`) çözmesi sağlanacak.
- [x] **Task 11.2:** **Tüm 31 Kayıtlı 3B Komponentin (14+ Temel + 17 Robotik/SBC) OOP Miras, 3B Pin Koordinatı ve Akım Çözücü Denetimi:**
  * Tüm bileşenlerin soyut `Base*` sınıflarından miras aldığının, 3B sahne nesnelerinin (`build3D`) ve pin koordinatlarının (`getPinWorldPosition`) eksiksiz olduğunun doğrulanması.
- [x] **🛑 Kontrol Noktası 11 (Sumo & Jetson Atölye Kapalı Çevrim & 31 Komponent Sabotaj Doğrulaması):**
  * *Test:* `tests/architecture.test.js` (Test 29) -> Sumo ve Jetson `getWorkbenchProject()` devrelerinin `StageManager` + `CircuitFlowSolver` üzerinde doğrudan kapalı çevrim (`closedLoopCount >= 2`, `totalCurrentMa > 0`) çalıştığının doğrulanması.
  * *Bilerek Bozma & Geri Alma:* `node tests/sabotage-verify.js --phase=all` -> **11/11 Sabotaj & Rollback Kontrol Noktası PASS (`exit 0`)**.

---

## Faz 12 — Agentic Chat, Code Mode Sandbox & 3B Sahnenin ReactFlow Veri Grafı (`Data-Flow Graph`) Olarak Çalışması — TAMAMLANDI
- [x] **Task 12.1:** **Birleşik Agentic Chat & Code Mode (`agentLoop.js`, `CodeModeExecutor.js`, `CircuitSDK.js`):**
  * Alt iskelede (`BottomFloatingDock.js`) akıcı sohbet akışı, çoklu konuşma geçmişi kenar çubuğu, `searchCapabilities` -> `getComponentSchema` -> `getFunctionSchema` -> `executeCode` tur döngüsü ve soru-duyarlı (`question-aware`) `askUser` akışı.
  * Otomatik C++/Python/ESP32/Jetson firmware sentezi (`synthesizeDefaultFirmwareForCircuit`) ve çoklu kart (`getBoards()`) farkındalığı.
- [x] **Task 12.2:** **3B Sahnenin Bizzat Bir ReactFlow Veri Grafı (Data-Flow Graph) Olarak Çalışması (`evaluate()` Kontratı):**
  * **Mimari Prensip:** Ayrı bir 2B kutucuk bağlama ekranı yerine **3B sahnenin kendisi bir ReactFlow veri grafıdır**:
    * **Node (Düğüm):** Her 3B Donanım Bileşeni (`HardwareComponent` ve tüm `Base*` alt sınıfları).
    * **Handle (Giriş/Çıkış Portu):** Bileşen üzerindeki fiziksel pinler (`ElectricalPin`: `VCC`, `GND`, `IN`, `OUT`, `TRIG`, `ECHO`, `TERMINAL_A`, `ANODE` vb.).
    * **Edge (Veri/Enerji Bağlantısı):** 3B Jumper Kablolar (`InteractiveWireTool`) ve Breadboard iletken şeritleri (`DisjointNetSet` + `CircuitFlowSolver`).
    * **Node İşlemcisi (`evaluate({ pins, state, dt, stageEnv, report })`):** Her bileşen her simülasyon adımında (`tick`) giriş pinlerine (`Handles`) gelen voltaj/veri/sinyali okur, kendi iç fiziksel durumunu (`state` ve 3B görünümünü) günceller ve ürettiği çıkış voltajını/sinyalini çıkış pinlerine yazar; `CircuitFlowSolver` da bu çıktıyı kablo/breadboard (`Edge`) üzerinden bağlı olduğu bir sonraki Node'un giriş pinine taşır.
  * Tüm temel donanım sınıfları (`BaseButton`, `BaseLightEmitter`, `BasePassiveComponent`, `BaseSensor`, `BaseDistanceSensor`, `BaseVisionSensor`, `BaseMotor`, `BaseAudioTransducer`, `BaseDisplayModule`, `BaseMotorDriver`) bu `evaluate()` veri akışı kontratına geçirildi.
- [x] **Task 12.3:** **Breadboard Uzamsal Delik İletimi, Anahtar Potansiyel Yayılımı & `0-Pin` Fiziksel Sahne Nesneleri (`Props`):**
  * `CircuitFlowSolver._autoBindBreadboardInsertions`: Sahnede breadboard deliklerine saplanan bileşen bacaklarının (`<= 0.65mm`) ve çoklu paralel kabloların (Single-Pin Multi-Wire Fan-Out) aynı elektriksel ağda (`Net`) birleştirilmesi.
  * `BaseButton` kapatıldığında (`pressed === true`) bir terminaldeki `5V`/`GND` potansiyelinin diğer terminale ve bağlı MCU pinine (`PIN2` -> `digitalRead(2) == HIGH`) gerçek zamanlı aktarılması; 3B sahnede butona tıklayarak veya `#gizmo-hud` üzerinden basma/bırakma kontrolü.
  * Elektriksel pini olmayan (`0-Pin`, `isEnvironmentProp: true`) ama sahnede ultrasonik/lazer/kamera sensörlerine fiziksel hedef olan 3B sahne nesneleri: `prop.obstacle_wall` (Engel Duvarı) ve `prop.toy_bear` (3B Oyuncak Ayı).
- [x] **🛑 Kontrol Noktası 12 — DOĞRULANDI:**
  * *Test:* `tests/architecture.test.js` (Test 30 – Test 42) -> **42/42 PASS (`exit 0`)**.

---

## Sıradaki Yol Haritası (Faz 13 – Faz 16): Custom Component Studio & 3B ReactFlow Veri Akışı Genişletmeleri

### Faz 13 — Custom Component Studio: Deklaratif 3B Modelleme (`parts[]` + `attach`) & Pin (`Handle`) Tasarım Tezgahı — TAMAMLANDI
- [x] **Task 13.1:** **İki Ana Bileşen Arketipi Seçici:**
  1. **Elektriksel Veri Düğümü (`3D ReactFlow Hardware Node`):** Giriş/çıkış pinleri (`Handles`), çok parçalı 3B modeli ve kendisine gelen veriyi işleyen `evaluate({ pins, state, dt, stageEnv, report })` fonksiyonu olan aktif/pasif komponentler.
  2. **Fiziksel Sahne Nesnesi (`0-Pin Stage Prop / Obstacle`):** Hiçbir elektriksel pini olmayan (`pins: []`, `isEnvironmentProp: true`), sahnede mesafe/optik/kamera/ısı/ışık sensörlerine fiziksel engel veya hedef olan 3B nesneler (`obstacleProfile: { boundingRadiusCm, reflectivity, visualClass, blocksUltrasonic, blocksInfrared }`).
- [x] **Task 13.2:** **Deklaratif Çok Parçalı 3B Modelleme Motoru (`DynamicComponentBuilder` v2 — Codex Modeling Studio Mimarisi + Akıllı Donanım Bağlamı):**
  * **Bağıl Yüzey Hizalama (`attach: { to, side, gap, offset }`):** Alt parçaların (`parts[]`) uzayda havada asılı kalmasını önlemek için her alt parçanın isimlendirilmiş bir ana parçanın yüzeyine (`to: "pcb_base"`, `side: "top" | "bottom" | "left" | "right" | "front" | "back" | "center" | "inside"`, `gap`, `offset: [dx, dy, dz]`) matematiksel sınır kutusu (`BoundingBox`) hesabı ile otomatik yapışması.
  * **Donanım Odaklı Parametrik CAD Primitifleri:** Standart `box`, `cylinder`, `sphere`, `cone`, `torus` yanına elektronik ve robotik için kritik olan **`rounded_box`** (`bevel` pahlı PCB, IC gövdesi, kasa), **`tube`** (`innerRadius` içi boş silindir: ultrasonik göz, vida dikmesi/standoff, barrel jack), **`capsule`** ve **`lathe`** (2B profil döndürme: LED kubbesi, kapasitör, potansiyometre düğmesi) primitiflerinin eklenmesi.
  * **Elektronik Dizi & Simetri Çoğaltıcıları (`repeat` & `mirror`):** Tek tek 16 bacak tanımlamak yerine `repeat: { count: 8, step: [2.54, 0, 0] }` (`2.54mm` standart pin header / IC bacak dizisi) ve `mirror: { axis: "x" | "z" }` (simetrik tekerlek, sensör gözü, oyuncak kulak/göz) desteği.
  * **Elektronik PBR Materyal Ön-Ayarları (`materialPreset`):** Düz plastik renkler yerine kalibre edilmiş `fr4_pcb_teal`, `fr4_pcb_black`, `fr4_pcb_red`, `ic_epoxy`, `gold_pin`, `brushed_aluminum`, `copper`, `frosted_led`, `rubber_tire`, `ceramic`, `matte_plastic` PBR materyal kütüphanesi.
  * **Canlı Fizik/Işık Alt Parça Rolleri (`partRole`):** Alt parçaları `emissive` (`state.active`/`state.brightness` ile parlayan LED/ekran), `rotor` (`state.rpm` ile dönen mil/pervane), `pivot` (`state.angle` ile dönen servo kolu) veya `plunger` (`state.pressed` ile basılan buton) olarak doğrudan `evaluate()` çıktısına bağlama.
- [x] **Task 13.3:** **3B Pin (`Handle`) Yerleştirici & Otomatik Header Pin Üretici (`pinGenerator`):**
  * `ComponentPalettePopover` içindeki **Custom Studio** sekmesi (`STUDIO_TEMPLATES`) ve `pinGenerator` / `pinGenerators` ile `2.54mm` adımlı otomatik pin dizisi (`Handle`) üretimi; her pinin yönünü (`IN`, `OUT`, `IO`), protokolünü (`GPIO`, `PWM`, `ADC`, `I2C`, `SPI`, `UART`) ve voltaj sınırını (`3.3V`, `5V`, `12V`) tanımlama.

### Faz 14 — 3B ReactFlow Veri Akışı Motoru (`Data-Flow Graph Engine`) & İzole `evaluate()` Sandbox — TAMAMLANDI
> **Not:** Buradaki "ReactFlow mantığı", 2B bir kutucuk bağlama ekranı değil; **3B sahnenin bizzat kendisinin bir ReactFlow veri grafı olarak çalışmasıdır** (`Node = 3B Komponent`, `Handle = Pin`, `Edge = 3B Kablo / Breadboard Şeridi`, `Processor = evaluate()`).

- [x] **Task 14.1:** **Özel Bileşenler İçin İzole `evaluate({ pins, state, dt, stageEnv, report })` Veri İşleme Kontratı:**
  * Kullanıcının tanımladığı özel bileşenin giriş pinlerine (`pins`) gelen voltaj (`5V`, `3.3V`, `ADC`), PWM görev döngüsü veya protokol verisini `DynamicComponentBuilder.compileEvaluateScript()` güvenlik duvarı altında işleyip kendi `state` / 3B animasyonunu güncellemesi ve çıkış pinlerine (`return { outputs: { OUT: { voltage, logicLevel } }, state }`) yeni veri/gerilim basması.
- [x] **Task 14.2:** **Çok Adımlı Zincirleme Node Yayılımı (Multi-Hop Cascade Propagation):**
  * `CircuitFlowSolver.solve()` içinde sınırlandırılmış (`maxCascadeHops = 6`) çok adımlı kaskad çözücü ile birbirine kablo veya breadboard ile bağlı özel ve standart Node'ların (`Sensör Node -> Lojik Tersleyici Node #1 -> Lojik Tersleyici Node #2 -> Aktüatör LED Node`) aynı simülasyon çerçevesinde girişten çıkışa kaskad veri akışı.
- [x] **Task 14.3:** **Canlı Pin & Veri Akışı Müfettişi (Live Node Handle Inspector):**
  * `StageTransformController.js` (`#gizmo-hud` içindeki `.gizmo-handle-inspector`) üzerinde bileşen seçildiğinde her giriş/çıkış pinindeki (`Handle`) anlık voltajı, mantık seviyesini (`HIGH`/`LOW`), `evaluate()` durum çıktısını canlı gösteren ve test için giriş pinlerine `0V` / `5V` enjekte edebilen (`[data-test-toggle-pin]`) teknik denetçi.

<!--
- [ ] **[SUSTURULDU / İLERİDE DENENEBİLİR] Task 14.X — Kod Yazmayanlar İçin 2B Görsel Kural Oluşturucu (No-Code Visual Node Builder):**
  * Kullanıcı kararıyla şimdilik susturuldu. Odağımız 2B kutucuk bağlama arayüzü değil, 3B sahnenin bizzat ReactFlow veri grafı mantığıyla (giriş pinlerinden gelen veriyi `evaluate()` ile işleyip çıkış pinlerine ve 3B fiziğe yansıtması) çalışmasıdır.
-->

### Faz 15 — Veritabanı Kalıcılığı, Katalog Entegrasyonu & AI Ajan (WebMCP / Code Mode) Keşfi — TAMAMLANDI
- [x] **Task 15.1:** **Backend `custom_components` Tablosu ve REST Uçları:**
  * `CustomComponent.php` (`type_id`, `manifest_json`, `is_environment_prop` nitelikleri) ve `CustomComponentController.php` (`/api/v1/custom-components` & `/api/v1/components` GET/POST/DELETE) ile `DynamicComponentBuilder` v2 özel bileşenlerinin veritabanında saklanması ve `BackendApiClient.hydrateCustomComponentsIntoRegistry()` ile çalışma alanlarına otomatik yüklenmesi.
- [x] **Task 15.2:** **AI Ajan (`searchCapabilities`, `getComponentSchema` & `CodeModeExecutor`) Otomatik Entegrasyonu:**
  * Kaydedilen her özel bileşenin `isCustom`, `isEnvironmentProp`, pin (`Handle`) şemasının ve `evaluateScript` özetinin `searchCapabilities` ve `getComponentSchema` tarafından otomatik keşfedilmesi; `CircuitSDK.registerCustomComponent()` ve `CircuitSDK.addComponent("custom....")` ile AI Ajanın özel bileşeni sahneye ekleyip kablolayabilmesi.
- [x] **🛑 Kontrol Noktası 13–15 — DOĞRULANDI:**
  * *Test:* `tests/architecture.test.js` (Test 1 – Test 45) -> **45/45 PASS (`exit 0`)**.

### Faz 16 — Gelişmiş Sahne Çevresi (`stageEnv` FOV Raycast) & Çoklu Kart (`Multi-MCU`) Pin-to-Pin Veri Akışı — TAMAMLANDI
- [x] **Task 16.1:** **3B Sahne Konisi (`FOV & Yönlü Raycast`) Fiziksel Engel Algılama:**
  * `HardwareComponent.getForwardVector()` ve `CircuitFlowSolver._buildStageEnvironmentForComponent()` ile sensörlerin (`BaseDistanceSensor` / `HC-SR04` / `VL53L0X` ve `BaseVisionSensor` / `IMX219`) 3B bakış yönü (`group.rotation.y` -> `forwardVector`) ve görüş açısı (`fovDeg` konisi) içinde `0-Pin` sahne nesnelerinin (`prop.obstacle_wall`, `prop.toy_bear`, `custom.arena_barrier_prop`) analitik 3B yönlü ışın kesişimi (`raycastHit`, `rayDistanceCm`) ve koni açısı (`angleDeg`, `inFov`) ile algılanması; görüş konisi dışındaki engellerin elenmesi.
- [x] **Task 16.2:** **Çoklu Kart (`Multi-MCU`) Pin-to-Pin ReactFlow Veri Akışı:**
  * `LiveCodeRuntime.setBoardCode(boardId, sourceCode)` ve `_executeMultiBoardPrograms()` iki geçişli ReactFlow kaskadı ile aynı 3B sahnede birden fazla kontrolcü kartın (`Arduino Uno` + `ESP32` + `Jetson Nano`) her birinin bağımsız firmware koştururken ortak kablolar (`GPIO` dijital/PWM ve `UART` `TX0 -> RX0` `Serial.println`) üzerinden birbirlerinin pinlerine canlı gerilim ve protokol çerçevesi göndermesi (`BaseHostBoard.evaluate()`).
- [x] **🛑 Kontrol Noktası 16 — DOĞRULANDI:**
  * *Test:* `tests/architecture.test.js` (Test 1 – Test 46) -> **46/46 PASS (`exit 0`)**.

---

### Faz 17 — Tam Ekran 3B Özel Bileşen Stüdyosu (`/studio` — Canlı 3B CAD Sahnesi, Görsel `parts[]`/`attach` Denetçisi, Canlı Pin Test Tezgahı & Stüdyo Komut Sentezleyici) — TAMAMLANDI
> **Tasarım & Mimari Kuralı (Sıfır AI Klişesi / Mevcut Yapıyla Tam Uyum):**
> - **Mevcut Tasarım Dili Korunur:** Mor-pembe gradyanlar, sahte parıltı/robot ikonları (`✨`, `🪄`, `🤖`) veya tasarım dilimizi bozan yabancı sohbet widget'ları **kesinlikle kullanılmaz**. Yüzeyler `1px solid var(--border-hairline)`, `--bg-canvas`, `--surface-floating`, teknik çizgisel SVG ikonlar (`1.5px stroke`) ve gerçek elektronik sinyal renkleri (`--signal-5v`, `--signal-3v3`, `--signal-ok`, `--signal-data`) ile `Dark` / `Light` tema ve `TR` / `EN` i18n uyumlu olarak inşa edilir.
> - **Mevcut Mimari Korunur:** Ayrı/kopuk bir ajan mimarisi uydurulmaz; doğrudan mevcut `AppRouter` (`/studio`), `DynamicComponentBuilder` v2, `ComponentRegistry`, `BackendApiClient` (`/api/v1/ai/custom-component` & `/api/v1/custom-components`) ve `BoardStage` sahne altyapısı kullanılır. `ComponentPalettePopover` içindeki sıkışık JSON sekmesi kaldırılıp doğrudan tam ekran `/studio` çalışma alanına yönlendirilir.

- [x] **Task 17.1:** **`/studio` Rotası (`AppRouter.js`) & Tam Ekran 3B Bileşen Stüdyosu İskelesi (`src/ui/studio/CustomComponentStudioPage.js`):**
  * `AppRouter.resolveRoute('/studio')` (`view: 'studio'`) desteği; üst barda (`TopContextPill`), alt iskelede (`BottomFloatingDock`) ve parça kataloğunda (`ComponentPalettePopover`) tek tıkla **`/studio`** sayfasına geçiş ve **`[← Atölyeye Dön (/workbench)]`** bağlantısı.
  * **Merkezde Canlı 3B CAD & Pin Stüdyo Sahnesi (`StudioViewport3D`):** Orbit/Zoom/Pan destekli endüstriyel 3B podyum, milimetrik ızgara, X-Ray iç dipol/sınır kutusu (`BoundingBox`) görünümü, renk kodlu 3B Pin/Handle etiketleri (`POWER`, `GND`, `PWM`, `ADC`, `I2C`, `GPIO`) ve sahnede alt parçaya (`parts[]`) tıklandığında o parçayı seçip vurgulama.
- [x] **Task 17.2:** **Görsel `parts[]` + `attach` CAD Denetçisi, `2.54mm` Pin/Handle Üretici & `evaluate()` Davranış Editörü (Sol Teknik Panel):**
  * **Arketip Seçici:** `3B ReactFlow Donanım Düğümü (Node)` veya `0-Pin Fiziksel Sahne Nesnesi (Prop / Obstacle)`.
  * **Görsel Parça Ağacı (`parts[]`):** Kod/JSON yazmadan `[+ Parça Ekle]` (`rounded_box`, `tube`, `cylinder`, `sphere`, `capsule`, `lathe`, `cone`, `torus`), seçili parçanın boyutları (`size`/`radius`/`height`), bağıl yüzey yapıştırma ayarları (`attach: { to, side: top|bottom|left|right|front|back|center, gap, offset }`), elektronik PBR materyal seçici (`fr4_pcb_teal`, `fr4_pcb_black`, `ic_epoxy`, `gold_pin`, `brushed_aluminum`, `frosted_led`, `rubber_tire`, `copper`, `ceramic`), dizi/simetri (`repeat`, `mirror`) ve canlı fizik rolü (`partRole: emissive | rotor | pivot | plunger`) kontrolleri. Her değişiklik anında merkezdeki 3B modeli yeniden örer.
  * **Görsel Pin (`Handle`) & `2.54mm` Header Oluşturucu + `evaluate()` Editörü:** Tekil pin ekleme/düzenleme (`name`, `direction: IN|OUT|IO`, `protocol`, `localPosition`) veya tek tıkla `1xN` (`2.54mm` aralıklı) `pinGenerator` dizisi oluşturma; yanında `evaluate({ pins, state, dt, stageEnv, report })` davranış editörü ve hazır v2 şablonları (`Smart Cooling Hub`, `Logic Inverter Gate`, `Threshold Sensor Node`, `Arena Barrier Prop`).
- [x] **Task 17.3:** **Stüdyo Özel LLM Araç Seti (`StudioModelingSDK.js` — Codex Modeling Studio Tarzı Tam Müdahale Araçları) & Canlı Pin/Fizik Test Tezgahı:**
  * **LLM İçin Özel Stüdyo Modelleme & Müdahale Araçları (`src/core/ai/StudioModelingSDK.js`):** Tıpkı Codex Modeling Studio'da olduğu gibi LLM'in 3B bileşendeki **her şeye** cerrahi olarak müdahale edebilmesi için mevcut Code Mode mimarimizle uyumlu özel stüdyo araçları:
    1. **Sahne & Geometri Okuma (`getComponentSnapshot`, `getPartBounds`, `listMaterialPresets`):** Sahnedeki mevcut parçaları (`parts[]`), her parçanın hesaplanmış 3B sınır kutusunu (`BoundingBox` min/max/center/size), pinleri ve aktif `evaluateScript` kodunu okuma.
    2. **3B Parça & Yüzey Manipülasyonu (`addPart`, `updatePart`, `removePart`, `attachPart`, `setPartMaterial`, `setPartModifier`, `clearParts`):** Yeni 3B CAD parçası (`rounded_box`, `tube`, `cylinder`, `sphere`, `capsule`, `lathe`, `cone`, `torus`) ekleme, mevcut bir parçanın boyutunu/rengini/PBR materyalini (`fr4_pcb_teal`, `gold_pin`, `ic_epoxy`, `frosted_led`, `brushed_aluminum`) değiştirme, `attachPart(partId, { to, side, gap, offset })` ile bir parçayı diğerinin yüzeyine hizalama, `repeat`/`mirror` ve `partRole` (`emissive`, `rotor`, `pivot`, `plunger`) atama.
    3. **Pin (`Handle`) & `2.54mm` Header Müdahalesi (`addPin`, `updatePin`, `removePin`, `addPinRow`):** Tekil pin ekleme/güncelleme/silme veya tek komutla `2.54mm` adımlı header dizisi (`pinGenerator`) yerleştirme.
    4. **Davranış Yazma & Kendi Kendini Test Etme (`setEvaluateScript`, `testComponentBehavior`, `setCameraView`, `setXRayMode`):** LLM'in yazdığı `evaluate({ pins, state, dt, stageEnv, report })` kodunu `testComponentBehavior({ pinVoltages: { IN: 5.0 }, distanceCm: 12 })` aracıyla bizzat simüle edip çıkış pinlerinin (`outputs`) ve `state`/`partRole` tepkilerinin doğru çalıştığını doğrulaması (Self-Verification).
  * **Canlı Pin & Fizik Test Tezgahı (`Live Handle & Physics Test Bench`):** Stüdyo sahnesinin altında kullanıcının da giriş pinlerine (`IN`, `VCC`, `TRIG` vb.) tek tıkla `0V` / `3.3V` / `5V` gerilim enjekte edip ve sanal sahne mesafesini (`stageEnv.distanceCm`) kaydırıp çıkış voltajını ve 3B `partRole` animasyonlarını (`rotor` dönüşü, `emissive` LED parlaması, `pivot` açısı, `plunger` basılması) canlı olarak 3B sahnede test etmesi.
- [x] **Task 17.4:** **Kütüphaneye Kaydetme (`/api/v1/custom-components`), Atölye Sahnesine Gönderme & Mimari Test (`Test 47`):**
  * **"Kütüphaneye Kaydet"** ve **"Kaydet & Atölye Sahnesine Ekle (`/workbench`)"** aksiyonları ile üretilen bileşenin hem `ComponentRegistry` + Backend `custom_components` tablosuna kaydedilmesi hem de doğrudan 3B devre masasına (`BoardStage`) spawn edilmesi.
  * `tests/architecture.test.js` içinde **Test 47** ile `/studio` rotası, `StudioModelingSDK` araçları (`addPart`, `attachPart`, `setPartMaterial`, `addPinRow`, `setEvaluateScript`, `testComponentBehavior`), `CustomComponentStudioPage` görsel parça/yüzey düzenleme, canlı pin test tezgahı ve atölyeye aktarım akışının doğrulanması (**47/47 PASS**).
- [x] **🛑 Kontrol Noktası 17 — DOĞRULANDI:**
  * *Test:* `tests/architecture.test.js` (Test 1 – Test 47) -> **47/47 PASS (`exit 0`)**.

---

### Faz 18 — Tam Kapsamlı Özgür 3B Bileşen Sentezi (Fiziksel CAD + Motor/Davranış), Bağlama Duyarlı Test Tezgahı, Veritabanı Kalıcılığı ve Çalışma Alanı (`Workbench`) Kapalı Çevrim Uyumu — TAMAMLANDI
- [x] **Task 18.1:** **Bağlama Duyarlı Canlı Test Tezgahı (`Context-Aware Test Bench`) & Dinamik Çevre/Fizik Kontrolleri (`CustomComponentStudioPage.js` & `StudioModelingSDK.js`):**
  * Saf sinyal/elektriksel bileşenlerde (ör. *İtfaiye Çakar Lambası*, *Mantık Kapısı*, *Röle*, *Akıllı Fan*) kafa karıştırıcı sabit `"Sanal Engel Mesafesi (stageEnv.nearestObstacleCm)"` slider'ının gizlenmesi; çevre simülasyon kontrollerinin (`nearestObstacleCm` / `distanceCm`, `temperatureC`, `lightLux`, `gasPpm`, `humidityPct`) yalnızca bileşenin `evaluateScript` motoru veya `testControls` tanımı bu büyüklükleri gerçekten kullandığında bağlama duyarlı olarak gösterilmesi.
  * `StudioModelingSDK` araç setine `studio.setInternalDipoles(dipolesArray)` ve `studio.setTestControls(controlsArray)` eklenerek LLM'in hem iç Kirchhoff dipol dirençlerini hem de özel test tezgahı parametrelerini doğrudan tanımlayabilmesi.
- [x] **Task 18.2:** **Fiziksel + Motor (`evaluate()` + İç Kirchhoff Dipolleri + `partRole`) Tam Uyumlu Sentez (`DynamicComponentBuilder.js` & `HardwareComponent.js`):**
  * `DynamicHardwareComponent` içinde özel `evaluateScript` / `evaluate` / `nodeBehavior` tanımlı bileşenlerde `onElectricalFlow` (`VCC->GND` besleme akımı `energized: true`) durumunun `evaluate()` tarafından hesaplanan `state.active = false` ve `state.rpm = 0` kararını ezmesinin önlenmesi (`IN = 0V LOW` iken ışıkların sönük ve motorun durur kalması; `IN = 5V HIGH` olduğunda `emissive` kubbelerin parlaması, `rotor` parçasının dönmesi ve `OUT` pininin `5.0V` sürmesi).
  * `DynamicComponentBuilder.normalizeSpec()` içinde otomatik iç `ConductiveDipole` üretiminin hem `VCC ↔ GND` (`1000 Ω`) hem de sinyal giriş pinleri (`IN`, `TRIG`, `SIG`, `PWM`, `EN`, `CLK` ↔ `GND`, `470 Ω`) için yapılması ve 2-kablolu (`D9 -> IN`, `GND -> GND`) veya 3/4-kablolu (`5V -> VCC`, `GND -> GND`, `D9 -> IN`, `OUT -> LED`) bağlantılarda Kirchhoff kapalı çevriminin kusursuz çalışması.
- [x] **Task 18.3:** **Backend Veritabanı Kalıcılığı (`CustomComponentController.php`) & Katalog/Yetenek İndeksi Senkronizasyonu:**
  * Giriş yapmış her kullanıcının `/studio` içinde ürettiği özel bileşeni `POST /api/v1/custom-components` üzerinden `custom_components` tablosuna (`mesh_recipe.v2_spec`, `pinout`, `internal_dipoles`, `electrical_specs`, `manifest_json`) kaydedebilmesi ve sayfa yenilendiğinde `hydrateCustomComponentsIntoRegistry()` ile kayıpsız geri yüklenmesi.
- [x] **Task 18.4:** **Çalışma Alanına (`Workbench` / `/workspace/<slug>`) Ekleme, Diğer Bileşenlerle Kapalı Çevrim Etkileşim & Mimari Doğrulama (`Test 48`):**
  * Stüdyodan **"Kaydet & Sahneye Ekle"** tıklandığında aktif çalışma alanı rotasını (`/workspace/<slug>` veya `/workbench`) koruyarak bileşenin `BoardStage` üzerine eklenmesi, `CapabilityIndex`'in (`Flownie` AI Ajan keşfi) anında güncellenmesi ve otomatik kaydın (`scheduleAutoSave`) tetiklenmesi.
  * `tests/architecture.test.js` içinde **Test 48** ile LLM destekli özel bileşen üretimi, bağlama duyarlı test tezgahı, veritabanı kalıcılığı ve çalışma alanında `Arduino Uno` + `Custom Bileşen` + `LED` kapalı çevrim (`LOW -> OFF`, `HIGH -> ON + 5V OUT + Rotor + Emissive`) uyumunun uçtan uca doğrulanması (**48/48 PASS**).
- [x] **🛑 Kontrol Noktası 18 — DOĞRULANDI:**
  * *Test:* `tests/architecture.test.js` (Test 1 – Test 48) -> **48/48 PASS (`exit 0`)**.



