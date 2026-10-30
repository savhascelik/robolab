<?php

namespace App\Filament\Resources\CircuitScenarioResource\Pages;

use App\Filament\Resources\CircuitScenarioResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ManageRecords;

class ManageCircuitScenarios extends ManageRecords
{
    protected static string $resource = CircuitScenarioResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make()
                ->label('Yeni Senaryo Ekle'),
        ];
    }
}
