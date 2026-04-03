import Selection from "./Selection";
import { Icon } from "@iconify/react";

interface PaginationProps {
	page: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	perPage: number;
	onPerPageChange: (perPage: number) => void;
	perPageOptions?: number[];
}

const defaultPerPageOptions = [5, 10, 20, 50];

export default function Pagination({
	page,
	totalPages,
	onPageChange,
	perPage,
	onPerPageChange,
	perPageOptions = defaultPerPageOptions,
}: PaginationProps) {
	// Helper to generate page numbers (show max 5 pages)
	const getPageNumbers = () => {
		const pages = [];
		let start = Math.max(1, page - 2);
		let end = Math.min(totalPages, page + 2);
		if (end - start < 4) {
			if (start === 1) end = Math.min(totalPages, start + 4);
			if (end === totalPages) start = Math.max(1, end - 4);
		}
		for (let i = start; i <= end; i++) pages.push(i);
		return pages;
	};

	return (
		<nav className="flex items-center justify-between w-full select-none gap-2">
			{/* Left: Rows per page */}
			<div className="flex items-center gap-2">
				<span className="text-sm text-(--muted)">Rows per page:</span>
				<div className="min-w-17.5">
					<Selection
						value={String(perPage)}
						onChange={(val: string) => onPerPageChange(Number(val))}
						options={perPageOptions.map((opt) => ({ value: String(opt), label: opt }))}
						className="m-0!"
						placeholder={undefined}
					/>
				</div>
			</div>
			{/* Right: Pagination controls */}
			<div className="flex items-center gap-2">
				<button
					className="px-1.5 py-1.5 shadow-md rounded-full border border-(--border) bg-white text-(--muted) font-bold hover:bg-(--surface2) disabled:opacity-50"
					onClick={() => onPageChange(page - 1)}
					disabled={page === 1}
					aria-label="Previous page"
				>
				    <Icon icon="iconamoon:arrow-up-2-light" width="24" height="24" className="rotate-270" />
				</button>
				{getPageNumbers().map((p) => (
					<button
						key={p}
						className={`px-3.5 py-1.5 shadow-md rounded-full border font-bold transition-colors ${
							p === page
								? "bg-(--primary) text-white border-(--primary)"
								: "bg-white text-(--text) border-(--border) hover:bg-(--surface2)"
						}`}
						onClick={() => onPageChange(p)}
						aria-current={p === page ? "page" : undefined}
					>
						{p}
					</button>
				))}
				<button
					className="px-1.5 py-1.5 shadow-md rounded-full border border-(--border) bg-white text-(--muted) font-bold hover:bg-(--surface2) disabled:opacity-50"
					onClick={() => onPageChange(page + 1)}
					disabled={page === totalPages || totalPages === 0}
					aria-label="Next page"
				>
					<Icon icon="iconamoon:arrow-up-2-light" width="24" height="24" className="rotate-90" />
				</button>
			</div>
		</nav>
	);
}
