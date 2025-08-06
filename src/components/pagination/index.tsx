import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Pagination,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationContent,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';

interface PaginationProps {
  total?: number;
  current?: number;
  pageSize?: number;
  onChange?: (page: number, pageSize: number) => void;
}

export default function PaginationMain({
  total = 0,
  current = 1,
  pageSize = 10,
  onChange,
}: PaginationProps) {
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(current);
  const totalPages = Math.ceil(total / pageSize);
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    onChange && onChange(page, pageSize);
  };
  const getPageNumbers = () => {
    const delta = isMobile ? 0 : 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            previousText={t('pagination.prev')}
            onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
            className={cn('text-black dark:text-white', {
              'pointer-events-none opacity-50': currentPage <= 1,
              'cursor-pointer': currentPage > 1,
            })}
          />
        </PaginationItem>
        {getPageNumbers().map((pageNumber, index) => (
          <PaginationItem key={index}>
            {pageNumber === '...' ? (
              <PaginationEllipsis
                className="text-black dark:text-white"
                more_pages={t('pagination.more_pages')}
              />
            ) : (
              <PaginationLink
                href="#"
                className={cn('text-black dark:text-white', {
                  'bg-accent': currentPage === pageNumber,
                })}
                onClick={e => {
                  e.preventDefault();
                  handlePageChange(pageNumber as number);
                }}
                isActive={currentPage === pageNumber}
              >
                {pageNumber}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            nextText={t('pagination.next')}
            onClick={() =>
              currentPage < totalPages && handlePageChange(currentPage + 1)
            }
            className={cn('text-black dark:text-white', {
              'pointer-events-none opacity-50': currentPage >= totalPages,
              'cursor-pointer': currentPage < totalPages,
            })}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
