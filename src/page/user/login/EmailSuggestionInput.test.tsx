/** @jest-environment jsdom */

import { act, forwardRef, type InputHTMLAttributes } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { EmailSuggestionInput } from './EmailSuggestionInput';

jest.mock('lucide-react', () => ({
  Mail: () => null,
}));

jest.mock('@/components/input', () => ({
  Input: forwardRef<
    HTMLInputElement,
    InputHTMLAttributes<HTMLInputElement> & {
      startIcon?: unknown;
      endIcon?: unknown;
    }
  >((props, ref) => {
    const { startIcon, endIcon, ...rest } = props;
    void startIcon;
    void endIcon;
    return <input ref={ref} {...rest} />;
  }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('EmailSuggestionInput', () => {
  let container: HTMLDivElement;
  let root: Root;
  const onChange = jest.fn();
  const scrollIntoView = jest.fn();
  const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;

  const renderInput = (value: string) => {
    act(() => {
      root.render(<EmailSuggestionInput value={value} onChange={onChange} />);
    });
  };

  const getInput = () => container.querySelector('input') as HTMLInputElement;

  const focusInput = () => {
    act(() => {
      getInput().focus();
    });
  };

  const pressKey = (key: string) => {
    act(() => {
      getInput().dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true })
      );
    });
  };

  beforeEach(() => {
    onChange.mockClear();
    scrollIntoView.mockClear();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  });

  it('does not show suggestions before @', () => {
    renderInput('dsa');
    focusInput();

    expect(container.querySelectorAll('[role="option"]')).toHaveLength(0);
  });

  it('shows domain suffix suggestions after @', () => {
    renderInput('483339@');
    focusInput();

    const options = [...container.querySelectorAll('[role="option"]')].map(
      node => node.textContent
    );

    expect(options).toEqual([
      '483339@gmail.com',
      '483339@outlook.com',
      '483339@hotmail.com',
      '483339@163.com',
      '483339@qq.com',
      '483339@126.com',
      '483339@foxmail.com',
      '483339@yeah.net',
      '483339@sina.com',
      '483339@yahoo.com',
      '483339@sohu.com',
    ]);
  });

  it('fills the selected suggestion on click', () => {
    renderInput('483339@');
    focusInput();

    const option = [...container.querySelectorAll('[role="option"]')].find(
      node => node.textContent === '483339@163.com'
    ) as HTMLElement;

    act(() => {
      option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      option.click();
    });

    expect(onChange).toHaveBeenCalledWith('483339@163.com');
  });

  it('selects the highlighted suggestion with Enter', () => {
    renderInput('483339@g');
    focusInput();

    act(() => {
      getInput().dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
    });

    expect(onChange).toHaveBeenCalledWith('483339@gmail.com');
  });

  it('keeps keyboard selections visible when navigating and wrapping the list', () => {
    renderInput('483339@');
    focusInput();

    const expectActiveOption = (email: string) => {
      const activeOption = container.querySelector(
        '[role="option"][aria-selected="true"]'
      );
      expect(activeOption?.textContent).toBe(email);
      expect(getInput().getAttribute('aria-activedescendant')).toBe(
        activeOption?.id
      );
      expect(
        scrollIntoView.mock.contexts[scrollIntoView.mock.contexts.length - 1]
      ).toBe(activeOption);
      expect(scrollIntoView).toHaveBeenLastCalledWith({ block: 'nearest' });
      expect(document.activeElement).toBe(getInput());
    };

    expectActiveOption('483339@gmail.com');
    pressKey('ArrowUp');
    expectActiveOption('483339@sohu.com');
    pressKey('ArrowDown');
    expectActiveOption('483339@gmail.com');

    for (let index = 0; index < 6; index += 1) {
      pressKey('ArrowDown');
    }
    expectActiveOption('483339@foxmail.com');
    pressKey('ArrowUp');
    expectActiveOption('483339@126.com');
    pressKey('Enter');

    expect(onChange).toHaveBeenCalledWith('483339@126.com');
    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });

  it('returns to the first suggestion when the input filters the list', () => {
    renderInput('483339@');
    focusInput();
    pressKey('ArrowUp');

    renderInput('483339@o');

    const activeOption = container.querySelector(
      '[role="option"][aria-selected="true"]'
    );
    expect(activeOption?.textContent).toBe('483339@outlook.com');
    expect(
      scrollIntoView.mock.contexts[scrollIntoView.mock.contexts.length - 1]
    ).toBe(activeOption);
    pressKey('Enter');
    expect(onChange).toHaveBeenCalledWith('483339@outlook.com');
  });
});
