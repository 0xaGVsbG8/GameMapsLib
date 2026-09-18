'use client'

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext } from "react";
import { apiUrl } from "./api";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [display, setDisplay] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const response = await fetch(apiUrl("/blog/isUserAuthed"), {
        credentials: "include",
      });
  
      const isLoginPage = pathname === "/admin/login";
  
      if (response.ok) {
        if (isLoginPage) {
          router.replace("/admin/dashboard");
        } else {
          setDisplay(true);
        }
  
        return;
      }
  
      if (response.status === 401) {
        if (isLoginPage) {
          setDisplay(true);
        } else {
          router.replace("/admin/login");
        }
      }
    };
  
    checkAuth();
  }, [pathname, router]);

 
  if (!display) {
    return null;
  }
  return (
  <>
    {children}
  </>);
}
