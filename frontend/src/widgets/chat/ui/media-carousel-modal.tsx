"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/src/shared/components";
import type { IAttachment } from "@/src/shared/types";
import { resolveFileUrl } from "@/src/shared/lib";
import Image from "next/image";

interface IProps {
  attachments: IAttachment[];
  initialIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Полноэкранный просмотр изображений сообщения (shadcn/embla Carousel). */
export function MediaCarouselModal({
  attachments,
  initialIndex,
  open,
  onOpenChange,
}: IProps) {
  const images = attachments.filter((a) => a.mimeType.startsWith("image/"));
  if (images.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogTitle className="sr-only">Просмотр изображений</DialogTitle>
        <Carousel opts={{ startIndex: initialIndex }}>
          <CarouselContent>
            {images.map((img) => (
              <CarouselItem key={img.id}>
                <div className="relative h-[70vh] w-full">
                  <Image
                    src={resolveFileUrl(img.url)}
                    alt={img.fileName}
                    fill
                    className="rounded-lg object-contain"
                    sizes="100vw"
                  />
                </div>
                <p className="mt-2 line-clamp-1 text-center text-xs text-muted-foreground">
                  {img.fileName}
                </p>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </DialogContent>
    </Dialog>
  );
}
