<?php

namespace App\Filament\Resources;

use App\Filament\Resources\CircuitScenarioResource\Pages;
use App\Models\CircuitScenario;
use BackedEnum;
use Filament\Actions\DeleteAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class CircuitScenarioResource extends Resource
{
    protected static ?string $model = CircuitScenario::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::CpuChip;

    protected static ?string $navigationLabel = 'Kayıtlı Devre Senaryoları';

    protected static ?string $modelLabel = 'Devre Senaryosu';

    protected static ?string $pluralModelLabel = 'Kayıtlı Devre Senaryoları';

    protected static ?int $navigationSort = 8;

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('title')
                ->label('Senaryo / Çalışma Alanı Adı')
                ->required()
                ->maxLength(160),
            TextInput::make('slug')
                ->label('Slug')
                ->required()
                ->unique(ignoreRecord: true)
                ->maxLength(190),
            Select::make('user_id')
                ->label('Sahibi (Kullanıcı)')
                ->relationship('owner', 'email')
                ->searchable()
                ->preload()
                ->required(),
            Select::make('board_type')
                ->label('Ana Kontrolcü Kartı')
                ->options([
                    'board.arduino_uno' => 'Arduino Uno R3',
                    'board.esp32_devkit' => 'ESP32 DevKit V1',
                    'board.jetson_nano' => 'NVIDIA Jetson Nano 2GB',
                ])
                ->default('board.arduino_uno')
                ->required(),
            Select::make('visibility')
                ->label('Görünürlük')
                ->options([
                    'private' => 'Özel (Private)',
                    'group' => 'Çalışma Grubu (Group)',
                    'public' => 'Herkese Açık (Public)',
                ])
                ->default('private')
                ->required(),
            Select::make('study_group_id')
                ->label('Çalışma Grubu')
                ->relationship('studyGroup', 'name')
                ->searchable()
                ->preload()
                ->nullable(),
            Textarea::make('summary')
                ->label('Açıklama / Özet')
                ->rows(3)
                ->columnSpanFull(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('created_at', 'desc')
            ->columns([
                TextColumn::make('id')
                    ->label('#ID')
                    ->sortable(),
                TextColumn::make('title')
                    ->label('Senaryo Başlığı')
                    ->description(fn (CircuitScenario $record): string => $record->slug ?? '')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('owner.name')
                    ->label('Sahibi (Kullanıcı)')
                    ->description(fn (CircuitScenario $record): string => $record->owner?->email ?? 'Silinmiş Kullanıcı')
                    ->searchable(['name', 'email'])
                    ->sortable(),
                TextColumn::make('board_type')
                    ->label('Ana Kart')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => match ($state) {
                        'board.arduino_uno', 'arduino_uno' => 'Arduino Uno',
                        'board.esp32_devkit', 'esp32_devkit' => 'ESP32 DevKit',
                        'board.jetson_nano', 'jetson_nano_2gb' => 'Jetson Nano',
                        default => $state ?: 'Bilinmiyor',
                    })
                    ->color(fn (?string $state): string => match ($state) {
                        'board.arduino_uno', 'arduino_uno' => 'info',
                        'board.esp32_devkit', 'esp32_devkit' => 'warning',
                        'board.jetson_nano', 'jetson_nano_2gb' => 'success',
                        default => 'gray',
                    }),
                TextColumn::make('visibility')
                    ->label('Görünürlük')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => match ($state) {
                        'public' => 'Herkese Açık',
                        'group' => 'Grup İçi',
                        'private' => 'Özel',
                        default => $state ?: 'Özel',
                    })
                    ->color(fn (?string $state): string => match ($state) {
                        'public' => 'success',
                        'group' => 'warning',
                        'private' => 'gray',
                        default => 'gray',
                    }),
                TextColumn::make('topology_summary')
                    ->label('3B Sahne İçeriği')
                    ->state(function (CircuitScenario $record): string {
                        $data = is_array($record->scenario_data) ? $record->scenario_data : [];
                        $components = count($data['components'] ?? []);
                        $wires = count($data['connections'] ?? $data['wires'] ?? []);

                        return "{$components} bileşen • {$wires} kablo";
                    })
                    ->badge()
                    ->color('primary'),
                TextColumn::make('studyGroup.name')
                    ->label('Çalışma Grubu')
                    ->placeholder('—')
                    ->toggleable(),
                TextColumn::make('forks_count')
                    ->label('Fork')
                    ->sortable()
                    ->toggleable(),
                TextColumn::make('created_at')
                    ->label('Oluşturulma Tarihi')
                    ->dateTime('d.m.Y H:i')
                    ->description(fn (CircuitScenario $record): string => $record->created_at ? $record->created_at->diffForHumans() : '')
                    ->sortable(),
                TextColumn::make('updated_at')
                    ->label('Son Kayıt')
                    ->dateTime('d.m.Y H:i')
                    ->sortable()
                    ->toggleable(),
            ])
            ->filters([
                SelectFilter::make('visibility')
                    ->label('Görünürlük')
                    ->options([
                        'private' => 'Özel (Private)',
                        'group' => 'Grup İçi (Group)',
                        'public' => 'Herkese Açık (Public)',
                    ]),
                SelectFilter::make('board_type')
                    ->label('Ana Kart')
                    ->options([
                        'board.arduino_uno' => 'Arduino Uno',
                        'board.esp32_devkit' => 'ESP32 DevKit',
                        'board.jetson_nano' => 'Jetson Nano',
                    ]),
                SelectFilter::make('user_id')
                    ->label('Kullanıcıya Göre')
                    ->relationship('owner', 'email')
                    ->searchable()
                    ->preload(),
            ])
            ->recordActions([
                EditAction::make(),
                DeleteAction::make(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ManageCircuitScenarios::route('/'),
        ];
    }
}
