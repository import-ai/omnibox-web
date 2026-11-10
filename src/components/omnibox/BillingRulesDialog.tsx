import { CircleQuestionMark } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

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
          className="max-h-[85dvh] overflow-y-auto text-foreground sm:max-w-2xl"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle>{t('billing_rules.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {sections.map((section, index) => (
              <section key={section.title} className="space-y-2">
                <h3 className="text-sm font-medium">{section.title}</h3>
                <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
                  {section.body}
                </p>
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
        </DialogContent>
      </Dialog>
    </>
  );
}
