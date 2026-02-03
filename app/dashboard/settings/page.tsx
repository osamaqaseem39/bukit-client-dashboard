"use client";

import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Save } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Manage your account settings and preferences
        </p>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-text-primary">
            General Settings
          </h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Input label="Business Name" defaultValue="Gaming Hub" />
          <Input label="Email" type="email" defaultValue="admin@gaminghub.com" />
          <Input label="Phone" type="tel" defaultValue="+1 234-567-8900" />
          <Input label="Address" defaultValue="123 Main St, New York, NY" />
          <div className="flex justify-end pt-4">
            <Button>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-text-primary">
            Notification Settings
          </h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">
                Email Notifications
              </p>
              <p className="text-xs text-text-secondary">
                Receive email updates about bookings and activities
              </p>
            </div>
            <input type="checkbox" className="h-4 w-4 rounded" defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">
                SMS Notifications
              </p>
              <p className="text-xs text-text-secondary">
                Receive SMS updates for urgent matters
              </p>
            </div>
            <input type="checkbox" className="h-4 w-4 rounded" />
          </div>
          <div className="flex justify-end pt-4">
            <Button>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
