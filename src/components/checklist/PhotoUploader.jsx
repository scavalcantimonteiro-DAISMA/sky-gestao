import React, { useRef } from 'react';
import { Camera, Image, Trash2, CheckCircle2 } from 'lucide-react';

export default function PhotoUploader({ label = 'Subir Foto do Setor', photo, onPhotoChange }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        // Redimensiona para max 1024px para manter leve no banco e no PDF
        const canvas = document.createElement('canvas');
        const maxDim = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
        onPhotoChange(compressedBase64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-800 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Camera className="w-4 h-4 text-rose-600" />
          {label}
        </span>
        {photo && (
          <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Foto Anexada
          </span>
        )}
      </label>

      {photo ? (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group max-w-sm">
          <img
            src={photo}
            alt="Foto do setor"
            className="w-full h-48 object-cover group-hover:opacity-90 transition-opacity"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-white text-slate-900 px-3 py-1.5 rounded-lg text-xs font-semibold shadow hover:bg-slate-100 flex items-center gap-1"
            >
              <Camera className="w-3.5 h-3.5" /> Trocar Foto
            </button>
            <button
              type="button"
              onClick={() => onPhotoChange('')}
              className="bg-rose-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow hover:bg-rose-700 flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Remover
            </button>
          </div>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-auto px-4 py-3.5 rounded-xl border-2 border-dashed border-slate-300 hover:border-rose-500 bg-slate-50 hover:bg-rose-50/50 transition-colors flex items-center justify-center gap-2 text-slate-600 hover:text-rose-600 font-medium text-sm"
          >
            <Camera className="w-5 h-5" />
            <span>Tirar Foto ou Escolher da Galeria</span>
          </button>
        </div>
      )}

      {/* Hidden file input supporting camera capture on mobile */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
