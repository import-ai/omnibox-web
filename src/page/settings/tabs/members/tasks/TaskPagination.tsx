import { useTranslation } from 'react-i18next';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/Pagination';

export interface TaskPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function TaskPagination({
  currentPage,
  totalPages,
  onPageChange,
}: TaskPaginationProps) {
  const { t } = useTranslation();
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7; // Show max 7 page numbers

    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const changePage = (
    event: React.MouseEvent<HTMLAnchorElement>,
    page: number
  ) => {
    event.preventDefault();
    if (page >= 1 && page <= totalPages && page !== currentPage)
      onPageChange(page);
  };

  return (
    <Pagination className="mt-4 shrink-0 [&_a]:text-foreground">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            text={t('common.previous')}
            aria-label={t('common.previous')}
            aria-disabled={currentPage <= 1}
            tabIndex={currentPage <= 1 ? -1 : undefined}
            className={
              currentPage <= 1 ? 'pointer-events-none opacity-50' : undefined
            }
            onClick={event => changePage(event, currentPage - 1)}
          />
        </PaginationItem>
        {getPageNumbers().map((page, index) => (
          <PaginationItem key={`${page}-${index}`}>
            {typeof page === 'number' ? (
              <PaginationLink
                href="#"
                isActive={currentPage === page}
                onClick={event => changePage(event, page)}
              >
                {page}
              </PaginationLink>
            ) : (
              <PaginationEllipsis />
            )}
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            href="#"
            text={t('common.next')}
            aria-label={t('common.next')}
            aria-disabled={currentPage >= totalPages}
            tabIndex={currentPage >= totalPages ? -1 : undefined}
            className={
              currentPage >= totalPages
                ? 'pointer-events-none opacity-50'
                : undefined
            }
            onClick={event => changePage(event, currentPage + 1)}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
