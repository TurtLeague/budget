"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", icon: "🏠", label: "Hem" },
  { href: "/transactions", icon: "💸", label: "Transaktioner" },
  { href: "/budget", icon: "📊", label: "Budget" },
  { href: "/savings", icon: "🎯", label: "Sparmål" },
  { href: "/settings", icon: "⚙️", label: "Inställningar" },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700 safe-bottom z-50">
      <div className="flex">
        {links.map(link => {
          const active = pathname.startsWith(link.href);
          return (
            <Link key={link.href} href={link.href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${active ? "text-green-500" : "text-gray-400 dark:text-slate-500"}`}>
              <span className="text-xl leading-none">{link.icon}</span>
              <span className={`text-[10px] font-medium ${active ? "text-green-500" : "text-gray-400 dark:text-slate-500"}`}>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
