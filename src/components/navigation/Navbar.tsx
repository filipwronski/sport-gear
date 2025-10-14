import { useState } from "react";
import { Home, Compass, Users, Bike, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NAVIGATION_ITEMS } from "../dashboard/types";
import type { NavbarProps } from "../dashboard/types";
import UserMenu from "./UserMenu";

const NAV_ICONS = {
  Dashboard: Home,
  Rekomendacje: Compass,
  Społeczność: Users,
  Sprzęt: Bike,
};

export default function Navbar({ userId }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const currentPath =
    typeof window !== "undefined" ? window.location.pathname : "/dashboard";

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleNavClick = (href: string) => {
    window.location.assign(href);
    closeMobileMenu();
  };

  const renderNavItems = (isMobile = false) =>
    NAVIGATION_ITEMS.map((item) => {
      const Icon = NAV_ICONS[item.label as keyof typeof NAV_ICONS];
      const isActive =
        currentPath === item.href ||
        (item.href !== "/dashboard" && currentPath.startsWith(item.href));

      return (
        <button
          key={item.label}
          onClick={() => handleNavClick(item.href)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            isMobile
              ? "w-full justify-start hover:bg-gray-100"
              : `hover:text-blue-600 ${isActive ? "text-blue-600" : "text-gray-700"}`
          }`}
        >
          <Icon className="h-4 w-4" />
          <span>{item.label}</span>
        </button>
      );
    });

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <button
              onClick={() => handleNavClick("/dashboard")}
              className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
            >
              CycleGear
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">{renderNavItems()}</nav>

          {/* User Menu & Mobile Menu Button */}
          <div className="flex items-center space-x-4">
            {/* User Menu */}
            <UserMenu userId={userId} />

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMobileMenu}
              className="md:hidden p-2"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <nav className="px-2 pt-2 pb-3 space-y-1">
              {renderNavItems(true)}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
