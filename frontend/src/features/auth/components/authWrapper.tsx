import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/src/shared/components";
import Link from "next/link";
import { type PropsWithChildren } from "react";

interface AuthWrapperProps {
  heading: string;
  description?: string;
  backButtonLabel?: string;
  backButtonHref?: string;
}

export function AuthWrapper({
  children,
  heading,
  description,
  backButtonHref,
  backButtonLabel,
}: PropsWithChildren<AuthWrapperProps>) {
  return (
    <Card className="w-[400px]">
      <CardHeader className="space-y-2">
        <CardTitle className="font-bold text-2xl">{heading}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="grid gap-2">{children}</CardContent>
      <CardFooter>
        {backButtonLabel && backButtonHref && (
          <Button className={"w-full font-normal"} variant={"link"}>
            <Link href={backButtonHref}>{backButtonLabel}</Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
