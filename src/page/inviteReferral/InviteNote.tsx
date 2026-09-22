import ReactMarkdown from 'react-markdown';

interface InviteNoteProps {
  note: string;
}

export function InviteNote({ note }: InviteNoteProps) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => (
          <p className="m-0 text-xs leading-[17px] text-foreground">
            {children}
          </p>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="!text-foreground underline"
          >
            {children}
          </a>
        ),
      }}
    >
      {note}
    </ReactMarkdown>
  );
}
