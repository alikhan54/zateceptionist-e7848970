import { ReactNode } from "react";

interface RTLWrapperProps {
  children: ReactNode;
  rtl?: boolean;
}

export function RTLWrapper({ children, rtl = false }: RTLWrapperProps) {
  return (
    <div dir={rtl ? "rtl" : "ltr"}>
      {children}
    </div>
  );
}
