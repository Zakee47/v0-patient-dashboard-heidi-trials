'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CheckSquare, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const navigationItems = [
  {
    name: 'Eligibility Dashboard',
    href: '/eligibility',
    icon: CheckSquare,
    description: 'Screen patients for trial eligibility'
  },
  {
    name: 'Enrollment Dashboard',
    href: '/enrollment',
    icon: Users,
    description: 'Track enrolled patients'
  }
]

export function Navigation() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <>
      <aside
        className={`fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-transform duration-300 ease-in-out w-64 ${
          isCollapsed ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Clinical Trials</h2>
        </div>

        <nav className="p-2 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs opacity-80 truncate">{item.description}</p>
                </div>
              </Link>
            )
          })}
        </nav>
      </aside>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`fixed top-4 z-50 h-8 w-8 bg-card border border-border shadow-md hover:bg-accent transition-all duration-300 ease-in-out ${
          isCollapsed ? 'left-4' : 'left-[240px]'
        }`}
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>

      <div className={`transition-[margin] duration-300 ease-in-out ${isCollapsed ? 'ml-0' : 'ml-64'}`}>
        {/* This wrapper will contain the page content */}
      </div>
    </>
  )
}
