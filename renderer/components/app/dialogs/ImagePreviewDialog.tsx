import { Dialog, DialogBody, DialogContent } from "@/components/ui/dialog";

export function ImagePreviewDialog({
  open,
  title,
  imageSrc,
  onOpenChange
}: {
  open: boolean;
  title: string;
  imageSrc: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        headerTitle={title}
        className="w-[min(1080px,calc(100vw-2rem))] max-w-[1080px]"
      >
        <DialogBody className="flex min-h-[320px] items-center justify-center bg-muted/20 p-6">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={title}
              className="max-h-[calc(100vh-12rem)] max-w-full rounded-[6px] object-contain shadow-lg"
            />
          ) : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
