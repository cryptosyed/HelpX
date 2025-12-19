export default function Pagination({ page, pageSize, total, onPageChange }) {
    const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));
    const canPrev = page > 1;
    const canNext = page < totalPages;

    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-center gap-4 mt-10" role="navigation" aria-label="Pagination">
            <button
                type="button"
                className="btn-ghost text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => canPrev && onPageChange(page - 1)}
                disabled={!canPrev}
            >
                ← Previous
            </button>
            <span className="text-sm text-slate-600 font-medium">
                Page {page} of {totalPages}
            </span>
            <button
                type="button"
                className="btn-gradient text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => canNext && onPageChange(page + 1)}
                disabled={!canNext}
            >
                Next →
            </button>
        </div>
    );
}


