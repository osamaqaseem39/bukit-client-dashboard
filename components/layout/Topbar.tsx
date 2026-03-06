"use client";

import React, { useState } from "react";
import { Search, Bell, Moon, Sun, User } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";

export default function Topbar() {
  const { theme, toggleTheme, mounted } = useTheme();
  const { user, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-surface shadow-sm">
      <div className="flex h-full items-center justify-between px-6">
        {/* Search */}
        <div className="hidden md:flex flex-1 max-w-md">
          <Input
            type="search"
            placeholder="Search..."
            icon={<Search className="h-4 w-4" />}
            className="w-full"
          />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          {mounted && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          )}

          {/* Notifications */}
          <Button variant="ghost" size="sm" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Button>

          {/* User Menu */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              aria-label="User menu"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
            >
              <User className="h-4 w-4 mr-1" />
              {user?.name || "Account"}
            </Button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-40 rounded-md bg-surface border border-border shadow-lg py-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logout();
                  }}
                >
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
