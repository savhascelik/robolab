/**
 * Turkish (TR) Locale Dictionary for Learn Arduino & Embedded 3D Lab.
 */
export const trLocale = {
  meta: {
    code: 'tr',
    label: 'TR',
    name: 'Türkçe'
  },
  ui: {
    brand: {
      title: 'Arduino & Gömülü 3D',
      subtitle: 'Keşfet · Anla · İnşa Et'
    },
    nav: {
      home: 'Ana Kart',
      lessons: 'Dersler',
      parts: 'Bileşenler',
      simulator: 'Simülatör',
      usb: 'WebUSB Yükle',
      settings: 'Ayarlar'
    },
    status: {
      basics: 'Müfredat',
      lessonsHeading: 'Dersler'
    },
    viewbar: {
      hint: 'Sürükle / WASD kaydır · Q / E döndür · Tekerlek yakınlaştır',
      turnLeft: 'Sola döndür (Q)',
      turnRight: 'Sağa döndür (E)',
      zoomOut: 'Uzaklaştır (−)',
      zoomIn: 'Yakınlaştır (+)',
      resetView: 'Kamera sıfırla (R)'
    },
    tabs: {
      overview: 'Genel Bakış',
      pinout: 'Pin Bağlantısı',
      example: 'Devre Şeması',
      specs: 'Teknik Özellikler'
    },
    info: {
      pinoutHeading: 'Pin Bağlantı Tablosu',
      circuitHeading: 'Devre Nasıl Çalışır?',
      circuitTip:
        'İpucu: Kodu derleyip 3D kart üzerinde canlı çalıştırmak için Oynat (Play) butonuna veya Boşluk (Space) tuşuna basın!',
      specsHeading: 'Teknik Özellikler'
    },
    code: {
      title: 'Kendin Dene & Derle',
      serialMonitor: 'Seri Port Ekranı (9600 baud)',
      statusStopped: 'Durduruldu',
      statusUploading: 'Yükleniyor…',
      statusRunning: 'Çalışıyor',
      statusFlashingUsb: 'USB Flashlanıyor…',
      btnUsbTitle: 'Tarayıcı USB (WebSerial) ile Gerçek Karta Derle ve Yükle',
      btnUsbLabel: 'USB Yükle',
      btnUsbConnected: 'USB Bağlı'
    },
    controls: {
      hardwareInput: 'Donanım Girişi',
      pin2Switch: 'Pin 2 Butonu:',
      pressAndHold: 'Basılı Tut',
      pressedLow: 'BASILI (LOW)',
      potentiometerTitle: 'Potansiyometre (ADC)',
      targetDistance: 'Hedef Mesafe',
      pwmSpeed: 'PWM Hızı (Pin 6)'
    },
    flyout: {
      allLessons: 'Tüm Dersler ({count})',
      hardwareRegistry: '3D Donanım Kayıt Defteri ({count})',
      settingsTitle: 'Sahne, Dil ve USB Ayarları',
      langTitle: 'Arayüz Dili: {lang}',
      langDesc: 'Tüm dersleri, 3D etiketleri ve panelleri Türkçe (TR) ve İngilizce (EN) arasında değiştir',
      hostAutoTitle: 'Ana Kart: Otomatik (Derse Göre)',
      hostAutoDesc: 'Ders 1–8 için Arduino Uno R3, Ders 9 için ESP32 DevKit V1 kullanır',
      hostUnoTitle: 'Sabit Kart: Arduino Uno R3 (5V AVR)',
      hostUnoDesc: 'ATmega328P • 5.0V Mantık • 10-bit ADC (0–1023) • STK500v1 USB',
      hostEsp32Title: 'Sabit Kart: ESP32 DevKit V1 (3.3V Wi-Fi)',
      hostEsp32Desc: 'ESP-WROOM-32 • 3.3V Mantık • 12-bit ADC (0–4095) • Esptool SLIP USB',
      usbFlashTitle: 'Tarayıcı WebSerial USB Yükleyici ({protocol})',
      usbFlashDesc: 'Aktif dersi tarayıcı USB üzerinden fiziksel kontrolcüye derle ve flashla',
      gridTitle: 'İzometrik Zemin Izgarası: {state}',
      gridDesc: 'Teknik çizim zemin kılavuz çizgilerini aç/kapat',
      soundTitle: 'Web Audio Sentezleyici: {state}',
      soundDesc: 'Piezo Buzzer tone() ses çıkışını aç/kapat',
      catalogDockTitle: 'Komponent Katalog Konumu: {dock}',
      catalogDockDesc: 'Komponent ekleme penceresini Ortada Modal, Sol Panel, Sağ Panel veya Alt Çekmece olarak ayarla',
      openCatalogTitle: '3B Komponent Katalogunu Aç',
      openCatalogDesc: 'Sahneye sınırsız sayıda bağımsız kart, sensör, motor, LED ve buton ekleyin',
      openSettingsModalTitle: '⚙️ Merkezi Ayarlar & Bulut Profil Penceresini Aç',
      openSettingsModalDesc: 'Pin görünürlük modu, en yakın uyumlu sınıf renklendirmesi ve kullanıcı profili senkronizasyonu',
      stateOn: 'AÇIK',
      stateOff: 'KAPALI'
    },
    settings: {
      modalTitle: '⚙️ Merkezi Ayarlar & Kullanıcı Profili',
      modalSubtitle: 'Tercihleriniz yerel olarak saklanır ve oturum açıldığında arka planda bulut profilinizle eşitlenir',
      close: 'Kapat',
      resetBtn: '↺ Varsayılanlara Sıfırla',
      sectionWiring: '🔌 Akıllı Kablolama & Bağlantı Noktası (Pin) Görünürlüğü',
      pinVisTitle: 'Bağlantı Noktası (Pin) Görünürlük Modu',
      pinVisDesc: 'Komponentlerin üzerindeki pin ve giriş etiketlerinin ne zaman gösterileceğini seçin',
      pinVisPinHover: '🎯 Sadece Bağlantı Üzerine Gelince (Varsayılan)',
      pinVisPinHoverDesc: 'Komponentin üstüne gelince tüm pinler kalabalık yapmaz; sadece üzerine geldiğiniz giriş/bağlantı noktası gözükür',
      pinVisCompHover: '📦 Komponente Bağlı Tüm Girişleri Göster',
      pinVisCompHoverDesc: 'Seçili veya üzerine gelinen komponentin tüm bağlantı noktalarını ve etiketlerini aynı anda gösterir',
      pinVisAlways: '🌐 Tüm Sahne Bağlantılarını Sürekli Göster',
      pinVisAlwaysDesc: 'Sahnedeki tüm komponentlerin bağlantı noktalarını her zaman açık tutar',
      nearestDragTitle: 'Sürüklerken En Yakın Uyumlu Sınıfı Renklendir',
      nearestDragDesc: 'Bir bağlantıyı tutup çektiğinizde aynı sınıftan bağlanabilir en yakın girişleri sınıf rengiyle parlatır',
      sectionStage: '🎛️ Sahne, Dil ve Katalog Tercihleri',
      sectionCloud: '☁️ Kullanıcı Oturumu & Backend Profil Senkronizasyonu',
      cloudStatusLocal: 'Yerel Profil (Çevrimdışı / Misafir)',
      cloudStatusSyncing: 'Bulut Profili Eşitleniyor…',
      cloudStatusSynced: 'Bulut Profiliyle Eşitlendi ({user})',
      cloudLoginSimulateBtn: '☁️ Bulut Profilini Yükle (Login Sync Test)',
      cloudLogoutBtn: 'Oturumu Kapat'
    },
    catalog: {
      openBtn: 'Komponent Katalogu',
      title: '3B Komponent Katalogu & Sahne Yöneticisi',
      subtitle: 'Sahneye istediğiniz kadar bağımsız komponent ekleyin ve masa yüzeyinde serbestçe sürükleyin',
      searchPlaceholder: 'Komponent, sensör, motor, kart veya kategori ara…',
      dockLabel: 'Konum',
      dockModal: 'Ortada Modal',
      dockLeft: 'Sol Panel',
      dockRight: 'Sağ Panel',
      dockBottom: 'Alt Çekmece',
      close: 'Kapat',
      addBtn: '+ Sahneye Ekle',
      spawnBtn: '+ Sahneye Ekle',
      onStageCount: 'Sahnede: {count}',
      instanceCount: 'Sahnede: {count}',
      activeInstancesTitle: 'Sahnedeki Bağımsız & Aktif Komponentler ({count})',
      activeStageTitle: 'Sahnedeki Bağımsız & Aktif Komponentler ({count})',
      selectBtn: 'Seç / Taşı',
      duplicateBtn: 'Çoğalt',
      removeBtn: 'Sil',
      noResults: 'Aramanızla eşleşen bir komponent bulunamadı.',
      emptySearch: 'Aramanızla eşleşen bir komponent bulunamadı.',
      categories: {
        all: 'Tümü',
        boards: 'Kartlar & Breadboard',
        leds: "LED'ler & Işık",
        passives: 'Pasif Elemanlar',
        buttons: 'Butonlar & Anahtarlar',
        sensors: 'Sensörler & Kameralar',
        audio: 'Ses & Buzzer',
        motors: 'Motorlar & Gimbal',
        drivers: 'Motor Sürücüler',
        power: 'Güç & LiPo Batarya',
        displays: 'OLED & Ekranlar',
        robotics: 'Robotik & Şasi Parçaları',
        props: 'Engeller & Test Nesneleri'
      }
    },
    gizmo: {
      title: 'Masa Üstü Taşıma & 3B Gizmo',
      hudTitle: 'Masa Üstü Taşıma',
      positionLabel: 'Konum',
      tableDragHint: '🖐 Komponenti doğrudan fareyle tutup masa yüzeyinde serbestçe sürükleyebilirsiniz',
      hint: 'X (Kırmızı) · Y (Yeşil) · Z (Mavi) eksenlerini, XZ masa düzlemini veya RY döndürme halkasını sürükleyin',
      snapOn: 'Mıknatıs: 2.54mm',
      snapOff: 'Mıknatıs: Serbest',
      snapToggle: 'Mıknatıs: {state}',
      axesToggle: '3B Gizmo Okları: {state}',
        rotate45: '45° Döndür',
      rotate90: '↻ 90° Döndür',
      duplicate: 'Çoğalt',
      delete: 'Sil',
      deselect: 'Seçimi Kaldır'
    }
  },
  stage: {
    wiring: {
      quick_connect: '🔗 Hızlı Bağla',
      smart_connect: '⚡ Akıllı Bağla',
      quick_connect_active:
        '⚡ Akıllı Bağlantı Aktif ({source}) — {source} ile bağlamak istediğiniz komponentlere sırayla tıklayın (Çıkış: ESC)',
      smart_connect_paired: '✓ Bağlandı: {from} → {to}',
      connect_to_label: 'Sahnedeki Komponente Bağla',
      magnet_snapped: 'Breadboard Mıknatıs: {pins}',
      disconnect_all: 'Bağlantıları Kopar',
      auto_wire: '⚡ Akıllı Bağla',
      wire_deleted: 'Kablo kaldırıldı',
      delete_wire_title: 'Kabloyu Sil'
    }
  },
  elec: {
    wiring: {
      err: {
        short_circuit: 'Doğrudan güç-toprak kısa devresi engellendi!',
        power_conflict: 'Farklı voltaj besleme hatları doğrudan birleştirilemez!',
        overvoltage: 'Hedef pin gerilim toleransı aşıldı (5V → 3.3V)!',
        no_free_pins: 'Bu iki komponent arasında eşleşecek boş uyumlu pin kalmadı.',
        incompatible: 'Seçilen pinler elektriksel olarak uyumsuz.',
        invalid_pin: 'Geçersiz pin seçimi.',
        same_pin: 'Aynı pin kendisine bağlanamaz.'
      }
    }
  },
  callouts: {
    usb: {
      label: 'USB Portu',
      desc: 'Kartı bilgisayara bağlayarak C++ kodlarını yükler ve 5V USB güç beslemesi sağlar.'
    },
    jack: {
      label: 'Güç Girişi (DC Jack)',
      desc: 'Bağımsız projeler için 7–12V DC adaptör veya pil paketi beslemesini kabul eder.'
    },
    digital: {
      label: 'Dijital Pinler',
      desc: 'Pin 0–13 arası HIGH (5V) veya LOW (0V) okur/yazar. ~ işaretli pinler PWM destekler.'
    },
    mcu: {
      label: 'Mikrodenetleyici',
      desc: 'ATmega328P — derlenen C++ döngünüzü 16 MHz hızında çalıştıran 8-bit AVR beyin.'
    },
    power: {
      label: 'Güç Pinleri',
      desc: 'Breadboard devrelerini beslemek için regüleli 5V, 3.3V ve GND (Toprak) hatlarını sunar.'
    },
    analog: {
      label: 'Analog Pinler',
      desc: 'A0–A5 pinleri sürekli voltajları (0–5V) 10-bitlik tam sayılar (0–1023) olarak okur.'
    },
    wroom: {
      label: 'ESP-WROOM-32 SoC',
      desc: 'RF koruma kalkanı altında 520 KB SRAM ve 4 MB Flash belleğe sahip 240 MHz Çift Çekirdekli Xtensa LX6 işlemci.'
    },
    antenna: {
      label: '2.4 GHz Wi-Fi / BLE Anteni',
      desc: '802.11 b/g/n Wi-Fi ve Bluetooth 4.2 + BLE destekleyen yerleşik altın menderes PCB anteni.'
    },
    esp_usb: {
      label: 'Micro-USB Portu',
      desc: '5V güç sağlar ve CP2102 köprüsü üzerinden 921.600 baud hızına kadar yazılım flashlar.'
    },
    cp2102: {
      label: 'CP2102 & 3.3V Regülatör',
      desc: 'Silicon Labs USB-UART köprüsü ve 5V USB gerilimini 3.3V mantık seviyesine düşüren AMS1117-3.3 LDO.'
    },
    buttons: {
      label: 'EN ve BOOT Butonları',
      desc: 'EN işlemciyi sıfırlar (Reset); BOOT (GPIO0) basılı tutulduğunda seri önyükleyici (flash) moduna girer.'
    },
    gpio: {
      label: '30-Pin Çoklu GPIO Dizisi',
      desc: '12-bit SAR ADC (0–4095), 16 PWM LEDC kanalı, kapasitif dokunma, I2C, SPI ve DAC destekli 3.3V pinler.'
    },
    jetson_heatsink: {
      label: '128-Çekirdekli Maxwell GPU & Soğutucu Blok',
      desc: '472 GFLOPS uçta yapay zeka (Edge AI) çıkarımı yapan Quad-Core ARM Cortex-A57 + 128-core NVIDIA Maxwell SoM ve eloksallı alüminyum soğutucu.'
    },
    jetson_gpio: {
      label: 'J41 40-Pin 3.3V GPIO Başlığı',
      desc: 'Linux sysfs / Jetson.GPIO uyumlu I2C, SPI, UART, PWM ve 3.3V CMOS mantık pinleri (5V doğrudan girişe toleranssız!).'
    },
    jetson_csi: {
      label: 'MIPI CSI-2 Kamera Konnektörü',
      desc: 'Gerçek zamanlı görüntü işleme ve TensorRT modelleri için yüksek hızlı MIPI CSI-2 kamera şerit veri yolu.'
    },
    jetson_ports: {
      label: 'Gigabit Ethernet & 4× USB 3.0 Kulesi',
      desc: 'Yüksek bant genişlikli sensör, kamera ve ağ iletişimi için çift katlı USB 3.0 ve RJ45 Gigabit Ethernet portları.'
    },
    jetson_power: {
      label: '5V 4A Barrel Jack & Micro-USB Güç',
      desc: 'Yüksek GPU yükü altında kararlı 5V / 4A (20W) DC besleme girişi.'
    }
  },
  workbench: {
    topPill: {
      brand: 'CircuitLab 3D',
      boardSelectLabel: 'Aktif Kontrolcü Kartı',
      noHostBoardOption: '— Ana Kart Yok (Boş Sahne) —',
      flowClosedLoop: '{currentMa} mA · Kapalı Çevrim',
      flowOpenLoop: '0.0 mA · Açık Devre',
      flowFault: 'Elektriksel Arıza ({count})',
      themeDark: 'Koyu',
      themeLight: 'Açık',
      themeToggleTitle: 'Koyu / Açık çalışma tezgahı temasını değiştir',
      langToggleTitle: 'Dili değiştir (TR / EN)',
      xrayLabel: 'X-Ray',
      xrayToggleTitle: 'Bileşen iç iletken yollarını (Dipole X-Ray) göster/gizle',
      showcaseBtn: '3B Robot Vitrini',
      showcaseBtnTitle: 'Otonom Sumo Robotu ve NVIDIA Jetson Nano Kamera Robotu 3B Tanıtım Sahnesini Aç',
      showcaseTitle: 'Otonom Sumo Robotu ve NVIDIA Jetson Nano Kamera Robotu 3B Tanıtım Sahnesini Aç',
      loginBtn: 'Giriş Yap',
      registerBtn: 'Kayıt Ol',
      logoutBtn: 'Çıkış Yap',
      logoutTitle: 'Mevcut oturumu kapat',
      dashboardBtn: 'Çalışma Alanlarım',
      dashboardBtnTitle: 'Kayıtlı çalışma alanlarınızı açın veya yeni bir çalışma alanı oluşturun',
      autosaveSaved: 'Kaydedildi · {title}',
      autosaveSaving: 'Kaydediliyor…',
      autosaveGuest: 'Misafir Modu',
      authenticatedAs: '{name}'
    },
    top: {
      brand: 'CircuitLab 3D',
      board_label: 'Aktif Kontrolcü Kartı',
      no_host_board: '— Ana Kart Yok (Boş Sahne) —',
      closed_loop: 'Kapalı Çevrim',
      open_circuit: 'Açık Devre',
      short_circuit: 'Kısa Devre / Aşırı Akım!',
      xray: 'X-Ray',
      xray_hint: 'Bileşen iç iletken yollarını (Dipole X-Ray) göster/gizle',
      showcase_btn: '3B Robot Vitrini',
      login_btn: 'Giriş Yap',
      register_btn: 'Kayıt Ol',
      logout_btn: 'Çıkış Yap',
      dashboard_btn: 'Çalışma Alanlarım',
      autosave_saving: 'Kaydediliyor…',
      autosave_saved: 'Otomatik Kaydedildi',
      autosave_guest: 'Misafir Modu'
    },
    dock: {
      toolSelect: 'Seç / Taşı',
      toolWire: 'Kablo Çek',
      toolAddPart: '+ Parça',
      simRun: 'Çalıştır',
      simStop: 'Durdur',
      commandPlaceholder: 'Devre komutu yazın (örn. "ESP32 ve DHT22 kur" veya "LED neden yanmıyor?")…',
      commandSubmit: 'Uygula',
      undoAiBtn: 'Geri Al',
      undoAiTitle: 'Son sahne komutunu geri al',
      codeBtn: 'Kod',
      codeBtnTitle: 'C++ / Python Kod ve Seri Port Çekmecesini Aç (Ctrl+E)',
      projectsBtn: 'Çalışma Alanlarım & Şablonlar',
      projectsBtnTitle: 'Kişisel Çalışma Alanı Panosu, Hazır 3B Şablonlar ve Çalışma Grupları',
      pinSidebarTitle: 'Sohbeti Yan Panele Sabitle (Sidebar)',
      attachScreenshotTitle: 'Aktif 3B Sahne Görüntüsünü Sohbete Ekle'
    },
    aiChat: {
      title: 'Donanım Ajanı & Code Mode',
      subtitle: 'Arama Modu · Kademeli Şema · Atomik 3B Sentez',
      roundBadge: 'Tur {round}/{maxRounds}',
      roundBadgeExtended: 'Tur {round}/{maxRounds} (Uzatıldı)',
      pinToSidebar: 'Yan Panele Sabitle',
      minimizeToDock: 'Alt Dock Akışına Küçült',
      clearHistory: 'Sohbeti Temizle',
      stopAgent: 'Durdur',
      undoLast: '1-Tıkla Geri Al',
      attachStageShot: '3B Sahne Görüntüsü Ekle',
      stageShotAttached: '3B Sahne Görüntüsü Eklendi',
      removeStageShot: 'Görüntüyü Kaldır',
      inputPlaceholder: 'Devre kur, pin bağla veya arıza sor (örn. "HC-SR04 ve Servo bariyer kur")…',
      answerPlaceholder: 'Yanıtınızı yazın veya yukarıdaki seçeneklerden birine tıklayın…',
      sendBtn: 'Gönder',
      answerBtn: 'Yanıtla',
      stepsHeader: 'Ajan Araç Adımları ({count})',
      extendRoundsHeader: 'Ek Tur Bütçesi İsteği',
      clarificationHeader: 'Ajan Yanıtınızı Bekliyor',
      grant5Rounds: '+5 Tur İzni Ver ve Devam Et',
      grant10Rounds: '+10 Tur İzni Ver',
      finishWithCurrent: 'Mevcut Haliyle Tamamla',
      tableComponents: 'Bileşen',
      tableWires: 'Kablo',
      tableClosedLoops: 'Kapalı Çevrim',
      tableCurrentMa: 'Toplam Akım (mA)',
      tableStatus: 'Durum',
      statusVerified: 'Doğrulandı',
      statusOpenLoop: 'Açık Çevrim',
      statusFault: 'Kısa Devre / Hata',
      emptyHint: 'Bir devre isteği yazın: Ajan önce bileşen şemalarını arar (Search Mode), ardından CircuitSDK ile 3B devreyi ve C++ kodunu sentezler (Code Mode).',
      errorFallback: 'İşlem tamamlanamadı.',
      errors: {
        modelNotConfigured: 'Sistemde aktif bir yapay zeka modeli tanımlı değil. Lütfen yönetim panelinden bir AI modeli ekleyin ve etkinleştirin.',
        apiKeyMissing: 'Aktif yapay zeka modeli için API anahtarı tanımlı değil. Lütfen sunucu veya yönetim paneli ayarlarından API anahtarını yapılandırın.',
        providerError: 'Yapay zeka sağlayıcısından geçerli bir yanıt alınamadı. Lütfen model bağlantı ayarlarını ve API anahtarını kontrol edin.',
        insufficientCredits: 'AI kredi bakiyeniz tükendi. Devre sentezine devam etmek için kredi mağazasından AI kredisi yükleyin.',
        maxRoundsExceeded: 'Maksimum ajan tur sınırına ulaşıldı.',
        unauthenticated: 'Yapay zeka ajanını kullanmak için giriş yapmalısınız.',
        requestFailed: 'Yapay zeka isteği sırasında bir hata oluştu. Lütfen tekrar deneyin.'
      }
    },
    codeDrawer: {
      title: 'Donanım Kodu & Canlı Yürütücü',
      subtitle: 'Değişiklikler gerçek zamanlı olarak 3B kart pinlerini ve CircuitFlowSolver kapalı çevrim çözücüsünü sürer',
      tabEditor: 'Kod Editörü',
      tabSerial: 'Seri Port & Pin Günlüğü',
      applyBtn: 'Kodu Karta Yükle & Çalıştır',
      resetBtn: 'Varsayılan Koda Dön',
      closeBtn: 'Kapat',
      activePinsHeading: 'Canlı Sürülen Pin Durumları',
      serialEmpty: 'Simülasyon başlatıldığında Serial.println() çıktıları ve pin geçişleri burada listelenir.',
      lineCount: '{lines} satır'
    },
    palette: {
      title: '3B Bileşen Kataloğu & Datasheet Sentezleyici',
      searchPlaceholder: 'Kart, sensör, motor, direnç veya parça kodu ara…',
      search_placeholder: 'Kart, sensör, motor, direnç veya parça kodu ara…',
      tabCatalog: 'Katalog ({count})',
      tab_catalog: 'Katalog ({count})',
      tabStudio: '✨ Özel Bileşen Stüdyosu',
      tab_studio: '✨ Özel Bileşen Stüdyosu',
      tabDatasheet: '+ Datasheet Sentezle',
      tab_datasheet: '+ Datasheet Sentezle',
      addStageBtn: '+ Sahneye Ekle',
      spawn_btn: '+ Sahneye Ekle',
      spawn_short_btn: '+ Ekle',
      previewBadge: '360° CANLI 3B ÖNİZLEME',
      previewRotateHint: 'Yavaş Döndürme · Sürükle Çevir',
      previewPinsLabel: 'Pin & Terminal Dizilimi',
      catAll: 'Tümü',
      catBoards: 'Kartlar',
      catSensors: 'Sensörler',
      catMotors: 'Motorlar',
      catDrivers: 'Sürücüler',
      catPower: 'Güç',
      catDisplays: 'Ekranlar',
      catRobots: 'Robotlar',
      catChassis: 'Şasi & Mekanik',
      catLeds: 'LED & Işık',
      catButtons: 'Butonlar',
      catPassives: 'Pasif',
      catAudio: 'Ses',
      catProps: 'Engel & Nesne',
      catCustom: 'Özel Üretim',
      studioTitle: '3B Özel Elektronik Bileşen & Modül Stüdyosu',
      studioDesc: '3B alt parça ağacı (parts[]), yüzey montajı (attach), gerçekçi devre materyalleri, 2.54mm pin dizilimi ve sinyal çalışma mantığı ile kendi elektronik modülünüzü veya sahne nesnenizi tasarlayın.',
      studioModeNode: 'Pinli Elektronik Modül (Sensör / Sürücü / Kart)',
      studioModeProp: 'Pinsiz Sahne Nesnesi (Fiziksel Engel / Hedef)',
      studioSaveSpawnBtn: 'Kataloğa Kaydet ve Sahneye Ekle',
      studioRefreshPreviewBtn: '3B Önizlemeyi Güncelle',
      studioAddPartBtn: '+ 3B Alt Parça Ekle',
      studioAddPinBtn: '+ Pin Ekle',
      studioGenHeaderBtn: '+ 2.54mm Pin Dizisi Üret',
      datasheetTitle: 'Canlı Datasheet / Parça Sentezleyici (Tavily + Nemotron)',
      datasheetDesc: 'Katalogda olmayan bir sensör veya modül adını girin; pin dizilimi, iç direnç/diyot modeli ve 3B geometrisi anında sahneye eklensin.',
      partInputPlaceholder: 'Parça kodu (örn. BME280, MPU6050, INA219, BH1750)…',
      datasheet_placeholder: 'Parça kodu (örn. BME280, MPU6050, INA219, BH1750)…',
      synthesizeBtn: 'Sentezle & Sahneye Ekle',
      datasheet_submit: 'Sentezle & Sahneye Ekle',
      synthesizingStatus: 'Datasheet taranıyor ve 3B model üretiliyor…',
      synthesizedSuccess: '{name} ({typeId}) sentezlendi ve sahneye eklendi.'
    },
    diagnostics: {
      title: 'Elektriksel Arıza & Topoloji Tanısı',
      analyzeBtn: 'Derin Teşhis (Nemotron)',
      fixBtn: 'Otomatik Onar',
      dismissBtn: 'Kapat',
      analyzing: 'Devre topolojisi analiz ediliyor…',
      healthySummary: 'Tüm kapalı çevrimler güvenli akım ve gerilim sınırları içinde çalışıyor.'
    },
    diagnostic: {
      title: 'Elektriksel Arıza & Topoloji Tanısı',
      fix_btn: 'Otomatik Onar',
      dismiss: 'Kapat'
    },
    projects: {
      title: 'Çalışma Alanı Panosu, 3B Şablonlar & Gruplar',
      subtitle: 'Kişisel bulut çalışma alanlarınızı yönetin, yeni çalışma alanı oluşturun veya hazır 3B robot devrelerini yükleyin',
      close: 'Kapat',
      tabWorkspaces: 'Çalışma Alanlarım ({count})',
      tab_workspaces: 'Çalışma Alanlarım',
      tabPresets: 'Hazır Şablonlar (3)',
      tab_presets: 'Hazır 3B Şablonlar',
      tabGroups: 'Çalışma Grupları',
      tab_groups: 'Çalışma Grupları',
      tabAccount: 'Hesabım & Güvenlik',
      tab_account: 'Hesabım & Güvenlik',
      return_workbench_btn: '3B Çalışma Alanına Dön',
      profile_section_title: 'Profil Bilgileri',
      profile_section_desc: 'Ad soyad ve hesap e-posta adresinizi güncelleyin.',
      profile_save_btn: 'Profil Bilgilerini Kaydet',
      profile_updated_toast: 'Hesap bilgileriniz başarıyla güncellendi.',
      password_section_title: 'Parola Değiştir',
      password_section_desc: 'Hesap güvenliğiniz için mevcut parolanızı doğrulayarak yeni parola belirleyin.',
      current_password_label: 'Mevcut Parola',
      new_password_label: 'Yeni Parola',
      new_password_confirm_label: 'Yeni Parola (Tekrar)',
      password_save_btn: 'Parolayı Güncelle',
      password_updated_toast: 'Parolanız güvenli bir şekilde güncellendi.',
      plan_summary_title: 'Üyelik Planı, Kota & AI Kredisi',
      newWorkspaceHeading: 'Yeni Çalışma Alanı Başlat',
      newWorkspaceDesc: 'Seçtiğiniz ana kontrolcü kartıyla temiz bir 3B çalışma alanı oluşturur ve yapılan tüm değişiklikleri otomatik kaydeder.',
      newWorkspaceTitlePlaceholder: 'Çalışma alanı adı (örn. Otonom Engel Kaçan Robot)…',
      new_workspace_title_placeholder: 'Çalışma alanı adı (örn. Otonom Engel Kaçan Robot)…',
      new_workspace_board_label: 'Ana Kontrolcü Kartı Seçin',
      createWorkspaceBtn: '+ Yeni Çalışma Alanı Oluştur',
      new_workspace_btn: '+ Yeni Çalışma Alanı Oluştur',
      activeWorkspaceLabel: 'Aktif Çalışma Alanı',
      workspace_active_badge: 'Aktif Çalışma Alanı',
      autosaveActiveBadge: 'Otomatik Kayıt Aktif',
      workspace_AutoSave_hint: 'Sahnede yaptığınız her değişiklik otomatik olarak hesabınıza kaydedilir.',
      saveNowBtn: 'Şimdi Kaydet',
      openWorkspaceBtn: 'Çalışma Alanını Aç',
      workspace_open_btn: 'Çalışma Alanını Aç',
      deleteWorkspaceBtn: 'Sil',
      workspace_delete_btn: 'Sil',
      emptyWorkspaces: 'Henüz kayıtlı bir çalışma alanınız yok. Yukarıdan yeni bir çalışma alanı başlatın veya sahnede devre kurmaya başlayın.',
      empty_workspaces: 'Henüz kayıtlı bir çalışma alanınız yok. Yukarıdan yeni bir çalışma alanı başlatın veya sahnede devre kurmaya başlayın.',
      guestDashboardTitle: 'Çalışma Alanlarınızı Hesabınıza Kaydedin',
      guest_workspace_title: 'Çalışma Alanlarınızı Hesabınıza Kaydedin',
      guestDashboardDesc: 'Oturum açtığınızda oluşturduğunuz her 3B devre ve kod değişikliği otomatik olarak hesabınıza kaydedilir.',
      guest_workspace_desc: 'Oturum açtığınızda oluşturduğunuz her 3B devre ve kod değişikliği otomatik olarak hesabınıza kaydedilir.',
      guestLoginCta: 'Giriş Yap / Kayıt Ol',
      guest_login_cta: 'Giriş Yap / Kayıt Ol',
      guestContinueCta: 'Mevcut Haliyle Devam Et (Misafir)',
      loadSceneBtn: 'Sahneye Yükle',
      load_btn: 'Sahneye Yükle',
      forkBtn: 'Forkla & Düzenle',
      fork_btn: 'Forkla & Düzenle',
      shareCurrentBtn: 'Mevcut Sahneyi Gruba Paylaş',
      share_stage_btn: 'Mevcut Sahneyi Gruba Paylaş',
      createGroupBtn: '+ Yeni Grup Kur',
      create_group_btn: '+ Yeni Grup Kur',
      create_group_label: 'Yeni Çalışma Grubu Oluştur',
      joinGroupBtn: 'Davet Koduyla Katıl',
      join_group_btn: 'Davet Koduyla Katıl',
      join_group_label: 'Davet Kodu ile Gruba Katıl',
      groupNamePlaceholder: 'Grup adı (örn. ODTÜ Robotik Atölyesi)…',
      group_name_placeholder: 'Grup adı (örn. ODTÜ Robotik Atölyesi)…',
      inviteCodePlaceholder: 'Davet kodu (örn. LAB-NEBIUS26)…',
      invite_code_placeholder: 'Davet kodu (örn. LAB-NEBIUS26)…',
      forkSuccess: '"{title}" devresi tüm özel parçalarıyla 3B sahneye yüklendi.',
      loaded_toast: '3B devre sahneye yüklendi',
      workspaceCreatedSuccess: '"{title}" çalışma alanı oluşturuldu ve hesabınıza kaydedildi.',
      workspace_created_toast: 'Yeni çalışma alanı oluşturuldu ve hesabınıza kaydedildi',
      workspaceSavedSuccess: '"{title}" çalışma alanı hesabınıza kaydedildi.',
      workspaceDeletedSuccess: 'Çalışma alanı silindi.',
      workspace_deleted_toast: 'Çalışma alanı silindi'
    },
    guestPrompt: {
      badge: 'MİSAFİR ÇALIŞMA ALANI',
      title: 'Çalışmanızı Hesabınıza Otomatik Kaydetmek İster misiniz?',
      desc: 'Oturum açtığınızda sahnede kurduğunuz devre ve yazdığınız kod anında hesabınıza kaydedilir. İsterseniz oturum açmadan mevcut haliyle de çalışmaya devam edebilirsiniz.',
      loginBtn: 'Giriş Yap / Kayıt Ol',
      continueBtn: 'Mevcut Haliyle Devam Et'
    },
    guest_prompt: {
      title: 'Çalışmanızı Hesabınıza Otomatik Kaydetmek İster misiniz?',
      body: 'Oturum açtığınızda sahnede kurduğunuz devre ve yazdığınız kod anında hesabınıza kaydedilir. İsterseniz oturum açmadan mevcut haliyle de çalışmaya devam edebilirsiniz.',
      login_cta: 'Giriş Yap / Kayıt Ol',
      continue_guest_cta: 'Oturum Açmadan Devam Et'
    },
    auth: {
      title: 'CircuitLab 3D Hesap & Bulut Çalışma Alanı',
      subtitle: 'Hesabınızla giriş yaparak 3B devre tasarımlarınızı bulutta saklayın ve her yerden projelerinize devam edin.',
      close: 'Kapat',
      loginTab: 'Giriş Yap',
      tab_login: 'Giriş Yap',
      registerTab: 'Kayıt Ol',
      tab_register: 'Kayıt Ol',
      accountTab: 'Hesabım',
      featureCloudTitle: 'Otomatik Bulut Kayıt',
      featureCloudDesc: '3B sahnede eklediğiniz her kart, sensör, kablo ve kod anında hesabınıza senkronize edilir.',
      featureDashboardTitle: 'Kişisel Çalışma Alanı Panosu',
      featureDashboardDesc: 'Arduino Uno, ESP32 ve NVIDIA Jetson Nano projeleriniz için bağımsız çalışma alanları oluşturun.',
      featureAiAssistantTitle: 'Akıllı 3B Devre & Kod Asistanı',
      featureAiAssistantDesc: 'Doğal dil komutlarıyla 3B devre kurulumu, otomatik kablolama ve gömülü C++ kodu üretimini anında çalıştırın.',
      securityPill: 'Güvenli Bulut Senkronizasyonu',
      nameLabel: 'Ad Soyad',
      name_label: 'Ad Soyad',
      emailLabel: 'E-posta Adresi',
      email_label: 'E-posta Adresi',
      passwordLabel: 'Parola',
      password_label: 'Parola',
      emailPlaceholder: 'ornek@eposta.com',
      email_placeholder: 'ornek@eposta.com',
      passwordPlaceholder: 'En az 6 karakterli parola…',
      password_placeholder: 'En az 6 karakterli parola…',
      namePlaceholder: 'Adınız ve Soyadınız…',
      name_placeholder: 'Adınız ve Soyadınız…',
      loginSubmitBtn: 'Giriş Yap',
      login_submit: 'Giriş Yap',
      registerSubmitBtn: 'Hesap Oluştur & Başla',
      register_submit: 'Hesap Oluştur & Başla',
      switchToRegisterText: 'Hesabınız yok mu? Yeni hesap oluşturun →',
      switch_to_register: 'Hesabınız yok mu? Yeni hesap oluşturun →',
      switchToLoginText: 'Zaten hesabınız var mı? Giriş yapın →',
      switch_to_login: 'Zaten hesabınız var mı? Giriş yapın →',
      logoutBtn: 'Çıkış Yap',
      logout_btn: 'Çıkış Yap',
      openDashboardBtn: 'Çalışma Alanlarımı Aç',
      open_dashboard_cta: 'Çalışma Alanlarımı Aç',
      verifiedSessionBadge: 'Aktif Hesap',
      session_verified_badge: 'Aktif Hesap',
      account_role_label: 'Üyelik Planı',
      account_credits_label: 'AI Kredi Bakiyesi',
      sessionActiveBadge: 'Aktif Oturum: {name} ({email})',
      auth_success_status: 'Oturum başarıyla açıldı.',
      register_success_status: 'Hesabınız oluşturuldu ve oturum açıldı.',
      logged_out_status: 'Oturumunuz güvenli şekilde kapatıldı.',
      invalid_credentials_error: 'E-posta veya parola hatalı.',
      invalidEmailError: 'Lütfen geçerli bir e-posta adresi girin (örn. ad@alanadi.com).',
      invalid_email_error: 'Lütfen geçerli bir e-posta adresi girin (örn. ad@alanadi.com).',
      invalidPasswordError: 'Parola en az 6 karakter olmalıdır.',
      short_password_error: 'Parola en az 6 karakter olmalıdır.',
      invalidNameError: 'Kayıt için lütfen ad ve soyadınızı girin.',
      missing_name_error: 'Kayıt için lütfen ad ve soyadınızı girin.'
    }
  },
  landing: {
    nav: {
      badge: 'ENDÜSTRİYEL 3B DONANIM & ROBOTİK LABORATUVARI',
      sceneSumo: '01 · Otonom Sumo Robotu',
      sceneJetson: '02 · NVIDIA Jetson Kamera Robotu',
      loginBtn: 'Giriş Yap',
      registerBtn: 'Kayıt Ol',
      dashboardBtn: 'Çalışma Alanlarım',
      logoutBtn: 'Çıkış Yap',
      enterWorkbenchBtn: '3B Donanım Atölyesine Geç →',
      enterWorkbench: '3B Donanım Atölyesine Geç →'
    },
    hero: {
      eyebrow: 'SIFIR DONANIM MALİYETİ · GERÇEK ZAMANLI 3B ELEKTRONİK & ROBOTİK STÜDYOSU',
      title: 'Fiziksel Parçaları Satın Almadan Önce Robotunuzu 3 Boyutlu Tasarlayın, Kablolayın ve Test Edin.',
      subtitle: 'Kısa devre riskini ve haftalar süren kargo bekleyişini bitirin. Gerçek 3B CAD bileşenlerini birleştirin, voltaj ve akım dağılımını canlı simüle edin; hazır robot şablonlarını tek tıkla atölyede özelleştirin.',
      ctaLaunchWorkbench: 'Boş 3B Çalışma Tezgahını Aç',
      ctaFocusSumo: 'Sahne 01: Sumo Robotu',
      ctaFocusJetson: 'Sahne 02: Jetson Kamera Robotu',
      primaryCta: 'Ücretsiz 3B Atölyeyi Başlat →',
      secondaryCtaSumo: 'Otonom Sumo Robotu',
      secondaryCtaJetson: 'Jetson AI Kamera Robotu',
      metricPhysics: 'Canlı Kirchhoff & Akım Koruması',
      metricBoards: '30+ Gerçek Ölçekli 3B Donanım',
      metricZeroGradient: 'Tarayıcıda Sıfır Kurulumla Çalışır'
    },
    valueStrip: {
      v1Title: '10× Daha Hızlı Prototipleme',
      v1Desc: 'Lehim ve kablo karmaşasına girmeden saniyeler içinde devre kurun ve kodu canlı çalıştırın.',
      v2Title: 'Sıfır Yanlış Bağlantı Riski',
      v2Desc: 'Akım çözücü her pini gerçek zamanlı denetler; kısa devre ve aşırı yükü donanım yanmadan yakalar.',
      v3Title: 'Üretime Hazır 3B Şablonlar',
      v3Desc: 'Otonom Sumo veya Jetson AI robotunu tek tıkla 3B atölyeye aktarıp kendi sensörlerinizle geliştirin.'
    },
    sumoScene: {
      sectionIndex: '01 · YÜKSEK TORKLU OTONOM ROBOTU KEŞFEDİN',
      sceneTag: '01 · YÜKSEK TORKLU OTONOM ROBOTU KEŞFEDİN',
      title: 'Otonom Mini-Sumo Robotu',
      subtitle: 'Yarışma standartlarında tasarlanmış tam otonom mücadele mimarisi. Kritik donanım katmanlarının üzerine gelerek iç yapıyı 3 boyutlu inceleyin veya devreyi doğrudan atölyede açın.',
      highlightsHint: 'ÖZELLİKLERİN ÜZERİNE GELEREK 3B DONANIMI AYRIŞTIRIN',
      highlights: {
        radar: {
          tag: 'MİLİSANİYE REFLEKS',
          title: '40 kHz Ultrasonik Rakip Kilitlenme & Sınır Koruması',
          desc: 'Çift HC-SR04 akustik sonar ile rakibi 400 cm menzilde anında tespit eder; TCRT5000 kızılötesi sensörlerle saha çizgisini okuyup otonom kaçış manevrası yapar.',
          metric: '40 kHz Sonar · 0.3 cm Hassasiyet'
        },
        drive: {
          tag: 'MAKSİMUM İTİŞ GÜCÜ',
          title: 'L298N Çift H-Köprü & 600 RPM Metal Dişli Tahrik',
          desc: 'Kanal başına 2A sürekli akım sağlayan çift H-Köprü sürücü ve yüksek torklu N20 redüktörlü motorlarla patinaj yapmadan tam güçte saldırı ivmesi üretir.',
          metric: '2A PWM Sürücü · 30:1 Redüktör'
        },
        brain: {
          tag: 'CANLI DEVRE & KOD',
          title: 'Arduino Uno R3 & 3S LiPo Güç Dağıtım Mimarisi',
          desc: 'ATmega328P mikrodenetleyici üzerindeki 14 gerçek kablo bağlantısını, PWM hız sinyallerini ve 11.1V LiPo akım akışını 3B atölyede canlı değiştirin.',
          metric: '16 MHz MCU · 11.1V 75C LiPo'
        }
      },
      statusApproaching: 'UZAKTAN YAKLAŞIYOR',
      statusAssembled: 'MEKANİK KİLİT (MERKEZ)',
      statusExploded: 'PATLATILMIŞ CAD GÖRÜNÜMÜ',
      telemetryDistance: 'Pist Mesafesi: {distanceMm} mm',
      telemetryExplode: 'CAD Ayrışma: %{percent}',
      explodeSliderLabel: 'Patlatma Oranı (Explode CAD)',
      approachSliderLabel: 'Pist Yaklaşım Konumu',
      approachLabel: 'Pist Yaklaşım Konumu (Z: -115 → 0)',
      explodeLabel: '8 Katmanlı CAD Patlatma Oranı',
      bomTitle: '8 MODÜLER 3B DONANIM KATMANI (BOM)',
      btnReplayApproach: '↺ Gelişi & Patlamayı Oynat',
      replayApproachBtn: '↺ Uzaktan Gelişi & Patlamayı Oynat',
      btnExplodeToggle: '⤢ Parçalarına Ayır / Birleştir',
      explodeBtn: '⤢ Parçalarına Ayır (100%)',
      assembleBtn: '⤡ Mekanik Birleştir (0%)',
      btnOpenInWorkbench: 'Sumo Robot Devresini 3B Atölyede Aç →',
      openInWorkbenchBtn: 'Sumo Robot Devresini 3B Atölyede Aç →',
      partsTitle: '8 Modüler 3B Bileşen Katmanı (Atölyede Tek Tek Kullanılabilir)',
      parts: {
        wedgeBlade: {
          title: '18° Sertleştirilmiş Çelik Dozer Bıçağı',
          spec: 'robotics.sumo_dozer_blade · BaseChassisPart · CNC Taşlanmış Ön Kama'
        },
        chassisBase: {
          title: 'CNC 6061-T6 Alt Şasi Plakası & M3 Pirinç Dikmeler',
          spec: 'robotics.sumo_chassis_plate · BaseChassisPart · Eloksal Gövde'
        },
        n20Drivetrain: {
          title: '4× N20 600RPM Redüktörlü Motor & Silikon Tekerlek',
          spec: 'motor.n20_gearmotor · BaseMotor · 1:50 Pirinç Dişli Kutusu'
        },
        l298nDriver: {
          title: 'L298N Çift H-Köprüsü Motor Sürücü',
          spec: 'driver.l298n_dual · BaseMotorDriver · 2A/Kanal + Eloksal Soğutucu'
        },
        arduinoUno: {
          title: 'Arduino Uno R3 Ana Kontrolcü Kartı',
          spec: 'board.arduino_uno · BaseMCUBoard · ATmega328P @ 16MHz'
        },
        lipoPack: {
          title: '3S 11.1V 1300mAh 75C LiPo Batarya Paketi',
          spec: 'power.lipo_3s_1300mah · BasePowerModule · XT60 + JST-XH Balans'
        },
        ultrasonicArray: {
          title: 'Çift HC-SR04 Ultrasonik Rakip Tarayıcı',
          spec: 'sensor.ultrasonic · BaseDistanceSensor · 40kHz Akustik Sonar'
        },
        lineSensors: {
          title: '4× TCRT5000 IR Dohyo Sınır Dizisi & 3K Karbon Zırh',
          spec: 'sensor.tcrt5000_line · BaseAnalogSensor + robotics.sumo_armor_hood'
        }
      }
    },
    jetsonScene: {
      sectionIndex: '02 · EDGE AI & BİLGİSAYARLI GÖRÜŞ PLATFORMU',
      sceneTag: '02 · EDGE AI & BİLGİSAYARLI GÖRÜŞ PLATFORMU',
      title: 'NVIDIA Jetson Nano AI Kamera Robotu',
      subtitle: 'Buluta ihtiyaç duymadan cihaz üzerinde gerçek zamanlı nesne takibi yapan otonom keşif robotu. Öne çıkan modüllerin üzerine gelerek 3B donanım katmanlarını canlı inceleyin.',
      highlightsHint: 'ÖZELLİKLERİN ÜZERİNE GELEREK 3B DONANIMI AYRIŞTIRIN',
      highlights: {
        ai: {
          tag: '472 GFLOPS EDGE AI',
          title: 'NVIDIA Jetson Nano & 128-Çekirdekli Maxwell GPU',
          desc: 'Saniyede 60 kare TensorRT derin öğrenme çıkarımı ve 40-pin J41 GPIO donanım kontrolünü tek bir düşük güçlü modülde birleştirir.',
          metric: '128 CUDA · FP16 TensorRT'
        },
        optics: {
          tag: 'AKTİF 3B GÖRÜŞ KONİSİ',
          title: 'Sony IMX219 160° Kamera & 2-Eksenli Servo Gimbal',
          desc: 'Geniş açılı 8MP MIPI CSI-2 kamera ve çift eksenli Pan/Tilt kule ile hareketli hedefleri 3B görüş alanı içinde otomatik kilitler.',
          metric: '160° FOV · 1080p 60FPS'
        },
        mobility: {
          tag: '360° OMNİDİREKSİYONEL',
          title: 'Mecanum Tekerlekler & VL53L1X Lazer ToF Kalkanı',
          desc: '45° açılı Mecanum silindirlerle olduğu yerde dönmeden her yöne kayar; milimetrik lazer mesafe sensörü ve OLED ekranla güvenli rota çizer.',
          metric: '360° Vektör · 940nm Lazer ToF'
        }
      },
      statusScanning: 'OTONOM KAMERA TAKİBİ AKTİF',
      statusExploded: 'JETSON CAD KATMAN ANALİZİ',
      telemetryStream: 'IMX219 CSI-2 · 1280×720 @ 60 FPS · TensorRT FP16',
      telemetryGimbal: 'Gimbal: Pan {panDeg}° · Tilt {tiltDeg}°',
      explodeSliderLabel: 'Jetson CAD Patlatma Oranı',
      panSliderLabel: 'Kamera Pan Açısı',
      panLabel: 'Kamera Pan Açısı (Yatay)',
      tiltLabel: 'Kamera Tilt Açısı (Dikey)',
      explodeLabel: 'Jetson CAD Patlatma Oranı',
      bomTitle: '8 MODÜLER 3B EDGE AI KATMANI (BOM)',
      autoScanBtn: 'Otonom Hedef Takibi',
      btnToggleFov: '3B Görüş Konisi (FOV)',
      fovToggleBtn: '3B Görüş Konisi (FOV)',
      btnExplodeToggle: '⤢ Robotu Parçalarına Ayır / Birleştir',
      explodeToggleBtn: '⤢ Robotu Parçalarına Ayır / Birleştir',
      btnOpenInWorkbench: 'Jetson Kamera Robotunu 3B Atölyede Aç →',
      openInWorkbenchBtn: 'Jetson Kamera Robotunu 3B Atölyede Aç →',
      partsTitle: '8 Modüler 3B Edge AI Bileşeni (Atölyede Tek Tek Kullanılabilir)',
      parts: {
        mecanumChassis: {
          title: '4× Mecanum Omni-Tekerlek & CNC Rover Şasisi',
          spec: 'motor.mecanum_wheel · BaseMotor + robotics.jetson_rover_chassis'
        },
        powerRegulator: {
          title: 'INA219 Çift 18650 5V/4A Buck Güç & Telemetri Modülü',
          spec: 'power.ina219_buck_bay · BasePowerModule · R100 Şönt + I2C'
        },
        jetsonNanoSbc: {
          title: 'NVIDIA Jetson Nano B01 Geliştirici Kartı',
          spec: 'board.jetson_nano · BaseSBCBoard · 128-Core Maxwell + J41 3.3V'
        },
        panTiltGimbal: {
          title: '2 Eksenli Pan/Tilt MG90S Servo Kamera Tareti',
          spec: 'motor.pan_tilt_gimbal · BaseMotor · Çift PWM Kule'
        },
        imx219Camera: {
          title: 'Sony IMX219 8MP 160° MIPI CSI-2 AI Kamera Modülü',
          spec: 'sensor.imx219_csi · BaseVisionSensor · Çok Elemanlı Cam Lens + IR'
        },
        csiRibbon: {
          title: '15-Pin MIPI CSI-2 Esnek Şerit Kablo & I2C Veri Yolu',
          spec: 'robotics.csi_ribbon_harness · BaseChassisPart · 1.5Gbps/Hat'
        },
        lidarTof: {
          title: 'VL53L1X 940nm Lazer Time-of-Flight Mesafe Sensörü',
          spec: 'sensor.vl53l1x_tof · BaseDistanceSensor · 4m Milimetrik Lazer'
        },
        oledTelemetry: {
          title: '0.96" SSD1306 128×64 I2C OLED Telemetri Ekranı',
          spec: 'display.ssd1306_oled · BaseDisplayModule · Canlı FPS & Voltaj'
        }
      }
    },
    sumo: {
      sceneCode: 'SAHNE 01 // OTONOM MİNİ-SUMO ROBOTU',
      title: 'Uzaktan Geliş Kinematiği & 8 Katmanlı Patlatılmış (Exploded CAD) Mekanik Mimari',
      subtitle: 'Dohyo pistinin derinliğinden hızlanarak sahne merkezine kilitlenen ve L298N H-Köprüsü, Arduino Uno R3, N20 redüktörlü motorlar, 3S LiPo batarya, HC-SR04 ultrasonik radar ve CNC çelik dozer bıçağı katmanlarına ayrılan otonom sumo robotu.',
      statusApproaching: 'UZAKTAN YAKLAŞIYOR',
      statusLocked: 'MEKANİK KİLİT (MERKEZ)',
      statusExploded: 'PATLATILMIŞ CAD GÖRÜNÜMÜ',
      replayBtn: '↺ Uzaktan Gelişi & Patlamayı Oynat',
      explodeFullBtn: '⤢ Parçalarına Ayır (100%)',
      assembleBtn: '⤡ Mekanik Birleştir (0%)',
      explodeSliderLabel: 'Patlatma Oranı (Explode CAD)',
      approachSliderLabel: 'Pist Yaklaşım Konumu',
      openInWorkbenchBtn: 'Sumo Robot Devresini 3B Atölyede Aç →',
      telemetryDistance: 'Pist Mesafesi: {zMm} mm',
      telemetryExplode: 'CAD Ayrışma: %{percent}',
      telemetrySubAssemblies: '8 Alt Montaj Grubu · 11.1V 3S LiPo / 5V Lojik'
    },
    jetson: {
      sceneCode: 'SAHNE 02 // NVIDIA JETSON NANO EDGE AI KAMERA ROBOTU',
      title: 'NVIDIA Jetson Nano & IMX219 CSI-2 160° Aktif Kamera Görüş Robotu',
      subtitle: '128 çekirdekli Maxwell GPU, 40-pin J41 3.3V GPIO başlığı, MIPI CSI-2 şerit veri yolu ve 2 eksenli Pan-Tilt servo gimbal kulesi üzerinde gerçek zamanlı 3B görüş konisi (FOV Frustum) taraması yapan otonom Edge AI kamera robotu.',
      statusTracking: 'OTONOM KAMERA TAKİBİ AKTİF',
      statusManual: 'MANUEL GİMBAL KONTROLÜ',
      statusExploded: 'JETSON CAD KATMAN ANALİZİ',
      toggleTrackingBtn: 'Otonom Hedef Takibi',
      toggleFovBtn: '3B Görüş Konisi (FOV)',
      explodeBtn: '⤢ Robotu Parçalarına Ayır',
      assembleBtn: '⤡ Robotu Birleştir',
      panSliderLabel: 'Kamera Pan Açısı ({deg}°)',
      tiltSliderLabel: 'Kamera Tilt Açısı ({deg}°)',
      explodeSliderLabel: 'Jetson CAD Patlatma Oranı',
      openInWorkbenchBtn: 'Jetson Kamera Robotunu 3B Atölyede Aç →',
      telemetryFps: 'TensorRT CSI-2: 60 FPS · 3.3V J41',
      telemetryGimbal: 'Gimbal: Pan {pan}° / Tilt {tilt}°',
      telemetrySubAssemblies: '8 Alt Montaj Grubu · IMX219 8MP + Mecanum Tahrik'
    }
  }
};
