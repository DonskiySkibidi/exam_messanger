import { Department } from "@/src/shared/types";

type ReturnObj = {
  value: string;
  label: string;
};

export function departmentOptions() {
  const arr: ReturnObj[] = [];
  for (const key in Department) {
    if (Object.prototype.hasOwnProperty.call(Department, key)) {
      const value = Department[key as keyof typeof Department];
      arr.push({ value: key, label: value });
    }
  }
  return arr;
}
