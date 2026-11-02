"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { compressImage, currentPosition, uploadImage } from "@/lib/client/image";
import { submitPod } from "./actions";
import { submitVendorPod } from "@/modules/dispatch/actions";
import { SignaturePad, type SignatureHandle } from "./signature-pad";

export function PodForm({ tripStopId, mode = "driver" }: { tripStopId: string; mode?: "driver" | "vendor" }) {
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const sig = useRef<SignatureHandle>(null);

  function submit() {
    if (!name.trim()) { toast.error("Nama penerima wajib diisi"); return; }
    if (sig.current?.isEmpty()) { toast.error("Tanda tangan wajib diisi"); return; }
    start(async () => {
      try {
        const sigBlob = await sig.current!.toBlob();
        if (!sigBlob) { toast.error("Tanda tangan gagal dibaca"); return; }
        const [signatureKey, photoKeys, pos] = await Promise.all([
          uploadImage(sigBlob),
          Promise.all(files.map(async (f) => uploadImage(await compressImage(f)))),
          currentPosition(),
        ]);
        const r = await (mode === "vendor" ? submitVendorPod : submitPod)({ tripStopId, receiverName: name, signatureKey, photoKeys, lat: pos?.lat, lng: pos?.lng });
        if (r.error) toast.error(r.error);
        else toast.success("POD tersimpan");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal menyimpan POD");
      }
    });
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <p className="font-medium">e-POD{mode === "vendor" ? " (input oleh dispatcher untuk driver vendor)" : ""}</p>
      <div className="space-y-1.5">
        <Label htmlFor={`rcv-${tripStopId}`}>Nama penerima *</Label>
        <Input id={`rcv-${tripStopId}`} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Foto bukti ({files.length}/5)</Label>
        <input
          type="file" accept="image/*" capture="environment" multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 5))}
          className="text-sm"
        />
      </div>
      <SignaturePad ref={sig} />
      <Button className="h-12 w-full" disabled={pending} onClick={submit}>
        {pending ? "Mengunggah…" : "Simpan POD"}
      </Button>
    </div>
  );
}
