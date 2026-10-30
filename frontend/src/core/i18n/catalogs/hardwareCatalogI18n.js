/**
 * Modular Hardware Component Translation Catalog (`hw.<typeId>.<field>`).
 * Decouples component display names, summaries, descriptions, and pin labels from component classes.
 * New or AI-generated components can register their own entries dynamically via `i18n.registerNamespace()`.
 */
export const hardwareCatalogI18n = {
  tr: {
    hw: {
      board: {
        arduino_uno: {
          name: 'Arduino Uno R3',
          summary: 'ATmega328P 8-bit AVR Mikrodenetleyici Kartı (5V)',
          desc: '14 dijital G/Ç pini (6 PWM), 6 analog giriş (10-bit ADC) ve 5V mantık seviyesine sahip standart geliştirme kartı.'
        },
        esp32_devkit: {
          name: 'ESP32 DevKit V1',
          summary: 'Çift Çekirdekli Xtensa LX6 Wi-Fi + BLE SoC Kartı (3.3V)',
          desc: '240 MHz çift çekirdek, dahili Wi-Fi/BLE, 12-bit ADC ve 3.3V mantık seviyesine sahip IoT kontrolcü kartı.'
        },
        jetson_nano: {
          name: 'NVIDIA Jetson Nano',
          summary: '128-Çekirdekli Maxwell GPU Yapay Zeka Bilgisayarı (3.3V)',
          desc: '40-pin GPIO dizisi, CSI kamera veri yolu ve uçta yapay zeka (Edge AI) çıkarımı sunan tek kartlı bilgisayar.'
        },
        breadboard: {
          name: '400-Nokta Lehimsiz Breadboard',
          summary: 'Beşli İletken Terminal Şeritleri ve Güç Rayları',
          desc: 'Beşli yatay terminal şeritleri (A–E, F–J) ve dikey güç dağıtım rayları (+ / −) ile lehimsiz devre kurulum tablası.'
        }
      },
      led: {
        single: {
          name: '5mm LED (Işık Yayan Diyot)',
          summary: 'Yarı-İletken P-N Eklemli Tek Renkli LED (2.0V / Maks 30mA)',
          desc: 'Akımın yalnızca Anot (+) bacağından Katot (−) bacağına akmasına izin verir; 220Ω seri direnç gerektirir.'
        },
        rgb: {
          name: '5mm Ortak Katot RGB LED',
          summary: 'Kırmızı, Yeşil ve Mavi PWM Kanal Karıştırıcı LED',
          desc: 'Tek şeffaf epoksi kubbe altında R, G, B yarı-iletken kristallerini birleştirerek milyonlarca renk üretir.'
        }
      },
      passive: {
        resistor: {
          name: '220 Ω Karbon Film Direnç',
          summary: 'Akım Sınırlayıcı Pasif Direnç (±%5 Tolerans)',
          desc: 'Ohm Yasası (I = V / R) uyarınca devreden geçen akımı güvenli seviyede sınırlar ve gerilim böler.'
        },
        wire: {
          name: 'DuPont Jumper Kablo',
          summary: 'İzoleli Bakır Breadboard Bağlantı Kablosu',
          desc: 'Kart pinleri, breadboard şeritleri ve bileşen bacakları arasında düşük dirençli (0.01 Ω) iletkenlik sağlar.'
        }
      },
      button: {
        tactile: {
          name: '6x6mm Taktil Anlık Buton',
          summary: 'Yaylı Mekanik Devre Anahtarı (NO - Normalde Açık)',
          desc: 'Basılı tutulduğunda iç kontaklarını birleştirerek ~0.05 Ω iletkenlik sağlar; bırakıldığında devreyi açar.'
        },
        arcade: {
          name: 'Endüstriyel Kubbeli Arcade Buton',
          summary: 'Geniş Başlıklı Yüksek Dayanımlı Anlık Anahtar',
          desc: 'Hızlı tetikleme ve oyun/kontrol panelleri için geniş kubbeli mekanik anahtar.'
        }
      },
      sensor: {
        potentiometer: {
          name: '10 kΩ Döner Potansiyometre',
          summary: 'Üç Bacaklı Ayarlanabilir Gerilim Bölücü (ADC)',
          desc: 'Döner mil açısına göre orta bacakta (Wiper) 0V ile VCC arasında kesintisiz analog gerilim üretir.'
        },
        ultrasonic: {
          name: 'HC-SR04 Ultrasonik Mesafe Sensörü',
          summary: '40 kHz Akustik Yankı (Sonar) Mesafe Ölçer',
          desc: 'TRIG pininden 10 µs darbe aldığında 40 kHz ses dalgası yayar ve ECHO darbe süresinden mesafeyi (2–400 cm) hesaplar.'
        },
        ldr: {
          name: 'LDR Foto-Direnç (Işık Sensörü)',
          summary: 'Işık Şiddetine Duyarlı Değişken Direnç (CdS)',
          desc: 'Üzerine düşen foton yoğunluğu arttıkça direnci kΩ seviyesinden yüzlerce Ohm seviyesine düşen analog sensör.'
        },
        imx219_csi: {
          name: 'Sony IMX219 8MP CSI-2 Kamera',
          summary: '160° Geniş Açılı MIPI CSI-2 Yapay Görme Kamerası',
          desc: 'NVIDIA Jetson Nano CSI-2 veri yolu için yüksek kare hızlı 8MP görüntü sensörü ve esnek şerit kablo konnektörü.'
        },
        vl53l1x_tof: {
          name: 'VL53L1X Lazer ToF Mesafe Sensörü',
          summary: '940nm VCSEL Uçuş Süresi (Time-of-Flight) Lazer Radar',
          desc: 'I2C veri yolu üzerinden milimetrik hassasiyetle 4 metreye kadar lazer mesafe ölçümü yapan optik sensör.'
        },
        tcrt5000_line: {
          name: 'TCRT5000 3’lü Kızılötesi Çizgi Dizisi',
          summary: 'Dohyo Sınır ve Çizgi Algılama IR Sensör Barı',
          desc: '950nm IR verici ve fototransistör çiftleriyle zemin yansımasını hem analog hem dijital olarak okur.'
        }
      },
      audio: {
        piezo: {
          name: 'Piezo Buzzer (Akustik Transdüser)',
          summary: 'Piezoelektrik Seramik Ses ve Frekans Üreteci',
          desc: 'Kare dalga (PWM / tone) sinyallerini mekanik diyafram titreşimine dönüştürerek işitilebilir notalar üretir.'
        }
      },
      motor: {
        dc: {
          name: 'Fırçalı DC Fan Motoru',
          summary: 'Elektromanyetik Bobinli Sürekli Dönüş Motoru',
          desc: 'Uygulanan ortalama gerilim ve PWM görev döngüsü (Duty Cycle) ile orantılı devir hızında (RPM) döner.'
        },
        servo: {
          name: 'SG90 Mikro Servo Motor',
          summary: 'Kapalı Çevrim Dişli Kutulu Açısal Aktüatör (0°–180°)',
          desc: '50 Hz PWM darbe genişliğini (500–2400 µs) okuyarak dahili potansiyometre geri bildirimiyle hedef açıya kilitlenir.'
        },
        n20_gearmotor: {
          name: 'N20 600RPM Redüktörlü Motor + Tekerlek',
          summary: '1:50 Pirinç Dişli Kutulu Mikro DC Motor ve Silikon Tekerlek',
          desc: 'Yüksek torklu 12V 600RPM N20 metal dişli motor, CNC alüminyum jant ve yüksek tutuşlu silikon sumo lastiği.'
        },
        mecanum_wheel: {
          name: 'Mecanum Yönsüz (Omnidirectional) Tekerlek',
          summary: '45° Açılı 9 Rulmanlı Holonomik Sürüş Tekerleği ve Enkoderli Motor',
          desc: 'Bağımsız vektör kontrolü ile ileri, yana (strafe) ve yerinde 360° dönüş hareketi sağlayan robotik tekerlek.'
        },
        pan_tilt_gimbal: {
          name: '2 Eksenli Pan/Tilt Kamera Gimbal Kulesi',
          summary: 'Çift MG90S Servo Aktüatörlü Yönlendirme Mekanizması',
          desc: 'Yatay (Pan ±75°) ve dikey (Tilt ±35°) eksenlerde kamera veya sensör yönlendirmesi sağlayan servo kulesi.'
        }
      },
      driver: {
        l298n_dual: {
          name: 'L298N Çift H-Köprüsü Motor Sürücü',
          summary: 'Çift Kanallı 2A PWM Motor Sürücü ve 5V Regülatör',
          desc: 'ENA/ENB PWM hız kontrolü, IN1–IN4 yön pinleri ve alüminyum soğutucu bloklu çift H-köprüsü sürücü.'
        }
      },
      power: {
        lipo_3s_1300mah: {
          name: '3S 11.1V 1300mAh LiPo Batarya Paketi',
          summary: 'Yüksek Deşarjlı (45C) XT60 Çıkışlı Robotik Güç Kaynağı',
          desc: 'XT60 ana güç konnektörü ve JST-XH balans soketine sahip 11.1V 3 hücreli lityum polimer batarya.'
        },
        ina219_buck_bay: {
          name: 'INA219 I2C Akım/Güç Telemetri & 5V/4A Buck',
          summary: '0.1Ω Şöntlü I2C Güç Ölçer ve Senkron Step-Down Regülatör',
          desc: 'Yüksek akımlı 5V/4A regüle çıkış üretirken I2C üzerinden anlık gerilim, akım ve güç telemetrisi sunar.'
        }
      },
      display: {
        ssd1306_oled: {
          name: '0.96" SSD1306 I2C OLED Ekran',
          summary: '128×64 Piksel Çift Renkli I2C Telemetri Ekranı',
          desc: 'I2C (SDA/SCL) veri yolu üzerinden canlı sensör, FPS ve durum telemetrisi gösteren 128×64 OLED panel.'
        }
      },
      robotics: {
        sumo_chassis_plate: {
          name: 'CNC Anodize Sumo Ana Şasi Plakası',
          summary: 'Pirinç M3 Standoff ve Motor Yataklı Alüminyum Gövde',
          desc: 'Mini-Sumo robotlar için CNC işlenmiş alüminyum taban plakası ve titreşim sönümleyici montaj dikmeleri.'
        },
        sumo_dozer_blade: {
          name: '22° Sertleştirilmiş Çelik Sumo Dozer Bıçağı',
          summary: 'Düşük Profilli CNC Kesim Ön Kama ve TCRT5000 Yuvası',
          desc: 'Rakip robotun altına girmek için hassas taşlanmış 22° eğimli çelik dozer bıçağı.'
        },
        sumo_armor_hood: {
          name: 'Karbon-Fiber Üst Zırh & Sonar Koruma Kalkanı',
          summary: 'HC-SR04 Akustik Portlu ve Durum LED’li Üst Zırh',
          desc: 'Elektronik katmanı koruyan karbon-fiber dokulu üst kabuk ve entegre ultrasonik sensör yuvası.'
        },
        jetson_rover_chassis: {
          name: 'Jetson Rover Çift Katlı Karbon Şasi',
          summary: 'Mecanum Süspansiyon Kollu Karbon-Fiber Robot Platformu',
          desc: 'NVIDIA Jetson Nano ve 4 tekerlekli Mecanum tahrik sistemi için titreşim izoleli çift katlı şasi.'
        },
        csi_ribbon_harness: {
          name: 'MIPI CSI-2 Yüksek Hızlı Esnek Şerit Kablo',
          summary: '15-Pin Altın Kontak EMI Korumalı Kamera Veri Yolu',
          desc: 'Kamera gimbal kulesi ile Jetson Nano CSI-2 portu arasında diferansiyel görüntü sinyali taşır.'
        }
      },
      robot: {
        autonomous_sumo: {
          name: 'Otonom Mini-Sumo Robot (Tam Montaj)',
          summary: '8 Katmanlı Patlatılabilir (Exploded View) Otonom Sumo Robotu',
          desc: 'Arduino Uno, L298N, çift N20 tekerlek, HC-SR04 sonar, TCRT5000 çizgi dizisi ve çelik dozer bıçağından oluşan tam otonom robot.'
        },
        jetson_vision_rover: {
          name: 'NVIDIA Jetson Nano Yapay Görme Robotu',
          summary: '8 Katmanlı Pan/Tilt Kamera Gimbal ve Mecanum Vizyon Robotu',
          desc: 'Jetson Nano, Sony IMX219 CSI-2 kamera, 2 eksenli servo gimbal, VL53L1X lazer ToF, OLED ekran ve 4 Mecanum tekerlekli tam robot.'
        }
      },
      prop: {
        obstacle_wall: {
          name: 'Akustik & Optik Engel Duvarı (Test Hedefi)',
          summary: 'Ultrasonik / Lazer ToF Mesafe ve Kamera Test Engeli (Pin Gerektirmez)',
          desc: 'Sahne üzerinde sürüklenerek HC-SR04 ultrasonik, VL53L1X lazer mesafe sensörleri ve kameraların gerçek zamanlı mesafe/engel tepkisini test eden 3B fiziksel hedef duvarı.'
        },
        toy_bear: {
          name: '3B Oyuncak Ayı (Engel & Kamera Hedefi)',
          summary: 'Kamera Nesne Tanıma ve Yakınlık Sensörü Test Nesnesi (Pin Gerektirmez)',
          desc: 'Sahneye yerleştirilip sensörlere yaklaştırıldığında mesafe ve yapay görme (IMX219 kamera) algılamasını tetikleyen 3B oyuncak ayı modeli.'
        }
      }
    }
  },
  en: {
    hw: {
      board: {
        arduino_uno: {
          name: 'Arduino Uno R3',
          summary: 'ATmega328P 8-bit AVR Microcontroller Board (5V)',
          desc: 'Standard development board with 14 digital I/O pins (6 PWM), 6 analog inputs (10-bit ADC), and 5V logic.'
        },
        esp32_devkit: {
          name: 'ESP32 DevKit V1',
          summary: 'Dual-Core Xtensa LX6 Wi-Fi + BLE SoC Board (3.3V)',
          desc: '240 MHz dual-core IoT controller with built-in Wi-Fi/BLE, 12-bit ADC, and 3.3V logic level.'
        },
        jetson_nano: {
          name: 'NVIDIA Jetson Nano',
          summary: '128-Core Maxwell GPU Edge AI Single-Board Computer (3.3V)',
          desc: 'Single-board AI computer featuring a 40-pin GPIO header, CSI camera bus, and 3.3V logic.'
        },
        breadboard: {
          name: '400-Point Solderless Breadboard',
          summary: '5-Hole Conductive Terminal Strips & Power Rails',
          desc: 'Solderless prototyping board with 5-point terminal strips (A–E, F–J) and vertical power distribution rails (+ / −).'
        }
      },
      led: {
        single: {
          name: '5mm LED (Light Emitting Diode)',
          summary: 'Semiconductor P-N Junction Monochromatic LED (2.0V / Max 30mA)',
          desc: 'Allows current to flow only from Anode (+) to Cathode (−); requires a series current-limiting resistor.'
        },
        rgb: {
          name: '5mm Common-Cathode RGB LED',
          summary: 'Red, Green & Blue PWM Channel Mixing LED',
          desc: 'Combines R, G, and B semiconductor dies under a single lens to mix millions of colors.'
        }
      },
      passive: {
        resistor: {
          name: '220 Ω Carbon Film Resistor',
          summary: 'Current-Limiting Passive Resistor (±5% Tolerance)',
          desc: 'Limits electrical current flow and divides voltage according to Ohm’s Law (I = V / R).'
        },
        wire: {
          name: 'DuPont Jumper Wire',
          summary: 'Insulated Copper Breadboard Jumper Wire',
          desc: 'Provides low-resistance (0.01 Ω) electrical conductivity between board headers, breadboard strips, and component leads.'
        }
      },
      button: {
        tactile: {
          name: '6x6mm Tactile Push Button',
          summary: 'Spring-Return Momentary Switch (Normally Open)',
          desc: 'Bridges internal contacts with ~0.05 Ω resistance while pressed; opens the circuit when released.'
        },
        arcade: {
          name: 'Industrial Dome Arcade Button',
          summary: 'Heavy-Duty Momentary Dome Switch',
          desc: 'Wide-plunger momentary mechanical switch for rapid trigger and control panel applications.'
        }
      },
      sensor: {
        potentiometer: {
          name: '10 kΩ Rotary Potentiometer',
          summary: 'Three-Terminal Variable Voltage Divider (ADC)',
          desc: 'Outputs a continuous analog voltage between 0V and VCC on the center wiper pin based on shaft angle.'
        },
        ultrasonic: {
          name: 'HC-SR04 Ultrasonic Distance Sensor',
          summary: '40 kHz Acoustic Echo Sonar Rangefinder',
          desc: 'Emits a 40 kHz ultrasonic burst upon a 10 µs TRIG pulse and measures distance (2–400 cm) from ECHO pulse width.'
        },
        ldr: {
          name: 'LDR Photoresistor (Light Sensor)',
          summary: 'Light-Dependent Variable Resistor (CdS)',
          desc: 'Analog sensor whose resistance drops from kΩ to hundreds of Ohms as incident photon intensity increases.'
        },
        imx219_csi: {
          name: 'Sony IMX219 8MP CSI-2 Camera',
          summary: '160° Wide-Angle MIPI CSI-2 Machine Vision Camera',
          desc: 'High-framerate 8MP CMOS sensor with wide-angle barrel lens and 15-pin MIPI CSI-2 ribbon interface.'
        },
        vl53l1x_tof: {
          name: 'VL53L1X Laser ToF Rangefinder',
          summary: '940nm VCSEL Time-of-Flight Laser Distance Sensor',
          desc: 'Millimeter-accurate optical Time-of-Flight distance sensor up to 4m over I2C.'
        },
        tcrt5000_line: {
          name: 'TCRT5000 3-Ch IR Line Sensor Array',
          summary: '950nm Infrared Reflectance & Ring-Edge Sensor Bar',
          desc: 'Triple IR emitter/phototransistor array providing both analog and digital reflectance outputs.'
        }
      },
      audio: {
        piezo: {
          name: 'Piezo Buzzer (Acoustic Transducer)',
          summary: 'Piezoelectric Ceramic Tone & Frequency Generator',
          desc: 'Converts square-wave (PWM / tone) signals into mechanical diaphragm vibrations to produce audible musical notes.'
        }
      },
      motor: {
        dc: {
          name: 'Brushed DC Fan Motor',
          summary: 'Electromagnetic Coil Continuous Rotation Motor',
          desc: 'Spins at an RPM proportional to the applied average voltage and PWM duty cycle.'
        },
        servo: {
          name: 'SG90 Micro Servo Motor',
          summary: 'Closed-Loop Geared Angular Actuator (0°–180°)',
          desc: 'Reads 50 Hz PWM pulse width (500–2400 µs) and locks onto the target angle using internal potentiometer feedback.'
        },
        n20_gearmotor: {
          name: 'N20 600RPM Gearmotor + Silicone Wheel',
          summary: '1:50 Brass Geartrain Micro DC Motor with Sumo Tire',
          desc: 'High-torque 12V 600RPM N20 metal gearmotor with CNC aluminum rim and high-friction silicone wheel.'
        },
        mecanum_wheel: {
          name: 'Mecanum Omnidirectional Wheel + Motor',
          summary: '45° 9-Roller Holonomic Drive Wheel & Geared Motor',
          desc: 'Enables forward, lateral strafe, and zero-radius 360° rotation via independent vector control.'
        },
        pan_tilt_gimbal: {
          name: '2-Axis Pan/Tilt Servo Camera Gimbal',
          summary: 'Dual MG90S Servo Actuated Turret Assembly',
          desc: 'Articulated pan (±75°) and tilt (±35°) servo turret for active camera and sensor tracking.'
        }
      },
      driver: {
        l298n_dual: {
          name: 'L298N Dual H-Bridge Motor Driver',
          summary: 'Dual-Channel 2A PWM Motor Driver & 5V Regulator',
          desc: 'Dual full-bridge driver with finned aluminum heatsink, ENA/ENB PWM speed control, and screw terminals.'
        }
      },
      power: {
        lipo_3s_1300mah: {
          name: '3S 11.1V 1300mAh LiPo Battery Pack',
          summary: 'High-Discharge (45C) Robotics Power Pack with XT60',
          desc: '3-cell 11.1V lithium-polymer battery with XT60 discharge connector and JST-XH balance lead.'
        },
        ina219_buck_bay: {
          name: 'INA219 I2C Power Telemetry & 5V/4A Buck',
          summary: '0.1Ω Shunt I2C Power Monitor & Step-Down Regulator',
          desc: 'Delivers regulated 5V/4A power while reporting real-time voltage, current, and power over I2C.'
        }
      },
      display: {
        ssd1306_oled: {
          name: '0.96" SSD1306 I2C OLED Display',
          summary: '128×64 Pixel Dual-Zone I2C Telemetry Screen',
          desc: 'Crisp 128×64 monochrome OLED panel driven over I2C (SDA/SCL) for live status and vision HUD telemetry.'
        }
      },
      robotics: {
        sumo_chassis_plate: {
          name: 'CNC Anodized Sumo Main Chassis Plate',
          summary: 'Machined Aluminum Baseplate with Brass M3 Standoffs',
          desc: 'Rigid CNC-milled baseplate with motor cutouts and brass M3 mounting standoffs for Mini-Sumo robots.'
        },
        sumo_dozer_blade: {
          name: '22° Hardened Steel Sumo Dozer Wedge',
          summary: 'Low-Clearance Beveled Front Wedge & Sensor Mount',
          desc: 'Precision-ground 22° steel wedge engineered to get underneath opponent robots.'
        },
        sumo_armor_hood: {
          name: 'Carbon-Fiber Top Armor & Sonar Hood',
          summary: 'Protective Upper Shell with Dual HC-SR04 Ports',
          desc: 'Carbon-fiber upper armor shell with ultrasonic transducer ports and status telemetry bar.'
        },
        jetson_rover_chassis: {
          name: 'Jetson Rover Twin-Deck Carbon Chassis',
          summary: 'Carbon-Fiber Mecanum Suspension Rover Platform',
          desc: 'Vibration-isolated twin-deck chassis designed for NVIDIA Jetson Nano and 4-wheel Mecanum drive.'
        },
        csi_ribbon_harness: {
          name: 'MIPI CSI-2 High-Speed Flex Ribbon Harness',
          summary: '15-Pin Gold-Contact Shielded Camera Flex Cable',
          desc: 'High-speed flat flex cable routing differential MIPI CSI-2 camera lanes to the gimbal turret.'
        }
      },
      robot: {
        autonomous_sumo: {
          name: 'Autonomous Mini-Sumo Robot (Full Assembly)',
          summary: '8-Layer Explodable Autonomous Sumo Robot Assembly',
          desc: 'Complete autonomous Mini-Sumo robot combining Arduino Uno, L298N, dual N20 wheels, HC-SR04 sonar, and steel wedge.'
        },
        jetson_vision_rover: {
          name: 'NVIDIA Jetson Nano Vision Rover (Full Assembly)',
          summary: '8-Layer Pan/Tilt Gimbal & Mecanum AI Vision Robot',
          desc: 'Complete AI vision rover featuring Jetson Nano, Sony IMX219 camera, 2-axis gimbal, VL53L1X ToF, OLED, and 4 Mecanum wheels.'
        }
      },
      prop: {
        obstacle_wall: {
          name: 'Acoustic & Optical Obstacle Wall (Test Target)',
          summary: 'Ultrasonic / Laser ToF & Vision Calibration Obstacle Prop (Zero-Pin)',
          desc: 'Movable 3D physical calibration wall used on stage to test real-time distance ranging (HC-SR04 / VL53L1X) and camera obstacle detection without electrical pins.'
        },
        toy_bear: {
          name: '3D Plush Toy Bear (Obstacle & Vision Target)',
          summary: 'AI Vision Object Recognition & Proximity Sensor Target Prop (Zero-Pin)',
          desc: 'Movable 3D plush toy bear prop for testing proximity alarms and IMX219 camera object recognition on the 3D workbench.'
        }
      }
    }
  }
};
