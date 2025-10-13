import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield } from 'lucide-react';
import type { UpdateProfileCommand } from '../../types';

interface PrivacySettingsSectionProps {
  shareWithCommunity: boolean | null;
  onUpdate: (share: boolean) => Promise<void>;
}

export function PrivacySettingsSection({ shareWithCommunity, onUpdate }: PrivacySettingsSectionProps) {
  const [shareEnabled, setShareEnabled] = useState(shareWithCommunity ?? false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Update local state when prop changes
  useEffect(() => {
    setShareEnabled(shareWithCommunity ?? false);
  }, [shareWithCommunity]);

  const handleShareToggle = async (checked: boolean) => {
    setIsUpdating(true);
    try {
      await onUpdate(checked);
      setShareEnabled(checked);
    } catch (error) {
      // Error is handled by parent component
      // Revert local state on error
      setShareEnabled(!checked);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Ustawienia prywatności
        </CardTitle>
        <CardDescription>
          Kontroluj udostępnianie swoich danych społeczności
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="share-community"
            checked={shareEnabled}
            onCheckedChange={handleShareToggle}
            disabled={isUpdating}
          />
          <div className="grid gap-1.5 leading-none">
            <Label
              htmlFor="share-community"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Udostępniaj moje zestawy społeczności
            </Label>
            <p className="text-sm text-muted-foreground">
              Pozwól innym użytkownikom zobaczyć Twoje zestawy ubiorów w sekcji społeczności.
              Twoje dane osobowe pozostaną anonimowe.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
