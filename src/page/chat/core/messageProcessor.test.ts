import type { MessageOperator } from './messageOperator';
import { messageProcessor } from './messageProcessor';
import { OpenAIMessageRole } from './types/chatResponse';

function mockOperator(): jest.Mocked<MessageOperator> {
  return {
    update: jest.fn(),
    add: jest.fn().mockReturnValue('assistant'),
    done: jest.fn(),
    stop: jest.fn(),
    error: jest.fn(),
    activate: jest.fn(),
    getSiblings: jest.fn().mockReturnValue([]),
    getParent: jest.fn().mockReturnValue(''),
  };
}

describe('messageProcessor', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('drops the ping heartbeat without touching the operator or logging', () => {
    const operator = mockOperator();
    messageProcessor(operator, '{"response_type":"ping"}');
    for (const fn of Object.values(operator)) {
      expect(fn).not.toHaveBeenCalled();
    }
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('routes bos, delta, eos and done chunks', () => {
    const operator = mockOperator();
    const bos = {
      response_type: 'bos',
      role: OpenAIMessageRole.ASSISTANT,
      id: 'assistant',
      parentId: 'user',
    };
    const delta = {
      response_type: 'delta',
      id: 'assistant',
      message: { content: 'hi' },
    };
    messageProcessor(operator, JSON.stringify(bos));
    messageProcessor(operator, '{"response_type":"ping"}');
    messageProcessor(operator, JSON.stringify(delta));
    messageProcessor(operator, '{"response_type":"eos","id":"assistant"}');
    messageProcessor(operator, '{"response_type":"done"}');

    expect(operator.add).toHaveBeenCalledWith(bos);
    expect(operator.update).toHaveBeenCalledWith(delta, 'assistant');
    expect(operator.done).toHaveBeenCalledWith('assistant');
    expect(operator.error).not.toHaveBeenCalled();
    expect(operator.stop).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('still reports unknown response types', () => {
    const operator = mockOperator();
    messageProcessor(operator, '{"response_type":"mystery"}');
    expect(consoleError).toHaveBeenCalledTimes(1);
  });
});
