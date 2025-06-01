import ChatArea from '../../chat-input';
import { formatDistance } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { ArtifactActions } from './artifact-actions';
import ArtifactCloseButton from './artifact-close-button';
import ArtifactMessages from './artifact-messages';
import { imageArtifact } from './image/client';
import { codeArtifact } from './code/client';
import { sheetArtifact } from './sheet/client';
import { textArtifact } from './text/client';

export const artifactDefinitions = [
  textArtifact,
  codeArtifact,
  imageArtifact,
  sheetArtifact,
];
export type ArtifactKind = (typeof artifactDefinitions)[number]['kind'];

export interface UIArtifact {
  title: string;
  documentId: string;
  kind: ArtifactKind;
  content: string;
  isVisible: boolean;
  status: 'streaming' | 'idle';
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

export default function Artifact() {
  return (
    <AnimatePresence>
      <motion.div
        data-testid="artifact"
        className="flex flex-row h-dvh w-dvw fixed top-0 left-0 z-50 bg-transparent"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { delay: 0.4 } }}
      >
        <motion.div
          className="fixed bg-background h-dvh"
          initial={{
            width: isSidebarOpen ? windowWidth - 256 : windowWidth,
            right: 0,
          }}
          animate={{ width: windowWidth, right: 0 }}
          exit={{
            width: isSidebarOpen ? windowWidth - 256 : windowWidth,
            right: 0,
          }}
        />
        <motion.div
          className="relative w-[400px] bg-muted dark:bg-background h-dvh shrink-0"
          initial={{ opacity: 0, x: 10, scale: 1 }}
          animate={{
            opacity: 1,
            x: 0,
            scale: 1,
            transition: {
              delay: 0.2,
              type: 'spring',
              stiffness: 200,
              damping: 30,
            },
          }}
          exit={{
            opacity: 0,
            x: 0,
            scale: 1,
            transition: { duration: 0 },
          }}
        >
          <AnimatePresence>
            {!isCurrentVersion && (
              <motion.div
                className="left-0 absolute h-dvh w-[400px] top-0 bg-zinc-900/50 z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            )}
          </AnimatePresence>

          <div className="flex flex-col h-full justify-between items-center">
            <ArtifactMessages
              chatId={chatId}
              status={status}
              votes={votes}
              messages={messages}
              setMessages={setMessages}
              reload={reload}
              isReadonly={isReadonly}
              artifactStatus={artifact.status}
            />

            <div className="flex flex-row gap-2 relative items-end w-full px-4 pb-4">
              <ChatArea />
            </div>
          </div>
        </motion.div>
        <motion.div
          className="fixed dark:bg-muted bg-background h-dvh flex flex-col overflow-y-scroll md:border-l dark:border-zinc-700 border-zinc-200"
          initial={{
            opacity: 1,
            x: artifact.boundingBox.left,
            y: artifact.boundingBox.top,
            height: artifact.boundingBox.height,
            width: artifact.boundingBox.width,
            borderRadius: 50,
          }}
          animate={{
            opacity: 1,
            x: 400,
            y: 0,
            height: windowHeight,
            width: windowWidth ? windowWidth - 400 : 'calc(100dvw-400px)',
            borderRadius: 0,
            transition: {
              delay: 0,
              type: 'spring',
              stiffness: 200,
              damping: 30,
              duration: 5000,
            },
          }}
          exit={{
            opacity: 0,
            scale: 0.5,
            transition: {
              delay: 0.1,
              type: 'spring',
              stiffness: 600,
              damping: 30,
            },
          }}
        >
          <div className="p-2 flex flex-row justify-between items-start">
            <div className="flex flex-row gap-4 items-start">
              <ArtifactCloseButton />

              <div className="flex flex-col">
                <div className="font-medium">{artifact.title}</div>

                {isContentDirty ? (
                  <div className="text-sm text-muted-foreground">
                    Saving changes...
                  </div>
                ) : document ? (
                  <div className="text-sm text-muted-foreground">
                    {`Updated ${formatDistance(
                      new Date(document.createdAt),
                      new Date(),
                      {
                        addSuffix: true,
                      },
                    )}`}
                  </div>
                ) : (
                  <div className="w-32 h-3 mt-2 bg-muted-foreground/20 rounded-md animate-pulse" />
                )}
              </div>
            </div>

            <ArtifactActions
              artifact={artifact}
              currentVersionIndex={currentVersionIndex}
              handleVersionChange={handleVersionChange}
              isCurrentVersion={isCurrentVersion}
              mode={mode}
              metadata={metadata}
              setMetadata={setMetadata}
            />
          </div>

          <div className="dark:bg-muted bg-background h-full overflow-y-scroll !max-w-full items-center">
            <artifactDefinition.content
              title={artifact.title}
              content={
                isCurrentVersion
                  ? artifact.content
                  : getDocumentContentById(currentVersionIndex)
              }
              mode={mode}
              status={artifact.status}
              currentVersionIndex={currentVersionIndex}
              suggestions={[]}
              onSaveContent={saveContent}
              isInline={false}
              isCurrentVersion={isCurrentVersion}
              getDocumentContentById={getDocumentContentById}
              isLoading={isDocumentsFetching && !artifact.content}
              metadata={metadata}
              setMetadata={setMetadata}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
