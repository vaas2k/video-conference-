import { Home, Video, Calendar, MessageSquare, Settings } from 'lucide-react'
import { cn } from "@/lib/utils"

const navItems = [
  { icon: Home, label: 'Home' },
  { icon: Video, label: 'Meetings' },
  { icon: Calendar, label: 'Calendar' },
  { icon: MessageSquare, label: 'Chat' },
  { icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  return (
    <div className="h-screen w-16 flex flex-col items-center py-8 bg-gray-900 text-gray-300">
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
  )
}