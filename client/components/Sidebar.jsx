import { Home, Video, Calendar, MessageSquare, Settings, Menu } from 'lucide-react';
import { useState } from 'react';
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: 'Home' },
  { icon: Video, label: 'Meetings' },
  { icon: Calendar, label: 'Calendar' },
  { icon: MessageSquare, label: 'Chat' },
  { icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Mobile menu toggle button */}
      <button
        className="sm:hidden fixed top-4 left-4 z-50 p-2  text-gray-800 rounded-md   transition-colors"
        onClick={toggleSidebar}
      >
        <Menu size={24} />
      </button>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 left-0 h-screen w-64 bg-gray-900 text-gray-300 transform transition-transform duration-300 sm:w-12 sm:relative sm:translate-x-0 flex flex-col items-center py-8 z-40",
          isOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
        )}
      >
        {navItems.map((item, index) => (
          <button
            key={index}
            className={cn(
              "w-12 h-12 flex items-center justify-center rounded-md mb-4 hover:bg-gray-800 transition-colors",
              index === 1 && "bg-gray-800 text-white"
            )}
          >
            <item.icon size={24} />
            <span className="sr-only">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="sm:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={toggleSidebar}
        ></div>
      )}
    </>
  );
}
