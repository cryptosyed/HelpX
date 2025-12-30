import React from "react";

type ProviderCardProps = {
  providerId: number;
  distanceKm?: number | null;
  rating?: number | null;
  onBook: () => void;
};

const formatNumber = (value: number | null | undefined, digits = 1) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
};

export const ProviderCard: React.FC<ProviderCardProps> = ({
  providerId,
  distanceKm,
  rating,
  onBook,
}) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 flex flex-col gap-2">
      <div className="text-sm text-slate-600">Provider ID</div>
      <div className="text-lg font-semibold text-slate-900">#{providerId}</div>

      <div className="flex justify-between text-sm text-slate-700">
        <span>Distance</span>
        <span>{formatNumber(distanceKm)} km</span>
      </div>

      <div className="flex justify-between text-sm text-slate-700">
        <span>Rating</span>
        <span>{formatNumber(rating, 1)}</span>
      </div>

      <button
        type="button"
        onClick={onBook}
        className="mt-2 inline-flex items-center justify-center rounded-lg bg-primary-start text-white px-3 py-2 text-sm font-medium hover:bg-primary-end transition"
      >
        Book
      </button>
    </div>
  );
};

export default ProviderCard;

