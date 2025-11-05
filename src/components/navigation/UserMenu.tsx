import { useState, useEffect } from "react";
import { LogOut, Settings } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useProfile } from "../profile/hooks/useProfile";

interface UserMenuProps {
  userId: string;
}

export default function UserMenu({ userId }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { profile, isLoading, fetchProfile } = useProfile();

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (response.ok) {
        // Redirect to login page
        window.location.href = "/auth/login";
      } else {
        console.error("Logout failed");
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleProfileClick = () => {
    setIsOpen(false);
    window.location.assign("/profile");
  };

  // Generate user initials from display name or userId
  const getUserInitials = () => {
    if (profile?.display_name) {
      return profile.display_name
        .split(" ")
        .map((name) => name.charAt(0))
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return userId.slice(0, 2).toUpperCase();
  };

  const getUserDisplayName = () => {
    return profile?.display_name || `Użytkownik ${userId.slice(0, 8)}`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 focus:ring-2 focus:ring-blue-500"
          aria-label="User menu"
        >
          {isLoading ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-medium text-gray-700">
              {getUserInitials()}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <div className="flex items-center space-x-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
            {getUserInitials()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {getUserDisplayName()}
            </p>
            <p className="text-xs text-gray-500 truncate">
              ID: {userId.slice(0, 8)}...
            </p>
          </div>
        </div>
        <Separator />
        <div className="p-2">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={handleProfileClick}
          >
            <Settings className="mr-2 h-4 w-4" />
            Profil
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Wyloguj się
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
