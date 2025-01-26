import { globalLoadingAtom } from "@/atoms";
import { useAtomValue } from "jotai";
import { createPortal } from "react-dom";
export const GlobalLoading = () => {
  const isLoading = useAtomValue(globalLoadingAtom);
  if (!isLoading) return null;
  return createPortal(
    <div className="absolute w-[100%] h-[100%] bg-gray-800 bg-opacity-60 left-0 top-0 z-50 flex items-center justify-center text-white select-none">
      loading
    </div>,
    document.body,
  );
};
