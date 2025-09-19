'use client'

import { authClient } from '@/lib/auth-client'
import React from 'react'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./droupdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { CreditCard, LogOut } from 'lucide-react'
import { useEffect,useState } from 'react'

interface DashboardUserButtonProps {
  isExpanded: boolean
}

const DashboardUserButton = ({ isExpanded }: DashboardUserButtonProps) => {
  const { data, isPending } = authClient.useSession()
  const router = useRouter()
const [open, setOpen] = useState(false);

  const onLogout = () => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/sign-in")
        },
      },
    })
  }

  if (isPending) {
    return (
      <div
        className={`${isExpanded ? 'w-full' : 'w-12'} h-12 bg-gray-800/50 rounded-xl animate-pulse`}
      />
    )
  }

  if (!data?.user) return null

  const userInitials = data.user.name
    ? data.user.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : data.user.email?.charAt(0).toUpperCase() || 'U'

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
    <DropdownMenuTrigger asChild>
      {isExpanded ? (
        <div className="w-full group">
          <div
            className="flex items-center gap-3 p-3 rounded-xl bg-gray-900/50
                       border border-gray-700/50 hover:bg-gray-800/40 transition-all duration-200
                       hover:shadow-lg hover:shadow-black/20 backdrop-blur-sm cursor-pointer"
          >
            <Avatar className="h-10 w-10 ring-2 ring-gray-700/50 group-hover:ring-gray-600/50 transition-all duration-200">
              <AvatarImage
                src={data.user.image || "/placeholder.svg"}
                alt={data.user.name || "User"}
                className="object-cover"
              />
              <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-800 text-white font-semibold text-sm">
                {userInitials}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-semibold text-gray-100 truncate text-sm">
                {data.user.name || "User"}
              </span>
              <span className="text-xs text-gray-400 truncate">
                {data.user.email}
              </span>
            </div>

            <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0" />
          </div>
        </div>
      ) : (
        <div className="cursor-pointer group">
          <Avatar className="h-10 w-10 ring-2 ring-gray-700/50 hover:ring-gray-600/50 transition-all duration-200
                            hover:shadow-lg hover:shadow-black/20">
            <AvatarImage
              src={data.user.image || "/placeholder.svg"}
              alt={data.user.name || "User"}
              className="object-cover"
            />
            <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-800 text-white font-semibold text-sm">
              {userInitials}
            </AvatarFallback>
          </Avatar>
        </div>
      )}
    </DropdownMenuTrigger>


      <DropdownMenuContent
        className="w-72 bg-gray-900/95 border border-gray-700/50 backdrop-blur-xl shadow-2xl shadow-black/50
                   data-[state=open]:animate-in data-[state=closed]:animate-out
                   data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
                   data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95
                   data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2
                   data-[side=top]:slide-in-from-bottom-2 data-[side=bottom]:slide-in-from-top-2"
        align="start"
        side="right"
        sideOffset={12}
        onMouseEnter={() => setOpen(true)}
onMouseLeave={() => setOpen(false)}
      >
        <DropdownMenuLabel className="p-4 bg-gray-800/50 rounded-t-lg">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-gray-600/50">
              <AvatarImage
                src={data.user.image || "/placeholder.svg"}
                alt={data.user.name || data.user.email || "User"}
                className="object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-800 text-white font-semibold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <span className="font-semibold truncate text-gray-100 text-base">
                {data.user.name || 'User'}
              </span>
              <span className="text-sm font-normal text-gray-400 truncate">
                {data.user.email}
              </span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-xs text-green-400 font-medium">Online</span>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-gray-700/50" />

        <div className="p-2">
          <DropdownMenuItem className="cursor-pointer flex items-center justify-between p-3 rounded-lg
                                     hover:bg-gray-800/40 transition-colors duration-200 group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-600/20 rounded-lg group-hover:bg-gray-600/30 transition-colors duration-200">
                <CreditCard className="h-4 w-4 text-gray-300" />
              </div>
              <span className="text-gray-100 font-medium">Billing</span>
            </div>
            <div className="w-6 h-6 bg-gray-700/50 rounded-full flex items-center justify-center group-hover:bg-gray-600/50 transition-colors duration-200">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="cursor-pointer flex items-center justify-between p-3 rounded-lg mt-1
                       hover:bg-red-900/20 transition-colors duration-200 group text-red-400 hover:text-red-300"
            onClick={onLogout}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-600/20 rounded-lg group-hover:bg-red-600/30 transition-colors duration-200">
                <LogOut className="h-4 w-4 text-red-400 group-hover:text-red-300" />
              </div>
              <span className="font-medium">Sign Out</span>
            </div>
            <div className="w-6 h-6 bg-red-600/20 rounded-full flex items-center justify-center group-hover:bg-red-600/30 transition-colors duration-200">
              <div className="w-1.5 h-1.5 bg-red-400 rounded-full group-hover:bg-red-300"></div>
            </div>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default DashboardUserButton
