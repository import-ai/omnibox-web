import Message from './message';
import Greeting from './greeting';
import { motion } from 'framer-motion';
import ThinkingMessage from './thinking-message';

export default function Messages() {
  return (
    <div className="flex flex-col min-w-0 gap-6 flex-1 overflow-y-scroll pt-4 relative">
      <Greeting />
      <ThinkingMessage />
      <Message />
      <motion.div className="shrink-0 min-w-[24px] min-h-[24px]" />
    </div>
  );
}
