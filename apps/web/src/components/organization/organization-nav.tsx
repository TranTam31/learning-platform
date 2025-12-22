"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function OrgNav({ slug }: { slug: string }) {
  const pathname = usePathname();

  // Định nghĩa các tab
  const basePath = `/dashboard/organization/${slug}`;

  const tabs = [
    {
      name: "Courses",
      href: basePath,
      // Kiểm tra nếu pathname khớp chính xác với basePath
      active: pathname === basePath,
    },
    {
      name: "Members",
      href: `${basePath}/members`,
      // Kiểm tra nếu pathname bắt đầu bằng /members
      active: pathname === `${basePath}/members`,
    },
    {
      name: "Settings",
      href: `${basePath}/settings`,
      // Kiểm tra nếu pathname bắt đầu bằng /settings
      active: pathname === `${basePath}/settings`,
    },
  ];

  return (
    <div className="flex items-center border-b border-gray-800 w-full">
      <div className="flex gap-6">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "relative py-2 text-sm font-medium transition-colors hover:text-black",
              tab.active ? "text-black" : "text-gray-400"
            )}
          >
            {tab.name}
            {tab.active && (
              <motion.div
                layoutId="activeTab"
                className="absolute -bottom-px -left-1 -right-1 h-0.5 bg-black"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
