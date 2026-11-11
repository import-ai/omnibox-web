import { CircleQuestionMark } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { IconButton } from '@/components/omnibox/IconButton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function BillingRulesDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const sections = t('billing_rules.sections', { returnObjects: true }) as {
    title: string;
    body: string;
  }[];
  const columns = t('billing_rules.columns', {
    returnObjects: true,
  }) as string[];
  const levels = t('billing_rules.levels', { returnObjects: true }) as string[];
  const parsing = t('billing_rules.parsing', { returnObjects: true }) as {
    name: string;
    rate: string;
    description: string;
  }[];
  return (
    <>
      <IconButton
        size="xs"
        tone="muted"
        label={t('billing_rules.title')}
        onClick={() => setOpen(true)}
      >
        <CircleQuestionMark className="size-4" />
      </IconButton>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="flex h-[640px] max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 text-foreground sm:max-w-2xl"
          aria-describedby={undefined}
        >
          <DialogHeader className="shrink-0 border-b border-border px-6 py-5">
            <DialogTitle>{t('billing_rules.title')}</DialogTitle>
            <p className="text-xs text-muted-foreground">
              {t('billing_rules.subtitle')}
            </p>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {sections.map((section, index) => (
              <section key={section.title} className="space-y-2">
                <h3 className="text-sm font-medium">{section.title}</h3>
                {index === 1 ? (
                  <div>
                    {parsing.map(row => (
                      <div
                        key={row.name}
                        className="border-b border-border py-3"
                      >
                        <div className="flex items-start justify-between gap-3 text-sm leading-[21px]">
                          <span>{row.name}</span>
                          <span className="shrink-0">{row.rate}</span>
                        </div>
                        <p className="mt-1 text-xs leading-[18px] text-muted-foreground">
                          {row.description}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="whitespace-pre-line text-sm leading-[21px] text-muted-foreground">
                    {section.body}
                  </p>
                )}
                {index === 2 && (
                  <div className="overflow-x-auto rounded-md border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted text-xs text-muted-foreground">
                        <tr>
                          {columns.map((column, i) => (
                            <th
                              key={column}
                              className={`p-2 font-normal ${i ? 'text-right' : 'text-left'}`}
                            >
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          [95, 28, 335],
                          [1450, 190, 4350],
                        ].map((rates, i) => (
                          <tr key={levels[i]}>
                            <td className="p-2">{levels[i]}</td>
                            {rates.map((rate, j) => (
                              <td
                                key={j}
                                className="p-2 text-right tabular-nums"
                              >
                                {rate.toLocaleString()}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ))}
          </div>
          <div className="flex shrink-0 justify-end border-t border-border px-6 py-4">
            <Button onClick={() => setOpen(false)}>
              {t('billing_rules.acknowledge')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
