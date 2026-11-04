import { Sidebar } from "@/src/widgets/sidebar";
import { GlobalEscape } from "@/src/shared/hooks";
import { PropsWithChildren } from "react";

export default function PageLayout({ children }: PropsWithChildren<unknown>) {
  return (
    <div className="h-screen w-screen flex flex-row">
      <GlobalEscape />
      <div className="w-[325px]">
        <Sidebar />
      </div>
      <div className="bg-[#bddbfc] flex-1 w-full h-full">{children}</div>
    </div>
  );
}
