"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function ClassNav() {
  const pathname = usePathname();
  const params = useParams();

  // Lấy slug từ dynamic route [slug] hoặc [orgSlug]
  // Lưu ý: Tên biến phải khớp với tên thư mục [slug] của bạn
  const slug = params.classId;

  const basePath = `/dashboard/class/${slug}`;

  // Tối ưu mảng tabs để code ngắn gọn hơn
  const tabs = [
    { name: "Members", href: `${basePath}/members` },
    { name: "Groups", href: `${basePath}/groups` },
    { name: "Analyst", href: `${basePath}/analyst` },
  ];

  return (
    <div className="flex items-center border-b border-gray-800 w-full">
      <div className="flex gap-6">
        {tabs.map((tab) => {
          // Kiểm tra active trực tiếp khi render
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative py-2 text-sm font-medium transition-colors hover:text-black",
                isActive ? "text-black" : "text-gray-400",
              )}
            >
              {tab.name}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -bottom-px -left-1 -right-1 h-0.5 bg-black"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
